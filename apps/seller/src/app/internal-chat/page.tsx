'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface InternalMessage {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  content: string;
  createdAt: Date;
  read: boolean;
  readAt?: Date;
}

interface Conversation {
  userId: string;
  userName: string;
  lastMessage: string | null;
  lastMessageTime: Date | null;
  unreadCount: number;
  avatar?: string;
}

export default function InternalChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<InternalMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [dealer, setDealer] = useState<any>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const conversationsPollingRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousMessagesCountRef = useRef(0);
  const notificationPermissionRef = useRef<NotificationPermission | null>(null);

  // Funciones de carga de datos
  const markMessagesAsRead = useCallback(async (userId: string) => {
    try {
      await fetch(`/api/internal-chat/mark-read?userId=${userId}`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      // Silenciar errores
    }
  }, []);

  const fetchAvailableUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const response = await fetch('/api/internal-chat/users', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error obteniendo usuarios disponibles:', error);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch('/api/internal-chat/conversations', {
        credentials: 'include',
      });

      if (response.status === 401) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const processedConversations = (data.conversations || []).map((conv: any) => {
          // Asegurar que lastMessageTime se procese correctamente
          let lastMessageTime: Date | null = null;
          if (conv.lastMessageTime) {
            lastMessageTime = new Date(conv.lastMessageTime);
          } else if (conv.createdAt) {
            lastMessageTime = new Date(conv.createdAt);
          }
          
          return {
            userId: conv.userId || conv.otherUserId,
            userName: conv.userName || conv.otherUserName || 'Usuario',
            lastMessage: typeof conv.lastMessage === 'string' 
              ? conv.lastMessage 
              : (conv.lastMessage?.content || null),
            lastMessageTime: lastMessageTime,
            unreadCount: conv.unreadCount || 0,
          };
        });

        // Actualizar conversaciones siempre, pero mantener orden
        setConversations(prev => {
          // Si no hay conversaciones nuevas, mantener las anteriores
          if (processedConversations.length === 0 && prev.length > 0) {
            return prev;
          }
          
          // Ordenar por fecha del último mensaje (más reciente primero)
          const sorted = processedConversations.sort((a: Conversation, b: Conversation) => {
            const aTime = a.lastMessageTime?.getTime() || 0;
            const bTime = b.lastMessageTime?.getTime() || 0;
            return bTime - aTime;
          });
          
          return sorted;
        });
      }
    } catch (error) {
      console.error('Error obteniendo conversaciones:', error);
    }
  }, []);

  const fetchMessages = useCallback(async (otherUserId: string) => {
    try {
      const response = await fetch(`/api/internal-chat/messages?userId=${otherUserId}`, {
        credentials: 'include',
      });

      if (response.status === 401) {
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const processedMessages = (data.messages || [])
          .filter((msg: any) => {
            return msg.content !== undefined && 
                   msg.fromUserId !== undefined && 
                   msg.toUserId !== undefined &&
                   !msg.sessionId &&
                   !msg.clientName &&
                   !msg.fromClient;
          })
          .map((msg: any) => ({
            id: msg.id,
            fromUserId: msg.fromUserId,
            fromUserName: msg.fromUserName || 'Usuario',
            toUserId: msg.toUserId,
            toUserName: msg.toUserName || 'Usuario',
            content: typeof msg.content === 'string' ? msg.content : String(msg.content || ''),
            createdAt: new Date(msg.createdAt),
            read: msg.read || false,
            readAt: msg.readAt ? new Date(msg.readAt) : undefined,
          }));

        // Actualizar solo si hay cambios
        setMessages(prev => {
          const prevIds = new Set(prev.map(m => m.id));
          const newIds = new Set<string>(processedMessages.map((m: InternalMessage) => m.id));
          
          if (prevIds.size !== newIds.size || 
              [...prevIds].some((id: string) => !newIds.has(id)) ||
              [...newIds].some((id: string) => !prevIds.has(id))) {
            return processedMessages.sort((a: InternalMessage, b: InternalMessage) => 
              a.createdAt.getTime() - b.createdAt.getTime()
            );
          }
          return prev;
        });

        // Marcar como leídos
        markMessagesAsRead(otherUserId);
      }
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
    }
  }, [currentUser, markMessagesAsRead]);

  // Inicializar y cargar datos
  useEffect(() => {
    async function init() {
      try {
        // Obtener usuario y tenantId
        const userRes = await fetch('/api/user', { credentials: 'include' });
        if (userRes.ok) {
          const userData = await userRes.json();
          if (userData.user) {
            setCurrentUser(userData.user);
            setTenantId(userData.user.tenantId || userData.user.dealerId);
          }
        }

        // Obtener dealer
        const dealerRes = await fetch('/api/dealer', { credentials: 'include' });
        if (dealerRes.ok) {
          const dealerData = await dealerRes.json();
          if (dealerData.dealer) {
            setDealer(dealerData.dealer);
            if (!tenantId && dealerData.dealer.tenantId) {
              setTenantId(dealerData.dealer.tenantId);
            }
          }
        }

        // Cargar conversaciones iniciales y usuarios disponibles
        await Promise.all([
          fetchConversations(),
          fetchAvailableUsers(),
        ]);
      } catch (error) {
        console.error('Error inicializando:', error);
        setError('Error al cargar el chat');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Polling para conversaciones
  useEffect(() => {
    if (!currentUser || !tenantId) return;

    // Limpiar intervalo anterior
    if (conversationsPollingRef.current) {
      clearInterval(conversationsPollingRef.current);
    }

    // Cargar inmediatamente
    fetchConversations();

    // Polling cada 5 segundos (reducido para menos carga)
    conversationsPollingRef.current = setInterval(() => {
      fetchConversations();
    }, 5000);

    return () => {
      if (conversationsPollingRef.current) {
        clearInterval(conversationsPollingRef.current);
      }
    };
  }, [currentUser, tenantId, fetchConversations]);

  // Polling para mensajes cuando hay conversación seleccionada
  useEffect(() => {
    if (!selectedUserId || !currentUser) {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      setMessages([]);
      return;
    }

    // Limpiar intervalo anterior
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Cargar mensajes inmediatamente
    fetchMessages(selectedUserId);

    // Polling cada 2 segundos para tiempo casi real (reducido para menos carga)
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages(selectedUserId);
    }, 2000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [selectedUserId, currentUser, fetchMessages, markMessagesAsRead]);

  // Scroll automático
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const deleteConversation = useCallback(async (userId: string) => {
    try {
      const response = await fetch(`/api/internal-chat/conversations/delete?userId=${userId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Si la conversación eliminada es la seleccionada, limpiar selección
        if (selectedUserId === userId) {
          setSelectedUserId(null);
          setMessages([]);
        }
        // Refrescar conversaciones
        await fetchConversations();
      } else {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al eliminar conversación');
      }
    } catch (error: any) {
      console.error('Error eliminando conversación:', error);
      alert(error.message || 'Error al eliminar conversación');
    }
  }, [selectedUserId, fetchConversations]);

  // Solicitar permisos de notificación al cargar
  useEffect(() => {
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
  }, []);

  // Detectar nuevos mensajes y mostrar notificaciones
  useEffect(() => {
    if (messages.length > previousMessagesCountRef.current && currentUser) {
      const newMessages = messages.slice(previousMessagesCountRef.current);
      const unreadMessages = newMessages.filter(
        (msg) => msg.toUserId === currentUser.id && !msg.read
      );

      if (unreadMessages.length > 0 && selectedUserId !== unreadMessages[0].fromUserId) {
        // Reproducir sonido
        if (audioRef.current) {
          audioRef.current.play().catch(() => {
            // Ignorar errores de reproducción
          });
        }

        // Mostrar notificación del navegador
        if ('Notification' in window && Notification.permission === 'granted') {
          const message = unreadMessages[0];
          const conversation = conversations.find((c) => c.userId === message.fromUserId);
          const userName = conversation?.userName || message.fromUserName || 'Usuario';

          new Notification(`Nuevo mensaje de ${userName}`, {
            body: message.content.length > 100 
              ? message.content.substring(0, 100) + '...' 
              : message.content,
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: `chat-${message.fromUserId}`,
            requireInteraction: false,
          });
        }
      }
    }

    previousMessagesCountRef.current = messages.length;
  }, [messages, currentUser, selectedUserId, conversations]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !currentUser || sending) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await fetch('/api/internal-chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          toUserId: selectedUserId,
          content: messageContent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al enviar mensaje');
      }

      // Refrescar mensajes inmediatamente después de enviar
      setTimeout(() => {
        fetchMessages(selectedUserId);
        fetchConversations();
      }, 500);
    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      setNewMessage(messageContent);
      setError('Error al enviar mensaje: ' + error.message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSending(false);
    }
  };

  const selectedUserName = selectedUserId
    ? conversations.find(c => c.userId === selectedUserId)?.userName ||
      dealer?.name ||
      'Usuario'
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Chat Interno</h1>
            <p className="text-sm text-gray-500 mt-1">Comunícate con tu equipo</p>
          </div>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Lista de Conversaciones */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-gray-900">Conversaciones</h2>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => {
                  fetchAvailableUsers();
                  setShowNewChatModal(true);
                }}
                className="flex-1 bg-primary-600 text-white py-2 px-3 rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nueva Conversación
              </button>
            </div>
            <div className="text-xs text-gray-500">
              {conversations.length} conversación{conversations.length !== 1 ? 'es' : ''}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-sm font-medium">No hay conversaciones</p>
                <p className="text-gray-400 text-xs mt-2">Inicia una nueva conversación</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.userId}
                  className={`p-4 border-b transition-colors hover:bg-gray-50 group relative ${
                    selectedUserId === conv.userId ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                  }`}
                >
                  <div
                    onClick={() => {
                      setSelectedUserId(conv.userId);
                      markMessagesAsRead(conv.userId);
                    }}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-semibold text-gray-900 truncate flex-1">{conv.userName}</p>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <span className="bg-primary-600 text-white text-xs font-bold rounded-full px-2 py-1 min-w-[20px] text-center">
                            {conv.unreadCount}
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`¿Estás seguro de que quieres eliminar la conversación con ${conv.userName}?`)) {
                              deleteConversation(conv.userId);
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"
                          title="Eliminar conversación"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {conv.lastMessage && (
                      <p className="text-sm text-gray-600 truncate mb-1">{conv.lastMessage}</p>
                    )}
                    {conv.lastMessageTime && (
                      <p className="text-xs text-gray-400">
                        {conv.lastMessageTime.toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Área de Chat */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedUserId ? (
            <>
              {/* Header del chat */}
              <div className="bg-white border-b px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900">{selectedUserName}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {messages.length > 0 ? `${messages.length} mensaje${messages.length !== 1 ? 's' : ''}` : 'Sin mensajes'}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      fetchMessages(selectedUserId);
                      fetchConversations();
                    }}
                    className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
                    title="Actualizar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Mensajes */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">No hay mensajes aún</p>
                      <p className="text-gray-300 text-xs mt-1">Envía el primer mensaje</p>
                    </div>
                  </div>
                ) : (
                  messages.map((message) => {
                    const isOwn = message.fromUserId === currentUser?.id;
                    const messageDate = message.createdAt;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-md ${isOwn ? 'order-2' : 'order-1'}`}>
                          {!isOwn && (
                            <p className="text-xs text-gray-500 mb-1 px-2">{message.fromUserName}</p>
                          )}
                          <div
                            className={`rounded-2xl px-4 py-2 shadow-sm ${
                              isOwn
                                ? 'bg-primary-600 text-white rounded-br-sm'
                                : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                            <div className={`flex items-center justify-end gap-1 mt-1 ${
                              isOwn ? 'text-primary-100' : 'text-gray-400'
                            }`}>
                              <span className="text-xs">
                                {messageDate.toLocaleTimeString('es-ES', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                              {isOwn && (
                                <span className="text-xs ml-1">
                                  {message.read ? '✓✓' : '✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input de mensaje */}
              <div className="bg-white border-t px-6 py-4">
                <div className="flex items-center gap-3">
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
                    className="flex-1 border border-gray-300 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || sending}
                    className="bg-primary-600 text-white rounded-full p-2.5 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[44px] flex items-center justify-center"
                    title="Enviar mensaje"
                  >
                    {sending ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-500 font-medium">Selecciona una conversación</p>
                <p className="text-gray-400 text-sm mt-1">Elige un contacto para comenzar a chatear</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal para nueva conversación */}
      {showNewChatModal && (
        <NewChatModal
          users={availableUsers}
          currentUserId={currentUser?.id}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelect={(userId) => {
            setSelectedUserId(userId);
            setShowNewChatModal(false);
            markMessagesAsRead(userId);
            setTimeout(() => {
              fetchMessages(userId);
              fetchConversations();
            }, 500);
          }}
          onClose={() => {
            setShowNewChatModal(false);
            setSearchQuery('');
          }}
          loading={loadingUsers}
        />
      )}
    </div>
  );
}

function NewChatModal({
  users,
  currentUserId,
  searchQuery,
  onSearchChange,
  onSelect,
  onClose,
  loading,
}: {
  users: any[];
  currentUserId?: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSelect: (userId: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  // Filtrar usuarios disponibles (excluir el usuario actual)
  const filteredUsers = users.filter((user) => {
    const isNotCurrentUser = user.id !== currentUserId;
    const isActive = user.status === 'active' || !user.status;
    const matchesSearch = !searchQuery || 
      (user.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.role || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    return isNotCurrentUser && isActive && matchesSearch;
  });

  // Agrupar por rol
  const usersByRole = filteredUsers.reduce((acc, user) => {
    const role = user.role || 'other';
    if (!acc[role]) {
      acc[role] = [];
    }
    acc[role].push(user);
    return acc;
  }, {} as Record<string, any[]>);

  const roleLabels: Record<string, string> = {
    dealer: 'Dealers',
    seller: 'Vendedores',
    fi_manager: 'F&I Managers',
    manager: 'Gerentes',
    admin: 'Administradores',
    other: 'Otros',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Nueva Conversación</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, email o rol..."
            className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-2">
                {searchQuery ? 'No se encontraron usuarios' : 'No hay usuarios disponibles'}
              </p>
              <p className="text-sm text-gray-400">
                {searchQuery ? 'Intenta con otro término de búsqueda' : 'Verifica que tengas usuarios creados en la plataforma'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(usersByRole).map(([role, roleUsers]) => {
                const users = roleUsers as any[];
                return (
                <div key={role}>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
                    {roleLabels[role] || role}
                  </h3>
                  <div className="space-y-2">
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => onSelect(user.id)}
                        className="w-full text-left p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-primary-300 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{user.name || user.email}</p>
                            {user.email && user.name && (
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            )}
                          </div>
                          <div className="ml-4 flex-shrink-0">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                              {roleLabels[role] || role}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
