// Definiciones de herramientas (function calling) para OpenAI Realtime

export interface VoiceToolDefinition {
  type: 'function';
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export const VOICE_TOOL_DEFINITIONS: VoiceToolDefinition[] = [
  {
    type: 'function',
    name: 'confirmIdentityAndDisclosure',
    description:
      'Llamar cuando la persona confirmó su identidad y ya se le dio el aviso de grabación. Obligatorio antes de entrar en materia.',
    parameters: {
      type: 'object',
      properties: {
        identityConfirmed: { type: 'boolean', description: 'La persona confirmó ser el cliente' },
      },
      required: ['identityConfirmed'],
    },
  },
  {
    type: 'function',
    name: 'findLeadByPhone',
    description:
      'Buscar el historial del cliente por su número de teléfono (llamadas entrantes). Devuelve datos del lead y su memoria.',
    parameters: {
      type: 'object',
      properties: {
        phone: { type: 'string', description: 'Número de teléfono del cliente' },
      },
      required: ['phone'],
    },
  },
  {
    type: 'function',
    name: 'listAvailableInventory',
    description:
      'Buscar vehículos disponibles en el inventario real. Usar SIEMPRE antes de mencionar disponibilidad o precios.',
    parameters: {
      type: 'object',
      properties: {
        make: { type: 'string', description: 'Marca (ej. Toyota)' },
        model: { type: 'string', description: 'Modelo (ej. Corolla)' },
        maxPrice: { type: 'number', description: 'Precio máximo' },
        minYear: { type: 'number', description: 'Año mínimo' },
        limit: { type: 'number', description: 'Cantidad máxima de resultados (default 5)' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'getActivePromotions',
    description: 'Obtener las promociones activas reales del negocio.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'checkAppointmentAvailability',
    description: 'Verificar disponibilidad de citas de ventas o test drive en una fecha.',
    parameters: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Fecha deseada en formato YYYY-MM-DD' },
      },
      required: ['date'],
    },
  },
  {
    type: 'function',
    name: 'createAppointment',
    description: 'Agendar una cita de ventas, consulta o test drive con el cliente.',
    parameters: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['consultation', 'test_drive'], description: 'Tipo de cita' },
        scheduledAt: { type: 'string', description: 'Fecha y hora ISO (ej. 2026-07-22T14:00:00)' },
        vehicleId: { type: 'string', description: 'ID del vehículo si aplica' },
        notes: { type: 'string', description: 'Notas para el vendedor' },
      },
      required: ['type', 'scheduledAt'],
    },
  },
  {
    type: 'function',
    name: 'createServiceAppointment',
    description: 'Agendar una cita de servicio o mantenimiento (si el negocio lo ofrece).',
    parameters: {
      type: 'object',
      properties: {
        serviceType: { type: 'string', description: 'Servicio solicitado (ej. cambio de aceite)' },
        scheduledAt: { type: 'string', description: 'Fecha y hora ISO' },
        vehicleDescription: { type: 'string', description: 'Vehículo del cliente (año marca modelo)' },
        notes: { type: 'string' },
      },
      required: ['serviceType', 'scheduledAt'],
    },
  },
  {
    type: 'function',
    name: 'recordPurchaseBlocker',
    description:
      'Registrar un impedimento de compra que mencionó el cliente (ej. "espera el income tax", "tiene que vender su carro").',
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'Descripción breve del impedimento' },
      },
      required: ['description'],
    },
  },
  {
    type: 'function',
    name: 'markBlockerCongratulated',
    description: 'Marcar que ya felicitaste al cliente por un impedimento resuelto.',
    parameters: {
      type: 'object',
      properties: {
        blockerId: { type: 'string', description: 'ID del impedimento resuelto' },
      },
      required: ['blockerId'],
    },
  },
  {
    type: 'function',
    name: 'saveMemoryNote',
    description:
      'Guardar en la memoria del cliente un dato relevante: preferencia, contexto personal, nombre preferido.',
    parameters: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['preference', 'personal', 'preferredName', 'vehicleDiscussed'],
        },
        key: { type: 'string', description: 'Clave (solo para preference, ej. "color")' },
        value: { type: 'string', description: 'Valor o texto de la nota' },
      },
      required: ['kind', 'value'],
    },
  },
  {
    type: 'function',
    name: 'requestCallback',
    description: 'Registrar que el cliente pidió que un vendedor humano le devuelva la llamada.',
    parameters: {
      type: 'object',
      properties: {
        preferredTime: { type: 'string', description: 'Cuándo prefiere que le llamen' },
        reason: { type: 'string', description: 'Motivo' },
      },
      required: [],
    },
  },
  {
    type: 'function',
    name: 'markDoNotCall',
    description: 'El cliente pidió que NO lo llamen más. Registrarlo de inmediato.',
    parameters: { type: 'object', properties: {}, required: [] },
  },
  {
    type: 'function',
    name: 'endCallSummary',
    description:
      'Llamar al FINAL de la conversación (tras despedirte) con el resumen para el vendedor humano.',
    parameters: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Resumen ejecutivo de la llamada (2-4 oraciones)' },
        nextSteps: {
          type: 'array',
          items: { type: 'string' },
          description: 'Próximos pasos accionables para el vendedor',
        },
        outcome: {
          type: 'string',
          enum: [
            'appointment_scheduled',
            'service_appointment_scheduled',
            'callback_requested',
            'interested',
            'not_interested',
            'no_answer',
            'voicemail',
            'wrong_person',
            'escalated',
            'do_not_call',
            'other',
          ],
        },
      },
      required: ['summary', 'outcome'],
    },
  },
];
