from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Card, ReviewLog
from django.db import transaction
from datetime import datetime, timezone as dt_timezone
from fsrs import Card as FSRScard , Scheduler as FSRSscheduler , review_log,State ,Rating
from django.utils import timezone
from rest_framework import generics
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .serializers import CardSerializer,TopicSerializer,ExamSerializer
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

@api_view(['GET'])
def fetsh_card_by_id(request,card_id : int):
    card = get_object_or_404(Card, pk=card_id)
    respo = {
        "id": card.id,
        "question": card.question,
        "answer": card.answer,
        "topic": {
            "id": card.topic.id,
            "topic_name": card.topic.topic_name,
            "subject": card.topic.subject,
            "notes": card.topic.notes,
        },
        "image": card.image.url if card.image else None,
        "card_type": card.card_type,
        "review_method": card.review_method,
        "attached_file": card.attached_file.url if card.attached_file else None,
        "audio": card.audio.url if card.audio else None,
        "context_hint": card.context_hint,
      
    }
    return Response(respo, status=200)


def _serialize_card_info(card : Card):
    return {
        "id": card.id,
        "question": card.question,
        "answer": card.answer,
        "topic": {
            "id": card.topic.id,
            "topic_name": card.topic.topic_name,
            "subject": card.topic.subject,
            "notes": card.topic.notes,
        },
        "image": card.image.url if card.image else None,
        "card_type": card.card_type,
        "review_method": card.review_method,
        "attached_file": card.attached_file.url if card.attached_file else None,
        "audio": card.audio.url if card.audio else None,
        "context_hint": card.context_hint,
      
    }
def get_fsrs_data(card : Card):
    return {
        "due": card.due,
        "stability": card.stability,
        "difficulty": card.difficulty,
        "state": card.state,
        "step" : card.step,
        "last_review": card.last_review,
    }


@api_view(['GET'])
def fetsh_card_by_topic(request, topic_id : int):
    cards = Card.objects.select_related('topic').filter(topic_id=topic_id).order_by('id')
    if not cards.exists():
        return Response({"detail": "no cards were found for that topic"}, status=404)
    return Response([_serialize_card_info(card) for card in cards], status=200)


@api_view(['GET'])
def fetsh_card_by_date(request, due : datetime):
    cards = Card.objects.select_related('topic').filter(due__date=due).order_by('due', 'id')
    if not cards.exists():
        return Response({"detail": "no cards were found for that date"}, status=404)
    return Response([_serialize_card_info(card) for card in cards], status=200)


@api_view(['GET'])
def fetsh_card_by_type(request, type : str):
    cards = Card.objects.select_related('topic').filter(card_type=type).order_by('id')
    if not cards.exists():
        return Response({"detail": "no cards were found for that type"}, status=404)
    return Response([_serialize_card_info(card) for card in cards], status=200)
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
def process_flashcard_review(card_id :int , user_rating :int, duration_ms :int):
    """submit the rating to a card and update it with history logging"""
    db_card = get_object_or_404(Card , pk=card_id) #return a dict of the fsrs data of that card
    now = datetime.now(dt_timezone.utc)
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
    shedular = FSRSscheduler()
    updated_fsrs_card,fsrs_log = shedular.review_card(fsrs_card,Rating(user_rating),review_duration=duration_ms)
    
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
    return Response("card been updated successfuly",status=201)

class ReadUpdateDeleteCard(generics.RetrieveUpdateDestroyAPIView):
    """this class is a generic view for getting , edetting and deleting a card"""

    queryset = Card.objects.all()
    serializer_class = CardSerializer

class RetrieveCards(generics.ListAPIView):
    """this class view will give all the retrieval methods React needs in one generic place """
    serializer_class = CardSerializer
    def get_queryset(self): 
        # if im filtering for a user :
        # user = self.request.data.get("user_id")
        # queryset = Card.objects.filter(user_id = user_id)
        queryset = Card.objects.all()
        requested_topic = self.request.query_params.get("topic") # type: ignore
        requested_type = self.request.query_params.get("type") # type: ignore
        requested_date = self.request.query_params.get("date") # type: ignore
        requested_card_id = self.request.query_params.get("topic") # type: ignore
        requested_exam = self.request.query_params.get("exam") # type : ignore
        requested_review_type = self.request.query_params.get("review_type") # type : ignore 
        requested_cards_by_difficulty = self.request.query_params.get("difficulty")
        
        if requested_card_id.exist():
            queryset = queryset.filter(id = requested_card_id)
        if requested_topic:
            queryset = queryset.filter(topic=requested_topic)

        if requested_type:
            queryset = queryset.filter(type=requested_type)

        if requested_date:
            queryset = queryset.filter(date=requested_date)

        if requested_exam:
            queryset = queryset.filter(exam=requested_exam)

        if requested_review_type:
            queryset = queryset.filter(review_type=requested_review_type)

        if requested_cards_by_difficulty:
            queryset = queryset.filter(difficulty=requested_cards_by_difficulty)
            
        return queryset
        