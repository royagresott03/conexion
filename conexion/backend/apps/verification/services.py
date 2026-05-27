"""
Verification service:
- Validates Colombian cedula format
- Uses OCR.space API (free) to extract text from document photo
- Uses DeepFace (local, no cost) for face comparison
- Falls back gracefully if APIs are unavailable
"""
import re
import os
import base64
import logging
import requests
from io import BytesIO

logger = logging.getLogger(__name__)

OCR_API_KEY = os.environ.get('OCR_API_KEY', 'K89999999')  # OCR.space free key


# ─── Cédula colombiana ────────────────────────────────────────────────────────

def validate_cedula_format(cedula: str) -> dict:
    """
    Validates Colombian cédula format.
    Rules:
    - Only digits
    - Between 6 and 10 digits
    - No leading zeros (except special cases)
    """
    cedula = cedula.strip().replace('.', '').replace(',', '').replace(' ', '')

    if not cedula.isdigit():
        return {
            'valid': False,
            'error': 'La cédula solo debe contener números.',
            'cedula': cedula,
        }

    if len(cedula) < 6 or len(cedula) > 10:
        return {
            'valid': False,
            'error': f'La cédula debe tener entre 6 y 10 dígitos. Tienes {len(cedula)}.',
            'cedula': cedula,
        }

    if cedula.startswith('0'):
        return {
            'valid': False,
            'error': 'La cédula no puede empezar con cero.',
            'cedula': cedula,
        }

    # Known invalid sequences
    invalid_sequences = ['1234567890', '0000000000', '1111111111', '9999999999']
    if cedula in invalid_sequences or len(set(cedula)) == 1:
        return {
            'valid': False,
            'error': 'Número de cédula no válido.',
            'cedula': cedula,
        }

    return {
        'valid': True,
        'cedula': cedula,
        'formatted': f'{int(cedula):,}'.replace(',', '.'),
    }


# ─── OCR — extraer texto del documento ───────────────────────────────────────

def extract_text_from_document(image_file) -> dict:
    """
    Uses OCR.space free API to extract text from a document image.
    Returns extracted text and detected cedula number.
    """
    try:
        # Read image and encode to base64
        image_file.seek(0)
        image_data = image_file.read()
        base64_image = base64.b64encode(image_data).decode('utf-8')

        # Detect content type
        content_type = getattr(image_file, 'content_type', 'image/jpeg')
        base64_string = f'data:{content_type};base64,{base64_image}'

        response = requests.post(
            'https://api.ocr.space/parse/image',
            data={
                'base64Image': base64_string,
                'language': 'spa',  # Spanish
                'isOverlayRequired': False,
                'detectOrientation': True,
                'scale': True,
                'OCREngine': 2,
            },
            headers={'apikey': OCR_API_KEY},
            timeout=30,
        )

        if response.status_code != 200:
            logger.warning(f'OCR API returned {response.status_code}')
            return {'success': False, 'error': 'Error al contactar servicio OCR.'}

        data = response.json()

        if data.get('IsErroredOnProcessing'):
            error_msg = data.get('ErrorMessage', ['Error desconocido'])[0]
            logger.warning(f'OCR error: {error_msg}')
            return {'success': False, 'error': error_msg}

        # Extract full text
        parsed_results = data.get('ParsedResults', [])
        if not parsed_results:
            return {'success': False, 'error': 'No se pudo extraer texto del documento.'}

        full_text = ' '.join([r.get('ParsedText', '') for r in parsed_results])
        full_text_clean = full_text.replace('\n', ' ').replace('\r', ' ')

        # Try to find cedula number in the extracted text
        cedula_patterns = [
            r'\b(\d{8,10})\b',          # 8-10 digit sequences
            r'C\.?C\.?\s*(\d{6,10})',    # CC followed by numbers
            r'No\.?\s*(\d{6,10})',       # No. followed by numbers
            r'NÚMERO\s+(\d{6,10})',      # NÚMERO followed by digits
        ]

        detected_cedula = ''
        for pattern in cedula_patterns:
            matches = re.findall(pattern, full_text_clean, re.IGNORECASE)
            if matches:
                # Take the longest match (most likely the cedula)
                detected_cedula = max(matches, key=len)
                break

        # Try to find name (usually after APELLIDOS or NOMBRES)
        name_patterns = [
            r'APELLIDOS\s+([A-ZÁÉÍÓÚÑ\s]+)\s+NOMBRES',
            r'NOMBRES\s+([A-ZÁÉÍÓÚÑ\s]+)\s+',
            r'NOMBRE\s*:?\s*([A-ZÁÉÍÓÚÑ\s]{5,50})',
        ]
        detected_name = ''
        for pattern in name_patterns:
            match = re.search(pattern, full_text_clean, re.IGNORECASE)
            if match:
                detected_name = match.group(1).strip()
                break

        return {
            'success': True,
            'full_text': full_text_clean,
            'detected_cedula': detected_cedula,
            'detected_name': detected_name,
            'raw_response': data,
        }

    except requests.Timeout:
        logger.error('OCR API timeout')
        return {'success': False, 'error': 'Tiempo de espera agotado. Intenta de nuevo.'}
    except Exception as e:
        logger.error(f'OCR error: {e}')
        return {'success': False, 'error': 'Error al procesar el documento.'}


