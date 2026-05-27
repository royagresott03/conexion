'use client';
import { useEffect, useRef, useCallback } from 'react';
import Cookies from 'js-cookie';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

type MessageHandler = (data: Record<string, unknown>) => void;

export function useChatSocket(conversationId: string | null, onMessage: MessageHandler) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!conversationId) return;
    const token = Cookies.get('access_token') || localStorage.getItem('access_token');
    if (!token) return;

    const url = `${WS_URL}/ws/chat/${conversationId}/?token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('[WS] Chat connected');
    };

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onMessage(data);
      } catch { /* ignore */ }
    };

    ws.current.onclose = () => {
      console.log('[WS] Chat disconnected, reconnecting...');
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.current.onerror = (err) => {
      console.error('[WS] Error:', err);
    };
  }, [conversationId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((content: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'chat.message', content }));
    }
  }, []);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'chat.typing', is_typing: isTyping }));
    }
  }, []);

  return { sendMessage, sendTyping };
}

export function useNotificationSocket(onNotification: MessageHandler) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    const token = Cookies.get('access_token') || localStorage.getItem('access_token');
    if (!token) return;

    const url = `${WS_URL}/ws/notifications/?token=${token}`;
    ws.current = new WebSocket(url);

    ws.current.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        onNotification(data);
      } catch { /* ignore */ }
    };

    ws.current.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 5000);
    };
  }, [onNotification]);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);
}
