from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import serializers as drf_serializers
from .models import Streak


class StreakSerializer(drf_serializers.ModelSerializer):
    hours_until_expiry = drf_serializers.ReadOnlyField()
    other_user_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = Streak
        fields = ['id', 'current_days', 'max_days', 'is_active',
                  'expires_at', 'hours_until_expiry', 'other_user_name', 'updated_at']

    def get_other_user_name(self, obj):
        request = self.context.get('request')
        if not request:
            return None
        try:
            other = obj.conversation.get_other_participant(request.user)
            return other.profile.first_name
        except Exception:
            return None


class MyStreaksView(APIView):
    def get(self, request):
        from apps.chat.models import Conversation
        convs = Conversation.objects.filter(participants=request.user)
        streaks = Streak.objects.filter(
            conversation__in=convs,
            is_active=True
        ).select_related('conversation').order_by('-current_days')

        serializer = StreakSerializer(streaks, many=True, context={'request': request})
        return Response({'streaks': serializer.data, 'count': streaks.count()})
