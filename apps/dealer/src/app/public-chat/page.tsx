'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const conversationsUnsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (user?.tenantId) {
      fetchConversations();
      subscribeToConversations();
    }

    return () => {
      if (conversationsUnsubscribeRef.current) {
        conversationsUnsubscribeRef.current();
      }
    };
  }, [user?.tenantId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchMessages(selectedSessionId);
      subscribeToMessages(selectedSessionId);
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [selectedSessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function fetchConversations() {
    setLoading(true);
    try {
      const response = await fetch('/api/public-chat/conversations');
      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function subscribeToConversations() {
    // Usar Firestore listeners si está disponible
    if (user?.tenantId) {
      try {
        const { subscribeToPublicChatConversations } = require('@/lib/firebase-client');
        const unsubscribe = subscribeToPublicChatConversations(user.tenantId, (newConversations: Conversation[]) => {
          setConversations(newConversations);
        });
        if (unsubscribe) {
          conversationsUnsubscribeRef.current = unsubscribe;
          return;
        }
      } catch (error) {
        console.warn('Firestore listeners no disponibles, usando polling');
      }
    }
    
    // Fallback a polling
    const interval = setInterval(() => {
      fetchConversations();
    }, 3000);
    conversationsUnsubscribeRef.current = () => clearInterval(interval);
  }

  async function fetchMessages(sessionId: string) {
    try {
      const response = await fetch(`/api/public-chat/messages?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function subscribeToMessages(sessionId: string) {
    // Usar Firestore listeners para tiempo real
    if (user?.tenantId) {
      try {
        const { subscribeToChatMessages } = require('@/lib/firebase-client');
        const unsubscribe = subscribeToChatMessages(user.tenantId, sessionId, (newMessages: PublicChatMessage[]) => {
          setMessages(newMessages);
          scrollToBottom();
        });
        if (unsubscribe) {
          unsubscribeRef.current = unsubscribe;
          return;
        }
      } catch (error) {
        console.warn('⚠️ Firestore listeners no disponibles, usando polling:', error);
      }
    }
    
    // Fallback a polling
    const interval = setInterval(() => {
      fetchMessages(sessionId);
    }, 2000);
    unsubscribeRef.current = () => clearInterval(interval);
  }

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
        fetchMessages(selectedSessionId);
        fetchConversations(); // Actualizar lista de conversaciones
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  // Obtener información del cliente seleccionado
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

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Conversaciones */}
        <div className="bg-white rounded-lg shadow overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="font-bold">Conversaciones</h2>
          </div>
          <div>
            {conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">
                No hay conversaciones
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.sessionId}
                  onClick={() => setSelectedSessionId(conv.sessionId)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedSessionId === conv.sessionId ? 'bg-primary-50' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{conv.clientName}</p>
                      {conv.clientEmail && (
                        <p className="text-xs text-gray-500">{conv.clientEmail}</p>
                      )}
                      {conv.clientPhone && (
                        <p className="text-xs text-gray-500">{conv.clientPhone}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conv.lastMessage}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedSessionId ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-bold">
                  {selectedConversation?.clientName || 'Cliente'}
                </h2>
                {selectedConversation?.clientEmail && (
                  <p className="text-sm text-gray-600">{selectedConversation.clientEmail}</p>
                )}
                {selectedConversation?.clientPhone && (
                  <p className="text-sm text-gray-600">{selectedConversation.clientPhone}</p>
                )}
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
                      {message.fromUserName && (
                        <p className="text-xs mb-1 opacity-75">
                          {message.fromUserName}
                        </p>
                      )}
                      <p>{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.fromClient ? 'text-gray-500' : 'text-primary-100'
                        }`}
                      >
                        {new Date(message.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        sendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded px-3 py-2"
                  />
                  <button
                    onClick={sendMessage}
                    className="bg-primary-600 text-white px-6 py-2 rounded hover:bg-primary-700"
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



