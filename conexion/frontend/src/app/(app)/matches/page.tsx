'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { matchApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface MatchData {
  id: string;
  conversation_id: string;
  compatibility_score: number;
  created_at: string;
  other_user: {
    user_id: string;
    first_name: string;
    age?: number;
    city?: string;
    main_photo_url?: string;
    is_verified?: boolean;
  };
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchApi.getMatches()
      .then(res => setMatches(res.data.results || res.data))
      .catch(() => toast.error('Error al cargar matches.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-4xl animate-pulse">💖</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold">Tus Matches</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {matches.length} {matches.length === 1 ? 'persona' : 'personas'} con quienes hay conexión mutua
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💫</div>
          <h2 className="font-display text-xl font-bold mb-2">Aún no tienes matches</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            ¡Sigue deslizando para encontrar tu conexión!
          </p>
          <Link href="/discover" className="btn-primary px-6 py-3 rounded-full text-sm inline-block">
            Ir a Descubrir
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {matches.map(match => (
            <Link
              key={match.id}
              href={`/chat/${match.conversation_id}`}
              className="glass-card overflow-hidden hover:scale-[1.02] transition-transform"
              style={{ borderColor: 'var(--glass-border)' }}>
              {/* Photo */}
              <div className="relative h-40 flex items-center justify-center text-5xl"
                style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b3d)' }}>
                {match.other_user.main_photo_url ? (
                  <Image
                    src={match.other_user.main_photo_url}
                    alt={match.other_user.first_name}
                    fill
                    className="object-cover"
                  />
                ) : '😊'}
                {match.other_user.is_verified && (
                  <div className="absolute top-2 right-2 verified-badge text-xs">✓</div>
                )}
              </div>

              {/* Info */}
              <div className="p-3">
                <div className="font-semibold text-sm">
                  {match.other_user.first_name}
                  {match.other_user.age ? `, ${match.other_user.age}` : ''}
                </div>
                {match.other_user.city && (
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    📍 {match.other_user.city}
                  </div>
                )}
                {/* Compatibility bar */}
                <div className="mt-2 flex items-center gap-1.5">
                  <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--glass-border)' }}>
                    <div className="h-full rounded-full"
                      style={{
                        width: `${match.compatibility_score}%`,
                        background: 'linear-gradient(90deg,var(--rose),var(--plum))'
                      }} />
                  </div>
                  <span className="text-xs" style={{ color: 'var(--rose-light)' }}>
                    {Math.round(match.compatibility_score)}%
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
