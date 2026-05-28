import uuid
from django.db import models
from django.utils import timezone
from datetime import timedelta


class Streak(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.OneToOneField(
        'chat.Conversation', on_delete=models.CASCADE, related_name='streak'
    )
    current_days = models.IntegerField(default=0)
    max_days = models.IntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)
    last_activity_user1 = models.DateTimeField(null=True, blank=True)
    last_activity_user2 = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)


    user1 = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='streaks_as_user1'
    )
    user2 = models.ForeignKey(
        'users.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='streaks_as_user2'
    )

    class Meta:
        db_table = 'streaks_streak'

    def __str__(self):
        return f'Streak {self.current_days}d - Conv {self.conversation_id}'

    def record_activity(self, user):
        """Call this every time a user sends a message."""
        now = timezone.now()
        self.last_message_at = now

        if not self.user1 or not self.user2:
            participants = list(self.conversation.participants.all()[:2])
            if len(participants) == 2:
                self.user1 = participants[0]
                self.user2 = participants[1]

        if self.user1 and user.id == self.user1.id:
            self.last_activity_user1 = now
        elif self.user2 and user.id == self.user2.id:
            self.last_activity_user2 = now


        u1_active = self.last_activity_user1 and (now - self.last_activity_user1).total_seconds() < 86400
        u2_active = self.last_activity_user2 and (now - self.last_activity_user2).total_seconds() < 86400

        if u1_active and u2_active:
            if not self.expires_at or now > self.expires_at:
                self.current_days += 1
                if self.current_days > self.max_days:
                    self.max_days = self.current_days

            self.expires_at = now + timedelta(hours=24)
            self.is_active = True
        else:

            if not self.expires_at:
                self.expires_at = now + timedelta(hours=24)

        self.save()

    def check_expiry(self):
        if self.is_active and self.expires_at and timezone.now() > self.expires_at:
            self.is_active = False
            self.current_days = 0
            self.last_activity_user1 = None
            self.last_activity_user2 = None
            self.save(update_fields=['is_active', 'current_days', 'last_activity_user1', 'last_activity_user2'])
            return True
        return False

    @property
    def hours_until_expiry(self):
        if not self.expires_at:
            return None
        delta = self.expires_at - timezone.now()
        return max(0, delta.total_seconds() / 3600)
