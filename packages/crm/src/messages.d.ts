import { Message } from './types';
/**
 * Crea un nuevo mensaje en el CRM
 */
export declare function createMessage(messageData: Omit<Message, 'id' | 'createdAt'>): Promise<Message>;
/**
 * Obtiene un mensaje por ID
 */
export declare function getMessageById(tenantId: string, messageId: string): Promise<Message | null>;
/**
 * Obtiene mensajes de un lead
 */
export declare function getLeadMessages(tenantId: string, leadId: string): Promise<Message[]>;
/**
 * Obtiene mensajes por canal
 */
export declare function getMessagesByChannel(tenantId: string, channel: Message['channel'], limit?: number): Promise<Message[]>;
/**
 * Actualiza el estado de un mensaje
 */
export declare function updateMessageStatus(tenantId: string, messageId: string, status: Message['status']): Promise<void>;
//# sourceMappingURL=messages.d.ts.map