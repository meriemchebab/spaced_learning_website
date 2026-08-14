from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Card, ReviewLog, Scheduler_settings, Topic
from django.db import transaction
from math import ceil
from datetime import datetime, timedelta, timezone as dt_timezone
from fsrs import Card as FSRScard , Scheduler as FSRSscheduler , review_log,State ,Rating
from django.utils import timezone
from rest_framework import generics, status, exceptions
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import CardSerializer,TopicSerializer,ExamSerializer
from django.http import Http404
# Rating.Again (==1) forgot the card
# Rating.Hard (==2) remembered the card with serious difficulty
# Rating.Good (==3) remembered the card after a hesitation
# Rating.Easy (==4) remembered the card easily

# Create your views here.
# - this is for getting the cards 
# fetsh_card_by_id(id)
# fetsh_card_by_topic(topic_id)
# fetsh_card_by_date(date , due)
# fetsh_card_by_type(type : str)

# @api_view(['GET'])
# def fetsh_card_by_id(request,card_id : int):
#     card = get_object_or_404(Card, pk=card_id)
#     respo = {
#         "id": card.id,
#         "question": card.question,
#         "answer": card.answer,
#         "topic": {
#             "id": card.topic.id,
#             "topic_name": card.topic.topic_name,
#             "subject": card.topic.subject,
#             "notes": card.topic.notes,
#         },
#         "image": card.image.url if card.image else None,
#         "card_type": card.card_type,
#         "review_method": card.review_method,
#         "attached_file": card.attached_file.url if card.attached_file else None,
#         "audio": card.audio.url if card.audio else None,
#         "context_hint": card.context_hint,
      
#     }
#     return Response(respo, status=200)


# def _serialize_card_info(card : Card):
#     return {
#         "id": card.id,
#         "question": card.question,
#         "answer": card.answer,
#         "topic": {
#             "id": card.topic.id,
#             "topic_name": card.topic.topic_name,
#             "subject": card.topic.subject,
#             "notes": card.topic.notes,
#         },
#         "image": card.image.url if card.image else None,
#         "card_type": card.card_type,
#         "review_method": card.review_method,
#         "attached_file": card.attached_file.url if card.attached_file else None,
#         "audio": card.audio.url if card.audio else None,
#         "context_hint": card.context_hint,
      
#     }
def get_fsrs_data(card : Card):
    return {
        "due": card.due,
        "stability": card.stability,
        "difficulty": card.difficulty,
        "state": card.state,
        "step" : card.step,
        "last_review": card.last_review,
    }


# @api_view(['GET'])
# def fetsh_card_by_topic(request, topic_id : int):
#     cards = Card.objects.select_related('topic').filter(topic_id=topic_id).order_by('id')
#     if not cards.exists():
#         return Response({"detail": "no cards were found for that topic"}, status=404)
#     return Response([_serialize_card_info(card) for card in cards], status=200)


# @api_view(['GET'])
# def fetsh_card_by_date(request, due : datetime):
#     cards = Card.objects.select_related('topic').filter(due__date=due).order_by('due', 'id')
#     if not cards.exists():
#         return Response({"detail": "no cards were found for that date"}, status=404)
#     return Response([_serialize_card_info(card) for card in cards], status=200)


# @api_view(['GET'])
# def fetsh_card_by_type(request, type : str):
#     cards = Card.objects.select_related('topic').filter(card_type=type).order_by('id')
#     if not cards.exists():
#         return Response({"detail": "no cards were found for that type"}, status=404)
#     return Response([_serialize_card_info(card) for card in cards], status=200)
def fetch_card_fsrs_info(card_id : int):
    card = get_object_or_404(Card,pk=card_id)
    return get_fsrs_data(card=card)


# class Card:
#     """
#     Represents a flashcard in the FSRS system.

#     Attributes:
#         card_id: The id of the card. Defaults to the epoch milliseconds of when the card was created.
#         state: The card's current learning state.
#         step: The card's current learning or relearning step or None if the card is in the Review state.
#         stability: Core mathematical parameter used for future scheduling.
#         difficulty: Core mathematical parameter used for future scheduling.
#         due: The date and time when the card is due next.
#         last_review: The date and time of the card's last review.

