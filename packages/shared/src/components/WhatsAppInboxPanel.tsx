'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

export type WhatsAppInboxMessage = {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  status?: string;
  aiGenerated?: boolean;
  createdAt: Date | { toDate?: () => Date } | string | number;
  metadata?: { deliveryError?: string | null; isRead?: boolean };
  isRead?: boolean;
};

export type WhatsAppInboxConversation = {
  leadId: string;
  leadName: string;
  messages: WhatsAppInboxMessage[];
  unread: number;
  lastMessage?: string;
};

type QuickTemplate = { id: string; name: string; content: string };

type ConnectionStatus = {
  connected: boolean;
  message: string;
  platformConfigured?: boolean;
};

type Props = {
  conversations: WhatsAppInboxConversation[];
  loading: boolean;
  selectedConversation: WhatsAppInboxConversation | null;
  onSelectConversation: (conv: WhatsAppInboxConversation | null) => void;
  conversationMessages: WhatsAppInboxMessage[];
  messagesLoading: boolean;
  tenantId?: string;
  messagesApiPath?: string;
  whatsappStatusPath?: string;
  templatesPath?: string;
  aiGeneratePath?: string;
  integrationsHref?: string;
  leadHref?: (leadId: string) => string;
  onGenerateAI?: (leadId: string, lastInbound: string) => Promise<string | null>;
};

