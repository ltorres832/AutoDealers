import * as admin from 'firebase-admin';
import { EmailService } from '@autodealers/messaging';
import { getEmailCredentials, getFirestore, getNewsletterAudience } from '@autodealers/core';

const BATCH_SIZE = 20;

function wrapNewsletterHtml(subject: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; color: #111; line-height: 1.6;">
      <div style="border-bottom: 3px solid #E10600; padding-bottom: 16px; margin-bottom: 24px;">
        <strong style="font-size: 18px; color: #5c0300;">AutoDealers</strong>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Boletín informativo</div>
      </div>
      <h1 style="font-size: 22px; margin: 0 0 16px;">${subject}</h1>
      <div>${bodyHtml}</div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
        Recibes este correo porque te registraste en AutoDealers o te suscribiste a nuestra newsletter.
      </p>
    </div>
  `;
}

export async function sendNewsletterCampaign(params: {
  subject: string;
  bodyHtml: string;
  sentByUserId: string;
  audience: 'all_active' | 'newsletter_only' | 'users_only';
}): Promise<{
  campaignId: string;
  total: number;
  successful: number;
  failed: number;
  errors: string[];
}> {
  const subject = params.subject.trim();
  const bodyHtml = params.bodyHtml.trim();
  if (!subject || !bodyHtml) {
    throw new Error('Asunto y contenido son obligatorios.');
  }

  const emailCreds = await getEmailCredentials();
  const emailApiKey = emailCreds.apiKey || '';
  if (!emailApiKey) {
    throw new Error('Email API Key no configurada. Configúrala en Admin → General y credenciales.');
  }

  const provider =
    emailApiKey.includes('re_') || emailApiKey.startsWith('re_') ? 'resend' : 'sendgrid';
  const emailService = new EmailService(emailApiKey, provider, emailCreds.fromAddress);
  const from = emailCreds.fromAddress || 'noreply@autodealers.com';
  const html = wrapNewsletterHtml(subject, bodyHtml);

  let audience = await getNewsletterAudience();
  audience = audience.filter((row) => row.status === 'active');

  if (params.audience === 'newsletter_only') {
    audience = audience.filter((row) =>
      row.sources.some((s) => s === 'landing_footer' || s === 'admin_import')
    );
  } else if (params.audience === 'users_only') {
    audience = audience.filter((row) => row.sources.includes('user_registration'));
  }

  const recipients = audience.map((r) => r.email);
  if (recipients.length === 0) {
    throw new Error('No hay destinatarios activos para esta audiencia.');
  }

  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((to) =>
        emailService.sendEmail({
          tenantId: 'platform',
          channel: 'email',
          direction: 'outbound',
          from,
          to,
          content: html,
          metadata: { subject, campaignType: 'newsletter' },
        })
      )
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      const to = batch[j];
      if (result.status === 'fulfilled' && result.value.status !== 'failed') {
        successful += 1;
      } else {
        failed += 1;
        const err =
          result.status === 'rejected'
            ? result.reason instanceof Error
              ? result.reason.message
              : String(result.reason)
            : result.value.error || 'Error desconocido';
        if (errors.length < 10) errors.push(`${to}: ${err}`);
      }
    }
  }

  const db = getFirestore();
  const campaignRef = db.collection('newsletter_campaigns').doc();
  await campaignRef.set({
    subject,
    bodyHtml,
    audience: params.audience,
    sentByUserId: params.sentByUserId,
    totalRecipients: recipients.length,
    successful,
    failed,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    campaignId: campaignRef.id,
    total: recipients.length,
    successful,
    failed,
    errors,
  };
}