def calculate_fsrs_stats(db_card, user_rating, now):
    """
    Calculates elapsed_days, scheduled_days, reps, and lapses manually.
    
    :param db_card: Your Django Card model BEFORE the FSRS update is applied.
    :param user_rating: The integer rating the user pressed (1=Again, 2=Hard, 3=Good, 4=Easy).
    :param now: The datetime of the current review.
    :return: A dictionary with the calculated values.
    """
    
    # 1. Calculate elapsed_days
    # The actual number of days between the last review and right now.
    if db_card.last_review:
        delta = now - db_card.last_review
        elapsed_days = delta.days
        # Ensure it doesn't go below 0 if reviews happen rapidly on the same day
        elapsed_days = max(0, elapsed_days) 
    else:
        # Brand new card, no time has elapsed
        elapsed_days = 0

    # 2. Calculate scheduled_days
    # The interval the algorithm previously assigned to this card.
    if db_card.last_review and db_card.due:
        scheduled_delta = db_card.due - db_card.last_review
        scheduled_days = scheduled_delta.days
        scheduled_days = max(0, scheduled_days)
    else:
        # New cards or cards in learning steps don't have scheduled days yet
        scheduled_days = 0

    # 3. Calculate reps
    # Simply increments by 1 every single time a review happens.
    reps = db_card.reps + 1

    # 4. Calculate lapses
    # A lapse ONLY happens if the user forgets (Again=1) a card that was 
    # already successfully learned (State Review = 2 in py-fsrs).
    # Note: Check your py-fsrs version, State.Review is usually integer 2.
    STATE_REVIEW = 2
    RATING_AGAIN = 1
    
    is_lapse = (db_card.state == STATE_REVIEW) and (user_rating == RATING_AGAIN)
    lapses = db_card.lapses + 1 if is_lapse else db_card.lapses

    return {
        "elapsed_days": elapsed_days,
        "scheduled_days": scheduled_days,
        "reps": reps,
        "lapses": lapses
    }
def save_to_log(db_card : Card , user_rating, duration_ms , previous_state,review_datetime):
        """ Create the historical ReviewLog using the log FSRS generated"""
        ReviewLog.objects.create(
            card_id=db_card,
            rating=user_rating,
            state=previous_state, # The state the card was in BEFORE this review
            review_duration_ms=duration_ms,
            review_datetime = review_datetime,
            # FSRS saves the snapshot of the math right after the review
            due=db_card.due,
            stability=db_card.stability,
            difficulty = db_card.difficulty,
            elapsed_days=db_card.elapsed_days,
            scheduled_days=db_card.scheduled_days,
        )
@api_view(['POST'])
def process_flashcard_review(request,card_id :int , user_rating :int, duration_ms :int):
    """submit the rating to a card and update it with history logging"""
    # see who is logged in or not 
    if request.user.is_authenticated:
        user = request.user
        db_card = get_object_or_404(Card, pk=card_id, user=user)
        settings_object = get_object_or_404(Scheduler_settings, user=user)
        
    elif request.headers.get("Guest_ID"):
        guest_id = request.headers.get("Guest_ID")
        db_card = get_object_or_404(Card, pk=card_id, guest=guest_id)
        settings_object = get_object_or_404(Scheduler_settings, guest=guest_id)
        
    else:
        return Response({"detail": "Authentication credentials or Guest_ID were not provided."}, status=401)
    
    previous_state = db_card.state
    fsrs_card = FSRScard()
    try:
        
        fsrs_card.due = db_card.due or timezone.now()
        fsrs_card.stability = db_card.stability
        fsrs_card.difficulty = db_card.difficulty
        fsrs_card.step = db_card.step
        fsrs_card.state = State(db_card.state)
        if db_card.last_review:
            fsrs_card.last_review = db_card.last_review
    except Exception as e:
        print(f"an error occured while making the FSRS card , error : {e}")
    # create the Scheduler with the user settings
    scheduler = settings_object.build_scheduler()
    updated_fsrs_card,fsrs_log = scheduler.review_card(fsrs_card,Rating(user_rating),review_duration=duration_ms)
    
    try:
        with transaction.atomic():
            
            # Overwrite the Django card fields with the new FSRS math
                db_card.due = updated_fsrs_card.due
                db_card.stability = updated_fsrs_card.stability or 0.0
                db_card.difficulty = updated_fsrs_card.difficulty or 0.0
                db_card.state = updated_fsrs_card.state.value # .value converts Enum back to Int
                db_card.last_review = updated_fsrs_card.last_review

                stats = calculate_fsrs_stats(db_card=db_card,user_rating=user_rating,now=fsrs_log.review_datetime)
                db_card.elapsed_days = stats["elapsed_days"]
                db_card.scheduled_days =  stats["scheduled_days"]
                db_card.reps = stats["reps"]
                db_card.lapses = stats["lapses"]
                
                db_card.save()
                save_to_log(db_card,fsrs_log.rating,fsrs_log.review_duration , previous_state,fsrs_log.review_datetime)
    except Exception as e:
        print(f"an error occured while saving the updated version of the card , error : {e}")
        return Response("an error occured while submiting the review",status=404)

    interval_days = 0
    if db_card.due:
        delta_seconds = (db_card.due - fsrs_log.review_datetime).total_seconds()
        interval_days = max(0, ceil(delta_seconds / 86400))

    return Response({
        "message": "card been updated successfuly",
        "card_id": db_card.id,
        "rating": user_rating,
        "next_review": db_card.due,
        "interval_days": interval_days,
        "last_review": db_card.last_review,
        "state": db_card.state,
        "stability": db_card.stability,
        "difficulty": db_card.difficulty,
    }, status=201)

