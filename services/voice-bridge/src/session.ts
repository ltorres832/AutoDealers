// Sesión de llamada: puente Twilio Media Streams <-> OpenAI Realtime

import type WebSocket from 'ws';
import {
  buildVoiceAgentPrompt,
  getVoiceConfigOrDefault,
  getLeadConversationMemory,
  finalizeCallLog,
  appendCallToMemory,
  consumeCallUsage,
  TranscriptAccumulator,
  VOICE_TOOL_DEFINITIONS,
  saveLeadConversationMemory,
  type CallDirection,
  type OutboundCallScenario,
} from '@autodealers/voice';
import { OpenAIRealtimeClient } from './openai-realtime';
import { ToolExecutor } from './tools';

export interface CallSessionParams {
  tenantId: string;
  callLogId: string;
  direction: CallDirection;
  leadId?: string;
  scenario?: OutboundCallScenario;
  extraContext?: Record<string, any>;
  /** CallSid de Twilio (para iniciar grabación en llamadas entrantes) */
  callSid?: string;
}

export class CallSession {
  private twilioWs: WebSocket;
  private params: CallSessionParams;
  private openai: OpenAIRealtimeClient | null = null;
  private streamSid = '';
  private transcript: TranscriptAccumulator;
  private tools: ToolExecutor | null = null;
  private startedAt = Date.now();
  private finalized = false;

  constructor(twilioWs: WebSocket, params: CallSessionParams) {
    this.twilioWs = twilioWs;
    this.params = params;
    this.transcript = new TranscriptAccumulator(this.startedAt);
  }

  async start(): Promise<void> {
    const { tenantId, leadId, direction, scenario, callLogId } = this.params;

    const config = await getVoiceConfigOrDefault(tenantId);

    let lead: any = null;
    let memory: any = null;
    if (leadId) {
      try {
        const crm: any = await import('@autodealers/crm');
        lead = await crm.getLeadById(tenantId, leadId);
        memory = await getLeadConversationMemory(tenantId, leadId);
      } catch (error) {
        console.warn('[voice-bridge] No se pudo cargar lead/memoria:', error);
      }
    }

    this.tools = new ToolExecutor({
      tenantId,
      leadId,
      callLogId,
      assignedTo: lead?.assignedTo,
      serviceSlotMinutes: config.service?.serviceSlotMinutes || 60,
    });

    const instructions = buildVoiceAgentPrompt({
      config,
      direction,
      scenario,
      lead,
      memory,
      extraContext: this.params.extraContext,
    });

    const apiKey = await this.resolveOpenAIKey();
    if (!apiKey) {
      console.error('[voice-bridge] Sin API key de OpenAI; terminando llamada');
      this.twilioWs.close();
      return;
    }

    this.openai = new OpenAIRealtimeClient({
      apiKey,
      voice: config.persona?.voiceId || 'marin',
      instructions,
      tools: VOICE_TOOL_DEFINITIONS,
      onAudioDelta: (audio) => this.sendAudioToTwilio(audio),
      onAgentTranscript: (text) => this.transcript.addTurn('agent', text),
      onCustomerTranscript: (text) => this.transcript.addTurn('customer', text),
      onSpeechStarted: () => this.handleInterruption(),
      onToolCall: (callId, name, args) => void this.handleToolCall(callId, name, args),
      onError: () => {
        /* logged upstream */
      },
      onClose: () => {
        /* Twilio stop finaliza la sesión */
      },
    });

    await this.openai.connect();

    this.twilioWs.on('message', (raw) => this.handleTwilioMessage(raw.toString()));
    this.twilioWs.on('close', () => void this.finalize('completed'));
    this.twilioWs.on('error', () => void this.finalize('failed'));

    // Grabación: las salientes se graban al crearse (Record=true);
    // las entrantes se inician aquí vía REST (la llamada ya está in-progress).
    if (direction === 'inbound' && this.params.callSid) {
      void this.startInboundRecording(this.params.callSid);
    }
  }

