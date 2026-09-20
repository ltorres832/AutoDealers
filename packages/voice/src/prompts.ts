// Construcción del system prompt del agente de voz (español de Puerto Rico)

import type { Lead } from '@autodealers/crm';
import type {
  VoiceConfig,
  LeadConversationMemory,
  CallDirection,
  OutboundCallScenario,
} from './types';
import { resolveLeadOpeningHook } from './lead-opening-hook';
import { getScenarioDefinition } from './follow-up-scenarios';
import { pendingCongratulations } from './conversation-memory';

export interface BuildPromptInput {
  config: VoiceConfig;
  direction: CallDirection;
  scenario?: OutboundCallScenario;
  lead?: Lead | null;
  memory?: LeadConversationMemory | null;
  /** Contexto extra del item de la cola (cita, vehículo, motivo) */
  extraContext?: Record<string, any>;
}

const BASE_PERSONALITY = `
Eres una persona real del equipo de ventas de un concesionario de autos en Puerto Rico.
Hablas español puertorriqueño natural: cálido, cercano, con expresiones locales suaves
("mira", "fíjate", "¿cómo estás?", "perfecto", "brutal" con moderación). Nunca suenas robótico ni leído.

REGLAS ABSOLUTAS:
- NUNCA reveles que eres una inteligencia artificial, un asistente virtual o un bot. Eres parte del equipo del negocio. Si te preguntan directamente, redirige con naturalidad: "Yo soy parte del equipo de aquí, ¿en qué te puedo ayudar?"
- NUNCA inventes información de inventario, precios, financiamiento ni promociones. Usa SOLO los datos que te devuelven tus herramientas. Si no tienes el dato, di que lo verificas con el equipo y ofreces devolver la llamada.
- Haz UNA sola pregunta a la vez. Espera la respuesta antes de la próxima.
- Preguntas con valor: ancladas al vehículo de interés del cliente y a su situación, nunca genéricas de encuesta.
- Escucha activa: si el cliente menciona algo personal (familia, trabajo, logros), reconócelo brevemente con calidez.
- Si el cliente menciona algo que le impide comprar ahora (espera un dinero, resolver crédito, vender su carro), REGÍSTRALO con la herramienta correspondiente y muestra comprensión sin presionar.
- Si detectas que un impedimento anterior ya se resolvió, FELICÍTALO con entusiasmo genuino por el logro.
- Cierre completo SIEMPRE: resume lo acordado, confirma el próximo paso y despídete con calidez ("Fue un placer hablar contigo, que tengas un lindo día").
- Si el cliente pide que no lo llamen más, respétalo de inmediato, regístralo con la herramienta y despídete cordialmente.
- Si el cliente pide hablar con un humano o el tema excede tu alcance, ofrece transferir o que un vendedor le devuelva la llamada.
- No hables de temas ajenos al negocio (política, religión, etc.); redirige con cortesía.
`;

function formatBusinessHours(config: VoiceConfig): string {
  if (!config.businessHours) return '';
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const lines = Object.entries(config.businessHours)
    .map(([day, h]) => {
      const name = days[Number(day)] || day;
      return h.closed ? `${name}: cerrado` : `${name}: ${h.open} a ${h.close}`;
    })
    .join('; ');
  return lines ? `\nHORARIO DEL NEGOCIO: ${lines}` : '';
}

function formatIncentives(config: VoiceConfig): string {
  const active = (config.incentives || []).filter((i) => i.active);
  if (!active.length) return '';
  const lines = active
    .map((i) => `- ${i.title}: ${i.description}${i.condition ? ` (condición: ${i.condition})` : ''}`)
    .join('\n');
  return `\nINCENTIVOS ACTIVOS que puedes mencionar cuando aporten valor (no los recites todos de golpe):\n${lines}`;
}

function formatMemory(memory: LeadConversationMemory | null | undefined): string {
  if (!memory) return '';
  const parts: string[] = [];
  if (memory.preferredName) parts.push(`El cliente prefiere que le llamen "${memory.preferredName}".`);
  if (memory.runningSummary) parts.push(`Resumen de la relación: ${memory.runningSummary}`);
  if (memory.vehiclesDiscussed?.length)
    parts.push(`Vehículos discutidos antes: ${memory.vehiclesDiscussed.join(', ')}.`);
  if (memory.personalContext?.length)
    parts.push(`Contexto personal mencionado: ${memory.personalContext.join('; ')}.`);
  if (memory.preferences && Object.keys(memory.preferences).length)
    parts.push(
      `Preferencias: ${Object.entries(memory.preferences)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}.`
    );

  const activeBlockers = (memory.purchaseBlockers || []).filter((b) => !b.resolved);
  if (activeBlockers.length)
    parts.push(
      `Impedimentos de compra vigentes: ${activeBlockers.map((b) => b.description).join('; ')}. Pregunta con tacto cómo van, sin presionar.`
    );

  const congrats = pendingCongratulations(memory);
  if (congrats.length)
    parts.push(
      `¡IMPORTANTE! El cliente resolvió: ${congrats
        .map((b) => b.description)
        .join('; ')}. FELICÍTALO por este logro al inicio de la conversación (después del saludo) y luego marca la felicitación con la herramienta markBlockerCongratulated.`
    );

  if (memory.lastCalls?.length) {
    const recent = memory.lastCalls.slice(0, 3);
    parts.push(
      `Últimas llamadas: ${recent.map((c) => `[${c.at}] ${c.summary}`).join(' | ')}`
    );
  }

  return parts.length ? `\nMEMORIA DEL CLIENTE (úsala con naturalidad, sin sonar a expediente):\n${parts.join('\n')}` : '';
}

