'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type Step = 'cedula' | 'document' | 'selfie' | 'processing' | 'result';
type ResultStatus = 'verified' | 'rejected' | 'manual_review' | null;

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('cedula');
  const [cedula, setCedula] = useState('');
  const [cedulaError, setCedulaError] = useState('');
  const [cedulaValid, setCedulaValid] = useState(false);
  const [validating, setValidating] = useState(false);
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [documentPreview, setDocumentPreview] = useState('');
  const [selfiePreview, setSelfiePreview] = useState('');
  const [resultStatus, setResultStatus] = useState<ResultStatus>(null);
  const [resultData, setResultData] = useState<Record<string, unknown>>({});
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Validate cedula format in real time
  const validateCedula = useCallback(async (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    setCedula(cleaned);
    if (cleaned.length < 6) {
      setCedulaError('');
      setCedulaValid(false);
      return;
    }
    setValidating(true);
    try {
      const res = await api.post('/validate-cedula/', { cedula_number: cleaned });
      if (res.data.valid) {
        setCedulaValid(true);
        setCedulaError('');
      } else {
        setCedulaValid(false);
        setCedulaError(res.data.error);
      }
    } catch {
      setCedulaValid(false);
    } finally {
      setValidating(false);
    }
  }, []);

  // Handle document photo upload
  const handleDocumentFile = (file: File) => {
    setDocumentFile(file);
    const url = URL.createObjectURL(file);
    setDocumentPreview(url);
  };

  // Open camera for selfie
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      setCameraStream(stream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      toast.error('No se pudo acceder a la cámara. Sube una foto manualmente.');
    }
  };

  const stopCamera = () => {
    cameraStream?.getTracks().forEach(t => t.stop());
    setCameraStream(null);
    setCameraActive(false);
  };

  const takeSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        setSelfieFile(file);
        setSelfiePreview(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  };

  // Submit everything
  const submitVerification = async () => {
    if (!documentFile || !selfieFile) {
      toast.error('Necesitas subir el documento y la selfie.');
      return;
    }
    setStep('processing');
    try {
      const form = new FormData();
      form.append('cedula_number', cedula);
      form.append('cedula_front', documentFile);
      form.append('selfie', selfieFile);

      const res = await api.post('/verify/', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000,
      });

      setResultStatus(res.data.status);
      setResultData(res.data);
      setStep('result');
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, unknown> } };
      const msg = error.response?.data?.detail || 'Error al enviar la verificación.';
      toast.error(String(msg));
      setStep('selfie');
    }
  };

  const progressSteps = ['cedula', 'document', 'selfie'];
  const currentProgress = progressSteps.indexOf(step as string);

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🛡️</div>
          <h1 className="font-display text-3xl font-bold gradient-text-rose">Verificación de identidad</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Paso obligatorio • Solo toma 2 minutos • Tus datos están seguros y encriptados
          </p>
        </div>

        {/* Progress bar */}
        {!['processing', 'result'].includes(step) && (
          <div className="flex gap-2 mb-8">
            {progressSteps.map((s, i) => (
              <div key={s} className="flex-1 h-1.5 rounded-full transition-all"
                style={{
                  background: i <= currentProgress
                    ? 'linear-gradient(90deg,var(--rose),var(--plum))'
                    : 'var(--glass-border)'
                }} />
            ))}
          </div>
        )}

        <div className="glass-card p-8">

          {/* STEP 1 — Cédula */}
          {step === 'cedula' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold mb-1">Número de cédula</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Ingresa tu número de cédula de ciudadanía colombiana
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Número de cédula</label>
                <div className="relative">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cedula}
                    onChange={e => validateCedula(e.target.value)}
                    placeholder="Ej: 1234567890"
                    maxLength={10}
                    className="input-dark rounded-xl px-4 py-3 text-lg tracking-widest pr-12"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xl">
                    {validating ? '⏳' : cedulaValid ? '✅' : cedula.length >= 6 ? '❌' : ''}
                  </div>
                </div>

                {cedulaError && (
                  <p className="text-sm mt-2 flex items-center gap-1" style={{ color: 'var(--rose)' }}>
                    ⚠️ {cedulaError}
                  </p>
                )}
                {cedulaValid && (
                  <p className="text-sm mt-2 flex items-center gap-1" style={{ color: '#00c864' }}>
                    ✓ Formato válido
                  </p>
                )}
              </div>

              {/* Info box */}
              <div className="p-4 rounded-xl text-sm space-y-2"
                style={{ background: 'rgba(199,125,255,0.08)', border: '1px solid rgba(199,125,255,0.2)' }}>
                <p className="font-semibold" style={{ color: 'var(--plum-light)' }}>🔒 ¿Por qué pedimos esto?</p>
                <p style={{ color: 'var(--text-muted)' }}>
                  Verificamos tu identidad para garantizar que todos los usuarios de Conexión
                  son personas reales. Tus datos son encriptados y nunca se comparten con terceros.
                </p>
              </div>

              {/* Obligatorio: NO hay botón de omitir */}
              <button
                onClick={() => setStep('document')}
                disabled={!cedulaValid}
                className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                Continuar →
              </button>

              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                La verificación es obligatoria para usar Conexión
              </p>
            </div>
          )}

          {/* STEP 2 — Document photo */}
          {step === 'document' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold mb-1">Foto del documento</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Toma una foto clara de la parte frontal de tu cédula
                </p>
              </div>

              {/* Tips */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: '💡', tip: 'Buena iluminación' },
                  { icon: '📐', tip: 'Documento centrado' },
                  { icon: '🔍', tip: 'Texto legible' },
                  { icon: '🚫', tip: 'Sin reflejos' },
                ].map(({ icon, tip }) => (
                  <div key={tip} className="flex items-center gap-2 text-sm p-2 rounded-lg"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                    <span>{icon}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{tip}</span>
                  </div>
                ))}
              </div>

              {/* Upload area */}
              {documentPreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={documentPreview} alt="Documento" className="w-full rounded-xl object-cover max-h-52" />
                  <button
                    onClick={() => { setDocumentFile(null); setDocumentPreview(''); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(255,77,109,0.9)', color: '#fff' }}>
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(0,200,100,0.9)', color: '#fff' }}>
                    ✓ Documento cargado
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => docInputRef.current?.click()}
                  className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all hover:border-rose-400"
                  style={{ borderColor: 'var(--glass-border)' }}>
                  <div className="text-4xl mb-3">📄</div>
                  <p className="font-medium mb-1">Sube la foto de tu cédula</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>JPG, PNG o WebP • Máx 10MB</p>
                  <input
                    ref={docInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleDocumentFile(file);
                    }}
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('cedula')}
                  className="btn-ghost flex-1 py-3 rounded-xl text-sm">← Atrás</button>
                <button
                  onClick={() => setStep('selfie')}
                  disabled={!documentFile}
                  className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                  Continuar →
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Selfie */}
          {step === 'selfie' && (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h2 className="font-display text-xl font-bold mb-1">Selfie de verificación</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Tómate una selfie para comparar con tu documento
                </p>
              </div>

              {/* Camera or preview */}
              {selfiePreview ? (
                <div className="relative rounded-xl overflow-hidden">
                  <img src={selfiePreview} alt="Selfie" className="w-full rounded-xl object-cover max-h-64" />
                  <button
                    onClick={() => { setSelfieFile(null); setSelfiePreview(''); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{ background: 'rgba(255,77,109,0.9)', color: '#fff' }}>
                    ✕
                  </button>
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold"
                    style={{ background: 'rgba(0,200,100,0.9)', color: '#fff' }}>
                    ✓ Selfie lista
                  </div>
                </div>
              ) : cameraActive ? (
                <div className="relative rounded-xl overflow-hidden">
                  <video ref={videoRef} className="w-full rounded-xl" autoPlay muted playsInline />
                  {/* Oval guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-40 h-52 rounded-full border-4 border-dashed border-white/60" />
                  </div>
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
                    <button onClick={stopCamera}
                      className="px-4 py-2 rounded-full text-sm"
                      style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      Cancelar
                    </button>
                    <button onClick={takeSelfie}
                      className="w-14 h-14 rounded-full border-4 border-white flex items-center justify-center"
                      style={{ background: 'rgba(255,77,109,0.9)' }}>
                      📸
                    </button>
                  </div>
                  <canvas ref={canvasRef} className="hidden" />
                </div>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={startCamera}
                    className="w-full py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold transition"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                    <span className="text-2xl">📷</span>
                    Usar la cámara
                  </button>
                  <div className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>o</div>
                  <label className="w-full py-4 rounded-xl flex items-center justify-center gap-3 text-sm font-semibold cursor-pointer transition"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                    <span className="text-2xl">🖼️</span>
                    Subir foto existente
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelfieFile(file);
                          setSelfiePreview(URL.createObjectURL(file));
                        }
                      }} />
                  </label>
                </div>
              )}

              <div className="p-3 rounded-xl text-xs"
                style={{ background: 'rgba(255,186,8,0.08)', border: '1px solid rgba(255,186,8,0.2)', color: 'var(--gold)' }}>
                💡 Asegúrate de estar en un lugar bien iluminado y mirar directamente a la cámara
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('document')}
                  className="btn-ghost flex-1 py-3 rounded-xl text-sm">← Atrás</button>
                <button
                  onClick={submitVerification}
                  disabled={!selfieFile}
                  className="btn-primary flex-1 py-3 rounded-xl text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
                  Verificar identidad 🛡️
                </button>
              </div>
            </div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <div className="text-center py-8 space-y-4 animate-fade-in">
              <div className="text-5xl animate-pulse">🔍</div>
              <h2 className="font-display text-xl font-bold">Verificando tu identidad</h2>
              <p style={{ color: 'var(--text-muted)' }}>Esto puede tardar hasta 30 segundos...</p>
              <div className="space-y-2 text-sm text-left max-w-xs mx-auto mt-4">
                {[
                  '✓ Validando formato de cédula',
                  '⏳ Leyendo datos del documento (OCR)',
                  '⏳ Comparando selfie con documento',
                  '⏳ Verificando autenticidad',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg"
                    style={{ background: 'var(--glass)', color: item.startsWith('✓') ? '#00c864' : 'var(--text-muted)' }}>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* RESULT */}
          {step === 'result' && (
            <div className="text-center py-6 space-y-5 animate-fade-in">
              {resultStatus === 'verified' && (
                <>
                  <div className="text-6xl">🎉</div>
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-2" style={{ color: '#00c864' }}>
                      ¡Identidad verificada!
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                      Ya tienes el badge ✓ en tu perfil. Ahora cuéntanos qué te gusta.
                    </p>
                  </div>
                  {resultData.name_detected && (
                    <div className="p-3 rounded-xl text-sm"
                      style={{ background: 'rgba(0,200,100,0.1)', border: '1px solid rgba(0,200,100,0.3)', color: '#00c864' }}>
                      Nombre detectado: <strong>{String(resultData.name_detected)}</strong>
                    </div>
                  )}
                  {resultData.face_score && (
                    <div className="p-3 rounded-xl text-sm"
                      style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
                      Similitud facial: <strong>{Number(resultData.face_score).toFixed(0)}%</strong>
                    </div>
                  )}
                  {/* Redirige a selección de intereses, no a /discover */}
                  <button onClick={() => router.push('/auth/setup-profile')}
                    className="btn-primary w-full py-3 rounded-xl font-semibold">
                    Continuar → Mis intereses 🎯
                  </button>
                </>
              )}

              {resultStatus === 'rejected' && (
                <>
                  <div className="text-6xl">❌</div>
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--rose)' }}>
                      No pudimos verificarte
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {String(resultData.reason) || 'Por favor revisa tus documentos e intenta de nuevo.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setStep('cedula'); setResultStatus(null); }}
                      className="btn-primary w-full py-3 rounded-xl font-semibold">
                      Intentar de nuevo
                    </button>
                    {/* Sin opción de "continuar sin verificar" */}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      La verificación es requerida para acceder a Conexión
                    </p>
                  </div>
                </>
              )}

              {resultStatus === 'manual_review' && (
                <>
                  <div className="text-6xl">⏳</div>
                  <div>
                    <h2 className="font-display text-2xl font-bold mb-2" style={{ color: 'var(--gold)' }}>
                      En revisión manual
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      Nuestro equipo revisará tu verificación en las próximas 24 horas.
                      Te notificaremos por email cuando esté lista.
                    </p>
                  </div>
                  {/* En revisión puede continuar a seleccionar intereses mientras espera */}
                  <button onClick={() => router.push('/auth/setup-profile')}
                    className="btn-primary w-full py-3 rounded-xl font-semibold">
                    Continuar → Mis intereses 🎯
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
