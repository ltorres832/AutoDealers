// Ganchos de apertura contextuales según el origen del lead
// "preguntaste por...", "solicitaste información sobre...", "vi que te interesa..."

import type { Lead } from '@autodealers/crm';
import type { LeadOpeningHook } from './types';

function vehicleReferenceFromLead(lead: Lead): string | undefined {
  if (lead.vehicleStockSnapshot) {
    const v: any = lead.vehicleStockSnapshot;
    const parts = [v.year, v.make, v.model].filter(Boolean);
    if (parts.length) return parts.join(' ');
  }
  if (lead.vehicleInterest && lead.vehicleInterest.trim()) {
    return lead.vehicleInterest.trim();
  }
  return undefined;
}

/**
 * Resuelve la frase de apertura según cómo llegó el lead.
 * El agente la usa después de confirmar identidad y dar el aviso de grabación.
 */
export function resolveLeadOpeningHook(lead: Lead): LeadOpeningHook {
  const vehicle = vehicleReferenceFromLead(lead);
  const vehiclePart = vehicle ? ` el ${vehicle}` : ' uno de nuestros vehículos';

  switch (lead.source) {
    case 'facebook':
      return {
        hookPhrase: lead.metaLeadGenId
          ? `Vi que llenaste el formulario de nuestro anuncio en Facebook y solicitaste información sobre${vehiclePart}.`
          : `Vi que nos escribiste por Facebook preguntando por${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'Facebook',
      };
    case 'instagram':
      return {
        hookPhrase: `Vi que nos escribiste por Instagram y te interesa${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'Instagram',
      };
    case 'whatsapp':
      return {
        hookPhrase: `Vi que nos escribiste por WhatsApp preguntando por${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'WhatsApp',
      };
    case 'web':
      return {
        hookPhrase: `Vi que solicitaste información en nuestra página web sobre${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'Página web',
      };
    case 'email':
      return {
        hookPhrase: `Recibimos tu correo preguntando por${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'Email',
      };
    case 'sms':
      return {
        hookPhrase: `Recibimos tu mensaje de texto preguntando por${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'SMS',
      };
    case 'phone':
      return {
        hookPhrase: `Nos llamaste hace poco interesado en${vehiclePart}.`,
        vehicleReference: vehicle,
        sourceLabel: 'Llamada',
      };
    default:
      return {
        hookPhrase: vehicle
          ? `Tenemos registrado que te interesa el ${vehicle}.`
          : 'Quería darte seguimiento a tu interés en nuestros vehículos.',
        vehicleReference: vehicle,
        sourceLabel: 'CRM',
      };
  }
}
