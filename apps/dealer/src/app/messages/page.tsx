'use client';

import { useEffect, useState, useCallback } from 'react';
import { WhatsAppInboxPanel } from '@autodealers/shared/client';
import { useRealtimeMessages, useRealtimeConversation } from '@/hooks/useRealtimeMessages';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';

export default function MessagesPage() {
  const [user, setUser] = useState<{ tenantId?: string } | null>(null);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  useEffect(() => {
    void fetchWithAuth('/api/user', {})
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch((err) => console.error('Error fetching user:', err));
  }, []);

  const tenantId = getDealerActiveTenantId(user?.tenantId ?? null) || user?.tenantId || '';

  const { conversations, loading } = useRealtimeMessages(tenantId);
  const selectedConversation =
    conversations.find((c) => c.leadId === selectedLeadId) ?? null;

  const { messages: conversationMessages, loading: messagesLoading } = useRealtimeConversation(
    tenantId,
    selectedLeadId ?? undefined
  );

  const handleGenerateAI = useCallback(async (leadId: string, lastInbound: string) => {
    const response = await fetchWithAuth('/api/ai/generate-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId,
        message: lastInbound,
        context: 'Conversación de venta de auto por WhatsApp',
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return typeof data.response === 'string' ? data.response : null;
  }, []);

  return (
    <div className="container mx-auto px-3 py-4 sm:px-4 sm:py-8">
      <WhatsAppInboxPanel
        tenantId={tenantId}
        conversations={conversations}
        loading={loading}
        selectedConversation={selectedConversation}
        onSelectConversation={(conv) => setSelectedLeadId(conv?.leadId ?? null)}
        conversationMessages={conversationMessages}
        messagesLoading={messagesLoading}
        onGenerateAI={handleGenerateAI}
        integrationsHref="/settings/integrations"
        leadHref={(id) => `/leads/${id}`}
      />
    </div>
  );
}
