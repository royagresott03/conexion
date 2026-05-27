from django.contrib import admin
from .models import SwipeAction, Match


@admin.register(SwipeAction)
class SwipeAdmin(admin.ModelAdmin):
    list_display = ['user_from', 'user_to', 'action', 'created_at']
    list_filter = ['action']
    search_fields = ['user_from__email', 'user_to__email']


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ['user_1', 'user_2', 'compatibility_score', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['user_1__email', 'user_2__email']
