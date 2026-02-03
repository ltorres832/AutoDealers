'use client';

import { useState, useEffect, useRef } from 'react';

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
}

export default function ChatWidget({ tenantId, tenantName, defaultOpen = false }: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [showNameForm, setShowNameForm] = useState(true);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousMessagesCountRef = useRef(0);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Obtener o crear sessionId del localStorage
    let storedSessionId = localStorage.getItem(`chat_session_${tenantId}`);
    if (!storedSessionId) {
      storedSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(`chat_session_${tenantId}`, storedSessionId);
    }
    setSessionId(storedSessionId);

    // Obtener información del cliente del localStorage
    const storedName = localStorage.getItem(`chat_name_${tenantId}`);
    const storedEmail = localStorage.getItem(`chat_email_${tenantId}`);
    const storedPhone = localStorage.getItem(`chat_phone_${tenantId}`);
    
    if (storedName) {
      setClientName(storedName);
      setClientEmail(storedEmail || '');
      setClientPhone(storedPhone || '');
      setShowNameForm(false);
    }

    if (storedSessionId && !showNameForm) {
      fetchMessages(storedSessionId);
      subscribeToMessages(storedSessionId);
    }

    // Solicitar permisos de notificación al cargar
    if ('Notification' in window) {
      notificationPermissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then((permission) => {
          notificationPermissionRef.current = permission;
        });
      }
    }

    // Crear elemento de audio para notificaciones
    if (typeof Audio !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGFzvLZkDkIHmS58OSbUQ4PVKzn77FdGAg=');
      audioRef.current.volume = 0.5;
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [tenantId, showNameForm]);

  // Escuchar eventos para abrir el chat desde otros componentes
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('openChat', handleOpenChat);
    return () => window.removeEventListener('openChat', handleOpenChat);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Detectar nuevos mensajes y mostrar notificaciones
  useEffect(() => {
    if (messages.length > previousMessagesCountRef.current && !showNameForm && isOpen) {
      const newMessages = messages.slice(previousMessagesCountRef.current);
      const unreadMessages = newMessages.filter((msg) => !msg.fromClient);

      if (unreadMessages.length > 0) {
        // Reproducir sonido
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // Ignorar errores de reproducción
          });
        }

        // Mostrar notificación del navegador (solo si el chat no está abierto o está minimizado)
        if ('Notification' in window && Notification.permission === 'granted') {
          const message = unreadMessages[0];
          new Notification(`Nuevo mensaje de ${tenantName}`, {
            body: message.content.length > 100 
              ? message.content.substring(0, 100) + '...' 
              : message.content,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `public-chat-${tenantId}-${sessionId}`,
            requireInteraction: false,
          });
        }
      }
    }

    previousMessagesCountRef.current = messages.length;
  }, [messages, showNameForm, isOpen, tenantId, tenantName, sessionId]);

  async function fetchMessages(session: string) {
    try {
      const response = await fetch(`/api/public-chat/messages?sessionId=${session}&tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }

  function subscribeToMessages(session: string) {
    // Usar Firestore listeners para tiempo real
    try {
      const { subscribeToChatMessages } = require('../lib/firebase-client');
      const unsubscribe = subscribeToChatMessages(tenantId, session, (newMessages: any) => {
        setMessages(newMessages);
        scrollToBottom();
      });
      if (unsubscribe) {
        return unsubscribe;
      }
    } catch (error) {
      console.warn('⚠️ Firebase Client no disponible, usando polling:', error);
    }
    // Fallback a polling si Firebase Client no está disponible
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(session);
    }, 3000); // Polling cada 3 segundos (optimizado)
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }

  async function handleStartChat() {
    if (!clientName.trim()) return;

    // Guardar información del cliente
    localStorage.setItem(`chat_name_${tenantId}`, clientName);
    if (clientEmail) localStorage.setItem(`chat_email_${tenantId}`, clientEmail);
    if (clientPhone) localStorage.setItem(`chat_phone_${tenantId}`, clientPhone);

    setShowNameForm(false);
    
    if (sessionId) {
      fetchMessages(sessionId);
      subscribeToMessages(sessionId);
    }
  }

  async function sendMessage() {
    if (!newMessage.trim() || !sessionId || !clientName) return;

    setLoading(true);
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
          content: newMessage,
        }),
      });

      if (response.ok) {
        const messageContent = newMessage.trim();
        setNewMessage('');
        // Esperar un momento antes de refrescar para asegurar que el mensaje se guardó
        setTimeout(() => {
          fetchMessages(sessionId);
        }, 500);
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error enviando mensaje:', errorData.error || 'Unknown error');
        // Restaurar el mensaje si falla
        setNewMessage(newMessage);
        alert('Error al enviar mensaje: ' + (errorData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full p-5 shadow-2xl hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-110 z-50 group"
        aria-label="Abrir chat"
      >
        <svg className="w-7 h-7 group-hover:rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
          💬
        </span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-4 rounded-t-2xl flex justify-between items-center">
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

      {/* Messages Area */}
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
              className="w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-300"
            >
              Iniciar Chat
            </button>
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p>¡Hola! ¿En qué puedo ayudarte?</p>
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
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-900 border border-gray-200'
                    }`}
                  >
                    <p>{message.content}</p>
                    <p
                      className={`text-xs mt-1 ${
                        message.fromClient ? 'text-purple-100' : 'text-gray-500'
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

      {/* Input Area */}
      {!showNameForm && (
        <div className="p-4 border-t bg-white">
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !loading) {
                  sendMessage();
                }
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 border rounded px-3 py-2"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !newMessage.trim()}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-300"
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



