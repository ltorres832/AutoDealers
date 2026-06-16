'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { DEFAULT_PLATFORM_BRAND_ASSET } from '@autodealers/shared/platform-branding-client';
import { subscribeToChatMessages, type PublicChatMessageRow } from '@/lib/firebase-client';

interface ChatMessage {
  id: string;
  content: string;
  fromClient: boolean;
  createdAt: string;
}

interface ChatWidgetProps {
  tenantId: string;
  tenantName: string;
  defaultOpen?: boolean;
  /** Texto cuando aún no hay mensajes (desde websiteSettings.chat.welcomeMessage). */
  welcomeMessage?: string;
  /** Si es false, no se muestra el widget. Por defecto true. */
  enabled?: boolean;
}

export default function ChatWidget({
  tenantId,
  tenantName,
  defaultOpen = false,
  welcomeMessage,
  enabled = true,
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [showNameForm, setShowNameForm] = useState(true);
  const [notifyBrandIcon, setNotifyBrandIcon] = useState(DEFAULT_PLATFORM_BRAND_ASSET);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousMessagesCountRef = useRef(0);
  const chatUnsubRef = useRef<(() => void) | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const fetchMessages = useCallback(
    async (session: string) => {
      try {
        const response = await fetch(
          `/api/public-chat/messages?sessionId=${encodeURIComponent(session)}&tenantId=${encodeURIComponent(tenantId)}`
        );
        if (response.ok) {
          const data = await response.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    },
    [tenantId]
  );

  const startPolling = useCallback(
    (session: string) => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      pollingIntervalRef.current = setInterval(() => {
        void fetchMessages(session);
      }, 5000);
    },
    [fetchMessages]
  );

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const applyMessages = useCallback(
    (rows: PublicChatMessageRow[]) => {
      setMessages(rows);
      scrollToBottom();
    },
    [scrollToBottom]
  );

  const subscribeRealtime = useCallback(
    (session: string) => {
      chatUnsubRef.current?.();
      chatUnsubRef.current = null;
      stopPolling();

      const unsub = subscribeToChatMessages(
        tenantId,
        session,
        applyMessages,
        () => {
          startPolling(session);
        }
      );

      if (unsub) {
        chatUnsubRef.current = unsub;
      } else {
        void fetchMessages(session);
        startPolling(session);
      }
    },
    [tenantId, applyMessages, fetchMessages, startPolling, stopPolling]
  );

  useEffect(() => {
    const onBranding = (e: Event) => {
      const d = (e as CustomEvent<{ logo?: string }>).detail;
      const u = d?.logo;
      if (typeof u === 'string' && u.trim()) setNotifyBrandIcon(u.trim());
    };
    window.addEventListener('platform-branding-changed', onBranding);
    return () => window.removeEventListener('platform-branding-changed', onBranding);
  }, []);

  useEffect(() => {
    let storedSessionId = localStorage.getItem(`chat_session_${tenantId}`);
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`chat_session_${tenantId}`, storedSessionId);
    }
    setSessionId(storedSessionId);

    const storedName = localStorage.getItem(`chat_name_${tenantId}`);
    const storedEmail = localStorage.getItem(`chat_email_${tenantId}`);
    const storedPhone = localStorage.getItem(`chat_phone_${tenantId}`);

    if (storedName) {
      setClientName(storedName);
      setClientEmail(storedEmail || '');
      setClientPhone(storedPhone || '');
      setShowNameForm(false);
    }

    if ('Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio(
        'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGFzvLZkDkIHmS58OSbUQ4PVKzn77FdGAg='
      );
      audioRef.current.volume = 0.5;
    }
  }, [tenantId]);

  useEffect(() => {
    if (!sessionId || showNameForm) return;

    void fetchMessages(sessionId);
    subscribeRealtime(sessionId);

    return () => {
      chatUnsubRef.current?.();
      chatUnsubRef.current = null;
      stopPolling();
    };
  }, [sessionId, showNameForm, fetchMessages, subscribeRealtime, stopPolling]);

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (messages.length <= previousMessagesCountRef.current || showNameForm) {
      previousMessagesCountRef.current = messages.length;
      return;
    }

    const newMessages = messages.slice(previousMessagesCountRef.current);
    const unreadFromDealer = newMessages.filter((msg) => !msg.fromClient);

    if (unreadFromDealer.length > 0 && !isOpen) {
      if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }

      if ('Notification' in window && Notification.permission === 'granted') {
        const message = unreadFromDealer[0];
        new Notification(`Nuevo mensaje de ${tenantName}`, {
          body:
            message.content.length > 100
              ? `${message.content.substring(0, 100)}...`
              : message.content,
          icon: notifyBrandIcon,
          badge: notifyBrandIcon,
          tag: `public-chat-${tenantId}-${sessionId}`,
          requireInteraction: false,
        });
      }
    }

    previousMessagesCountRef.current = messages.length;
  }, [messages, showNameForm, isOpen, tenantId, tenantName, sessionId, notifyBrandIcon]);

  async function handleStartChat() {
    if (!clientName.trim()) return;

    localStorage.setItem(`chat_name_${tenantId}`, clientName);
    if (clientEmail) localStorage.setItem(`chat_email_${tenantId}`, clientEmail);
    if (clientPhone) localStorage.setItem(`chat_phone_${tenantId}`, clientPhone);

    setShowNameForm(false);
  }

  async function sendMessage() {
    if (!newMessage.trim() || !sessionId || !clientName) return;

    setLoading(true);
    const messageToSend = newMessage.trim();
    setNewMessage('');

    try {
      const response = await fetch('/api/public-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId,
          sessionId,
          clientName,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          content: messageToSend,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setNewMessage(messageToSend);
        alert(`Error al enviar mensaje: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setNewMessage(messageToSend);
    } finally {
      setLoading(false);
    }
  }

  if (enabled === false) {
    return null;
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-primary-600 to-brand-red-bright600 text-white rounded-full p-5 shadow-2xl hover:from-primary-700 hover:to-brand-red-bright700 transition-all transform hover:scale-110 z-50 group"
        aria-label="Abrir chat"
      >
        <svg
          className="w-7 h-7 group-hover:rotate-12 transition-transform"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          💬
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 inset-x-4 sm:inset-x-auto w-auto sm:w-[min(24rem,calc(100vw-2rem))] h-[min(600px,calc(100dvh-2rem))] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-primary-600 to-brand-red-bright600 text-white p-4 rounded-t-2xl flex justify-between items-center">
        <div>
          <h3 className="font-bold text-lg">{tenantName}</h3>
          <p className="text-sm text-white/90">Chatea con nosotros</p>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-white hover:text-gray-200"
          aria-label="Cerrar chat"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {showNameForm ? (
          <div className="space-y-4">
            <p className="text-gray-700">Para comenzar, por favor ingresa tu información:</p>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="Tu nombre"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Email (opcional)</label>
              <input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Teléfono (opcional)</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="w-full border rounded px-3 py-2"
                placeholder="+1 234 567 8900"
              />
            </div>
            <button
              onClick={handleStartChat}
              disabled={!clientName.trim()}
              className="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:bg-gray-300"
            >
              Iniciar Chat
            </button>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>{(welcomeMessage && welcomeMessage.trim()) || '¡Hola! ¿En qué puedo ayudarte?'}</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.fromClient ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs px-4 py-2 rounded-lg ${
                      message.fromClient
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.fromClient ? 'text-primary-100' : 'text-gray-500'
                      }`}
                    >
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {!showNameForm && (
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  void sendMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 border rounded px-3 py-2"
              disabled={loading}
            />
            <button
              onClick={() => void sendMessage()}
              disabled={loading || !newMessage.trim()}
              className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700 disabled:bg-gray-300"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
