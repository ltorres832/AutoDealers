// Tipos del módulo de Agente de Voz IA

// ============================================================
// Configuración del agente por tenant (voice_config/{tenantId})
// ============================================================

export type VoiceAgentGender = 'female' | 'male' | 'neutral';

export interface VoicePersonaConfig {
  /** Nombre con el que se presenta el agente (ej. "Valeria") */
  agentName: string;
  /** Nombre del negocio con el que se presenta (ej. "Autos del Caribe") */
  businessName: string;
  gender: VoiceAgentGender;
  /** Voz de OpenAI Realtime (alloy, echo, shimmer, etc.) */
  voiceId: string;
  /** Tono: cercano, profesional, entusiasta */
  tone: 'cercano' | 'profesional' | 'entusiasta';
  /** Instrucciones adicionales del dealer para el estilo de conversación */
  extraStyleInstructions?: string;
}

export interface VoiceBusinessHours {
  /** 0 = domingo ... 6 = sábado */
  [dayOfWeek: string]: { open: string; close: string; closed?: boolean };
}

export interface VoiceServiceConfig {
  /** Ofrece citas de servicio/mantenimiento */
  serviceAppointmentsEnabled: boolean;
  /** Duración por defecto de cita de servicio en minutos */
  serviceSlotMinutes: number;
  /** Horario del área de servicio */
  serviceHours?: VoiceBusinessHours;
  /** Servicios ofrecidos (ej. cambio de aceite, gomas, frenos) */
  servicesOffered?: string[];
}

export interface VoiceIncentive {
  id: string;
  title: string;
  description: string;
  /** Condición para mencionarlo (texto libre que el agente interpreta) */
  condition?: string;
  active: boolean;
  validUntil?: string;
}

export interface VoiceSocialAutoCallConfig {
  /** Llamar automáticamente a leads de Meta Lead Ads */
  metaLeadAdsEnabled: boolean;
  /** Llamar automáticamente a leads de WhatsApp */
  whatsappEnabled: boolean;
  /** Llamar automáticamente a leads de Facebook Messenger */
  messengerEnabled: boolean;
  /** Llamar automáticamente a leads de Instagram DM */
  instagramEnabled: boolean;
  /** Minutos de espera antes de llamar tras recibir el lead */
  delayMinutes: number;
  /** Solo llamar dentro de horario laboral */
  onlyBusinessHours: boolean;
}

export interface VoiceConfig {
  tenantId: string;
  enabled: boolean;
  inboundEnabled: boolean;
  outboundEnabled: boolean;
  persona: VoicePersonaConfig;
  /** Horario general del negocio */
  businessHours?: VoiceBusinessHours;
  /** Aviso de grabación (obligatorio, editable) */
  recordingDisclosure: string;
  /** Configuración de servicio/mantenimiento */
  service: VoiceServiceConfig;
  /** Incentivos activos que el agente puede mencionar */
  incentives: VoiceIncentive[];
  /** Auto-llamadas para leads de redes sociales */
  socialAutoCall: VoiceSocialAutoCallConfig;
  /** Número Twilio asignado al tenant (E.164) */
  twilioPhoneNumber?: string;
  /** Reglas de negocio adicionales en texto libre */
  businessRules?: string;
  /** Temas prohibidos / límites (guardrails) */
  guardrails?: string;
  /** Escalar a humano: número al que transferir si el cliente lo pide */
  escalationPhoneNumber?: string;
  /** Estado del aprovisionamiento automático (membresía con voz) */
  provisioning?: {
    status: 'ready' | 'pending' | 'error' | 'skipped';
    twilioSid?: string;
    error?: string;
    provisionedAt?: Date | string;
    source?: string;
  };
  updatedAt?: Date;
  updatedBy?: string;
}

// ============================================================
// Call logs (tenants/{tenantId}/call_logs/{callId})
// ============================================================

export type CallDirection = 'inbound' | 'outbound';

export type CallOutcome =
  | 'appointment_scheduled'
  | 'service_appointment_scheduled'
  | 'callback_requested'
  | 'interested'
  | 'not_interested'
  | 'no_answer'
  | 'voicemail'
  | 'wrong_person'
  | 'escalated'
  | 'do_not_call'
  | 'incomplete'
  | 'other';

