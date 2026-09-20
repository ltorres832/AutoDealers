import { getFirestore, notifyFIDocumentEvent } from '@autodealers/core';
import * as admin from 'firebase-admin';
import { addFIRequestNote, getFIRequestById } from './finance-insurance';

export interface FIEmailReplyWebhookResult {
  received: true;
  processed: boolean;
  reason?: string;
}

const db = getFirestore();

function firstValue(value: unknown): string {
  if (Array.isArray(value)) return String(value[0] || '');
  return String(value || '');
}

function extractReplyAddress(body: any): string {
  return firstValue(
    body.data?.to ||
      body.data?.recipient ||
      body.to ||
      body.recipient ||
      body.envelope?.to ||
      body.headers?.to
  );
}

function extractSender(body: any): string {
  return firstValue(body.data?.from_email || body.data?.from || body.from || body.from_email);
}

function extractSubject(body: any): string {
  return firstValue(body.data?.subject || body.subject);
}

function extractContent(body: any): string {
  return firstValue(body.data?.text || body.data?.html || body.text || body.html);
}

export async function processFIEmailReplyWebhook(body: any): Promise<FIEmailReplyWebhookResult> {
  const replyToEmail = extractReplyAddress(body);
  const match = replyToEmail.match(/fi-([^-@]+)-([^@]+)@/);

  if (!match) {
    console.warn('Respuesta F&I sin alias válido:', replyToEmail);
    return { received: true, processed: false, reason: 'invalid_reply_alias' };
  }

  const [, requestId, token] = match;
  const replyDoc = await db.collection('fi_email_replies').doc(token).get();
  if (!replyDoc.exists) {
    console.warn('Token de respuesta F&I no encontrado:', token);
    return { received: true, processed: false, reason: 'reply_token_not_found' };
  }

  const replyData = replyDoc.data();
  if (!replyData || replyData.requestId !== requestId) {
    console.warn('Respuesta F&I no coincide con solicitud:', { requestId, token });
    return { received: true, processed: false, reason: 'request_mismatch' };
  }

  const replyEmail = extractSender(body);
  const subject = extractSubject(body);
  const content = extractContent(body);

  await addFIRequestNote(
    replyData.tenantId,
    requestId,
    `Respuesta recibida de ${replyEmail || 'tercero'}:\n\n${content || '(Sin contenido)'}`,
    'system',
    true
  );

  await db
    .collection('tenants')
    .doc(replyData.tenantId)
    .collection('fi_requests')
    .doc(requestId)
    .collection('external_emails')
    .add({
      type: 'reply',
      from: replyEmail,
      subject,
      body: content,
      receivedAt: admin.firestore.FieldValue.serverTimestamp(),
      replyToken: token,
    });

  const fiRequest = await getFIRequestById(replyData.tenantId, requestId).catch(() => null);
  await notifyFIDocumentEvent(replyData.tenantId, {
    title: 'Respuesta externa F&I recibida',
    message: `Respuesta recibida de ${replyEmail || 'tercero'} para la solicitud F&I.`,
    sellerId: fiRequest?.createdBy,
    requestId,
    clientId: fiRequest?.clientId,
    route: `/fi/requests/${requestId}`,
  });

  return { received: true, processed: true };
}
