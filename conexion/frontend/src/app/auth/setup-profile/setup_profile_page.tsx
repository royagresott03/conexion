'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function SetupProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuthStore();
  const profile = user?.profile;

  const [saving, setSaving] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [form, setForm] = useState({
    bio: profile?.bio || '',
    occupation: profile?.occupation || '',
    city: profile?.city || '',
    looking_for: 'any',
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const photos = profile?.photos || [];

  const handlePhotoUpload = async (slot: string, file: File) => {
    setUploadingSlot(slot);
    try {
      const res = await profileApi.uploadPhoto(slot, file);
      updateProfile({
        photos: [
          ...(profile?.photos || []).filter(p => p.index !== Number(slot)),
          { index: Number(slot), url: res.data.url }
        ]
      });
      toast.success('Foto subida ✓');
    } catch {
      toast.error('Error al subir la foto.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const handleSave = async () => {
    if (!form.bio.trim()) {
      toast.error('Escribe algo sobre ti para continuar.');
      return;
    }
    if (photos.length === 0) {
      toast.error('Sube al menos una foto para continuar.');
      return;
    }
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form as Record<string, unknown>);
      updateProfile(res.data);
      toast.success('Perfil guardado ✓');
      router.push('/auth/interests');
    } catch {
      toast.error('Error al guardar el perfil.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🧑‍💼</div>
          <h1 className="font-display text-3xl font-bold gradient-text-rose">Configura tu perfil</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Cuéntanos sobre ti y sube tus fotos
          </p>
        </div>

        {/* Progress indicator — paso 3 de 4 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Cuenta', 'Verificación', 'Perfil', 'Intereses'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i < 2
                      ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                      : i === 2
                        ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                        : 'var(--glass)',
                    border: i >= 3 ? '1px solid var(--glass-border)' : 'none',
                    color: i <= 2 ? '#fff' : 'var(--text-muted)',
                  }}>
                  {i < 2 ? '✓' : i + 1}
                </div>
                <span className="text-xs mt-1" style={{ color: i === 2 ? 'var(--rose-light)' : 'var(--text-muted)' }}>
                  {label}
                </span>
              </div>
              {i < 3 && (
                <div className="w-6 h-0.5 mb-4"
                  style={{ background: i < 2 ? 'linear-gradient(90deg,var(--rose),var(--plum))' : 'var(--glass-border)' }} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-6 space-y-6">

          {/* Fotos */}
          <div>
            <h3 className="text-sm font-semibold mb-1">Tus fotos <span style={{ color: 'var(--rose)' }}>*</span></h3>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
              Sube al menos 1 foto · Puedes agregar hasta 6
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3, 4, 5, 6].map(slot => {
                const photo = photos.find(p => p.index === slot);
                return (
                  <div
                    key={slot}
                    className="aspect-square rounded-xl overflow-hidden relative flex items-center justify-center text-2xl cursor-pointer group"
                    style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}
                    onClick={() => fileInputRefs.current[slot]?.click()}>
                    {photo
                      ? <Image src={photo.url} alt="" fill className="object-cover" />
                      : <span style={{ color: 'var(--text-muted)' }}>+</span>}
                    {uploadingSlot === String(slot) && (
                      <div className="absolute inset-0 flex items-center justify-center text-sm"
                        style={{ background: 'rgba(0,0,0,0.6)' }}>⏳</div>
                    )}
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs">
                      {photo ? 'Cambiar' : 'Agregar'}
                    </div>
                    <input
                      ref={el => { fileInputRefs.current[slot] = el; }}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(String(slot), file);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-semibold mb-1">
              Sobre ti <span style={{ color: 'var(--rose)' }}>*</span>
            </label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Cuéntale a otros quién eres, qué te apasiona..."
              rows={3}
              maxLength={500}
              className="input-dark rounded-xl px-4 py-2.5 text-sm resize-none w-full"
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>
              {form.bio.length}/500
            </p>
          </div>

          {/* Ciudad y ocupación */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Ciudad</label>
              <input
                type="text"
                value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                placeholder="Tu ciudad"
                className="input-dark rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Ocupación</label>
              <input
                type="text"
                value={form.occupation}
                onChange={e => setForm(f => ({ ...f, occupation: e.target.value }))}
                placeholder="Tu profesión"
                className="input-dark rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          </div>

          {/* Busco */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Busco</label>
            <select
              value={form.looking_for}
              onChange={e => setForm(f => ({ ...f, looking_for: e.target.value }))}
              className="input-dark rounded-xl px-4 py-2.5 text-sm w-full"
              style={{ background: 'var(--glass)' }}>
              <option value="serious" style={{ background: '#1A1A2E' }}>Algo serio</option>
              <option value="casual" style={{ background: '#1A1A2E' }}>Citas casuales</option>
              <option value="friends" style={{ background: '#1A1A2E' }}>Amistades</option>
              <option value="any" style={{ background: '#1A1A2E' }}>Cualquier cosa</option>
            </select>
          </div>

          {/* Botón */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
            {saving ? 'Guardando...' : 'Continuar → Mis intereses 🎯'}
          </button>

          <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
            * Campos obligatorios para continuar
          </p>
        </div>
      </div>
    </div>
  );
}
