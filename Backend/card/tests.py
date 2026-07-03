from datetime import datetime, timezone
import tempfile
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Card, ReviewLog, Topic
from .views import process_flashcard_review


def make_test_image(name="test.png"):
    png_bytes = (
        b"\x89PNG\r\n\x1a\n"
        b"\x00\x00\x00\rIHDR"
        b"\x00\x00\x00\x01"
        b"\x00\x00\x00\x01"
        b"\x08\x02\x00\x00\x00"
        b"\x90wS\xde"
        b"\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01"
        b"\r\n-\xb4"
        b"\x00\x00\x00\x00IEND\xaeB`\x82"
    )
    return SimpleUploadedFile(name, png_bytes, content_type="image/png")


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class CardReadEndpointTests(APITestCase):
    def setUp(self):
        self.topic = Topic.objects.create(
            topic_name="Algebra",
            subject="Math",
            notes="Core formulas",
        )
        self.other_topic = Topic.objects.create(
            topic_name="Biology",
            subject="Science",
            notes="Cell basics",
        )

        self.card = Card.objects.create(
            question="What is 2 + 2?",
            answer="4",
            topic=self.topic,
            image=make_test_image(),
            card_type=Card.CardType.QUESTION,
            review_method=Card.ReviewMethod.RECALL,
            context_hint="Very basic arithmetic",
            due=datetime(2026, 7, 2, 10, 30, tzinfo=timezone.utc),
            stability=1.25,
            difficulty=3.5,
            elapsed_days=2,
            scheduled_days=7,
            reps=3,
            lapses=1,
            state=Card.FSRSState.REVIEW,
            last_review=datetime(2026, 7, 1, 18, 0, tzinfo=timezone.utc),
        )

        self.other_card = Card.objects.create(
            question="What is a cell?",
            answer="The basic unit of life",
            topic=self.other_topic,
            image=make_test_image("biology.png"),
            card_type=Card.CardType.CONCEPT,
            review_method=Card.ReviewMethod.READ,
            context_hint="Intro biology",
            due=datetime(2026, 7, 3, 9, 0, tzinfo=timezone.utc),
        )

    def test_fetch_card_by_id_returns_expected_payload(self):
        response = self.client.get(reverse("get-a-card-by-id", kwargs={"card_id": self.card.id}))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["id"], self.card.id)
        self.assertEqual(response.data["question"], self.card.question)
        self.assertEqual(response.data["answer"], self.card.answer)
        self.assertEqual(response.data["topic"]["id"], self.topic.id)
        self.assertEqual(response.data["topic"]["topic_name"], self.topic.topic_name)
        self.assertEqual(response.data["topic"]["subject"], self.topic.subject)
        self.assertEqual(response.data["topic"]["notes"], self.topic.notes)
        self.assertEqual(response.data["card_type"], self.card.card_type)
        self.assertEqual(response.data["review_method"], self.card.review_method)
        self.assertEqual(response.data["context_hint"], self.card.context_hint)

    def test_fetch_card_by_id_returns_404_for_missing_card(self):
        response = self.client.get(reverse("get-a-card-by-id", kwargs={"card_id": 99999}))

        self.assertEqual(response.status_code, 404)

    def test_fetch_cards_by_topic_returns_matching_cards_only(self):
        response = self.client.get(reverse("get-cards-by-topic", kwargs={"topic_id": self.topic.id}))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.card.id)
        self.assertEqual(response.data[0]["topic"]["id"], self.topic.id)

    def test_fetch_cards_by_topic_returns_404_when_empty(self):
        response = self.client.get(reverse("get-cards-by-topic", kwargs={"topic_id": 99999}))

        self.assertEqual(response.status_code, 404)

    def test_fetch_cards_by_date_returns_matching_cards_only(self):
        response = self.client.get(reverse("get-cards-by-date", kwargs={"due": "2026-07-02"}))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.card.id)

    def test_fetch_cards_by_date_returns_404_when_empty(self):
        response = self.client.get(reverse("get-cards-by-date", kwargs={"due": "2026-07-10"}))

        self.assertEqual(response.status_code, 404)

    def test_fetch_cards_by_type_returns_matching_cards_only(self):
        response = self.client.get(
            reverse("get-cards-by-type", kwargs={"type": Card.CardType.QUESTION})
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.card.id)

    def test_fetch_cards_by_type_returns_404_when_empty(self):
        response = self.client.get(reverse("get-cards-by-type", kwargs={"type": Card.CardType.MISTAKE}))

        self.assertEqual(response.status_code, 404)


@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class ProcessFlashcardReviewTests(APITestCase):
    def setUp(self):
        self.topic = Topic.objects.create(
            topic_name="Physics",
            subject="Science",
            notes="Motion and forces",
        )
        self.card = Card.objects.create(
            question="What is force?",
            answer="A push or pull",
            topic=self.topic,
            image=make_test_image("physics.png"),
            stability=1.0,
            difficulty=2.0,
            elapsed_days=1,
            scheduled_days=4,
            reps=2,
            lapses=0,
            state=Card.FSRSState.REVIEW,
            due=datetime(2026, 7, 2, 12, 0, tzinfo=timezone.utc),
            last_review=datetime(2026, 7, 1, 12, 0, tzinfo=timezone.utc),
        )

    @patch("card.views.save_to_log")
    @patch("card.views.FSRSscheduler")
    @patch("card.views.FSRScard")
    def test_process_flashcard_review_updates_card_and_logs_review(
        self, mock_fsrs_card_cls, mock_scheduler_cls, mock_save_to_log
    ):
        class FakeState:
            value = Card.FSRSState.LEARNING

        class FakeUpdatedCard:
            due = datetime(2026, 7, 8, 12, 0, tzinfo=timezone.utc)
            stability = 3.2
            difficulty = 1.7
            state = FakeState()
            last_review = datetime(2026, 7, 3, 12, 0, tzinfo=timezone.utc)

        class FakeLog:
            rating = 3
            review_duration = 4500
            review_datetime = datetime(2026, 7, 3, 12, 0, tzinfo=timezone.utc)

        mock_fsrs_card_cls.return_value = SimpleNamespace()

        mock_scheduler = MagicMock()
        mock_scheduler.review_card.return_value = (FakeUpdatedCard(), FakeLog())
        mock_scheduler_cls.return_value = mock_scheduler

        process_flashcard_review(self.card.id, 3, 4500)

        self.card.refresh_from_db()
        self.assertEqual(self.card.due, FakeUpdatedCard.due)
        self.assertEqual(self.card.stability, FakeUpdatedCard.stability)
        self.assertEqual(self.card.difficulty, FakeUpdatedCard.difficulty)
        self.assertEqual(self.card.state, Card.FSRSState.LEARNING)
        self.assertEqual(self.card.last_review, FakeUpdatedCard.last_review)
        self.assertEqual(self.card.reps, 3)

        mock_scheduler.review_card.assert_called_once()
        mock_save_to_log.assert_called_once()
        self.assertEqual(mock_save_to_log.call_args.args[3], Card.FSRSState.REVIEW)
        self.assertEqual(ReviewLog.objects.count(), 0)
