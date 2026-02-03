import { TemplateType, TemplateEvent } from './communication-templates';
/**
 * Envía una comunicación automática según el evento
 */
export declare function sendAutomaticCommunication(event: TemplateEvent, type: TemplateType, subscriptionId: string, additionalVariables?: Record<string, string | number>): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
}>;
//# sourceMappingURL=communication-sender.d.ts.map