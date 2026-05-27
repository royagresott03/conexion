from django.contrib import admin
from .models import Streak


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    list_display = ['conversation', 'current_days', 'max_days', 'is_active', 'expires_at', 'updated_at']
    list_filter = ['is_active']
    search_fields = ['conversation__id']
    readonly_fields = ['created_at', 'updated_at']
