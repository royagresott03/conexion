from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('profile/photo/', views.UploadPhotoView.as_view(), name='upload_photo'),
    path('profile/location/', views.update_location, name='update_location'),
    path('users/<uuid:user_id>/', views.PublicProfileView.as_view(), name='public_profile'),
    path('interests/', views.InterestListView.as_view(), name='interests'),
    path('create-admin/', views.create_admin),
]
