from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from fsrs import Card as FSRSCard, Rating, Scheduler as FSRSScheduler, State

from .models import Card, ReviewLog, Topic


class FSRSSchedulerUnitTests(APITestCase):
    """Behavior checks for the real py-fsrs scheduler, without database/API mocks."""

    REVIEW_TIME = datetime(2026, 1, 1, 10, 0, tzinfo=timezone.utc)

    def make_scheduler(self):
        # Fuzzing intentionally stays off so interval assertions are repeatable.
        return FSRSScheduler(enable_fuzzing=False)

    def make_mature_card(self):
        return FSRSCard(
            due=self.REVIEW_TIME,
            stability=20,
            difficulty=5,
            state=State.Review,
            last_review=self.REVIEW_TIME - timedelta(days=20),
        )

    def interval_seconds(self, card, rating):
        updated_card, review_log = self.make_scheduler().review_card(
            card,
            rating,
            review_datetime=self.REVIEW_TIME,
        )
        interval = (updated_card.due - review_log.review_datetime).total_seconds()
        self.assertGreater(interval, 0)
        return interval, updated_card

    def test_mature_card_intervals_follow_rating_order(self):
        intervals = {
            rating: self.interval_seconds(self.make_mature_card(), rating)[0]
            for rating in Rating
        }

        self.assertLess(intervals[Rating.Again], intervals[Rating.Hard])
        self.assertLess(intervals[Rating.Hard], intervals[Rating.Good])
        self.assertLess(intervals[Rating.Good], intervals[Rating.Easy])

    def test_again_moves_mature_card_to_relearning(self):
        _, updated_card = self.interval_seconds(self.make_mature_card(), Rating.Again)

        self.assertEqual(updated_card.state, State.Relearning)
        self.assertLess(
            (updated_card.due - self.REVIEW_TIME).total_seconds(),
            timedelta(days=1).total_seconds(),
        )

    def test_successful_ratings_keep_mature_card_in_review(self):
        for rating in (Rating.Hard, Rating.Good, Rating.Easy):
            _, updated_card = self.interval_seconds(self.make_mature_card(), rating)
            self.assertEqual(updated_card.state, State.Review)

    def test_new_card_has_a_future_due_date_for_every_rating(self):
        for rating in Rating:
            updated_card, review_log = self.make_scheduler().review_card(
                FSRSCard(),
                rating,
                review_datetime=self.REVIEW_TIME,
            )

            self.assertGreater(updated_card.due, review_log.review_datetime)
            self.assertGreater(updated_card.stability, 0)
            self.assertGreater(updated_card.difficulty, 0)

    def test_interval_is_deterministic_without_fuzzing(self):
        first = self.interval_seconds(self.make_mature_card(), Rating.Good)[0]
        second = self.interval_seconds(self.make_mature_card(), Rating.Good)[0]

        self.assertEqual(first, second)


@override_settings(USE_TZ=True)
class CardCreateEndpointTests(APITestCase):
    def setUp(self):
        self.topic = Topic.objects.create(
            topic_name="Algebra",
            subject="Math",
            notes="Core formulas",
            guest="guest-test",
        )

    def test_guest_can_create_card(self):
        response = self.client.post(
            "/api/cards/",
            {
                "question": "What is 2 + 2?",
                "answer": "4",
                "topic": self.topic.id,
                "card_type": "QU",
                "review_method": "RC",
                "context_hint": "Very basic arithmetic",
            },
            format="json",
            HTTP_GUEST="guest-test",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["question"], "What is 2 + 2?")
        self.assertEqual(response.data["answer"], "4")
        self.assertEqual(response.data["topic"], self.topic.id)
        self.assertEqual(response.data["card_type"], "QU")
        self.assertEqual(response.data["review_method"], "RC")
        self.assertEqual(response.data["context_hint"], "Very basic arithmetic")

        card = Card.objects.get(id=response.data["id"])
        self.assertEqual(card.guest, "guest-test")
        self.assertEqual(card.topic_id, self.topic.id)


@override_settings(USE_TZ=True)
class TopicCreateEndpointTests(APITestCase):
    def test_guest_can_create_topic(self):
        response = self.client.post(
            "/api/topics/",
            {
                "topic_name": "Biology",
                "subject": "Science",
                "notes": "Cells and organisms",
            },
            format="json",
            HTTP_GUEST="guest-test",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["topic_name"], "Biology")
        self.assertEqual(response.data["subject"], "Science")
        self.assertEqual(response.data["notes"], "Cells and organisms")

        topic = Topic.objects.get(id=response.data["id"])
        self.assertEqual(topic.guest, "guest-test")


