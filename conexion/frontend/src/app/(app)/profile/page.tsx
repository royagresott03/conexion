'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';

interface Interest { id: number; name: string; emoji: string; category: string; }

export default function ProfilePage() {
  const { user, updateProfile, logout } = useAuthStore();
  const router = useRouter();
  const profile = user?.profile;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  const [form, setForm] = useState({
    first_name: profile?.first_name || '',
    bio: profile?.bio || '',
    occupation: profile?.occupation || '',
    city: profile?.city || '',
    looking_for: (profile as Record<string, unknown>)?.looking_for as string || 'any',
    min_age_preference: (profile as Record<string, unknown>)?.min_age_preference as number || 18,
    max_age_preference: (profile as Record<string, unknown>)?.max_age_preference as number || 45,
    interest_ids: profile?.interests?.map(i => i.id) || [],
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    profileApi.getInterests().then(res => setAllInterests(res.data));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await profileApi.updateProfile(form as Record<string, unknown>);
      updateProfile(res.data);
      toast.success('Perfil actualizado ✓');
      setEditing(false);
    } catch {
      toast.error('Error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (slot: string, file: File) => {
    setUploadingSlot(slot);
    try {
      const res = await profileApi.uploadPhoto(slot, file);
      updateProfile({ photos: [...(profile?.photos || []).filter(p => p.index !== Number(slot)), { index: Number(slot), url: res.data.url }] });
      toast.success('Foto subida ✓');
    } catch {
      toast.error('Error al subir la foto.');
    } finally {
      setUploadingSlot(null);
    }
  };

  const toggleInterest = (id: number) => {
    setForm(f => ({
      ...f,
      interest_ids: f.interest_ids.includes(id)
        ? f.interest_ids.filter(i => i !== id)
        : [...f.interest_ids, id],
    }));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const photos = profile?.photos || [];
  const byCategory = allInterests.reduce<Record<string, Interest[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-8">
      {/* Hero */}
      <div className="text-center mb-6 p-6 rounded-2xl"
        style={{ background: 'linear-gradient(180deg,rgba(255,77,109,0.08),transparent)' }}>
        <div className="relative w-24 h-24 rounded-full mx-auto mb-3 flex items-center justify-center text-5xl"
          style={{ background: 'linear-gradient(135deg,var(--rose),var(--plum))', border: '3px solid var(--rose)' }}>
          {profile?.main_photo_url
            ? <Image src={profile.main_photo_url} alt="" fill className="object-cover rounded-full" />
            : '🧑'}
        </div>
        <h1 className="font-display text-2xl font-bold">{profile?.first_name || user?.email?.split('@')[0]}</h1>
        {profile?.city && <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>📍 {profile.city}</p>}
        {user?.is_verified && (
          <div className="inline-flex items-center gap-1.5 verified-badge mt-2">✓ Identidad verificada</div>
        )}
        {!editing && (
          <button onClick={() => setEditing(true)}
            className="btn-primary mt-4 px-6 py-2 rounded-full text-sm block mx-auto">
            Editar perfil
          </button>
        )}
      </div>

      {/* Photos */}
      <div className="glass-card p-5 mb-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
          Mis fotos
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map(slot => {
            const photo = photos.find(p => p.index === slot);
            return (
              <div key={slot}
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
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-sm">
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

      {/* Info form or display */}
      {editing ? (
        <div className="glass-card p-5 mb-4 space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
            Editar información
          </h3>

          {[
            { label: 'Nombre', key: 'first_name', type: 'text', placeholder: 'Tu nombre' },
            { label: 'Ciudad', key: 'city', type: 'text', placeholder: 'Tu ciudad' },
            { label: 'Ocupación', key: 'occupation', type: 'text', placeholder: 'Tu profesión' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>{label}</label>
              <input
                type={type}
                value={form[key as keyof typeof form] as string}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                className="input-dark rounded-xl px-4 py-2.5 text-sm"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Sobre mí</label>
            <textarea
              value={form.bio}
              onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Cuéntale a otros quién eres..."
              rows={3}
              maxLength={500}
              className="input-dark rounded-xl px-4 py-2.5 text-sm resize-none w-full"
            />
            <p className="text-xs mt-1 text-right" style={{ color: 'var(--text-muted)' }}>{form.bio.length}/500</p>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>Busco</label>
            <select
              value={form.looking_for}
              onChange={e => setForm(f => ({ ...f, looking_for: e.target.value }))}
              className="input-dark rounded-xl px-4 py-2.5 text-sm"
              style={{ background: 'var(--glass)' }}>
              <option value="serious" style={{ background: '#1A1A2E' }}>Algo serio</option>
              <option value="casual" style={{ background: '#1A1A2E' }}>Citas casuales</option>
              <option value="friends" style={{ background: '#1A1A2E' }}>Amistades</option>
              <option value="any" style={{ background: '#1A1A2E' }}>Cualquier cosa</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              Rango de edad preferido: {form.min_age_preference} – {form.max_age_preference} años
            </label>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Mín</label>
                <input type="range" min={18} max={60}
                  value={form.min_age_preference}
                  onChange={e => setForm(f => ({ ...f, min_age_preference: Number(e.target.value) }))}
                  className="w-full accent-rose-500" />
              </div>
              <div className="flex-1">
                <label className="text-xs mb-1 block" style={{ color: 'var(--text-muted)' }}>Máx</label>
                <input type="range" min={18} max={80}
                  value={form.max_age_preference}
                  onChange={e => setForm(f => ({ ...f, max_age_preference: Number(e.target.value) }))}
                  className="w-full accent-rose-500" />
              </div>
            </div>
          </div>

          {/* Interests selector */}
          <div>
            <label className="block text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>
              Mis intereses ({form.interest_ids.length} seleccionados)
            </label>
            {Object.entries(byCategory).map(([cat, interests]) => (
              <div key={cat} className="mb-3">
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>{cat}</p>
                <div className="flex flex-wrap gap-2">
                  {interests.map(i => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => toggleInterest(i.id)}
                      className="px-3 py-1 rounded-full text-xs font-medium transition-all"
                      style={{
                        background: form.interest_ids.includes(i.id)
                          ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                          : 'var(--glass)',
                        border: `1px solid ${form.interest_ids.includes(i.id) ? 'transparent' : 'var(--glass-border)'}`,
                        color: form.interest_ids.includes(i.id) ? '#fff' : 'var(--text-muted)',
                      }}>
                      {i.emoji} {i.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditing(false)}
              className="btn-ghost flex-1 py-2.5 rounded-xl text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving}
              className="btn-primary flex-1 py-2.5 rounded-xl text-sm">
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </div>
      ) : (
        <div className="glass-card p-5 mb-4 space-y-4">
          {profile?.bio && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Sobre mí
              </h3>
              <p className="text-sm leading-relaxed">{profile.bio}</p>
            </div>
          )}

          {profile?.interests && profile.interests.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Intereses
              </h3>
              <div className="flex flex-wrap gap-2">
                {profile.interests.map(i => (
                  <span key={i.id} className="tag-pill">{i.emoji} {i.name}</span>
                ))}
              </div>
            </div>
          )}

          {[
            { label: 'Email', value: user?.email },
            { label: 'Ocupación', value: profile?.occupation },
            { label: 'Ciudad', value: profile?.city },
          ].filter(f => f.value).map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-2"
              style={{ borderBottom: '1px solid var(--glass-border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Verify identity button if not verified */}
      {!user?.is_verified && (
        <Link href="/auth/verify"
          className="w-full py-3 rounded-xl text-sm font-semibold text-center block mb-3 transition"
          style={{ background: 'linear-gradient(135deg,var(--rose),var(--plum))', color: '#fff' }}>
          🛡️ Verificar mi identidad
        </Link>
      )}

      {/* Logout */}
      <button onClick={handleLogout}
        className="w-full py-3 rounded-xl text-sm font-medium transition"
        style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.2)', color: 'var(--rose)' }}>
        Cerrar sesión
      </button>
    </div>
  );
}
