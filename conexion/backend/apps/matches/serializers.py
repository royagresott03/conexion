from rest_framework import serializers
from .models import SwipeAction, Match
from apps.users.serializers import PublicProfileSerializer


class SwipeSerializer(serializers.Serializer):
    user_to = serializers.UUIDField()
    action = serializers.ChoiceField(choices=['like', 'superlike', 'pass'])


class MatchSerializer(serializers.ModelSerializer):
    other_user = serializers.SerializerMethodField()
    conversation_id = serializers.SerializerMethodField()

    class Meta:
        model = Match
        fields = ['id', 'other_user', 'compatibility_score', 'is_active',
                  'created_at', 'conversation_id']

    def get_other_user(self, obj):
        request = self.context.get('request')
        user = request.user if request else None
        other = obj.get_other_user(user)
        try:
            return PublicProfileSerializer(other.profile, context={'request': request}).data
        except Exception:
            return {'user_id': str(other.id), 'first_name': other.email.split('@')[0]}

    def get_conversation_id(self, obj):
        try:
            return str(obj.conversation.id)
        except Exception:
            return None