class ReadUpdateDeleteCard(generics.RetrieveUpdateDestroyAPIView):
    """This class is a generic view for getting, editing and deleting a card"""
    serializer_class = CardSerializer

    def get_queryset(self): # type: ignore
        # Logged-in users can only access their own cards
        if self.request.user.is_authenticated:
            return Card.objects.filter(user=self.request.user)

        # Guests can only access cards tied to their Guest ID
        guest_id = self.request.headers.get("Guest_ID") 
        if guest_id:
            return Card.objects.filter(user=None, guest=guest_id)

        # If neither is provided, block access by returning nothing
        else:
            return Card.objects.none()
class CreateCard(generics.CreateAPIView):
    serializer_class = CardSerializer

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
            return
        guest_id = self.request.headers.get("Guest_ID") 
        if guest_id:
            serializer.save(user=None, guest=guest_id)
            return
        raise ValueError("the user is not allowed to create a card")


class TopicListCreateView(generics.ListCreateAPIView):
    serializer_class = TopicSerializer

    def get_queryset(self): # type: ignore
        if self.request.user.is_authenticated:
            try:
                return Topic.objects.filter(user=self.request.user)
            except Exception:
                return Topic.objects.none()
        guest_id = self.request.headers.get("Guest_ID") or self.request.headers.get("Guest-ID") or self.request.headers.get("X-Guest-ID")
        if guest_id:
            return Topic.objects.filter(user=None, guest=guest_id)
        return Topic.objects.none()

    # final check before saving to the database 
    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            try:
                serializer.save(user=self.request.user)
                return
            except Exception:
                pass
        guest_id = self.request.headers.get("Guest_ID") or self.request.headers.get("Guest-ID") or self.request.headers.get("X-Guest-ID")
        if guest_id:
            serializer.save(user=None, guest=guest_id)
            return
        raise exceptions.PermissionDenied("Authentication credentials or Guest_ID header were not provided.")


