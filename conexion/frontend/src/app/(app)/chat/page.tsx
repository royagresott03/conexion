'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { chatApi } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface Conversation {
  id: string;
  other_user: {
    user_id: string;
    first_name: string;
    main_photo_url?: string;
    is_verified?: boolean;
  };
  last_message?: {
    content: string;
    msg_type: string;
    created_at: string;
    sender_id: string;
  };
  unread_count: number;
  streak?: {
    current_days: number;
    is_active: boolean;
  };
  updated_at: string;
}

export default function ChatListPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chatApi.getConversations()
      .then(res => setConversations(res.data.results || res.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-4xl animate-pulse">💬</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-display text-2xl font-bold">Mensajes</h1>
        {conversations.some(c => c.unread_count > 0) && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'var(--rose)', color: '#fff' }}>
            {conversations.reduce((a, c) => a + c.unread_count, 0)} nuevos
          </span>
        )}
      </div>

      {conversations.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="font-display text-xl font-bold mb-2">Sin conversaciones aún</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            ¡Haz match con alguien para empezar a chatear!
          </p>
          <Link href="/discover" className="btn-primary px-6 py-3 rounded-full text-sm inline-block">
            Ir a Descubrir
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map(conv => (
            <Link
              key={conv.id}
              href={`/chat/${conv.id}`}
              className="flex items-center gap-3 p-4 rounded-2xl transition-all hover:scale-[1.01]"
              style={{
                background: 'var(--glass)',
                border: `1px solid ${conv.unread_count > 0 ? 'rgba(255,77,109,0.3)' : 'var(--glass-border)'}`,
              }}>
              {/* Avatar */}
              <div className="relative w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-2xl"
                style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b3d)', border: '2px solid var(--glass-border)' }}>
                {conv.other_user.main_photo_url ? (
                  <Image
                    src={conv.other_user.main_photo_url}
                    alt={conv.other_user.first_name}
                    fill
                    className="object-cover rounded-full"
                  />
                ) : '😊'}
                <div className="online-dot absolute bottom-0.5 right-0.5" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{conv.other_user.first_name}</span>
                  {conv.streak?.is_active && conv.streak.current_days > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: 'rgba(255,186,8,0.15)', color: 'var(--gold)' }}>
                      🔥 {conv.streak.current_days}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
                  {conv.last_message
                    ? conv.last_message.msg_type === 'image' ? '📷 Imagen' : conv.last_message.content
                    : 'Nuevo match • Di hola!'}
                </p>
              </div>

              {/* Meta */}
              <div className="text-right flex-shrink-0">
                <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false, locale: es })}
                </div>
                {conv.unread_count > 0 && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ml-auto"
                    style={{ background: 'var(--rose)', color: '#fff' }}>
                    {conv.unread_count}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