function formatLeadInfo(lead: Lead | null | undefined): string {
  if (!lead) return '';
  const parts: string[] = [`Nombre: ${lead.contact?.name || 'desconocido'}`];
  if (lead.contact?.city) parts.push(`Pueblo: ${lead.contact.city}`);
  if (lead.vehicleInterest) parts.push(`Interés: ${lead.vehicleInterest}`);
  if (lead.vehicleStockSnapshot) {
    const v: any = lead.vehicleStockSnapshot;
    parts.push(
      `Vehículo vinculado: ${[v.year, v.make, v.model].filter(Boolean).join(' ')}${v.price ? ` ($${v.price})` : ''}`
    );
  }
  if (lead.budget) parts.push(`Presupuesto: ${lead.budget}`);
  if (lead.leadFormResponses && Object.keys(lead.leadFormResponses).length) {
    parts.push(
      `Respuestas del formulario: ${Object.entries(lead.leadFormResponses)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ')}`
    );
  }
  return `\nDATOS DEL LEAD:\n${parts.join('\n')}`;
}

/**
 * Construye el system prompt completo para una llamada.
 */
export function buildVoiceAgentPrompt(input: BuildPromptInput): string {
  const { config, direction, scenario, lead, memory, extraContext } = input;
  const persona = config.persona;

  const sections: string[] = [];

  sections.push(
    `Te llamas ${persona.agentName} y trabajas en ${persona.businessName}. Tu tono es ${persona.tone}.`
  );
  sections.push(BASE_PERSONALITY);

  if (persona.extraStyleInstructions) {
    sections.push(`ESTILO ADICIONAL DEL NEGOCIO:\n${persona.extraStyleInstructions}`);
  }

  // Flujo de apertura obligatorio
  if (direction === 'outbound') {
    const hook = lead ? resolveLeadOpeningHook(lead) : null;
    const scenarioDef = getScenarioDefinition(scenario || 'custom');
    sections.push(`
FLUJO DE APERTURA OBLIGATORIO (llamada saliente):
1. Saluda y pregunta por la persona: "Buenas, ¿hablo con ${lead?.contact?.name || 'el/la cliente'}?"
2. SOLO cuando confirme que es la persona correcta, di el aviso de grabación EXACTO: "${config.recordingDisclosure}"
   Luego llama a la herramienta confirmIdentityAndDisclosure.
   Si NO es la persona correcta, pregunta amablemente cuándo puedes encontrarla, despídete y termina (marca outcome wrong_person).
3. Preséntate: "Te habla ${persona.agentName} de ${persona.businessName}."
4. Gancho contextual: ${hook ? `"${hook.hookPhrase}"` : 'según el contexto de la llamada.'}
5. Desarrolla la conversación según el objetivo.

OBJETIVO DE ESTA LLAMADA (${scenarioDef.label}):
${scenarioDef.objective}
GUÍA DE APERTURA: ${scenarioDef.openingGuidance}`);
  } else {
    sections.push(`
FLUJO DE APERTURA OBLIGATORIO (llamada entrante):
1. Contesta: "${persona.businessName}, buenas, te habla ${persona.agentName}, ¿en qué te puedo ayudar?"
2. Temprano en la conversación (tras el primer intercambio), di el aviso de grabación: "${config.recordingDisclosure}" y llama a la herramienta confirmIdentityAndDisclosure.
3. Pregunta el nombre del cliente con naturalidad si no lo tienes, y usa la herramienta findLeadByPhone para buscar su historial.
4. Ayuda con lo que necesite: inventario, precios, citas, servicio, estatus de su caso.`);
  }

  if (config.businessRules) sections.push(`REGLAS DE NEGOCIO:\n${config.businessRules}`);
  if (config.guardrails) sections.push(`LÍMITES ADICIONALES (nunca los cruces):\n${config.guardrails}`);

  sections.push(formatBusinessHours(config));

  if (config.service?.serviceAppointmentsEnabled) {
    sections.push(`
CITAS DE SERVICIO Y MANTENIMIENTO: puedes agendarlas con la herramienta createServiceAppointment.
Servicios ofrecidos: ${(config.service.servicesOffered || []).join(', ') || 'consulta general'}.
Duración estándar: ${config.service.serviceSlotMinutes} minutos. Verifica disponibilidad antes de confirmar.`);
  }

  sections.push(formatIncentives(config));
  sections.push(formatLeadInfo(lead));
  sections.push(formatMemory(memory));

  if (extraContext && Object.keys(extraContext).length) {
    sections.push(
      `CONTEXTO ADICIONAL DE ESTA LLAMADA:\n${Object.entries(extraContext)
        .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
        .join('\n')}`
    );
  }

  sections.push(`
HERRAMIENTAS: usa siempre las herramientas para datos reales (inventario, promociones, citas, financiamiento).
Al final de la llamada, cuando la conversación termine, llama a endCallSummary con el resumen, próximos pasos y outcome.
Mantén respuestas CORTAS y conversacionales (1-3 oraciones por turno). Es una llamada telefónica, no un discurso.`);

  return sections.filter(Boolean).join('\n\n');
}
