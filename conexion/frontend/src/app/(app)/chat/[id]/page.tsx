'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { chatApi } from '@/lib/api';
import { useChatSocket } from '@/hooks/useWebSocket';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  msg_type: string;
  media_url?: string;
  read_at?: string;
  created_at: string;
}

interface ConvInfo {
  id: string;
  other_user: {
    user_id: string;
    first_name: string;
    main_photo_url?: string;
    is_verified?: boolean;
  };
  streak?: { current_days: number; is_active: boolean };
}

export default function ChatWindowPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<Message[]>([]);
  const [conv, setConv] = useState<ConvInfo | null>(null);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<NodeJS.Timeout>();
  const inputRef = useRef<HTMLInputElement>(null);


  useEffect(() => {
    Promise.all([
      chatApi.getMessages(conversationId),
      chatApi.getConversations(),
    ])
      .then(([msgsRes, convsRes]) => {
        setMessages(msgsRes.data.results || msgsRes.data);
        const convs = convsRes.data.results || convsRes.data;
        const found = convs.find((c: ConvInfo) => c.id === conversationId);
        if (found) setConv(found);
      })
      .catch(() => toast.error('Error al cargar la conversación.'))
      .finally(() => setLoading(false));
  }, [conversationId]);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, otherTyping]);


  const handleWsMessage = useCallback((data: Record<string, unknown>) => {
    const type = data.type as string;

    if (type === 'chat.message') {
      const newMsg: Message = {
        id: data.message_id as string,
        sender_id: data.sender_id as string,
        sender_name: data.sender_name as string,
        content: data.content as string,
        msg_type: data.msg_type as string,
        created_at: data.created_at as string,
      };
      setMessages(prev => {

        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      setOtherTyping(false);
    }

    if (type === 'chat.typing') {
      if ((data.user_id as string) !== user?.id) {
        setOtherTyping(data.is_typing as boolean);
      }
    }
  }, [user?.id]);

  const { sendMessage: wsSend, sendTyping } = useChatSocket(conversationId, handleWsMessage);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 1500);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendTyping(false);
    setIsTyping(false);

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender_id: user?.id || '',
      sender_name: user?.profile?.first_name || 'Tú',
      content: text,
      msg_type: 'text',
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);


    try {
      wsSend(text);
    } catch {
      try {
        const res = await chatApi.sendMessage(conversationId, text);
        setMessages(prev => prev.map(m =>
          m.id === tempMsg.id ? res.data : m
        ));
      } catch {
        toast.error('Error al enviar el mensaje.');
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      }
    }

    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-3xl animate-pulse">💬</div>
    </div>
  );

  const otherUser = conv?.other_user;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 sticky top-[57px] z-10"
        style={{ background: 'rgba(22,33,62,0.9)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--glass-border)' }}>
        <button onClick={() => router.back()}
          className="w-9 h-9 rounded-full flex items-center justify-center text-lg transition hover:bg-white/10"
          style={{ color: 'var(--text-muted)' }}>
          ←
        </button>

        <div className="relative w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xl"
          style={{ background: 'linear-gradient(135deg,#1a0a2e,#2d1b3d)', border: '2px solid var(--glass-border)' }}>
          {otherUser?.main_photo_url
            ? <Image src={otherUser.main_photo_url} alt="" fill className="object-cover rounded-full" />
            : '😊'}
          <div className="online-dot absolute -bottom-0.5 -right-0.5" />
        </div>

        <div className="flex-1">
          <div className="font-semibold text-sm flex items-center gap-2">
            {otherUser?.first_name || 'Conversación'}
            {otherUser?.is_verified && <span className="verified-badge text-xs">✓</span>}
          </div>
          <div className="text-xs" style={{ color: '#00c864' }}>● En línea</div>
        </div>

        {conv?.streak?.is_active && conv.streak.current_days > 0 && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
            style={{ background: 'rgba(255,186,8,0.15)', color: 'var(--gold)' }}>
            🔥 {conv.streak.current_days} días
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ background: 'rgba(0,0,0,0.15)' }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              ¡Es un match! Di hola a {otherUser?.first_name}
            </p>
          </div>
        )}

        {messages.map((msg) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className="max-w-[75%]">
                <div className={`px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
                  isMe
                    ? 'rounded-br-sm text-white'
                    : 'rounded-bl-sm'
                }`}
                  style={{
                    background: isMe
                      ? 'linear-gradient(135deg,var(--rose),var(--plum))'
                      : 'var(--glass)',
                    border: isMe ? 'none' : '1px solid var(--glass-border)',
                  }}>
                  {msg.content}
                </div>
                <div className={`text-xs mt-1 ${isMe ? 'text-right' : 'text-left'}`}
                  style={{ color: 'var(--text-muted)' }}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: es })}
                  {isMe && msg.read_at && ' · Leído'}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {otherTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-bl-sm"
              style={{ background: 'var(--glass)', border: '1px solid var(--glass-border)' }}>
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-3 px-4 py-3"
        style={{ background: 'rgba(13,13,13,0.7)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--glass-border)' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyPress}
          placeholder={`Mensaje a ${otherUser?.first_name || ''}...`}
          className="input-dark flex-1 rounded-full px-5 py-2.5 text-sm"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base transition-all hover:scale-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,var(--rose),var(--plum))' }}>
          ➤
        </button>
      </div>
    </div>
  );
}
