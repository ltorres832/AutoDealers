"use strict";
// Servicio de SMS (Twilio)
Object.defineProperty(exports, "__esModule", { value: true });
exports.SMSService = void 0;
class SMSService {
    constructor(accountSid, authToken, phoneNumber) {
        this.accountSid = accountSid;
        this.authToken = authToken;
        this.phoneNumber = phoneNumber;
    }
    /**
     * Envía un SMS
     */
    async sendSMS(payload) {
        try {
            const auth = btoa(`${this.accountSid}:${this.authToken}`);
            const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`, {
                method: 'POST',
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    From: this.phoneNumber,
                    To: payload.to,
                    Body: payload.content,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Failed to send SMS');
            }
            return {
                id: data.sid,
                status: 'sent',
                externalId: data.sid,
            };
        }
        catch (error) {
            return {
                id: '',
                status: 'failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
}
exports.SMSService = SMSService;
//# sourceMappingURL=sms.js.map