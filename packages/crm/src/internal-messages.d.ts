export interface InternalMessage {
    id: string;
    tenantId: string;
    fromUserId: string;
    fromUserName: string;
    toUserId: string;
    toUserName: string;
    content: string;
    attachments?: string[];
    read: boolean;
    readAt?: Date;
    createdAt: Date;
}
/**
 * Crea un mensaje interno
 */
export declare function createInternalMessage(tenantId: string, fromUserId: string, fromUserName: string, toUserId: string, toUserName: string, content: string, attachments?: string[]): Promise<InternalMessage>;
/**
 * Obtiene mensajes internos entre dos usuarios
 */
export declare function getInternalMessages(tenantId: string, userId1: string, userId2: string): Promise<InternalMessage[]>;
/**
 * Obtiene conversaciones de un usuario
 */
export declare function getInternalConversations(tenantId: string, userId: string): Promise<Array<{
    otherUserId: string;
    otherUserName: string;
    lastMessage: InternalMessage | null;
    unreadCount: number;
}>>;
/**
 * Marca mensajes como leídos
 */
export declare function markInternalMessagesAsRead(tenantId: string, fromUserId: string, toUserId: string): Promise<void>;
//# sourceMappingURL=internal-messages.d.ts.map