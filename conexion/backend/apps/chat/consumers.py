import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'

        is_participant = await self.check_participant()
        if not is_participant:
            await self.close()
            return

        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()


        await self.update_last_active()


        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_online',
                'user_id': str(self.user.id),
                'status': 'online',
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_online',
                    'user_id': str(self.user.id),
                    'status': 'offline',
                }
            )
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        msg_type = data.get('type', 'chat.message')

        if msg_type == 'chat.message':
            content = data.get('content', '').strip()
            if not content:
                return
            message = await self.save_message(content, 'text')
            if message:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'chat_message',
                        'message_id': str(message['id']),
                        'sender_id': str(self.user.id),
                        'sender_name': message['sender_name'],
                        'content': content,
                        'msg_type': 'text',
                        'created_at': message['created_at'],
                    }
                )
                await self.update_streak()

        elif msg_type == 'chat.typing':
            is_typing = data.get('is_typing', False)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'typing_indicator',
                    'user_id': str(self.user.id),
                    'is_typing': is_typing,
                }
            )

        elif msg_type == 'chat.read':
            await self.mark_messages_read()


    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat.message',
            'message_id': event['message_id'],
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'content': event['content'],
            'msg_type': event['msg_type'],
            'created_at': event['created_at'],
        }))

    async def typing_indicator(self, event):
        if event['user_id'] != str(self.user.id):
            await self.send(text_data=json.dumps({
                'type': 'chat.typing',
                'user_id': event['user_id'],
                'is_typing': event['is_typing'],
            }))

    async def user_online(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user.online',
            'user_id': event['user_id'],
            'status': event['status'],
        }))



    @database_sync_to_async
    def check_participant(self):
        from .models import Conversation
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            return conv.participants.filter(id=self.user.id).exists()
        except Conversation.DoesNotExist:
            return False

    @database_sync_to_async
    def save_message(self, content, msg_type):
        from .models import Conversation, Message
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            msg = Message.objects.create(
                conversation=conv,
                sender=self.user,
                content=content,
                msg_type=msg_type,
            )

            conv.save(update_fields=['updated_at'])
            try:
                sender_name = self.user.profile.first_name
            except Exception:
                sender_name = self.user.email.split('@')[0]
            return {
                'id': msg.id,
                'sender_name': sender_name,
                'created_at': msg.created_at.isoformat(),
            }
        except Exception:
            return None

    @database_sync_to_async
    def mark_messages_read(self):
        from .models import Conversation
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            conv.messages.filter(read_at__isnull=True).exclude(
                sender=self.user
            ).update(read_at=timezone.now())
        except Exception:
            pass

    @database_sync_to_async
    def update_last_active(self):
        self.user.update_last_active()

    @database_sync_to_async
    def update_streak(self):
        from .models import Conversation
        from apps.streaks.models import Streak
        try:
            conv = Conversation.objects.get(id=self.conversation_id)
            streak, _ = Streak.objects.get_or_create(conversation=conv)
            streak.record_activity(self.user)
        except Exception:
            pass