class AnalyticsView(APIView):
    """
    Analytics API engine calculating cards studied, overall FSRS retention, and upcoming workload.
    """
    def get(self, request):
        if request.user.is_authenticated:
            card_filter = {'user': request.user}
            log_filter = {'card_id__user': request.user}
        else:
            guest_id = request.headers.get("Guest_ID") or request.headers.get("Guest-ID") or request.headers.get("X-Guest-ID")
            if guest_id:
                card_filter = {'user': None, 'guest': guest_id}
                log_filter = {'card_id__guest': guest_id}
            else:
                card_filter = {'user': None, 'guest': None}
                log_filter = {'card_id__guest': None}

        # 1. Total Cards Studied: Count from ReviewLog model
        total_cards_studied = ReviewLog.objects.filter(**log_filter).count()

        # 2. Overall Retention Rate: Average FSRS retrievability (R) of cards in "Review" state
        review_cards = Card.objects.filter(**card_filter, state=Card.FSRSState.REVIEW)
        now = timezone.now()
        
        # Standard FSRS retrievability decay parameters:
        # R(t, S) = (1 + FACTOR * (t / S)) ** DECAY
        FACTOR = 0.9803464944134797
        DECAY = -0.1542

        retrievability_scores = []
        for card in review_cards:
            if card.last_review and card.stability > 0:
                elapsed_days = max(0.0, (now - card.last_review).total_seconds() / 86400.0)
                r = (1.0 + FACTOR * (elapsed_days / card.stability)) ** DECAY
                retrievability_scores.append(r)
            elif card.stability > 0:
                retrievability_scores.append(1.0)
            else:
                retrievability_scores.append(0.0)

        overall_retention_rate = (
            sum(retrievability_scores) / len(retrievability_scores) if retrievability_scores else 0.0
        )

        # 3. Upcoming Workload: Simple count of cards due today vs. tomorrow
        today = now.date()
        tomorrow = today + timedelta(days=1)

        user_cards = Card.objects.filter(**card_filter)
        due_today = user_cards.filter(due__date__lte=today).count()
        due_tomorrow = user_cards.filter(due__date=tomorrow).count()

        return Response({
            "total_cards_studied": total_cards_studied,
            "overall_retention_rate": round(overall_retention_rate * 100, 2),  # Returned as percentage (e.g. 88.5)
            "retention_rate_decimal": round(overall_retention_rate, 4),
            "upcoming_workload": {
                "due_today": due_today,
                "due_tomorrow": due_tomorrow
            }
        }, status=status.HTTP_200_OK)


class RetrieveCards(generics.ListCreateAPIView):
    
    # permission_class= [IsAuthenticated]
    """this class view will give all the retrieval methods React needs in one generic place """
    serializer_class = CardSerializer

    def get_queryset(self): # type: ignore
        # if im filtering for a user :
        if self.request.user.is_authenticated:
            user = self.request.user
            queryset = Card.objects.filter(user=user)
        else:
            guest_id = self.request.headers.get("Guest_ID") or self.request.headers.get("X-Guest-ID")
            if guest_id:
                queryset = Card.objects.filter(user=None, guest=guest_id)
            else:
                return Card.objects.none()
        requested_topic = self.request.query_params.get("topic") # type: ignore
        requested_type = self.request.query_params.get("type") # type: ignore
        requested_date = self.request.query_params.get("date") # type: ignore
        requested_card_id = self.request.query_params.get("id") # type: ignore
        requested_exam = self.request.query_params.get("exam") # type: ignore
        requested_review_type = self.request.query_params.get("review_type") # type: ignore 
        requested_cards_by_difficulty = self.request.query_params.get("difficulty") # type: ignore
        
        
        if requested_card_id:
            queryset = queryset.filter(id = requested_card_id)
        if requested_topic:
            queryset = queryset.filter(topic=requested_topic)

        if requested_type:
            queryset = queryset.filter(type=requested_type)

        if requested_date:
            queryset = queryset.filter(date=requested_date)

        if requested_exam:
            queryset = queryset.filter(topic__exams=requested_exam)

        if requested_review_type:
            queryset = queryset.filter(review_type=requested_review_type)

        if requested_cards_by_difficulty:
            queryset = queryset.filter(difficulty=requested_cards_by_difficulty)
            
        return queryset

    def perform_create(self, serializer):
        if self.request.user.is_authenticated:
            serializer.save(user=self.request.user)
            return
        guest_id = self.request.headers.get("Guest_ID") or self.request.headers.get("X-Guest-ID")
        if guest_id:
            serializer.save(user=None, guest=guest_id)
            return
        raise ValueError("the user is not allowed to create a card")
    

def fetsh_card_by_date(due):
    cards = Card.objects.select_related('topic').filter(due__date=due).order_by('due', 'id')
    if not cards:
        return Response({"detail": "no cards were found for that date"}, status=status.HTTP_404_NOT_FOUND)
    sery = CardSerializer(cards,many=True)
    return Response(sery.data)

@api_view(['GET'])
def get_today_cards(request):
    today = timezone.now().date()
    return fetsh_card_by_date(today)
    
