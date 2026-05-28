'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { matchApi } from '@/lib/api';

interface ProfileCard {
  user_id: string;
  first_name: string;
  age?: number;
  city?: string;
  bio?: string;
  occupation?: string;
  photos?: { index: number; url: string }[];
  main_photo_url?: string;
  interests?: { id: number; name: string; emoji: string }[];
  is_verified?: boolean;
  compatibility_score?: number;
}

interface MatchModalData {
  name: string;
  conversation_id: string;
}

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<ProfileCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [matchModal, setMatchModal] = useState<MatchModalData | null>(null);
  const [dragState, setDragState] = useState({ x: 0, y: 0, isDragging: false });
  const cardRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await matchApi.getDiscover();
      setProfiles(res.data.profiles || []);
      setCurrentIndex(0);
    } catch {
      toast.error('Error al cargar perfiles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProfiles(); }, [loadProfiles]);

  const currentProfile = profiles[currentIndex];
  const nextProfile = profiles[currentIndex + 1];

  const doSwipe = async (action: 'like' | 'superlike' | 'pass') => {
    if (!currentProfile || actionLoading) return;
    setActionLoading(true);

    try {
      const res = await matchApi.swipe(currentProfile.user_id, action);
      if (res.data.match && res.data.match_data) {
        setMatchModal({
          name: currentProfile.first_name,
          conversation_id: res.data.match_data.conversation_id,
        });
      } else if (action === 'like' || action === 'superlike') {
        toast(`${action === 'superlike' ? '⭐ Super Like' : '❤️ Like'} enviado!`, { icon: '' });
      }
      setCurrentIndex(i => i + 1);
    } catch {
      toast.error('Error al registrar acción.');
    } finally {
      setActionLoading(false);
      setDragState({ x: 0, y: 0, isDragging: false });
    }
  };


  const onPointerDown = (e: React.PointerEvent) => {
    dragStart.current = { x: e.clientX, y: e.clientY };
    setDragState(d => ({ ...d, isDragging: true }));
    cardRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragState.isDragging) return;
    const x = e.clientX - dragStart.current.x;
    const y = e.clientY - dragStart.current.y;
    setDragState(d => ({ ...d, x, y }));
  };

  const onPointerUp = () => {
    if (!dragState.isDragging) return;
    const { x } = dragState;
    if (x > 80) doSwipe('like');
    else if (x < -80) doSwipe('pass');
    else setDragState({ x: 0, y: 0, isDragging: false });
  };

  const rotation = dragState.x * 0.06;
  const likeOpacity = Math.min(1, (dragState.x - 30) / 60);
  const nopeOpacity = Math.min(1, (-dragState.x - 30) / 60);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">🔥</div>
          <p style={{ color: 'var(--text-muted)' }}>Buscando conexiones...</p>
        </div>
      </div>
    );
  }

  if (!currentProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen px-4 text-center">
        <div className="text-5xl mb-4">👀</div>
        <h2 className="font-display text-2xl font-bold mb-2">¡Has visto todos los perfiles!</h2>
        <p className="mb-6" style={{ color: 'var(--text-muted)' }}>Vuelve más tarde para ver nuevas personas</p>
        <button onClick={loadProfiles} className="btn-primary px-6 py-3 rounded-full">
          Recargar perfiles
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-6 max-w-md mx-auto">
      {/* Stack area */}
      <div className="relative w-full" style={{ height: '520px' }}>
        {/* Back card */}
        {nextProfile && (
          <div className="profile-card mx-auto"
            style={{
              transform: 'scale(0.93) translateY(12px)',
              zIndex: 1,
              filter: 'brightness(0.7)',
              left: '50%',
              marginLeft: '-170px',
            }}>
            <div className="h-72 flex items-center justify-center text-7xl"
              style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b3d)' }}>
              {nextProfile.photos?.[0]
                ? <Image src={nextProfile.photos[0].url} alt="" fill className="object-cover" />
                : '😊'}
            </div>
          </div>
        )}

        {/* Front card */}
        <div
          ref={cardRef}
          className="profile-card mx-auto cursor-grab active:cursor-grabbing"
          style={{
            zIndex: 2,
            transform: `translate(${dragState.x}px, ${dragState.y}px) rotate(${rotation}deg)`,
            transition: dragState.isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.25,0.46,0.45,0.94)',
            left: '50%',
            marginLeft: '-170px',
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {/* Indicators */}
          {likeOpacity > 0 && (
            <div className="absolute top-6 left-6 z-10 font-bold text-lg px-3 py-1 rounded-xl border-2 rotate-[-15deg]"
              style={{ background: 'rgba(0,200,100,0.85)', borderColor: '#00c864', color: '#fff', opacity: likeOpacity }}>
              LIKE ♥
            </div>
          )}
          {nopeOpacity > 0 && (
            <div className="absolute top-6 right-6 z-10 font-bold text-lg px-3 py-1 rounded-xl border-2 rotate-[15deg]"
              style={{ background: 'rgba(255,77,109,0.85)', borderColor: 'var(--rose)', color: '#fff', opacity: nopeOpacity }}>
              NOPE ✕
            </div>
          )}

          {/* Verified */}
          {currentProfile.is_verified && (
            <div className="absolute top-4 right-4 z-10 verified-badge">✓ Verificado</div>
          )}

          {/* Photo */}
          <div className="relative h-72 flex items-center justify-center text-8xl select-none"
            style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b3d)', pointerEvents: 'none' }}>
            {currentProfile.photos?.[0] ? (
              <Image
                src={currentProfile.photos[0].url}
                alt={currentProfile.first_name}
                fill
                className="object-cover"
                draggable={false}
              />
            ) : (
              <span>😊</span>
            )}
            {/* Overlay */}
            <div className="absolute bottom-0 left-0 right-0 px-4 pb-3 pt-8"
              style={{ background: 'linear-gradient(transparent,rgba(0,0,0,0.85))' }}>
              <div className="font-display text-2xl font-bold text-white">
                {currentProfile.first_name}{currentProfile.age ? `, ${currentProfile.age}` : ''}
              </div>
              {currentProfile.city && (
                <div className="text-sm text-gray-300 mt-0.5">📍 {currentProfile.city}</div>
              )}
            </div>
          </div>

          {/* Body */}
          <div className="p-4">
            {currentProfile.interests && currentProfile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {currentProfile.interests.slice(0, 5).map(i => (
                  <span key={i.id} className="tag-pill">{i.emoji} {i.name}</span>
                ))}
              </div>
            )}
            {currentProfile.bio && (
              <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                {currentProfile.bio}
              </p>
            )}
            {currentProfile.compatibility_score !== undefined && (
              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--glass-border)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{
                      width: `${currentProfile.compatibility_score}%`,
                      background: 'linear-gradient(90deg,var(--rose),var(--plum))'
                    }} />
                </div>
                <span className="text-xs font-semibold" style={{ color: 'var(--rose-light)' }}>
                  {Math.round(currentProfile.compatibility_score)}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-4 mt-4">
        <button
          onClick={() => doSwipe('pass')}
          disabled={actionLoading}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(255,77,109,0.1)', border: '2px solid rgba(255,77,109,0.3)', color: 'var(--rose)' }}>
          ✕
        </button>
        <button
          onClick={() => doSwipe('superlike')}
          disabled={actionLoading}
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg transition-all hover:scale-110"
          style={{ background: 'rgba(255,186,8,0.1)', border: '2px solid rgba(255,186,8,0.3)', color: 'var(--gold)' }}>
          ⭐
        </button>
        <button
          onClick={() => doSwipe('like')}
          disabled={actionLoading}
          className="w-14 h-14 rounded-full flex items-center justify-center text-xl transition-all hover:scale-110 active:scale-95"
          style={{ background: 'rgba(0,200,100,0.1)', border: '2px solid rgba(0,200,100,0.3)', color: '#00c864' }}>
          ♥
        </button>
      </div>

      <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
        Arrastra o usa los botones · {profiles.length - currentIndex} perfiles restantes
      </p>

      {/* Match modal */}
      {matchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
          <div className="glass-card p-8 text-center max-w-sm w-full animate-pop-in"
            style={{ border: '1px solid rgba(255,77,109,0.4)', boxShadow: '0 0 60px rgba(255,77,109,0.25)' }}>
            <div className="text-5xl mb-3 animate-pulse-heart">💖</div>
            <h2 className="font-display text-3xl font-bold mb-1"
              style={{ background: 'linear-gradient(135deg,var(--rose-light),var(--plum-light))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ¡Es un Match!
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
              Tú y {matchModal.name} se han gustado mutuamente
            </p>
            <div className="flex flex-col gap-3">
              <a href={`/chat/${matchModal.conversation_id}`}
                className="btn-primary py-3 rounded-xl text-sm font-semibold block"
                onClick={() => setMatchModal(null)}>
                Enviar un mensaje 💬
              </a>
              <button onClick={() => setMatchModal(null)}
                className="btn-ghost py-3 rounded-xl text-sm">
                Seguir explorando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
