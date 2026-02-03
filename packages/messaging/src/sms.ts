// Servicio de SMS (Twilio)

import { MessagePayload, MessageResponse } from './types';

export class SMSService {
  private accountSid: string;
  private authToken: string;
  private phoneNumber: string;

  constructor(accountSid: string, authToken: string, phoneNumber: string) {
    this.accountSid = accountSid;
    this.authToken = authToken;
    this.phoneNumber = phoneNumber;
  }

  /**
   * Envía un SMS
   */
  async sendSMS(payload: MessagePayload): Promise<MessageResponse> {
    try {
      const auth = btoa(`${this.accountSid}:${this.authToken}`);
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
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
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send SMS');
      }

      return {
        id: data.sid,
        status: 'sent',
        externalId: data.sid,
      };
    } catch (error) {
      return {
        id: '',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}





