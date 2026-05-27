from django.urls import path
from . import views

urlpatterns = [
    path('discover/', views.DiscoverView.as_view(), name='discover'),
    path('swipe/', views.SwipeView.as_view(), name='swipe'),
    path('matches/', views.MatchListView.as_view(), name='match_list'),
    path('matches/<uuid:match_id>/', views.UnmatchView.as_view(), name='unmatch'),
]
