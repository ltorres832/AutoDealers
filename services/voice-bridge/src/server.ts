// voice-bridge: servidor WebSocket para Twilio Media Streams <-> OpenAI Realtime
// Desplegado en Cloud Run. Twilio se conecta a wss://<host>/twilio-stream
// con parámetros custom (tenantId, callLogId, direction, leadId, scenario).

import http from 'http';
import { WebSocketServer } from 'ws';
import { CallSession } from './session';

const PORT = Number(process.env.PORT || 8080);

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'voice-bridge' }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server, path: '/twilio-stream' });

wss.on('connection', (ws) => {
  console.log('[voice-bridge] Conexión de Twilio entrante');
  let session: CallSession | null = null;

  // Esperar el evento "start" de Twilio para leer los customParameters
  const onFirstMessages = async (raw: Buffer | string) => {
    let msg: any;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.event === 'start') {
      ws.off('message', onFirstMessages);
      const params = msg.start?.customParameters || {};
      const tenantId = params.tenantId;
      const callLogId = params.callLogId;
      const direction = params.direction === 'outbound' ? 'outbound' : 'inbound';

      if (!tenantId || !callLogId) {
        console.error('[voice-bridge] Stream sin tenantId/callLogId; cerrando');
        ws.close();
        return;
      }

      let extraContext: Record<string, any> | undefined;
      if (params.extraContext) {
        try {
          extraContext = JSON.parse(params.extraContext);
        } catch {
          extraContext = undefined;
        }
      }

      session = new CallSession(ws as any, {
        tenantId,
        callLogId,
        direction,
        leadId: params.leadId || undefined,
        scenario: params.scenario || undefined,
        extraContext,
        callSid: params.callSid || msg.start?.callSid || undefined,
      });

      try {
        await session.start();
        // Reinyectar el evento start para que la sesión capture el streamSid y salude
        ws.emit('message', raw);
      } catch (error) {
        console.error('[voice-bridge] Error iniciando sesión:', error);
        ws.close();
      }
    }
  };

  ws.on('message', onFirstMessages);
  ws.on('error', (err) => console.error('[voice-bridge] WS error:', err));
});

server.listen(PORT, () => {
  console.log(`[voice-bridge] Escuchando en puerto ${PORT}`);
});
