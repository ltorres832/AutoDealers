// Callback de grabaciones Twilio: descarga la grabación,
// la sube a Firebase Storage y actualiza el call log.

import { onRequest } from 'firebase-functions/v2/https';
import { getStorage } from 'firebase-admin/storage';
import { updateCallLog, getCallLog, findCallLogByTwilioSid } from '@autodealers/voice';
import { getTwilioCredentials } from '@autodealers/core';
import { publicWebhookHttpsOptions } from './public-http';

/** Descarga y sube grabaciones a Storage; necesita más memoria que un webhook simple. */
const recordingHttpsOptions = { ...publicWebhookHttpsOptions, memory: '512MiB' as const };

export const twilioVoiceRecording = onRequest(recordingHttpsOptions, async (req, res) => {
  try {
    const tenantId = String(req.query.tenantId || '');
    let callLogId = String(req.query.callLogId || '');
    const recordingSid = String(req.body?.RecordingSid || '');
    const recordingUrl = String(req.body?.RecordingUrl || '');
    const recordingStatus = String(req.body?.RecordingStatus || '');
    const callSid = String(req.body?.CallSid || '');
    const duration = Number(req.body?.RecordingDuration || 0);

    if (!tenantId || !recordingUrl || recordingStatus !== 'completed') {
      res.status(200).send('OK');
      return;
    }

    if (!callLogId && callSid) {
      const log = await findCallLogByTwilioSid(tenantId, callSid);
      if (log) callLogId = log.id;
    }
    if (!callLogId) {
      console.warn('[twilio-recording] Sin callLogId para la grabación', recordingSid);
      res.status(200).send('OK');
      return;
    }

    // Guardar la URL de Twilio de inmediato (fallback si falla la migración a Storage)
    await updateCallLog(tenantId, callLogId, { twilioRecordingUrl: recordingUrl });

    const { accountSid, authToken } = await getTwilioCredentials();
    if (!accountSid || !authToken) {
      console.error('[twilio-recording] Sin credenciales Twilio para descargar grabación');
      res.status(200).send('OK');
      return;
    }

    // Descargar mp3 desde Twilio
    const audioResponse = await fetch(`${recordingUrl}.mp3`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    });
    if (!audioResponse.ok) {
      console.error(`[twilio-recording] Error descargando grabación: ${audioResponse.status}`);
      res.status(200).send('OK');
      return;
    }
    const buffer = Buffer.from(await audioResponse.arrayBuffer());

    // Subir a Firebase Storage
    const storagePath = `tenants/${tenantId}/call-recordings/${callLogId}.mp3`;
    const bucket = getStorage().bucket();
    await bucket.file(storagePath).save(buffer, {
      contentType: 'audio/mpeg',
      metadata: {
        metadata: {
          tenantId,
          callLogId,
          recordingSid,
          twilioCallSid: callSid,
        },
      },
    });

    const patch: any = { recordingStoragePath: storagePath };
    const existing = await getCallLog(tenantId, callLogId);
    if (duration > 0 && !existing?.durationSeconds) {
      patch.durationSeconds = duration;
    }
    await updateCallLog(tenantId, callLogId, patch);

    console.log(`[twilio-recording] Grabación guardada: ${storagePath} (${buffer.length} bytes)`);
    res.status(200).send('OK');
  } catch (error) {
    console.error('[twilio-recording] Error procesando grabación:', error);
    res.status(200).send('OK');
  }
});
