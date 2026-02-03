'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeMessages, useRealtimeConversation } from '@/hooks/useRealtimeMessages';
import { useAuth } from '@/hooks/useAuth';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';
import { NewItemBadge } from '@/components/NewItemBadge';

interface Message {
  id: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  content: string;
  createdAt: Date | string;
  leadId?: string;
}

interface Conversation {
  leadId: string;
  leadName: string;
  messages: Message[];
  unread: number;
  lastMessage?: string;
}

export default function MessagesPage() {
  const { auth } = useAuth();
  const { conversations, loading } = useRealtimeMessages(auth?.tenantId);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const { messages: conversationMessages, loading: messagesLoading } = useRealtimeConversation(
    auth?.tenantId,
    selectedLeadId || undefined
  );
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousMessagesCount = useRef(0);
  const [newMessages, setNewMessages] = useState<Set<string>>(new Set());

  const selectedConversation = conversations.find(c => c.leadId === selectedLeadId || '');

  // Detectar nuevos mensajes
  useEffect(() => {
    if (conversationMessages.length > previousMessagesCount.current) {
      const newMessageIds = new Set<string>();
      conversationMessages.slice(previousMessagesCount.current).forEach(msg => {
        newMessageIds.add(msg.id);
      });
      setNewMessages(newMessageIds);
      setTimeout(() => setNewMessages(new Set()), 3000);
    }
    previousMessagesCount.current = conversationMessages.length;
  }, [conversationMessages.length]);

  useEffect(() => {
    if (selectedLeadId) {
      scrollToBottom();
    }
  }, [conversationMessages, selectedLeadId]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedLeadId) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLeadId,
          channel: 'whatsapp', // Por defecto
          content: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // El listener en tiempo real actualizará automáticamente
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mensajería</h1>
        <RealtimeIndicator isActive={!loading && auth?.tenantId !== undefined} />
      </div>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de conversaciones */}
        <div className="bg-white rounded-lg shadow overflow-y-auto">
          <div className="p-4 border-b">
            <h2 className="font-bold">Conversaciones</h2>
          </div>
          <div>
            {conversations.length === 0 ? (
              <p className="p-4 text-gray-500 text-center">
                No hay conversaciones
              </p>
            ) : (
              conversations.map((conv) => (
                <NewItemBadge key={conv.leadId} isNew={conv.unread > 0}>
                  <div
                    onClick={() => setSelectedLeadId(conv.leadId)}
                    className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-all ${
                      selectedLeadId === conv.leadId
                        ? 'bg-primary-50 border-l-4 border-primary-600'
                        : ''
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <p className="font-medium">{conv.leadName}</p>
                      {conv.unread > 0 && (
                        <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
                          {conv.unread}
                        </span>
                      )}
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-500 truncate mt-1">
                        {conv.lastMessage}
                      </p>
                    )}
                  </div>
                </NewItemBadge>
              ))
            )}
          </div>
        </div>

        {/* Área de mensajes */}
        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg">{selectedConversation.leadName}</h2>
                  <RealtimeIndicator isActive={!messagesLoading} label="Sincronizado" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messagesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <>
                    {conversationMessages.map((message) => (
                      <NewItemBadge key={message.id} isNew={newMessages.has(message.id)}>
                        <div
                          className={`flex ${
                            message.direction === 'outbound'
                              ? 'justify-end'
                              : 'justify-start'
                          } animate-fade-in`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg shadow-sm transition-all duration-300 ${
                              message.direction === 'outbound'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                                : 'bg-white text-gray-900 border border-gray-200'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            <p
                              className={`text-xs mt-1 ${
                                message.direction === 'outbound'
                                  ? 'text-blue-100'
                                  : 'text-gray-500'
                              }`}
                            >
                              {message.createdAt instanceof Date
                                ? message.createdAt.toLocaleTimeString()
                                : (message.createdAt as any)?.toDate?.() 
                                  ? (message.createdAt as any).toDate().toLocaleTimeString()
                                  : new Date(message.createdAt as unknown as string | number).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </NewItemBadge>
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
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