export interface CallTranscriptTurn {
  role: 'agent' | 'customer';
  text: string;
  /** Milisegundos desde el inicio de la llamada */
  atMs?: number;
}

export interface CallLog {
  id: string;
  tenantId: string;
  leadId?: string;
  /** Vendedor asignado al lead en el momento de la llamada */
  assignedTo?: string;
  direction: CallDirection;
  /** Escenario de la llamada saliente (sales_follow_up, fi_follow_up, etc.) */
  scenario?: OutboundCallScenario;
  twilioCallSid: string;
  fromNumber: string;
  toNumber: string;
  status: 'queued' | 'ringing' | 'in_progress' | 'completed' | 'failed' | 'no_answer' | 'busy' | 'canceled';
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  /** Ruta en Firebase Storage de la grabación */
  recordingStoragePath?: string;
  /** URL de grabación en Twilio (temporal, antes de migrar a Storage) */
  twilioRecordingUrl?: string;
  transcript?: CallTranscriptTurn[];
  /** Resumen ejecutivo generado por IA para el vendedor */
  summary?: string;
  /** Próximos pasos sugeridos */
  nextSteps?: string[];
  outcome?: CallOutcome;
  /** Si la persona confirmó su identidad antes del aviso de grabación */
  identityConfirmed?: boolean;
  /** Si se leyó el aviso de grabación */
  disclosureGiven?: boolean;
  /** Minutos facturables (redondeo hacia arriba) */
  billedMinutes?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Memoria conversacional (tenants/{tenantId}/lead_conversation_memory/{leadId})
// ============================================================

export interface PurchaseBlocker {
  id: string;
  description: string;
  detectedAt: Date | string;
  resolved: boolean;
  resolvedAt?: Date | string;
  /** Si ya se le felicitó por resolverlo */
  congratulated?: boolean;
}

export interface LeadConversationMemory {
  leadId: string;
  tenantId: string;
  /** Nombre preferido del cliente ("Don José", "Mari") */
  preferredName?: string;
  /** Vehículo(s) de interés mencionados en conversaciones */
  vehiclesDiscussed?: string[];
  /** Impedimentos de compra detectados (ej. "espera el income tax") */
  purchaseBlockers?: PurchaseBlocker[];
  /** Datos personales mencionados (hijos, trabajo, hobbies) para rapport */
  personalContext?: string[];
  /** Preferencias detectadas (color, pronto disponible, pago mensual objetivo) */
  preferences?: Record<string, string>;
  /** Resumen acumulado de todas las interacciones */
  runningSummary?: string;
  /** Últimas llamadas resumidas */
  lastCalls?: Array<{ callId: string; at: Date | string; summary: string; outcome?: CallOutcome }>;
  /** No llamar a este cliente */
  doNotCall?: boolean;
  updatedAt?: Date;
}

// ============================================================
// Cola de llamadas salientes (voice_outbound_queue)
// ============================================================

export type OutboundCallScenario =
  | 'new_lead_follow_up'
  | 'social_lead_follow_up'
  | 'sales_follow_up'
  | 'fi_follow_up'
  | 'appointment_reminder'
  | 'appointment_no_show'
  | 'post_sale_check_in'
  | 'maintenance_reminder'
  | 'service_follow_up'
  | 'reactivation'
  | 'birthday'
  | 'review_request'
  | 'custom';

export interface VoiceOutboundQueueItem {
  id: string;
  tenantId: string;
  leadId: string;
  scenario: OutboundCallScenario;
  toNumber: string;
  /** Cuándo debe ejecutarse (Date) */
  scheduledFor: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'canceled' | 'skipped';
  attempts: number;
  maxAttempts: number;
  /** Contexto adicional para el prompt (ej. cita, vehículo, motivo) */
  context?: Record<string, any>;
  lastError?: string;
  callId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Opening hooks según origen del lead
// ============================================================

export interface LeadOpeningHook {
  /** Frase de apertura contextual ("preguntaste por...", "solicitaste información sobre...") */
  hookPhrase: string;
  /** Vehículo de referencia si existe */
  vehicleReference?: string;
  /** Origen normalizado del lead */
  sourceLabel: string;
}
