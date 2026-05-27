from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.users.urls')),
    path('api/', include('apps.matches.urls')),
    path('api/', include('apps.chat.urls')),
    path('api/', include('apps.streaks.urls')),
    path('api/', include('apps.notifications.urls')),
    path('api/', include('apps.verification.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
