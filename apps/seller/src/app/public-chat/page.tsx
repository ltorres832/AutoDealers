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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<PublicChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

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

  async function fetchMessages(sessionId: string) {
    try {
      const response = await fetch(`/api/public-chat/messages?sessionId=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        // Actualizar conversaciones para refrescar el contador de no leídos
        fetchConversations();
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  function subscribeToMessages(sessionId: string) {
    // Polling para tiempo real - aumentado a 10 segundos para reducir carga
    const interval = setInterval(() => {
      if (sessionId) {
        fetchMessages(sessionId);
      }
    }, 10000); // Aumentado de 2 a 10 segundos

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
      <p className="text-gray-600 mb-6">
        Conversaciones con clientes desde tu página web pública
      </p>

      <div className="grid grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Lista de Conversaciones */}
        <div className="bg-white rounded-lg shadow overflow-y-auto">
          <div className="p-4 border-b sticky top-0 bg-white z-10">
            <h2 className="font-bold">Conversaciones</h2>
            <p className="text-xs text-gray-500 mt-1">
              {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
            </p>
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
                  className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition ${
                    selectedSessionId === conv.sessionId ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{conv.clientName}</p>
                      {conv.clientEmail && (
                        <p className="text-xs text-gray-500 truncate">{conv.clientEmail}</p>
                      )}
                      {conv.clientPhone && (
                        <p className="text-xs text-gray-500 truncate">{conv.clientPhone}</p>
                      )}
                    </div>
                    {conv.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full px-2 py-1 ml-2 flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.lastMessage && (
                    <p className="text-sm text-gray-500 truncate mt-1">
                      {conv.lastMessage}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(conv.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="col-span-2 bg-white rounded-lg shadow flex flex-col">
          {selectedSessionId ? (
            <>
              <div className="p-4 border-b bg-gray-50">
                <h2 className="font-bold text-lg">
                  {selectedConversation?.clientName || 'Cliente'}
                </h2>
                <div className="flex gap-4 mt-1">
                  {selectedConversation?.clientEmail && (
                    <p className="text-sm text-gray-600">
                      📧 {selectedConversation.clientEmail}
                    </p>
                  )}
                  {selectedConversation?.clientPhone && (
                    <p className="text-sm text-gray-600">
                      📱 {selectedConversation.clientPhone}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No hay mensajes aún. Comienza la conversación.
                  </div>
                ) : (
                  messages.map((message) => (
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
                          <p className="text-xs mb-1 opacity-75 font-medium">
                            {message.fromUserName}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            message.fromClient ? 'text-gray-500' : 'text-primary-100'
                          }`}
                        >
                          {new Date(message.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
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
                        sendMessage();
                      }
                    }}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim()}
                    className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg">Selecciona una conversación</p>
                <p className="text-sm mt-2">
                  Los mensajes de clientes desde tu página web aparecerán aquí
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



