from django.core.validators import FileExtensionValidator
from django.db import models
class Topic(models.Model):
    topic_name = models.CharField(max_length=50)
    subject = models.CharField(max_length=50)
    notes = models.TextField(blank=True)
    def __str__(self) -> str:
        return self.topic_name
class Card(models.Model):
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
     # The question on the card
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
    elapsed_days    = models.IntegerField(default=0)
    scheduled_days  = models.IntegerField(default=0)
    reps       = models.IntegerField(default=0)
    lapses     = models.IntegerField(default=0)
    state      = models.IntegerField(default=0)  # 0=New, 1=Learning, 2=Review, 3=Relearning
    last_review = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return self.question
