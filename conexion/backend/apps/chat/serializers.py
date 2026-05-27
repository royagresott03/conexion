from rest_framework import serializers
from .models import Conversation, Message
from apps.users.serializers import PublicProfileSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source='sender.id', read_only=True)
    sender_name = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'sender_id', 'sender_name', 'content',
                  'msg_type', 'media_url', 'read_at', 'created_at']

    def get_sender_name(self, obj):
        try:
            return obj.sender.profile.first_name
        except Exception:
            return obj.sender.email.split('@')[0]

    def get_media_url(self, obj):
        request = self.context.get('request')
        if obj.media and request:
            return request.build_absolute_uri(obj.media.url)
        return None


class ConversationSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    streak = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'other_user', 'last_message', 'unread_count',
                  'streak', 'created_at', 'updated_at']

    def get_other_user(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        other = obj.get_other_participant(user)
        if not other:
            return None
        try:
            return PublicProfileSerializer(other.profile, context={'request': request}).data
        except Exception:
            return {'user_id': str(other.id), 'first_name': other.email.split('@')[0]}

    def get_last_message(self, obj):
        msg = obj.last_message()
        if msg:
            return {
                'content': msg.content,
                'msg_type': msg.msg_type,
                'created_at': msg.created_at,
                'sender_id': str(msg.sender_id),
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        return obj.messages.filter(
            read_at__isnull=True
        ).exclude(sender=request.user).count()

    def get_streak(self, obj):
        try:
            streak = obj.streak
            return {
                'current_days': streak.current_days,
                'max_days': streak.max_days,
                'is_active': streak.is_active,
                'expires_at': streak.expires_at,
            }
        except Exception:
            return None
