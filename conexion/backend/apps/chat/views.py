from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.utils import timezone

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


class ConversationListView(generics.ListAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related(
            'participants__profile__interests',
            'messages',
        ).select_related('match').order_by('-updated_at')


class ConversationDetailView(generics.RetrieveAPIView):
    serializer_class = ConversationSerializer

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    def get_object(self):
        conv = super().get_object()
        conv.messages.filter(
            read_at__isnull=True
        ).exclude(sender=self.request.user).update(read_at=timezone.now())
        return conv


class MessageListView(generics.ListAPIView):
    serializer_class = MessageSerializer

    def get_queryset(self):
        conversation_id = self.kwargs['conversation_id']
        try:
            conv = Conversation.objects.get(
                id=conversation_id,
                participants=self.request.user
            )
        except Conversation.DoesNotExist:
            return Message.objects.none()
        return conv.messages.select_related('sender__profile').order_by('created_at')


class SendMessageView(APIView):
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request, conversation_id):
        try:
            conv = Conversation.objects.get(
                id=conversation_id,
                participants=request.user
            )
        except Conversation.DoesNotExist:
            return Response({'error': 'Conversación no encontrada.'}, status=404)

        content = request.data.get('content', '').strip()
        msg_type = request.data.get('msg_type', 'text')
        media = request.FILES.get('media')

        if not content and not media:
            return Response({'error': 'El mensaje no puede estar vacío.'}, status=400)

        msg = Message.objects.create(
            conversation=conv,
            sender=request.user,
            content=content,
            msg_type=msg_type,
            media=media,
        )
        conv.save(update_fields=['updated_at'])

        try:
            conv.streak.record_activity(request.user)
        except Exception:
            pass

        serializer = MessageSerializer(msg, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
