from django.urls import path
from . import views

urlpatterns = [

    path('validate-cedula/', views.ValidateCedulaView.as_view(), name='validate_cedula'),
    path('verify/', views.SubmitVerificationView.as_view(), name='submit_verification'),
    path('verify/status/', views.VerificationStatusView.as_view(), name='verification_status'),
    path('verify/retry/', views.RetryVerificationView.as_view(), name='retry_verification'),
]
