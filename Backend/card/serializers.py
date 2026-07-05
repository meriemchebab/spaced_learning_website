from rest_framework import serializers
from .models import Card,Topic,Exam

class CardSerializer(serializers.ModelSerializer):
    topic_name = serializers.StringRelatedField(source = Topic,read_only=True)
    class Meta:
        model = Card
        feilds = [
            'id', 'question', 'answer', 'topic','topic_name', 'image', 'card_type',
                'review_method', 'attached_file', 'audio', 'context_hint', 'due'
            
        ]
    def validate_qst(self,value : str):
        if(len(value))<5:
            raise serializers.ValidationError("the question is too smol to be valide")
        return value
    def validate_data(self, data):
        """Object-level validation: Checks relationships between fields"""
        if data.get('question') == data.get('answer'):
            raise serializers.ValidationError({"answer": "The answer cannot be identical to the question."})
        return data
class TopicSerializer(serializers.ModelSerializer):
    exam_name = serializers.StringRelatedField(many=True,read_only=True)
    class Meta:
        model = Topic
        fields = [
            'id', 'topic_name','subject','exam_name','note'
        ]
from django.utils import timezone

class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        fields = [
            'exam_id', 'exam_name', 'topics', 'dead_line', 
            'desired_retention', 'priority'
        ]

    def validate_dead_line(self, value):
        """Ensure the exam deadline is in the future."""
        # value is a Date object. Compare it to today's date.
        if value < timezone.now().date():
            raise serializers.ValidationError("The exam deadline must be in the future. No time travel allowed!")
        return value

    def validate_desired_retention(self, value):
        """Ensure FSRS retention is between 50% and 99%."""
        if not (0.5 <= value <= 0.99):
            raise serializers.ValidationError("Desired retention must be between 0.5 (50%) and 0.99 (99%).")
        return value