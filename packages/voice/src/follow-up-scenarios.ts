// Escenarios de llamadas salientes y su contexto para el prompt

import type { OutboundCallScenario } from './types';

export interface ScenarioDefinition {
  scenario: OutboundCallScenario;
  label: string;
  /** Objetivo principal de la llamada, inyectado en el prompt */
  objective: string;
  /** Guía de apertura específica del escenario */
  openingGuidance: string;
}

export const OUTBOUND_SCENARIOS: Record<OutboundCallScenario, ScenarioDefinition> = {
  new_lead_follow_up: {
    scenario: 'new_lead_follow_up',
    label: 'Seguimiento a lead nuevo',
    objective:
      'Contactar al lead poco después de su solicitud, responder sus preguntas sobre el vehículo de interés y agendar una cita o test drive.',
    openingGuidance:
      'Usa el gancho de apertura según el origen del lead (formulario, web, redes). Menciona el vehículo específico si existe.',
  },
  social_lead_follow_up: {
    scenario: 'social_lead_follow_up',
    label: 'Seguimiento a lead de redes sociales',
    objective:
      'Dar seguimiento inmediato a un lead que llegó por redes sociales (Meta Lead Ads, WhatsApp, Messenger, Instagram), retomando lo que preguntó y llevándolo a una cita.',
    openingGuidance:
      'Referencia la conversación o el anuncio de la red social. Si hay historial de chat, retómalo con naturalidad.',
  },
  sales_follow_up: {
    scenario: 'sales_follow_up',
    label: 'Seguimiento de ventas',
    objective:
      'Retomar una negociación en progreso, resolver dudas pendientes, verificar si los impedimentos anteriores siguen vigentes y avanzar hacia el cierre.',
    openingGuidance:
      'Recuerda lo hablado antes. Si un impedimento fue resuelto, felicita al cliente por el logro con genuino entusiasmo.',
  },
  fi_follow_up: {
    scenario: 'fi_follow_up',
    label: 'Seguimiento F&I / financiamiento',
    objective:
      'Dar seguimiento a una solicitud de financiamiento: documentos pendientes, estatus de aprobación, próximos pasos.',
    openingGuidance:
      'Sé claro y tranquilizador con temas de financiamiento. No prometas aprobaciones; informa el estatus real.',
  },
  appointment_reminder: {
    scenario: 'appointment_reminder',
    label: 'Recordatorio de cita',
    objective:
      'Confirmar la asistencia a una cita próxima, resolver dudas de última hora y reagendar si es necesario.',
    openingGuidance: 'Menciona fecha, hora y tipo de cita. Ofrece reagendar si no puede asistir.',
  },
  appointment_no_show: {
    scenario: 'appointment_no_show',
    label: 'Cita perdida (no-show)',
    objective:
      'Contactar con empatía a quien no llegó a su cita, entender qué pasó y reagendar sin presionar.',
    openingGuidance: 'Sin reproches. "Te esperábamos y queríamos saber si todo está bien."',
  },
  post_sale_check_in: {
    scenario: 'post_sale_check_in',
    label: 'Seguimiento post-venta',
    objective:
      'Verificar la satisfacción del cliente con su vehículo recién comprado, resolver dudas y sembrar referidos.',
    openingGuidance: 'Felicita por la compra. Pregunta cómo le ha ido con el vehículo.',
  },
  maintenance_reminder: {
    scenario: 'maintenance_reminder',
    label: 'Recordatorio de mantenimiento',
    objective:
      'Recordar el mantenimiento programado del vehículo y agendar una cita de servicio.',
    openingGuidance:
      'Menciona el vehículo y el servicio que corresponde (ej. cambio de aceite). Ofrece agendar de una vez.',
  },
  service_follow_up: {
    scenario: 'service_follow_up',
    label: 'Seguimiento de servicio',
    objective:
      'Verificar satisfacción tras un servicio realizado y detectar necesidades adicionales.',
    openingGuidance: 'Pregunta cómo quedó el vehículo tras el servicio.',
  },
  reactivation: {
    scenario: 'reactivation',
    label: 'Reactivación de lead frío',
    objective:
      'Reconectar con un lead inactivo, verificar si sigue interesado y presentar novedades del inventario o incentivos.',
    openingGuidance:
      'Retoma la última conversación. Si mencionó un impedimento (ej. esperar ingresos), pregunta cómo va y felicita si lo logró.',
  },
  birthday: {
    scenario: 'birthday',
    label: 'Cumpleaños / aniversario',
    objective:
      'Felicitar al cliente por su cumpleaños o aniversario de compra y fortalecer la relación.',
    openingGuidance: 'Llamada breve y cálida. Solo vende si el cliente abre la puerta.',
  },
  review_request: {
    scenario: 'review_request',
    label: 'Solicitud de reseña',
    objective:
      'Pedir amablemente una reseña a un cliente satisfecho y ofrecer enviar el enlace por texto.',
    openingGuidance: 'Solo pide reseña si el cliente expresa satisfacción primero.',
  },
  custom: {
    scenario: 'custom',
    label: 'Personalizado',
    objective: 'Objetivo definido por el dealer en el contexto de la llamada.',
    openingGuidance: 'Sigue las instrucciones del contexto adicional.',
  },
};

export function getScenarioDefinition(scenario: OutboundCallScenario): ScenarioDefinition {
  return OUTBOUND_SCENARIOS[scenario] || OUTBOUND_SCENARIOS.custom;
}
