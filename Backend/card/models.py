from django.core.validators import FileExtensionValidator
from django.db import models
class User(models.Model):
    user_id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=50,default="user")
    email = models.EmailField()
    admin = models.BooleanField(default=False)
class Topic(models.Model):
    id = models.BigAutoField(primary_key=True)
    topic_name = models.CharField(max_length=50)
    subject = models.CharField(max_length=50)
    notes = models.TextField(blank=True)
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="topics",blank=True,null=True)
    guest = models.CharField(max_length=100,null=True)

    def __str__(self) -> str:
        return self.topic_name

class Card(models.Model):
    # add a link to the user table 
    class CardType(models.TextChoices):
        """return a tuple (db_storage name , human readable name)"""
        EXERCISE = 'EX', 'Exercise'
        MISTAKE = 'MI', 'Mistake'
        CONCEPT = 'CO', 'Concept'
        NOTE = 'NO', 'Note'
        QUESTION = 'QU', 'Question'

    class ReviewMethod(models.TextChoices):
        RECALL = 'RC', 'Recall'
        TEST = 'TS', 'Test'
        READ = 'RD', 'Read'
        WATCH = 'WT', 'Watch'
    # FSRS State Enums (Matches Py-FSRS State)
    class FSRSState(models.IntegerChoices):
        NEW = 0, 'New'
        LEARNING = 1, 'Learning'
        REVIEW = 2, 'Review'
        RELEARNING = 3, 'Relearning'
     # The question on the card
    id = models.BigAutoField(primary_key=True)
    question = models.TextField()
    answer = models.TextField()
    topic = models.ForeignKey(Topic,on_delete=models.CASCADE,related_name='cards')
    # optional params
    image = models.ImageField()
    card_type = models.CharField(
        max_length=2,choices=CardType.choices, default=CardType.QUESTION
    )
    review_method = models.CharField(
        max_length=2, 
        choices=ReviewMethod.choices, 
        default=ReviewMethod.RECALL
    )
    # attached_file = models.URLField(null = True,blank=True)
    attached_file = models.FileField(
        upload_to='card_attachments/', 
        null=True, 
        blank=True,
        # Optional: Restrict uploads to documents only
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'docx', 'doc', 'txt', 'png', 'jpg'])]
    )
    audio = models.FileField(upload_to='card_audio/', null=True, blank=True)
    context_hint = models.TextField(blank=True)

    # py-fsrs fields — these get updated after every review
    due        = models.DateTimeField(null=True, blank=True)
    stability  = models.FloatField(default=0)
    difficulty = models.FloatField(default=0) # difficulte , good , easy
    step = models.IntegerField(null=True, blank=True, default=None)
    # elapsed_days: The actual number of days that have passed since the user last reviewed this card.
    elapsed_days    = models.IntegerField(default=0)
    # # the actual days that the algorithm wanted the user to review the card 
    scheduled_days  = models.IntegerField(default=0)

    # repetitions 
    reps       = models.IntegerField(default=0)
    # how much you got it wrong 
    lapses     = models.IntegerField(default=0)
    state = models.IntegerField(choices=FSRSState.choices, default=FSRSState.NEW)
    last_review = models.DateTimeField(null=True, blank=True)
    # the user
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="cards",blank=True,null=True)
    guest = models.CharField(max_length=100,null=True)

    def __str__(self):
        return self.question
class ReviewLog(models.Model):
    """
    The historical ledger. Every time a user clicks Again, Hard, Good, or Easy, 
    you create one of these records. You NEVER update it once created.
     Attributes:
        card_id: The id of the card being reviewed.
        rating: The rating given to the card during the review.
        review_datetime: The date and time of the review.
        review_duration: The number of milliseconds it took to review the card or None if unspecified.
    """
    # Py-FSRS Rating Enums
    class FSRSRating(models.IntegerChoices):
        AGAIN = 1, 'Again'
        HARD = 2, 'Hard'
        GOOD = 3, 'Good'
        EASY = 4, 'Easy'

    # Link back to the card (if the card is deleted, delete its history)
    card_id = models.ForeignKey(Card, on_delete=models.CASCADE, related_name='review_logs')
    
    # What button the user pressed
    rating = models.IntegerField(choices=FSRSRating.choices)
    
    # State of the card BEFORE this review happened
    state = models.IntegerField(choices=Card.FSRSState.choices)
    
    # Timing data
    review_datetime = models.DateTimeField(auto_now_add=True)
    review_duration_ms = models.IntegerField(help_text="How long it took the user to answer in milliseconds")
    
    # FSRS Historical variables (snapshot of the card state AFTER the review)
    due = models.DateTimeField()
    stability = models.FloatField()
    difficulty = models.FloatField()
    elapsed_days = models.IntegerField()
    scheduled_days = models.IntegerField()

    def __str__(self):
        return f"Log: {self.card_id} - {self.rating} at {self.review_datetime}"
    
class Exam(models.Model):
    exam_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="exams",blank=True,null=True)
    guest = models.CharField(max_length=100,null=True)

    exam_name = models.TextField()
    # topic_id = models.ForeignKey(Topic,on_delete= models.CASCADE,related_name="topics")
    topics = models.ManyToManyField(Topic,related_name="exams")
    dead_line = models.DateField()
    desired_retention = models.FloatField(default=0.9)
    priority = models.FloatField(default=1)
    def __str__(self):
        return f"{self.exam_name}"
    

from datetime import timedelta
from fsrs import Scheduler


DEFAULT_PARAMETERS = [
    0.212,
    1.2931,
    2.3065,
    8.2956,
    6.4133,
    0.8334,
    3.0194,
    0.001,
    1.8722,
    0.1666,
    0.796,
    1.4835,
    0.0614,
    0.2629,
    1.6483,
    0.6014,
    1.8729,
    0.5425,
    0.0912,
    0.0658,
    0.1542,
]


def default_parameters():
    return DEFAULT_PARAMETERS.copy()


def default_learning_steps():
    return [60, 600]


def default_relearning_steps():
    return [600]


class Scheduler_settings(models.Model):
    """
    stores the FSRS scheduler configuration in the database.
    """
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="fsrs_settings",blank=True,null=True)
    guest = models.CharField(max_length=100,null=True)
    parameters = models.JSONField(
        default=default_parameters,
        help_text="FSRS parameter list used to initialize the scheduler.",
    )
    # add a forgein key to the user table
    desired_retention = models.FloatField(default=0.9)
    learning_steps = models.JSONField(default=default_learning_steps)
    relearning_steps = models.JSONField(default=default_relearning_steps)
    maximum_interval = models.IntegerField(default=36500)
    enable_fuzzing = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    card_limit = models.IntegerField(default=None)
    class Meta:
        verbose_name = "FSRS Scheduler"
        verbose_name_plural = "FSRS Schedulers"


    def build_scheduler(self) -> Scheduler:
        """
        Create a live fsrs.Scheduler instance from this model record.
        """
        return Scheduler(
            parameters=tuple(self.parameters),
            desired_retention=self.desired_retention,
            learning_steps=tuple(timedelta(seconds=s) for s in self.learning_steps),
            relearning_steps=tuple(
                timedelta(seconds=s) for s in self.relearning_steps
            ),
            maximum_interval=self.maximum_interval,
            enable_fuzzing=self.enable_fuzzing,
        )