import uuid
import os
from django.db import models
from django.utils import timezone


def message_media_upload(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('chat', str(instance.conversation.id), f'{uuid.uuid4()}.{ext}')


class Conversation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    match = models.OneToOneField(
        'matches.Match', on_delete=models.CASCADE,
        related_name='conversation', null=True, blank=True
    )
    participants = models.ManyToManyField('users.User', related_name='conversations')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chat_conversation'
        ordering = ['-updated_at']

    def __str__(self):
        return f'Conversation {self.id}'

    def get_other_participant(self, user):
        return self.participants.exclude(id=user.id).first()

    def last_message(self):
        return self.messages.order_by('-created_at').first()


class Message(models.Model):
    TYPE_CHOICES = [
        ('text', 'Texto'),
        ('image', 'Imagen'),
        ('emoji', 'Emoji'),
        ('gif', 'GIF'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name='messages'
    )
    sender = models.ForeignKey(
        'users.User', on_delete=models.CASCADE, related_name='sent_messages'
    )
    content = models.TextField(blank=True)
    msg_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='text')
    media = models.ImageField(upload_to=message_media_upload, null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'chat_message'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f'{self.sender} → [{self.msg_type}] {self.content[:40]}'

    def mark_read(self):
        if not self.read_at:
            self.read_at = timezone.now()
            self.save(update_fields=['read_at'])
