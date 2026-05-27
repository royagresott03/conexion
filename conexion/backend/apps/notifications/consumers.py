import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        self.group_name = f'notifications_{self.user.id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass  # Client doesn't send to this socket

    async def match_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification.match',
            'match_id': event.get('match_id'),
            'user_name': event.get('user_name'),
            'conversation_id': event.get('conversation_id'),
        }))

    async def streak_warning(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification.streak',
            'streak_id': event.get('streak_id'),
            'contact_name': event.get('contact_name'),
            'hours_left': event.get('hours_left'),
            'current_days': event.get('current_days'),
        }))

    async def new_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'notification.message',
            'conversation_id': event.get('conversation_id'),
            'sender_name': event.get('sender_name'),
            'content': event.get('content'),
        }))
