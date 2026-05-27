from django.urls import path
from . import views

urlpatterns = [
    path('conversations/', views.ConversationListView.as_view(), name='conversations'),
    path('conversations/<uuid:pk>/', views.ConversationDetailView.as_view(), name='conversation_detail'),
    path('conversations/<uuid:conversation_id>/messages/', views.MessageListView.as_view(), name='messages'),
    path('conversations/<uuid:conversation_id>/messages/send/', views.SendMessageView.as_view(), name='send_message'),
]
