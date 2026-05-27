from django.urls import path
from . import views

urlpatterns = [
    # Quick cedula format check (no auth needed)
    path('validate-cedula/', views.ValidateCedulaView.as_view(), name='validate_cedula'),
    # Submit full verification (document + selfie)
    path('verify/', views.SubmitVerificationView.as_view(), name='submit_verification'),
    # Check status
    path('verify/status/', views.VerificationStatusView.as_view(), name='verification_status'),
    # Retry rejected verification
    path('verify/retry/', views.RetryVerificationView.as_view(), name='retry_verification'),
]
