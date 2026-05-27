from django.urls import path
from .views import MyStreaksView

urlpatterns = [
    path('streaks/', MyStreaksView.as_view(), name='my_streaks'),
]
