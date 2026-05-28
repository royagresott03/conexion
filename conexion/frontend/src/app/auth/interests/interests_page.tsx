'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { profileApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

interface Interest {
  id: number;
  name: string;
  emoji: string;
  category: string;
}

export default function InterestsPage() {
  const router = useRouter();
  const { updateProfile } = useAuthStore();
  const [allInterests, setAllInterests] = useState<Interest[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    profileApi.getInterests()
      .then(res => setAllInterests(res.data))
      .catch(() => toast.error('No se pudieron cargar los intereses.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterest = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (selectedIds.length < 3) {
      toast.error('Selecciona al menos 3 intereses para continuar.');
      return;
    }
    setSaving(true);
    try {
      const res = await profileApi.updateProfile({ interest_ids: selectedIds });
      updateProfile(res.data);
      toast.success('¡Perfecto! Ya podemos encontrar tu match 🔥');
      router.push('/discover');
    } catch {
      toast.error('Error al guardar tus intereses. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const byCategory = allInterests.reduce<Record<string, Interest[]>>((acc, i) => {
    if (!acc[i.category]) acc[i.category] = [];
    acc[i.category].push(i);
    return acc;
  }, {});

  return (
    <div className="min-h-screen hero-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🎯</div>
          <h1 className="font-display text-3xl font-bold gradient-text-rose">Tus intereses</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
            Selecciona al menos 3 • Así encontramos tu match perfecto
          </p>
        </div>

        {/* Progress: paso 3 de 3 */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {['Cuenta', 'Verificación', 'Intereses'].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: i < 2
                      ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                      : 'linear-gradient(135deg,var(--rose),var(--plum))',
                    color: '#fff',
                  }}>
                  {i < 2 ? '✓' : '3'}
                </div>
                <span className="text-xs mt-1" style={{ color: i === 2 ? 'var(--rose-light)' : 'var(--text-muted)' }}>
                  {label}
                </span>
              </div>
              {i < 2 && (
                <div className="w-8 h-0.5 mb-4" style={{ background: 'linear-gradient(90deg,var(--rose),var(--plum))' }} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-6">

          {/* Counter */}
          <div className="flex items-center justify-between mb-5">
            <span className="text-sm font-medium">
              {selectedIds.length === 0
                ? 'Ninguno seleccionado'
                : `${selectedIds.length} seleccionado${selectedIds.length > 1 ? 's' : ''}`}
            </span>
            {selectedIds.length > 0 && (
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs"
                style={{ color: 'var(--rose)' }}>
                Limpiar todo
              </button>
            )}
          </div>

          {/* Minimum indicator */}
          <div className="flex gap-1 mb-6">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-1 flex-1 rounded-full transition-all"
                style={{
                  background: selectedIds.length >= n
                    ? 'linear-gradient(90deg,var(--rose),var(--plum))'
                    : 'var(--glass-border)'
                }} />
            ))}
            <span className="text-xs ml-2 self-center" style={{ color: 'var(--text-muted)' }}>
              mín. 3
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-3xl animate-pulse">✨</div>
              <p style={{ color: 'var(--text-muted)' }}>Cargando intereses...</p>
            </div>
          ) : (
            <div className="space-y-5 max-h-96 overflow-y-auto pr-1">
              {Object.entries(byCategory).map(([category, interests]) => (
                <div key={category}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--text-muted)' }}>
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {interests.map(interest => {
                      const selected = selectedIds.includes(interest.id);
                      return (
                        <button
                          key={interest.id}
                          type="button"
                          onClick={() => toggleInterest(interest.id)}
                          className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
                          style={{
                            background: selected
                              ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                              : 'var(--glass)',
                            border: `1px solid ${selected ? 'transparent' : 'var(--glass-border)'}`,
                            color: selected ? '#fff' : 'var(--text-muted)',
                            transform: selected ? 'scale(1.05)' : 'scale(1)',
                          }}>
                          {interest.emoji} {interest.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-6 space-y-3">
            <button
              onClick={handleSave}
              disabled={saving || selectedIds.length < 3}
              className="btn-primary w-full py-3 rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed">
              {saving
                ? 'Guardando...'
                : selectedIds.length < 3
                  ? `Selecciona ${3 - selectedIds.length} más`
                  : 'Empezar a descubrir 🔥'}
            </button>

            {selectedIds.length < 3 && (
              <p className="text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Necesitas seleccionar al menos 3 intereses para continuar
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
