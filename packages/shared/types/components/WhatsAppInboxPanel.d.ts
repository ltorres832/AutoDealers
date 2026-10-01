export type WhatsAppInboxMessage = {
    id: string;
    direction: 'inbound' | 'outbound';
    content: string;
    status?: string;
    aiGenerated?: boolean;
    createdAt: Date | {
        toDate?: () => Date;
    } | string | number;
    metadata?: {
        deliveryError?: string | null;
        isRead?: boolean;
    };
    isRead?: boolean;
};
export type WhatsAppInboxConversation = {
    leadId: string;
    leadName: string;
    messages: WhatsAppInboxMessage[];
    unread: number;
    lastMessage?: string;
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
export declare function WhatsAppInboxPanel({ conversations, loading, selectedConversation, onSelectConversation, conversationMessages, messagesLoading, tenantId, messagesApiPath, whatsappStatusPath, templatesPath, integrationsHref, leadHref, onGenerateAI, }: Props): import("react/jsx-runtime").JSX.Element;
export {};