  private async startInboundRecording(callSid: string) {
    try {
      const core: any = await import('@autodealers/core');
      const { accountSid, authToken } = await core.getTwilioCredentials();
      const baseUrl = (process.env.VOICE_FUNCTIONS_BASE_URL || '').replace(/\/$/, '');
      if (!accountSid || !authToken) return;

      const body = new URLSearchParams({ RecordingChannels: 'dual' });
      if (baseUrl) {
        body.set(
          'RecordingStatusCallback',
          `${baseUrl}/twilioVoiceRecording?tenantId=${this.params.tenantId}&callLogId=${this.params.callLogId}`
        );
      }

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${callSid}/Recordings.json`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      );
      if (!response.ok) {
        console.warn(`[voice-bridge] No se pudo iniciar grabación inbound: ${response.status}`);
      }
    } catch (error) {
      console.warn('[voice-bridge] Error iniciando grabación inbound:', error);
    }
  }

  private async resolveOpenAIKey(): Promise<string | undefined> {
    if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
    try {
      const core: any = await import('@autodealers/core');
      return await core.getOpenAIApiKey();
    } catch {
      return undefined;
    }
  }

  private handleTwilioMessage(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start':
        this.streamSid = msg.start?.streamSid || '';
        // El agente inicia la conversación (saludo)
        this.openai?.requestInitialResponse();
        break;
      case 'media':
        if (msg.media?.payload) {
          this.openai?.appendAudio(msg.media.payload);
        }
        break;
      case 'stop':
        void this.finalize('completed');
        break;
      default:
        break;
    }
  }

  private sendAudioToTwilio(base64Audio: string) {
    if (this.twilioWs.readyState !== this.twilioWs.OPEN || !this.streamSid) return;
    this.twilioWs.send(
      JSON.stringify({
        event: 'media',
        streamSid: this.streamSid,
        media: { payload: base64Audio },
      })
    );
  }

  /** El cliente empezó a hablar: cortar el audio del agente (barge-in natural). */
  private handleInterruption() {
    this.openai?.cancelResponse();
    if (this.twilioWs.readyState === this.twilioWs.OPEN && this.streamSid) {
      this.twilioWs.send(JSON.stringify({ event: 'clear', streamSid: this.streamSid }));
    }
  }

  private async handleToolCall(callId: string, name: string, args: any) {
    if (!this.tools || !this.openai) return;
    const result = await this.tools.execute(name, args);
    this.openai.submitToolResult(callId, result);
  }

  private async finalize(status: 'completed' | 'failed') {
    if (this.finalized) return;
    this.finalized = true;

    try {
      this.openai?.close();
    } catch {
      /* noop */
    }

    const { tenantId, callLogId, direction } = this.params;
    const endedAt = new Date();
    const durationSeconds = Math.round((Date.now() - this.startedAt) / 1000);
    const endData = this.tools?.endCallData || null;
    const leadId = this.tools?.leadId || this.params.leadId;

    try {
      await finalizeCallLog(tenantId, callLogId, {
        status,
        endedAt,
        durationSeconds,
        transcript: this.transcript.getTurns(),
        summary: endData?.summary,
        nextSteps: endData?.nextSteps,
        outcome: endData?.outcome,
        identityConfirmed: this.tools?.identityConfirmed,
        disclosureGiven: this.tools?.disclosureGiven,
      });
    } catch (error) {
      console.error('[voice-bridge] Error finalizando call log:', error);
    }

    // Memoria del lead: resumen de la llamada + resumen acumulado
    if (leadId && endData?.summary) {
      try {
        await appendCallToMemory(tenantId, leadId, {
          callId: callLogId,
          summary: endData.summary,
          outcome: endData.outcome,
        });
        const memory = await getLeadConversationMemory(tenantId, leadId);
        const prior = memory?.runningSummary ? `${memory.runningSummary} | ` : '';
        const running = `${prior}${endData.summary}`.slice(-2000);
        await saveLeadConversationMemory(tenantId, leadId, { runningSummary: running });
      } catch (error) {
        console.error('[voice-bridge] Error actualizando memoria:', error);
      }
    }

    // Uso: llamada + minutos (overage automático si aplica)
    try {
      const billedMinutes = Math.ceil(durationSeconds / 60);
      await consumeCallUsage(tenantId, direction, billedMinutes);
    } catch (error) {
      console.error('[voice-bridge] Error registrando uso:', error);
    }

    try {
      if (this.twilioWs.readyState === this.twilioWs.OPEN) this.twilioWs.close();
    } catch {
      /* noop */
    }
  }
}
