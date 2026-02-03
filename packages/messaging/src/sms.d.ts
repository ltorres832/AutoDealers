import { MessagePayload, MessageResponse } from './types';
export declare class SMSService {
    private accountSid;
    private authToken;
    private phoneNumber;
    constructor(accountSid: string, authToken: string, phoneNumber: string);
    /**
     * Envía un SMS
     */
    sendSMS(payload: MessagePayload): Promise<MessageResponse>;
}
//# sourceMappingURL=sms.d.ts.map