@override_settings(USE_TZ=True)
class CardRatingEndpointTests(APITestCase):
    def setUp(self):
        self.topic = Topic.objects.create(
            topic_name="Physics",
            subject="Science",
            notes="Motion and forces",
            guest="guest-test",
        )
        self.card = Card.objects.create(
            question="What is force?",
            answer="A push or pull",
            topic=self.topic,
            card_type=Card.CardType.QUESTION,
            review_method=Card.ReviewMethod.RECALL,
            context_hint="Think Newton",
            due=datetime(2026, 8, 14, 10, 0, tzinfo=timezone.utc),
            stability=1.0,
            difficulty=2.0,
            elapsed_days=1,
            scheduled_days=4,
            reps=2,
            lapses=0,
            state=Card.FSRSState.REVIEW,
            last_review=datetime(2026, 8, 13, 10, 0, tzinfo=timezone.utc),
            guest="guest-test",
        )

    @patch("card.views.save_to_log")
    @patch("card.views.get_object_or_404")
    @patch("card.views.Scheduler_settings.objects.get_or_create")
    @patch("card.views.FSRSscheduler")
    @patch("card.views.FSRScard")
    def test_review_endpoint_updates_card_and_returns_interval(
        self,
        mock_fsrs_card_cls,
        mock_scheduler_cls,
        mock_get_or_create_settings,
        mock_get_object_or_404,
        mock_save_to_log,
    ):
        class FakeState:
            value = Card.FSRSState.LEARNING

        class FakeUpdatedCard:
            due = datetime(2026, 8, 18, 10, 0, tzinfo=timezone.utc)
            stability = 3.25
            difficulty = 1.75
            step = 1
            state = FakeState()
            last_review = datetime(2026, 8, 14, 10, 0, tzinfo=timezone.utc)

        class FakeLog:
            rating = 3
            review_duration = 4500
            review_datetime = datetime(2026, 8, 14, 10, 0, tzinfo=timezone.utc)

        mock_fsrs_card_cls.return_value = SimpleNamespace()

        mock_scheduler = MagicMock()
        mock_scheduler.review_card.return_value = (FakeUpdatedCard(), FakeLog())
        mock_scheduler_cls.return_value = mock_scheduler

        mock_get_or_create_settings.return_value = (
            SimpleNamespace(build_scheduler=lambda: mock_scheduler),
            False,
        )
        mock_get_object_or_404.return_value = self.card

        response = self.client.post(
            f"/api/cards/{self.card.id}/ratings/3/4500/",
            HTTP_GUEST="guest-test",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["message"], "card been updated successfuly")
        self.assertEqual(response.data["card_id"], self.card.id)
        self.assertEqual(response.data["rating"], 3)
        self.assertEqual(response.data["interval_days"], 4)
        self.assertEqual(str(response.data["next_review"]), "2026-08-18 10:00:00+00:00")

        self.card.refresh_from_db()
        self.assertEqual(self.card.due, FakeUpdatedCard.due)
        self.assertEqual(self.card.stability, FakeUpdatedCard.stability)
        self.assertEqual(self.card.difficulty, FakeUpdatedCard.difficulty)
        self.assertEqual(self.card.state, Card.FSRSState.LEARNING)
        self.assertEqual(self.card.last_review, FakeUpdatedCard.last_review)
        self.assertEqual(self.card.reps, 3)
        self.assertEqual(self.card.lapses, 0)

        mock_scheduler.review_card.assert_called_once()
        mock_save_to_log.assert_called_once()
        self.assertEqual(ReviewLog.objects.count(), 0)

    def test_review_endpoint_rejects_missing_guest_or_auth(self):
        response = self.client.post(f"/api/cards/{self.card.id}/ratings/3/4500/")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(response.data["detail"], "Authentication credentials or Guest_ID were not provided.")


