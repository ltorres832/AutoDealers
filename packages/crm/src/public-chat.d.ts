export interface PublicChatMessage {
    id: string;
    tenantId: string;
    sessionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    fromClient: boolean;
    fromUserId?: string;
    fromUserName?: string;
    content: string;
    attachments?: string[];
    read: boolean;
    readAt?: Date;
    createdAt: Date;
}
/**
 * Crea un mensaje de chat público
 */
export declare function createPublicChatMessage(tenantId: string, sessionId: string, clientName: string, clientEmail: string | undefined, clientPhone: string | undefined, fromClient: boolean, content: string, fromUserId?: string, fromUserName?: string, attachments?: string[]): Promise<PublicChatMessage>;
/**
 * Obtiene mensajes de una sesión de chat público
 */
export declare function getPublicChatMessages(tenantId: string, sessionId: string): Promise<PublicChatMessage[]>;
/**
 * Obtiene todas las conversaciones de chat público para un tenant
 */
export declare function getPublicChatConversations(tenantId: string): Promise<Array<{
    sessionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    lastMessage: PublicChatMessage | null;
    unreadCount: number;
    createdAt: Date;
}>>;
/**
 * Marca mensajes de una sesión como leídos
 */
export declare function markPublicChatMessagesAsRead(tenantId: string, sessionId: string, userId: string): Promise<void>;
//# sourceMappingURL=public-chat.d.ts.map