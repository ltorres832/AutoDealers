import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { getTenantById } from './tenants';

function getDb() {
  return getFirestore();
}

export interface FreePublicListingsSettings {
  enabled: boolean;
  maxActiveFreeVehiclesPerSeller: number;
  durationDays: number;
  ctaTitle: string;
  ctaSubtitle: string;
  ctaButtonLabel: string;
  /** Path al formulario público de "Publicar Gratis" (sin cuenta). */
  quickListingPath: string;
  /** Path para invitar a registro completo (con cuenta). */
  registerPath: string;
  /** Label del CTA secundario que invita a crear cuenta completa. */
  registerCtaLabel: string;
  /** Mensaje de éxito tras publicar (incluye texto que motiva al registro). */
  successHeadline: string;
  successSubtitle: string;
}

const DEFAULTS: FreePublicListingsSettings = {
  enabled: true,
  maxActiveFreeVehiclesPerSeller: 2,
  durationDays: 14,
  ctaTitle: '¿Quieres vender?',
  ctaSubtitle: 'Publica tu auto hoy mismo y llega a millones',
  ctaButtonLabel: 'Publicar Gratis',
  quickListingPath: '/publicar-gratis',
  registerPath: '/register?type=seller',
  registerCtaLabel: 'Crear cuenta de vendedor (más beneficios)',
  successHeadline: '¡Tu anuncio está publicado!',
  successSubtitle:
    'Regístrate gratis como vendedor y consigue muchos más clientes: panel de control, cotizaciones, financiamiento, mensajería y mucho más.',
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export async function getFreePublicListingsSettings(): Promise<FreePublicListingsSettings> {
  const doc = await getDb().collection('system_settings').doc('free_public_listings').get();
  if (!doc.exists) {
    return { ...DEFAULTS };
  }
  const d = doc.data() || {};
  return {
    enabled: d.enabled !== false,
    maxActiveFreeVehiclesPerSeller: clamp(
      Number(d.maxActiveFreeVehiclesPerSeller) || DEFAULTS.maxActiveFreeVehiclesPerSeller,
      0,
      100
    ),
    durationDays: clamp(Number(d.durationDays) || DEFAULTS.durationDays, 1, 365),
    ctaTitle: typeof d.ctaTitle === 'string' && d.ctaTitle.trim() ? d.ctaTitle : DEFAULTS.ctaTitle,
    ctaSubtitle:
      typeof d.ctaSubtitle === 'string' && d.ctaSubtitle.trim() ? d.ctaSubtitle : DEFAULTS.ctaSubtitle,
    ctaButtonLabel:
      typeof d.ctaButtonLabel === 'string' && d.ctaButtonLabel.trim()
        ? d.ctaButtonLabel
        : DEFAULTS.ctaButtonLabel,
    quickListingPath:
      typeof d.quickListingPath === 'string' && d.quickListingPath.startsWith('/')
        ? d.quickListingPath
        : DEFAULTS.quickListingPath,
    registerPath:
      typeof d.registerPath === 'string' && d.registerPath.startsWith('/')
        ? d.registerPath
        : DEFAULTS.registerPath,
    registerCtaLabel:
      typeof d.registerCtaLabel === 'string' && d.registerCtaLabel.trim()
        ? d.registerCtaLabel
        : DEFAULTS.registerCtaLabel,
    successHeadline:
      typeof d.successHeadline === 'string' && d.successHeadline.trim()
        ? d.successHeadline
        : DEFAULTS.successHeadline,
    successSubtitle:
      typeof d.successSubtitle === 'string' && d.successSubtitle.trim()
        ? d.successSubtitle
        : DEFAULTS.successSubtitle,
  };
}

export function freeListingExpiresAtMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === 'object' && v !== null && '_seconds' in (v as object)) {
    const sec = (v as { _seconds?: number })._seconds;
    if (typeof sec === 'number') return sec * 1000;
  }
  if (typeof v === 'object' && v !== null && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (v as { toDate: () => Date }).toDate().getTime();
    } catch {
      return null;
    }
  }
  if (v instanceof Date) return v.getTime();
  if (typeof v === 'string') {
    const t = Date.parse(v);
    return Number.isNaN(t) ? null : t;
  }
  return null;
}

/** Anuncio gratuito que sigue contando para el cupo (no vendido, no borrado, no vencido). */
export function isFreeListingSlotActive(v: {
  isFreePublicListing?: boolean;
  freeListingExpiresAt?: unknown;
  status?: string;
  deleted?: boolean;
}): boolean {
  if (v.deleted === true) return false;
  if (!v.isFreePublicListing) return false;
  const st = String(v.status ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
  if (['sold', 'deleted', 'inactive'].includes(st)) return false;
  const exp = freeListingExpiresAtMs(v.freeListingExpiresAt);
  if (exp != null && exp < Date.now()) return false;
  return true;
}

export async function countActiveFreeListingsForSeller(
  tenantId: string,
  sellerId: string
): Promise<number> {
  const { getVehicles } = await import('@autodealers/inventory');
  const vehicles = await getVehicles(tenantId);
  return vehicles.filter((veh) => {
    const sid = (veh as { sellerId?: string }).sellerId || (veh as { assignedTo?: string }).assignedTo;
    if (sid !== sellerId) return false;
    return isFreeListingSlotActive(veh as any);
  }).length;
}

/** Sin membresía (plan de pago) asignada al tenant → política de anuncios gratis. */
export async function tenantUsesFreePublicListingsPolicy(tenantId: string): Promise<boolean> {
  const tenant = await getTenantById(tenantId);
  if (!tenant) return false;
  const mid = (tenant as { membershipId?: string }).membershipId;
  return mid == null || String(mid).trim() === '';
}

export type SellerVehicleCreatePolicyResult =
  | { mode: 'paid' }
  | { mode: 'free'; expiresAt: admin.firestore.Timestamp }
  | { mode: 'blocked'; status: number; message: string };

export async function resolveSellerVehicleCreatePolicy(
  tenantId: string,
  sellerId: string
): Promise<SellerVehicleCreatePolicyResult> {
  const settings = await getFreePublicListingsSettings();
  const useFree = await tenantUsesFreePublicListingsPolicy(tenantId);

  if (!useFree) {
    const { canPerformAction } = await import('./membership-validation');
    const r = await canPerformAction(tenantId, 'addVehicle');
    if (!r.allowed) {
      return {
        mode: 'blocked',
        status: 403,
        message: r.reason || 'No puedes agregar más vehículos con tu plan actual.',
      };
    }
    return { mode: 'paid' };
  }

  if (!settings.enabled) {
    return {
      mode: 'blocked',
      status: 403,
      message:
        'Las publicaciones gratuitas están desactivadas. Contrata un plan o contacta soporte para publicar vehículos.',
    };
  }

  if (settings.maxActiveFreeVehiclesPerSeller <= 0) {
    return {
      mode: 'blocked',
      status: 403,
      message: 'En este momento no se permiten anuncios gratuitos. Contrata un plan para publicar.',
    };
  }

  const count = await countActiveFreeListingsForSeller(tenantId, sellerId);
  if (count >= settings.maxActiveFreeVehiclesPerSeller) {
    return {
      mode: 'blocked',
      status: 403,
      message: `Ya tienes ${settings.maxActiveFreeVehiclesPerSeller} anuncio(s) gratuito(s) activo(s). Cuando vendas o elimines uno, o venza el plazo, podrás publicar otro. También puedes contratar un plan para más inventario.`,
    };
  }

  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + settings.durationDays);
  const expiresAt = admin.firestore.Timestamp.fromDate(expires);
  return { mode: 'free', expiresAt };
}