@override_settings(USE_TZ=True)
class AnalyticsEndpointTests(APITestCase):
    def setUp(self):
        self.topic = Topic.objects.create(
            topic_name="Math",
            subject="Algebra",
            notes="Equations",
            guest="guest-test",
        )
        self.card = Card.objects.create(
            question="What is x if 2x = 4?",
            answer="2",
            topic=self.topic,
            card_type=Card.CardType.QUESTION,
            review_method=Card.ReviewMethod.RECALL,
            due=datetime.now(timezone.utc),
            stability=10.0,
            difficulty=2.0,
            state=Card.FSRSState.REVIEW,
            last_review=datetime.now(timezone.utc) - timedelta(days=10),
            guest="guest-test",
        )
        ReviewLog.objects.create(
            card_id=self.card,
            rating=3,
            state=Card.FSRSState.REVIEW,
            review_duration_ms=2500,
            due=datetime.now(timezone.utc),
            stability=10.0,
            difficulty=2.0,
            elapsed_days=10,
            scheduled_days=10,
        )

    def test_analytics_returns_correct_calculations(self):
        response = self.client.get(
            "/api/analytics/",
            HTTP_GUEST="guest-test",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_cards_studied"], 1)
        # R at 10 days elapsed with 10 stability is 0.90 (90%)
        self.assertEqual(response.data["overall_retention_rate"], 90.0)
        self.assertIn("upcoming_workload", response.data)
        self.assertEqual(response.data["upcoming_workload"]["due_today"], 1)


@override_settings(USE_TZ=True)
class AnalyticsDataScopeTests(APITestCase):
    NOW = datetime(2026, 1, 10, 12, 0, tzinfo=timezone.utc)

    def make_card(self, guest, due, state=Card.FSRSState.REVIEW, stability=10.0):
        topic = Topic.objects.create(
            topic_name=f"{guest}-topic-{Topic.objects.filter(guest=guest).count()}",
            subject="Science",
            notes="Analytics test data",
            guest=guest,
        )
        return Card.objects.create(
            question=f"Question for {guest}",
            answer="Answer",
            topic=topic,
            card_type=Card.CardType.QUESTION,
            review_method=Card.ReviewMethod.RECALL,
            due=due,
            stability=stability,
            difficulty=5.0,
            state=state,
            last_review=self.NOW - timedelta(days=10),
            guest=guest,
        )

    def make_log(self, card):
        return ReviewLog.objects.create(
            card_id=card,
            rating=ReviewLog.FSRSRating.GOOD,
            state=Card.FSRSState.REVIEW,
            review_duration_ms=2500,
            due=card.due,
            stability=card.stability,
            difficulty=card.difficulty,
            elapsed_days=10,
            scheduled_days=10,
        )

    @patch("card.views.timezone.now")
    def test_guest_analytics_counts_only_that_guests_cards_and_logs(self, mock_now):
        mock_now.return_value = self.NOW

        own_overdue = self.make_card("guest-one", self.NOW - timedelta(days=1))
        own_today = self.make_card("guest-one", self.NOW)
        own_tomorrow = self.make_card("guest-one", self.NOW + timedelta(days=1))
        own_later = self.make_card("guest-one", self.NOW + timedelta(days=3))
        other_card = self.make_card("guest-two", self.NOW)

        self.make_log(own_overdue)
        self.make_log(own_today)
        self.make_log(other_card)

        response = self.client.get("/api/analytics/", HTTP_GUEST="guest-one")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_cards_studied"], 2)
        self.assertEqual(response.data["upcoming_workload"], {
            "due_today": 2,
            "due_tomorrow": 1,
        })
        self.assertNotEqual(own_later.id, other_card.id)

    @patch("card.views.timezone.now")
    def test_retention_uses_review_cards_and_returns_expected_percentage(self, mock_now):
        mock_now.return_value = self.NOW

        review_card = self.make_card("guest-retention", self.NOW, stability=10.0)
        learning_card = self.make_card(
            "guest-retention",
            self.NOW,
            state=Card.FSRSState.LEARNING,
            stability=1.0,
        )
        self.make_log(review_card)
        self.make_log(learning_card)

        response = self.client.get("/api/analytics/", HTTP_GUEST="guest-retention")

        self.assertEqual(response.data["total_cards_studied"], 2)
        self.assertEqual(response.data["overall_retention_rate"], 90.0)
        self.assertEqual(response.data["retention_rate_decimal"], 0.9)

    def test_missing_guest_header_returns_empty_analytics(self):
        response = self.client.get("/api/analytics/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["total_cards_studied"], 0)
        self.assertEqual(response.data["overall_retention_rate"], 0.0)
        self.assertEqual(response.data["upcoming_workload"], {
            "due_today": 0,
            "due_tomorrow": 0,
        })
