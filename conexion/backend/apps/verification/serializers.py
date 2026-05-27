from rest_framework import serializers
from .models import IdentityVerification
from .services import validate_cedula_format


class SubmitVerificationSerializer(serializers.Serializer):
    cedula_number = serializers.CharField(max_length=20)
    cedula_front = serializers.ImageField()
    selfie = serializers.ImageField()

    def validate_cedula_number(self, value):
        result = validate_cedula_format(value)
        if not result['valid']:
            raise serializers.ValidationError(result['error'])
        return result['cedula']

    def validate_cedula_front(self, value):
        allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if hasattr(value, 'content_type') and value.content_type not in allowed:
            raise serializers.ValidationError('Solo se permiten imágenes JPG, PNG o WebP.')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('La imagen no puede superar 10MB.')
        return value

    def validate_selfie(self, value):
        allowed = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
        if hasattr(value, 'content_type') and value.content_type not in allowed:
            raise serializers.ValidationError('Solo se permiten imágenes JPG, PNG o WebP.')
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError('La selfie no puede superar 10MB.')
        return value


class VerificationStatusSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = IdentityVerification
        fields = [
            'id', 'status', 'status_display',
            'cedula_number', 'ocr_name_extracted',
            'face_match_score', 'cedula_valid_format',
            'rejection_reason', 'submitted_at', 'verified_at',
        ]
        read_only_fields = fields


class ValidateCedulaSerializer(serializers.Serializer):
    cedula_number = serializers.CharField(max_length=20)
