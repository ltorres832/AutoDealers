// Precios base de excesos (overage) y paquetes de valor adicional.
// El admin puede sobreescribirlos en platform_settings/usage_pricing.

import { getFirestore } from '@autodealers/shared';

export type UsageMetric =
  | 'voiceMinutes'
  | 'voiceOutboundCalls'
  | 'voiceInboundCalls'
  | 'messages'
  | 'aiResponses'
  | 'emails'
  | 'leads'
  | 'appointments'
  | 'storageGB';

export interface OveragePriceConfig {
  metric: UsageMetric;
  /** Precio por unidad excedida en USD */
  unitPriceUsd: number;
  /** Unidad legible (minuto, llamada, mensaje...) */
  unitLabel: string;
  enabled: boolean;
}

export interface UsagePack {
  id: string;
  metric: UsageMetric;
  label: string;
  /** Unidades incluidas en el paquete */
  units: number;
  priceUsd: number;
  active: boolean;
}

export interface UsagePricingConfig {
  overages: Record<string, OveragePriceConfig>;
  packs: UsagePack[];
  updatedAt?: Date;
  updatedBy?: string;
}

/** Base configurable: precios por defecto de excesos. */
export const DEFAULT_OVERAGE_PRICES: Record<UsageMetric, OveragePriceConfig> = {
  voiceMinutes: { metric: 'voiceMinutes', unitPriceUsd: 0.25, unitLabel: 'minuto', enabled: true },
  voiceOutboundCalls: { metric: 'voiceOutboundCalls', unitPriceUsd: 0.5, unitLabel: 'llamada', enabled: true },
  voiceInboundCalls: { metric: 'voiceInboundCalls', unitPriceUsd: 0.35, unitLabel: 'llamada', enabled: true },
  messages: { metric: 'messages', unitPriceUsd: 0.03, unitLabel: 'mensaje', enabled: true },
  aiResponses: { metric: 'aiResponses', unitPriceUsd: 0.02, unitLabel: 'respuesta', enabled: true },
  emails: { metric: 'emails', unitPriceUsd: 0.005, unitLabel: 'email', enabled: true },
  leads: { metric: 'leads', unitPriceUsd: 0.1, unitLabel: 'lead', enabled: false },
  appointments: { metric: 'appointments', unitPriceUsd: 0.1, unitLabel: 'cita', enabled: false },
  storageGB: { metric: 'storageGB', unitPriceUsd: 0.5, unitLabel: 'GB', enabled: true },
};

/** Paquetes de valor adicional por defecto (upsell). */
export const DEFAULT_USAGE_PACKS: UsagePack[] = [
  { id: 'voice_100', metric: 'voiceMinutes', label: '100 minutos de voz', units: 100, priceUsd: 20, active: true },
  { id: 'voice_500', metric: 'voiceMinutes', label: '500 minutos de voz', units: 500, priceUsd: 85, active: true },
  { id: 'msg_1000', metric: 'messages', label: '1,000 mensajes', units: 1000, priceUsd: 25, active: true },
  { id: 'ai_2000', metric: 'aiResponses', label: '2,000 respuestas IA', units: 2000, priceUsd: 30, active: true },
];

export const USAGE_METRIC_LABELS: Record<UsageMetric, string> = {
  voiceMinutes: 'Minutos de voz',
  voiceOutboundCalls: 'Llamadas salientes',
  voiceInboundCalls: 'Llamadas entrantes',
  messages: 'Mensajes',
  aiResponses: 'Respuestas de IA',
  emails: 'Emails',
  leads: 'Leads',
  appointments: 'Citas',
  storageGB: 'Almacenamiento (GB)',
};

/** Config global efectiva: defaults + overrides del admin. */
export async function getUsagePricingConfig(): Promise<UsagePricingConfig> {
  try {
    const doc = await getFirestore().collection('platform_settings').doc('usage_pricing').get();
    if (!doc.exists) {
      return { overages: { ...DEFAULT_OVERAGE_PRICES }, packs: [...DEFAULT_USAGE_PACKS] };
    }
    const data = doc.data() || {};
    return {
      overages: { ...DEFAULT_OVERAGE_PRICES, ...(data.overages || {}) },
      packs: Array.isArray(data.packs) && data.packs.length ? data.packs : [...DEFAULT_USAGE_PACKS],
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      updatedBy: data.updatedBy,
    };
  } catch (error) {
    console.error('[billing] Error leyendo usage_pricing, usando defaults:', error);
    return { overages: { ...DEFAULT_OVERAGE_PRICES }, packs: [...DEFAULT_USAGE_PACKS] };
  }
}

export async function saveUsagePricingConfig(
  patch: Partial<Pick<UsagePricingConfig, 'overages' | 'packs'>>,
  updatedBy?: string
): Promise<void> {
  await getFirestore()
    .collection('platform_settings')
    .doc('usage_pricing')
    .set(
      JSON.parse(JSON.stringify({ ...patch, updatedAt: new Date(), updatedBy })),
      { merge: true }
    );
}
