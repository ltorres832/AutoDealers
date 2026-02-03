// Tipos del módulo de mensajería

export type MessageChannel =
  | 'whatsapp'
  | 'facebook'
  | 'instagram'
  | 'email'
  | 'sms';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';

export interface MessagePayload {
  tenantId: string;
  leadId?: string;
  channel: MessageChannel;
  direction: MessageDirection;
  from: string;
  to: string;
  content: string;
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface MessageResponse {
  id: string;
  status: MessageStatus;
  externalId?: string;
  error?: string;
}

export interface WebhookPayload {
  channel: MessageChannel;
  tenantId: string;
  data: Record<string, any>;
}





