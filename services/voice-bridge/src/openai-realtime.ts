// Cliente WebSocket para OpenAI Realtime API GA (audio/pcmu <-> Twilio g711_ulaw)

import WebSocket from 'ws';

export interface RealtimeSessionOptions {
  apiKey: string;
  model?: string;
  voice: string;
  instructions: string;
  tools: any[];
  onAudioDelta: (base64Audio: string) => void;
  onAudioDone?: () => void;
  onAgentTranscript: (text: string) => void;
  onCustomerTranscript: (text: string) => void;
  onToolCall: (callId: string, name: string, args: any) => void;
  onSpeechStarted?: () => void;
  onError?: (error: any) => void;
  onClose?: () => void;
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private options: RealtimeSessionOptions;
  private closed = false;

  constructor(options: RealtimeSessionOptions) {
    this.options = options;
  }

  async connect(): Promise<void> {
    const model = this.options.model || process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime';
    // GA: sin header OpenAI-Beta (retirado 2026-05-12 → beta_api_shape_disabled)
    const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(model)}`;
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${this.options.apiKey}`,
      },
    });

    await new Promise<void>((resolve, reject) => {
      this.ws!.once('open', () => resolve());
      this.ws!.once('error', (err) => reject(err));
    });

    this.ws.on('message', (raw) => this.handleMessage(raw.toString()));
    this.ws.on('error', (err) => {
      console.error('[voice-bridge] OpenAI WS error:', err);
      this.options.onError?.(err);
    });
    this.ws.on('close', () => {
      if (!this.closed) this.options.onClose?.();
    });

    this.send({
      type: 'session.update',
      session: {
        type: 'realtime',
        model,
        instructions: this.options.instructions,
        output_modalities: ['audio'],
        audio: {
          input: {
            format: { type: 'audio/pcmu' },
            transcription: { model: 'whisper-1', language: 'es' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 600,
            },
          },
          output: {
            format: { type: 'audio/pcmu' },
            voice: this.options.voice,
          },
        },
        tools: this.options.tools,
        tool_choice: 'auto',
      },
    });
  }

  private handleMessage(raw: string) {
    let event: any;
    try {
      event = JSON.parse(raw);
    } catch {
      return;
    }

    switch (event.type) {
      // GA event names (+ legacy beta aliases por si el servidor aún emite alguno)
      case 'response.output_audio.delta':
      case 'response.audio.delta':
        if (event.delta) this.options.onAudioDelta(event.delta);
        break;
      case 'response.output_audio.done':
      case 'response.audio.done':
        this.options.onAudioDone?.();
        break;
      case 'response.output_audio_transcript.done':
      case 'response.audio_transcript.done':
        if (event.transcript) this.options.onAgentTranscript(event.transcript);
        break;
      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript) this.options.onCustomerTranscript(event.transcript);
        break;
      case 'input_audio_buffer.speech_started':
        this.options.onSpeechStarted?.();
        break;
      case 'response.function_call_arguments.done': {
        let args: any = {};
        try {
          args = event.arguments ? JSON.parse(event.arguments) : {};
        } catch {
          args = {};
        }
        this.options.onToolCall(event.call_id, event.name, args);
        break;
      }
      case 'error':
        console.error('[voice-bridge] OpenAI Realtime error:', JSON.stringify(event.error || event));
        this.options.onError?.(event.error || event);
        break;
      default:
        break;
    }
  }

  /** Audio del cliente (Twilio -> OpenAI), base64 g711_ulaw / audio/pcmu */
  appendAudio(base64Audio: string) {
    this.send({ type: 'input_audio_buffer.append', audio: base64Audio });
  }

  /** Resultado de una herramienta ejecutada */
  submitToolResult(callId: string, result: any) {
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'function_call_output',
        call_id: callId,
        output: JSON.stringify(result),
      },
    });
    this.send({ type: 'response.create' });
  }

  /** Pide al agente que hable primero (llamadas salientes / saludo inbound) */
  requestInitialResponse() {
    this.send({ type: 'response.create' });
  }

  /** Cancela la respuesta en curso (el cliente interrumpió) */
  cancelResponse() {
    this.send({ type: 'response.cancel' });
  }

  private send(payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  close() {
    this.closed = true;
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
  }
}
