from django.contrib import admin
from django.utils.html import format_html
from .models import IdentityVerification


@admin.register(IdentityVerification)
class IdentityVerificationAdmin(admin.ModelAdmin):
    list_display = [
        'user', 'cedula_number', 'status_colored',
        'face_match_score', 'cedula_valid_format',
        'submitted_at', 'verified_at'
    ]
    list_filter = ['status', 'cedula_valid_format']
    search_fields = ['user__email', 'cedula_number', 'ocr_name_extracted']
    readonly_fields = [
        'ocr_raw', 'ocr_cedula_extracted', 'ocr_name_extracted',
        'face_match_score', 'cedula_valid_format',
        'submitted_at', 'verified_at', 'created_at', 'updated_at',
        'document_preview', 'selfie_preview',
    ]
    actions = ['approve_verification', 'reject_verification']

    fieldsets = (
        ('Usuario', {'fields': ('user', 'cedula_number')}),
        ('Documentos', {'fields': ('document_preview', 'cedula_front', 'selfie_preview', 'selfie')}),
        ('Resultados', {'fields': (
            'status', 'cedula_valid_format', 'face_match_score',
            'ocr_cedula_extracted', 'ocr_name_extracted', 'rejection_reason',
        )}),
        ('Datos OCR', {'fields': ('ocr_raw',), 'classes': ('collapse',)}),
        ('Fechas', {'fields': ('submitted_at', 'verified_at', 'created_at', 'updated_at')}),
    )

    def status_colored(self, obj):
        colors = {
            'verified': '#00c864',
            'rejected': '#FF4D6D',
            'processing': '#FFBA08',
            'pending': '#888',
            'manual_review': '#C77DFF',
        }
        color = colors.get(obj.status, '#888')
        return format_html(
            '<span style="color:{}; font-weight:bold;">● {}</span>',
            color, obj.get_status_display()
        )
    status_colored.short_description = 'Estado'

    def document_preview(self, obj):
        if obj.cedula_front:
            return format_html(
                '<img src="{}" style="max-height:200px; border-radius:8px;" />',
                obj.cedula_front.url
            )
        return '—'
    document_preview.short_description = 'Vista previa documento'

    def selfie_preview(self, obj):
        if obj.selfie:
            return format_html(
                '<img src="{}" style="max-height:200px; border-radius:8px;" />',
                obj.selfie.url
            )
        return '—'
    selfie_preview.short_description = 'Vista previa selfie'

    def approve_verification(self, request, queryset):
        from django.utils import timezone
        for verification in queryset:
            verification.status = 'verified'
            verification.verified_at = timezone.now()
            verification.rejection_reason = ''
            verification.save()
            verification.user.is_verified = True
            verification.user.save(update_fields=['is_verified'])
        self.message_user(request, f'{queryset.count()} verificaciones aprobadas.')
    approve_verification.short_description = '✅ Aprobar verificaciones seleccionadas'

    def reject_verification(self, request, queryset):
        queryset.update(status='rejected', rejection_reason='Rechazado manualmente por el administrador.')
        self.message_user(request, f'{queryset.count()} verificaciones rechazadas.')
    reject_verification.short_description = '❌ Rechazar verificaciones seleccionadas'
