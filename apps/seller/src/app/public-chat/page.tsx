'use client';

import { useState, useEffect, useRef } from 'react';

interface PublicChatMessage {
  id: string;
  sessionId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  fromClient: boolean;
  fromUserName?: string;
  content: string;
  createdAt: string;
  read: boolean;
}

interface Conversation {
  sessionId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  lastMessage: string | null;
  unreadCount: number;
  createdAt: string;
}

export default function PublicChatPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesUnsubRef = useRef<(() => void) | null>(null);
  const conversationsUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch('/api/user', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setTenantId(data.user?.tenantId || null);
        } else {
          setLoadError('No se pudo obtener el tenant. Vuelve a iniciar sesión.');
        }
      } catch {
        setLoadError('No se pudo cargar el chat público.');
      } finally {
        setLoading(false);
      }
    }
    void init();
  }, []);

  useEffect(() => {
    if (!tenantId) return;

    const {
      subscribeToPublicChatConversations,
    } = require('@/lib/firebase-client');

    conversationsUnsubRef.current?.();
    const unsub = subscribeToPublicChatConversations(
      tenantId,
      (list: Array<Conversation & { lastMessage?: { content?: string; createdAt?: string } }>) => {
        setConversations(
          list.map((c) => ({
            sessionId: c.sessionId,
            clientName: c.clientName,
            clientEmail: c.clientEmail,
            clientPhone: c.clientPhone,
            unreadCount: c.unreadCount || 0,
            createdAt: c.createdAt,
            lastMessage:
              typeof c.lastMessage === 'string'
                ? c.lastMessage
                : c.lastMessage?.content
                  ? String(c.lastMessage.content)
                  : null,
          }))
        );
        setLoadError(null);
      }
    );
    conversationsUnsubRef.current = unsub || null;

    return () => {
      conversationsUnsubRef.current?.();
      conversationsUnsubRef.current = null;
    };
  }, [tenantId]);

  useEffect(() => {
    if (!selectedSessionId || !tenantId) {
      messagesUnsubRef.current?.();
      messagesUnsubRef.current = null;
      setMessages([]);
      return;
    }

    const { subscribeToChatMessages } = require('@/lib/firebase-client');
    messagesUnsubRef.current?.();

    const unsub = subscribeToChatMessages(
      tenantId,
      selectedSessionId,
      (newMessages: PublicChatMessage[]) => {
        setMessages(newMessages);
      }
    );
    messagesUnsubRef.current = unsub || null;

    return () => {
      messagesUnsubRef.current?.();
      messagesUnsubRef.current = null;
    };
  }, [selectedSessionId, tenantId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedSessionId) return;

    try {
      const response = await fetch('/api/public-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSessionId,
          content: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  const selectedConversation = selectedSessionId
    ? conversations.find((c) => c.sessionId === selectedSessionId)
    : null;

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Chat Público</h1>
      <p className="text-gray-600 mb-6">
        Conversaciones con clientes desde tu página web pública
      </p>

      {loadError ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {loadError}
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        <div className="bg-white rounded-lg shadow overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="font-bold">Conversaciones</h2>
            <p className="text-xs text-gray-500 mt-1">
              {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div>
            {conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">No hay conversaciones</p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.sessionId}
                  onClick={() => setSelectedSessionId(conv.sessionId)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                    selectedSessionId === conv.sessionId
                      ? 'bg-primary-50 border-l-4 border-l-primary-600'
                      : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.clientName}</p>
                      {conv.clientEmail && (
                        <p className="text-xs text-gray-500 truncate">{conv.clientEmail}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1 ml-2">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-1">{conv.lastMessage}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedSessionId ? (
            <>
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-bold text-lg">
                  {selectedConversation?.clientName || 'Cliente'}
                </h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.fromClient ? 'justify-start' : 'justify-end'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.fromClient
                          ? 'bg-gray-200 text-gray-900'
                          : 'bg-primary-600 text-white'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs mt-1 opacity-75">
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded-lg px-4 py-2"
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!newMessage.trim()}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Selecciona una conversación
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
