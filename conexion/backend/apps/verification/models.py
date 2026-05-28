import uuid
import os
from django.db import models
from django.utils import timezone


def document_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('verification', str(instance.user.id), f'document_{uuid.uuid4()}.{ext}')


def selfie_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return os.path.join('verification', str(instance.user.id), f'selfie_{uuid.uuid4()}.{ext}')


class IdentityVerification(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pendiente'),
        ('processing', 'Procesando'),
        ('verified', 'Verificado'),
        ('rejected', 'Rechazado'),
        ('manual_review', 'Revisión manual'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        'users.User', on_delete=models.CASCADE, related_name='verification'
    )


    cedula_number = models.CharField(max_length=20, blank=True)
    cedula_front = models.ImageField(upload_to=document_upload_path, null=True, blank=True)
    selfie = models.ImageField(upload_to=selfie_upload_path, null=True, blank=True)


    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    ocr_raw = models.JSONField(default=dict, blank=True)
    ocr_cedula_extracted = models.CharField(max_length=20, blank=True)
    ocr_name_extracted = models.CharField(max_length=200, blank=True)
    face_match_score = models.FloatField(null=True, blank=True)
    cedula_valid_format = models.BooleanField(null=True, blank=True)


    rejection_reason = models.TextField(blank=True)


    submitted_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verification_identity'
        verbose_name = 'Verificación de identidad'
        verbose_name_plural = 'Verificaciones de identidad'

    def __str__(self):
        return f'{self.user.email} — {self.status}'
