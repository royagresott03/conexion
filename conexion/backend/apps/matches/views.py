from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, generics
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Match, SwipeAction
from .algorithm import get_discover_profiles, process_swipe
from .serializers import SwipeSerializer, MatchSerializer
from apps.users.serializers import PublicProfileSerializer


class DiscoverView(APIView):

    def get(self, request):
        profiles, scores = get_discover_profiles(request.user, limit=20)
        serialized = []
        for profile in profiles:
            data = PublicProfileSerializer(profile, context={'request': request}).data
            data['compatibility_score'] = scores.get(profile.user_id, 0)
            serialized.append(data)
        return Response({
            'count': len(serialized),
            'profiles': serialized,
        })


class SwipeView(APIView):


    def post(self, request):
        serializer = SwipeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user_to_id = serializer.validated_data['user_to']
        action = serializer.validated_data['action']

        swipe, match_created, match_obj = process_swipe(
            request.user, user_to_id, action
        )

        if swipe is None:
            return Response({'error': 'Usuario no encontrado.'}, status=404)

        response_data = {
            'action': action,
            'match': match_created,
        }

        if match_created and match_obj:
            match_data = MatchSerializer(match_obj, context={'request': request}).data
            response_data['match_data'] = match_data


            try:
                channel_layer = get_channel_layer()
                async_to_sync(channel_layer.group_send)(
                    f'notifications_{user_to_id}',
                    {
                        'type': 'match_notification',
                        'match_id': str(match_obj.id),
                        'user_name': getattr(request.user.profile, 'first_name', request.user.email.split('@')[0]),
                        'conversation_id': match_data.get('conversation_id'),
                    }
                )
            except Exception:
                pass  

        return Response(response_data, status=status.HTTP_200_OK)


class MatchListView(generics.ListAPIView):
    serializer_class = MatchSerializer

    def get_queryset(self):
        user = self.request.user
        return Match.objects.filter(
            Q(user_1=user) | Q(user_2=user),
            is_active=True
        ).select_related(
            'user_1__profile', 'user_2__profile'
        ).prefetch_related(
            'user_1__profile__interests', 'user_2__profile__interests'
        ).order_by('-created_at')


class UnmatchView(APIView):
    def delete(self, request, match_id):
        try:
            match = Match.objects.get(
                id=match_id,
                **{'user_1': request.user} if True else {'user_2': request.user}
            )
        except Match.DoesNotExist:
            from django.db.models import Q
            try:
                match = Match.objects.get(
                    id=match_id
                )
                if match.user_1 != request.user and match.user_2 != request.user:
                    return Response({'error': 'No autorizado.'}, status=403)
            except Match.DoesNotExist:
                return Response({'error': 'Match no encontrado.'}, status=404)

        match.is_active = False
        match.save(update_fields=['is_active'])
        return Response({'message': 'Match eliminado.'})
