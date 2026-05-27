import logging
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser

from .models import IdentityVerification
from .serializers import (
    SubmitVerificationSerializer,
    VerificationStatusSerializer,
    ValidateCedulaSerializer,
)
from .services import validate_cedula_format, run_verification

logger = logging.getLogger(__name__)


class ValidateCedulaView(APIView):
    """
    Quick cedula format validation — no document needed.
    Used in real-time as the user types their cedula number.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = ValidateCedulaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        cedula = serializer.validated_data['cedula_number']
        result = validate_cedula_format(cedula)
        return Response(result)


class SubmitVerificationView(APIView):
    """
    Submit identity verification with document photo + selfie.
    Runs full pipeline: OCR → cedula cross-check → face match.
    """
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        # Check if already verified
        if request.user.is_verified:
            return Response({
                'status': 'verified',
                'message': 'Tu identidad ya está verificada.',
            })

        serializer = SubmitVerificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        # Create or update verification record
        verification, _ = IdentityVerification.objects.get_or_create(user=request.user)

        if verification.status == 'verified':
            return Response({
                'status': 'verified',
                'message': 'Ya tienes verificación aprobada.',
            })

        # Save submitted data
        verification.cedula_number = data['cedula_number']
        verification.cedula_front = data['cedula_front']
        verification.selfie = data['selfie']
        verification.status = 'processing'
        verification.submitted_at = timezone.now()
        verification.save()

        # Run verification pipeline
        try:
            results = run_verification(verification)

            # Save results
            verification.status = results['status']
            verification.cedula_valid_format = results.get('cedula_format_valid')
            verification.face_match_score = results.get('face_score')
            verification.rejection_reason = results.get('rejection_reason', '')

            ocr_data = results.get('ocr_data', {})
            verification.ocr_raw = ocr_data
            verification.ocr_cedula_extracted = ocr_data.get('detected_cedula', '')
            verification.ocr_name_extracted = ocr_data.get('detected_name', '')

            if results['status'] == 'verified':
                verification.verified_at = timezone.now()
                # Mark user as verified
                request.user.is_verified = True
                request.user.save(update_fields=['is_verified'])

            verification.save()

            # Build response
            response_data = {
                'status': verification.status,
                'message': self._get_message(verification.status),
                'face_score': verification.face_match_score,
                'cedula_valid': verification.cedula_valid_format,
                'name_detected': verification.ocr_name_extracted or None,
            }

            if verification.status == 'rejected':
                response_data['reason'] = verification.rejection_reason

            return Response(response_data)

        except Exception as e:
            logger.error(f'Verification pipeline error for {request.user.email}: {e}')
            verification.status = 'manual_review'
            verification.rejection_reason = 'Error interno — en revisión manual.'
            verification.save()
            return Response({
                'status': 'manual_review',
                'message': 'Tu verificación está en revisión manual. Te notificaremos pronto.',
            })

    def _get_message(self, status):
        messages = {
            'verified': '¡Identidad verificada exitosamente! 🎉 Ya tienes el badge de verificado.',
            'rejected': 'No pudimos verificar tu identidad. Revisa los detalles e intenta de nuevo.',
            'manual_review': 'Tu verificación está en revisión manual. Te notificaremos en 24h.',
            'processing': 'Tu verificación está siendo procesada.',
        }
        return messages.get(status, 'Estado desconocido.')


class VerificationStatusView(APIView):
    """Returns the current verification status for the logged-in user."""

    def get(self, request):
        try:
            verification = request.user.verification
            serializer = VerificationStatusSerializer(verification)
            return Response(serializer.data)
        except IdentityVerification.DoesNotExist:
            return Response({
                'status': 'not_started',
                'message': 'Aún no has iniciado la verificación de identidad.',
            })


class RetryVerificationView(APIView):
    """Allows user to retry a rejected verification."""

    def post(self, request):
        try:
            verification = request.user.verification
            if verification.status == 'verified':
                return Response({'message': 'Ya estás verificado.'})
            if verification.status == 'processing':
                return Response({'message': 'Tu verificación está en proceso.'})

            # Reset for retry
            verification.status = 'pending'
            verification.rejection_reason = ''
            verification.ocr_raw = {}
            verification.ocr_cedula_extracted = ''
            verification.face_match_score = None
            verification.save()

            return Response({'message': 'Puedes volver a enviar tu verificación.'})
        except IdentityVerification.DoesNotExist:
            return Response({'message': 'No tienes ninguna verificación iniciada.'})
