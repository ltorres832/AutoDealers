'use client';

import { useState, useEffect, useRef } from 'react';
import { useRealtimeMessages, useRealtimeConversation } from '@/hooks/useRealtimeMessages';

interface Conversation {
  leadId: string;
  leadName: string;
  messages: any[];
  unread: number;
}

export default function MessagesPage() {
  const [user, setUser] = useState<any>(null);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/user')
      .then(res => res.json())
      .then(data => setUser(data.user))
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  const { conversations, loading } = useRealtimeMessages(user?.tenantId);
  const { messages: conversationMessages, loading: messagesLoading } = useRealtimeConversation(
    user?.tenantId,
    selectedConversation?.leadId
  );

  useEffect(() => {
    if (selectedConversation) {
      scrollToBottom();
    }
  }, [conversationMessages, selectedConversation]);

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedConversation.leadId,
          channel: 'whatsapp',
          content: newMessage,
        }),
      });

      if (response.ok) {
        setNewMessage('');
        // Los mensajes se actualizan automáticamente con tiempo real
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function generateAIResponse() {
    if (!selectedConversation) return;

    // Obtener el último mensaje del cliente
    const lastInboundMessage = conversationMessages
      .filter((m) => m.direction === 'inbound')
      .pop();

    if (!lastInboundMessage) {
      alert('No hay mensajes del cliente para responder');
      return;
    }

    setGeneratingAI(true);
    try {
      const response = await fetch('/api/ai/generate-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedConversation.leadId,
          message: lastInboundMessage.content,
          context: 'Conversación de venta de auto',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewMessage(data.response);
        
        // Si requiere aprobación, mostrar advertencia
        if (data.requiresApproval) {
          alert(`Respuesta generada con confianza ${(data.confidence * 100).toFixed(0)}%. Por favor revisa antes de enviar.`);
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Error al generar respuesta');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al generar respuesta con IA');
    } finally {
      setGeneratingAI(false);
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
      <h1 className="text-3xl font-bold mb-6">Mensajería</h1>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
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
                <div
                  key={conv.leadId}
                  onClick={() => {
                    setSelectedConversation(conv);
                  }}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedConversation?.leadId === conv.leadId
                      ? 'bg-primary-50'
                      : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <p className="font-medium">{conv.leadName}</p>
                    {conv.unread > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  {conv.messages.length > 0 && (
                    <p className="text-sm text-gray-500 truncate">
                      {conv.messages[conv.messages.length - 1].content}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedConversation ? (
            <>
              <div className="p-4 border-b">
                <h2 className="font-bold">{selectedConversation.leadName}</h2>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messagesLoading ? (
                  <div className="text-center text-gray-500">Cargando mensajes...</div>
                ) : (
                  conversationMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        message.direction === 'outbound'
                          ? 'justify-end'
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.direction === 'outbound'
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-900'
                        }`}
                      >
                        <p>{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.direction === 'outbound'
                              ? 'text-primary-100'
                              : 'text-gray-500'
                          }`}
                        >
                          {(() => {
                            let date: Date;
                            if (message.createdAt instanceof Date) {
                              date = message.createdAt;
                            } else if (message.createdAt && typeof message.createdAt === 'object' && 'toDate' in message.createdAt) {
                              date = (message.createdAt as any).toDate();
                            } else {
                              date = new Date(message.createdAt as string | number);
                            }
                            return date.toLocaleTimeString();
                          })()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-4 border-t">
                <div className="flex gap-2 mb-2">
                  <button
                    onClick={generateAIResponse}
                    disabled={generatingAI || !selectedConversation}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                    title="Generar respuesta automática con IA"
                  >
                    {generatingAI ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Generando...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        IA
                      </>
                    )}
                  </button>
                </div>
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