# ─── Face comparison ─────────────────────────────────────────────────────────

def compare_faces(document_image_file, selfie_image_file) -> dict:
    """
    Compares the face in the document photo with the selfie.
    Uses DeepFace locally (no API cost).
    Falls back gracefully if DeepFace is not available.
    """
    try:
        from deepface import DeepFace
        import tempfile
        import numpy as np
        from PIL import Image

        # Save both images to temp files
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as doc_tmp:
            document_image_file.seek(0)
            doc_tmp.write(document_image_file.read())
            doc_path = doc_tmp.name

        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as selfie_tmp:
            selfie_image_file.seek(0)
            selfie_tmp.write(selfie_image_file.read())
            selfie_path = selfie_tmp.name

        try:
            result = DeepFace.verify(
                img1_path=doc_path,
                img2_path=selfie_path,
                model_name='VGG-Face',
                enforce_detection=False,
            )
            distance = result.get('distance', 1.0)
            verified = result.get('verified', False)
            # Convert distance to similarity score (0-100)
            similarity = max(0, min(100, (1 - distance) * 100))

            return {
                'success': True,
                'match': verified,
                'similarity_score': round(similarity, 2),
                'distance': distance,
            }
        finally:
            os.unlink(doc_path)
            os.unlink(selfie_path)

    except ImportError:
        logger.warning('DeepFace not installed — skipping face comparison')
        # Return neutral result — manual review will handle it
        return {
            'success': True,
            'match': None,
            'similarity_score': None,
            'note': 'Comparación facial no disponible — revisión manual requerida.',
        }
    except Exception as e:
        logger.error(f'Face comparison error: {e}')
        return {
            'success': False,
            'error': f'Error en comparación facial: {str(e)}',
        }


# ─── Main verification flow ───────────────────────────────────────────────────

def run_verification(verification_obj) -> dict:
    """
    Full verification pipeline:
    1. Validate cedula format
    2. OCR the document
    3. Cross-check cedula from form vs OCR
    4. Face comparison
    5. Return final verdict
    """
    results = {
        'cedula_format_valid': False,
        'ocr_success': False,
        'cedula_match': False,
        'face_match': None,
        'face_score': None,
        'status': 'rejected',
        'rejection_reason': '',
    }

    # Step 1 — Validate cedula format
    cedula_result = validate_cedula_format(verification_obj.cedula_number)
    results['cedula_format_valid'] = cedula_result['valid']
    if not cedula_result['valid']:
        results['rejection_reason'] = cedula_result['error']
        return results

    # Step 2 — OCR document
    if verification_obj.cedula_front:
        verification_obj.cedula_front.seek(0)
        ocr_result = extract_text_from_document(verification_obj.cedula_front)
        results['ocr_success'] = ocr_result.get('success', False)
        results['ocr_data'] = ocr_result

        if ocr_result.get('success'):
            extracted_cedula = ocr_result.get('detected_cedula', '')
            extracted_name = ocr_result.get('detected_name', '')

            # Step 3 — Cross-check cedula
            entered = verification_obj.cedula_number.strip()
            if extracted_cedula and extracted_cedula == entered:
                results['cedula_match'] = True
            elif not extracted_cedula:
                # OCR couldn't find cedula number — not a hard failure
                results['cedula_match'] = None  # inconclusive
            else:
                results['cedula_match'] = False
                results['rejection_reason'] = (
                    f'El número de cédula ingresado ({entered}) no coincide '
                    f'con el del documento ({extracted_cedula}).'
                )
                return results

            results['extracted_name'] = extracted_name

    # Step 4 — Face comparison
    if verification_obj.cedula_front and verification_obj.selfie:
        verification_obj.cedula_front.seek(0)
        verification_obj.selfie.seek(0)
        face_result = compare_faces(verification_obj.cedula_front, verification_obj.selfie)
        results['face_match'] = face_result.get('match')
        results['face_score'] = face_result.get('similarity_score')

        if face_result.get('success') and face_result.get('match') is False:
            score = face_result.get('similarity_score', 0)
            if score is not None and score < 40:
                results['rejection_reason'] = (
                    f'La selfie no coincide con la foto del documento '
                    f'(similitud: {score:.0f}%).'
                )
                return results

    # Step 5 — Final verdict
    cedula_ok = results['cedula_format_valid']
    cedula_match = results.get('cedula_match')  # True, False, or None (inconclusive)
    face_ok = results.get('face_match')  # True, False, or None

    if cedula_ok and cedula_match is not False and face_ok is not False:
        results['status'] = 'verified'
    elif cedula_ok and cedula_match is None:
        # OCR couldn't confirm — send to manual review
        results['status'] = 'manual_review'
        results['rejection_reason'] = 'Verificación incompleta — en revisión manual.'
    else:
        results['status'] = 'rejected'
        if not results['rejection_reason']:
            results['rejection_reason'] = 'No se pudo verificar la identidad.'

    return results
