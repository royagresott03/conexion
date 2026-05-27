from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Profile, Interest


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ['email', 'username', 'is_verified', 'is_premium', 'is_active', 'created_at']
    list_filter = ['is_verified', 'is_premium', 'is_active', 'is_staff']
    search_fields = ['email', 'username']
    ordering = ['-created_at']
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Info', {'fields': ('username', 'is_verified', 'is_premium', 'email_confirmed')}),
        ('Permisos', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Fechas', {'fields': ('created_at', 'last_active')}),
    )
    add_fieldsets = (
        (None, {'classes': ('wide',), 'fields': ('email', 'password1', 'password2')}),
    )
    readonly_fields = ['created_at', 'last_active']


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'user', 'gender', 'city', 'age', 'profile_complete']
    list_filter = ['gender', 'orientation', 'looking_for', 'profile_complete']
    search_fields = ['first_name', 'user__email', 'city']
    raw_id_fields = ['user']
    filter_horizontal = ['interests']


@admin.register(Interest)
class InterestAdmin(admin.ModelAdmin):
    list_display = ['name', 'emoji', 'category']
    list_filter = ['category']
    search_fields = ['name']
