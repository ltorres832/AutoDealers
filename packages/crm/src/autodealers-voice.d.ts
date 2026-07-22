declare module '@autodealers/voice' {
  export function maybeEnqueueSocialLeadCall(
    tenantId: string,
    lead: { id: string; phone?: string | null; [key: string]: unknown }
  ): Promise<void>;
}
