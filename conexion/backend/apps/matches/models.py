import uuid
from django.db import models
from django.utils import timezone


class SwipeAction(models.Model):
    ACTION_CHOICES = [
        ('like', 'Like'),
        ('superlike', 'Super Like'),
        ('pass', 'Pasar'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_from = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='swipes_given'
    )
    user_to = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='swipes_received'
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'matches_swipe'
        unique_together = ('user_from', 'user_to')
        indexes = [
            models.Index(fields=['user_from', 'action']),
            models.Index(fields=['user_to', 'action']),
        ]

    def __str__(self):
        return f'{self.user_from} → {self.user_to} ({self.action})'


class Match(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_1 = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='matches_as_user1'
    )
    user_2 = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='matches_as_user2'
    )
    compatibility_score = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'matches_match'
        unique_together = ('user_1', 'user_2')
        indexes = [
            models.Index(fields=['user_1', 'is_active']),
            models.Index(fields=['user_2', 'is_active']),
        ]

    def __str__(self):
        return f'Match: {self.user_1} ↔ {self.user_2}'

    def get_other_user(self, user):
        return self.user_2 if self.user_1 == user else self.user_1