function formatTime(value: WhatsAppInboxMessage['createdAt']): string {
  let date: Date;
  if (value instanceof Date) date = value;
  else if (value && typeof value === 'object' && 'toDate' in value && value.toDate) {
    date = value.toDate();
  } else date = new Date(value as string | number);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function WhatsAppInboxPanel({
  conversations,
  loading,
  selectedConversation,
  onSelectConversation,
  conversationMessages,
  messagesLoading,
  tenantId,
  messagesApiPath = '/api/messages',
  whatsappStatusPath = '/api/messages/whatsapp-status',
  templatesPath = '/api/settings/templates?type=whatsapp',
  integrationsHref = '/settings/integrations',
  leadHref = (id) => `/leads/${id}`,
  onGenerateAI,
}: Props) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [connection, setConnection] = useState<ConnectionStatus | null>(null);
  const [templates, setTemplates] = useState<QuickTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void fetch(whatsappStatusPath, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => setConnection(data))
      .catch(() => setConnection({ connected: false, message: 'No se pudo verificar WhatsApp.' }));
  }, [whatsappStatusPath]);

  useEffect(() => {
    void fetch(templatesPath, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { templates: [] }))
      .then((data) => {
        const list = (data.templates ?? []) as Array<{ id: string; name: string; content: string }>;
        setTemplates(list.slice(0, 12));
      })
      .catch(() => setTemplates([]));
  }, [templatesPath]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationMessages, selectedConversation]);

  const markRead = useCallback(
    async (leadId: string) => {
      await fetch('/api/messages/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ leadId, channel: 'whatsapp' }),
      }).catch(() => undefined);
    },
    []
  );

  const handleSelect = useCallback(
    (conv: WhatsAppInboxConversation) => {
      onSelectConversation(conv);
      void markRead(conv.leadId);
    },
    [markRead, onSelectConversation]
  );

  async function sendMessage() {
    if (!newMessage.trim() || !selectedConversation || sending) return;
    setSending(true);
    setSendError('');

    try {
      const res = await fetch(messagesApiPath, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          leadId: selectedConversation.leadId,
          channel: 'whatsapp',
          content: newMessage.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSendError(data.error || 'No se pudo enviar el mensaje.');
        return;
      }
      setNewMessage('');
    } catch {
      setSendError('Error de red al enviar.');
    } finally {
      setSending(false);
    }
  }

  async function handleGenerateAI() {
    if (!selectedConversation || !onGenerateAI) return;
    const lastInbound = [...conversationMessages].reverse().find((m) => m.direction === 'inbound');
    if (!lastInbound) {
      setSendError('No hay mensajes del cliente para responder con IA.');
      return;
    }
    setGeneratingAI(true);
    setSendError('');
    try {
      const text = await onGenerateAI(selectedConversation.leadId, lastInbound.content);
      if (text) setNewMessage(text);
    } finally {
      setGeneratingAI(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">WhatsApp</h1>
          <p className="text-sm text-gray-500">Conversaciones con clientes en tiempo real</p>
        </div>
        {connection && (
          <div
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              connection.connected
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-900'
            }`}
          >
            {connection.connected ? '● Conectado' : '○ Sin conectar'}
          </div>
        )}
      </div>

      {connection && !connection.connected && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">WhatsApp no está listo</p>
          <p className="mt-1">{connection.message}</p>
          <Link href={integrationsHref} className="mt-2 inline-block font-medium text-emerald-700 hover:underline">
            Ir a Integraciones →
          </Link>
        </div>
      )}

      <div className="grid min-h-[calc(100dvh-12rem)] grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 md:h-[calc(100dvh-200px)]">
        <div
          className={`${
            selectedConversation ? 'hidden md:block' : 'block'
          } min-h-0 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-sm`}
        >
          <div className="border-b bg-emerald-50 px-4 py-3">
            <h2 className="font-semibold text-emerald-900">Conversaciones</h2>
          </div>
          {conversations.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">
              Cuando un cliente escriba por WhatsApp, la conversación aparecerá aquí.
            </p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.leadId}
                type="button"
                onClick={() => handleSelect(conv)}
                className={`w-full border-b px-4 py-3 text-left hover:bg-gray-50 ${
                  selectedConversation?.leadId === conv.leadId ? 'bg-emerald-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-medium text-gray-900">{conv.leadName}</p>
                  {conv.unread > 0 && (
                    <span className="shrink-0 rounded-full bg-emerald-600 px-2 py-0.5 text-xs text-white">
                      {conv.unread}
                    </span>
                  )}
                </div>
                {conv.lastMessage && (
                  <p className="mt-1 truncate text-sm text-gray-500">{conv.lastMessage}</p>
                )}
              </button>
            ))
          )}
        </div>

        <div
          className={`${
            selectedConversation ? 'flex' : 'hidden md:flex'
          } md:col-span-2 min-h-[calc(100dvh-14rem)] min-w-0 flex-col rounded-xl border border-gray-200 bg-white shadow-sm md:min-h-0`}
        >
          {selectedConversation ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectConversation(null)}
                    className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
                    aria-label="Volver"
                  >
                    ←
                  </button>
                  <div>
                    <h2 className="truncate font-bold">{selectedConversation.leadName}</h2>
                    <p className="text-xs text-emerald-600">WhatsApp Business</p>
                  </div>
                </div>
                <Link
                  href={leadHref(selectedConversation.leadId)}
                  className="text-sm font-medium text-emerald-700 hover:underline"
                >
                  Ver lead →
                </Link>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto bg-[#e5ddd5] p-4">
                {messagesLoading ? (
                  <p className="text-center text-sm text-gray-600">Cargando…</p>
                ) : (
                  conversationMessages.map((message) => {
                    const outbound = message.direction === 'outbound';
                    const failed = message.status === 'failed';
                    return (
                      <div
                        key={message.id}
                        className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-3 py-2 shadow-sm sm:max-w-md ${
                            outbound
                              ? failed
                                ? 'bg-red-100 text-red-900'
                                : 'bg-emerald-600 text-white'
                              : 'bg-white text-gray-900'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
                          <div
                            className={`mt-1 flex items-center gap-2 text-[10px] ${
                              outbound && !failed ? 'text-emerald-100' : 'text-gray-500'
                            }`}
                          >
                            <span>{formatTime(message.createdAt)}</span>
                            {message.aiGenerated && <span>· IA</span>}
                            {outbound && !failed && <span>· ✓</span>}
                            {failed && <span>· Error</span>}
                          </div>
                          {failed && message.metadata?.deliveryError && (
                            <p className="mt-1 text-xs text-red-700">{message.metadata.deliveryError}</p>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="shrink-0 border-t bg-white p-3 sm:p-4">
                {sendError && (
                  <p className="mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sendError}</p>
                )}

                <div className="mb-2 flex flex-wrap gap-2">
                  {onGenerateAI && (
                    <button
                      type="button"
                      onClick={handleGenerateAI}
                      disabled={generatingAI || !connection?.connected}
                      className="rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                    >
                      {generatingAI ? 'Generando…' : '✨ IA'}
                    </button>
                  )}
                  {templates.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowTemplates((v) => !v)}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Plantillas
                    </button>
                  )}
                </div>

                {showTemplates && templates.length > 0 && (
                  <div className="mb-2 max-h-32 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2">
                    {templates.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        className="mb-1 block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-white"
                        onClick={() => {
                          setNewMessage(t.content);
                          setShowTemplates(false);
                        }}
                      >
                        <span className="font-medium">{t.name}</span>
                        <span className="ml-2 text-gray-500 line-clamp-1">{t.content}</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendMessage();
                      }
                    }}
                    rows={2}
                    placeholder="Escribe un mensaje… (Enter para enviar)"
                    disabled={!connection?.connected || sending}
                    className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={sendMessage}
                    disabled={!connection?.connected || sending || !newMessage.trim()}
                    className="self-end rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {sending ? '…' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-gray-500">
              <div className="mb-3 text-4xl">💬</div>
              <p className="font-medium text-gray-700">Selecciona una conversación</p>
              <p className="mt-1 max-w-sm text-sm">
                Los mensajes de WhatsApp de tus clientes aparecen aquí en tiempo real.
              </p>
              {!tenantId && (
                <p className="mt-4 text-xs text-amber-600">Inicia sesión para ver tus conversaciones.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
