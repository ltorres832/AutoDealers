/**
 * Constantes del paquete competitivo de inventario (vs INV360).
 * Solo tipos y constantes — seguro para importar desde componentes cliente.
 * No borra ni modifica el modelo Vehicle existente.
 */

export const INVENTORY_COMPETE_FEATURE_KEYS = [
  'vin_camera_scan',
  'share_landing',
  'photo_guide',
  'bg_remover',
  'dynamic_scenes',
  'dealer_site_builder',
  'daco_labels',
  'inventory_alliances',
  'inventory_feed_sync',
] as const;

export type InventoryCompeteFeatureKey = (typeof INVENTORY_COMPETE_FEATURE_KEYS)[number];

/** Solo dealer: sitio propio, alianzas y sync por feed. */
export const INVENTORY_COMPETE_DEALER_ONLY_KEYS = [
  'dealer_site_builder',
  'inventory_alliances',
  'inventory_feed_sync',
] as const satisfies readonly InventoryCompeteFeatureKey[];

export type InventoryCompeteDealerOnlyKey = (typeof INVENTORY_COMPETE_DEALER_ONLY_KEYS)[number];

export const INVENTORY_COMPETE_SELLER_KEYS = INVENTORY_COMPETE_FEATURE_KEYS.filter(
  (k) => !(INVENTORY_COMPETE_DEALER_ONLY_KEYS as readonly string[]).includes(k)
) as InventoryCompeteFeatureKey[];

/** Etiquetas ES para Admin (membresías + feature flags). */
export const INVENTORY_COMPETE_FEATURE_META: Record<
  InventoryCompeteFeatureKey,
  { name: string; description: string; membershipLabel: string }
> = {
  vin_camera_scan: {
    name: 'Escaneo VIN (cámara)',
    description: 'Decodificar VIN (cámara o pegado) al crear vehículo',
    membershipLabel: 'Escaneo VIN con cámara / decodificación',
  },
  share_landing: {
    name: 'Landing + QR para compartir',
    description: 'Landing + QR para compartir un vehículo',
    membershipLabel: 'Landing y QR para compartir vehículo',
  },
  photo_guide: {
    name: 'Guía de fotos',
    description: 'Ángulos guiados; original siempre se conserva',
    membershipLabel: 'Guía de fotos por ángulos',
  },
  bg_remover: {
    name: 'Quitar fondo (IA)',
    description: 'Generar versión editada sin borrar el original',
    membershipLabel: 'Quitar fondo de fotos (IA)',
  },
  dynamic_scenes: {
    name: 'Escenas dinámicas',
    description: 'Fondos de estudio sobre la foto editada',
    membershipLabel: 'Escenas dinámicas (fondos de estudio)',
  },
  dealer_site_builder: {
    name: 'Constructor de sitio del dealer',
    description: 'Plantillas publicables sin tocar el marketplace',
    membershipLabel: 'Constructor de sitio web del dealer',
  },
  daco_labels: {
    name: 'Etiquetas DACO + QR',
    description: 'Etiqueta imprimible con QR a la ficha',
    membershipLabel: 'Etiquetas DACO imprimibles con QR',
  },
  inventory_alliances: {
    name: 'Alianzas de inventario',
    description: 'Compartir unidades con otro dealer aliado',
    membershipLabel: 'Alianzas de inventario entre dealers',
  },
  inventory_feed_sync: {
    name: 'Sync por feed URL',
    description: 'Importar CSV/JSON por URL sin borrar stock local',
    membershipLabel: 'Sincronización de inventario por feed URL',
  },
};

export const PHOTO_GUIDE_ANGLES = [
  { id: 'front', label: 'Frente', hint: 'Cámara a la altura del capó, centrado' },
  { id: 'front_left', label: '3/4 frontal izquierdo', hint: 'Ángulo 45° del lado del conductor' },
  { id: 'side_left', label: 'Lateral izquierdo', hint: 'Perfil completo, ruedas visibles' },
  { id: 'rear_left', label: '3/4 trasero izquierdo', hint: 'Ángulo 45° desde atrás' },
  { id: 'rear', label: 'Trasera', hint: 'Centrado, luces y placa visibles' },
  { id: 'rear_right', label: '3/4 trasero derecho', hint: 'Ángulo 45° desde atrás' },
  { id: 'side_right', label: 'Lateral derecho', hint: 'Perfil completo' },
  { id: 'front_right', label: '3/4 frontal derecho', hint: 'Ángulo 45° del lado del pasajero' },
  { id: 'interior_dash', label: 'Interior / tablero', hint: 'Desde el asiento del conductor' },
  { id: 'interior_rear', label: 'Asientos traseros', hint: 'Puerta abierta o desde atrás' },
] as const;

export type PhotoGuideAngleId = (typeof PHOTO_GUIDE_ANGLES)[number]['id'];

export const DEALER_SITE_TEMPLATES = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Home, inventario, ficha y contacto. Ideal para empezar.',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'Incluye mapa, horarios y CTAs de llamada/WhatsApp.',
  },
  {
    id: 'premium',
    name: 'Premium',
    description: 'Bloques de financiamiento, empleo y contacto ampliados.',
  },
] as const;

export type DealerSiteTemplateId = (typeof DEALER_SITE_TEMPLATES)[number]['id'];

export const DYNAMIC_SCENE_PRESETS = [
  { id: 'white', label: 'Estudio blanco', css: '#f5f5f5' },
  { id: 'showroom', label: 'Showroom gris', css: '#e8e8ec' },
  { id: 'black', label: 'Estudio negro', css: '#1a1a1a' },
  { id: 'blue', label: 'Azul profesional', css: '#1e3a5f' },
] as const;

export function buildVehicleSharePath(tenantId: string, vehicleId: string): string {
  return `/share/${encodeURIComponent(tenantId)}/${encodeURIComponent(vehicleId)}`;
}

export function buildDealerSitePath(slugOrTenantId: string): string {
  return `/d/${encodeURIComponent(slugOrTenantId)}`;
}

export function buildQrImageUrl(data: string, size = 280): string {
  const q = encodeURIComponent(data);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${q}`;
}

export interface VehiclePhotoSlot {
  angleId: PhotoGuideAngleId | string;
  originalUrl: string;
  editedUrl?: string | null;
  sceneId?: string | null;
  createdAt?: string;
}

export interface DealerSiteConfig {
  templateId: DealerSiteTemplateId;
  published: boolean;
  slug: string;
  headline?: string;
  tagline?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  address?: string;
  mapUrl?: string;
  hours?: string;
  showFinancing?: boolean;
  showJobs?: boolean;
  primaryColor?: string;
  /** Full-bleed hero image URL */
  heroImageUrl?: string;
  /** About / bio block (plain text or simple HTML) */
  aboutHtml?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  /** Service list shown on public dealer site */
  services?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  logoUrl?: string;
  updatedAt?: string;
}

export interface DacoLabelSettings {
  warrantyNote: string;
  footerNote: string;
  updatedAt?: string;
}

export const DEFAULT_DACO_WARRANTY_NOTE =
  'Garantía según política del concesionario. Consulte términos. Etiqueta informativa — no sustituye documentos DACO oficiales.';

export const DEFAULT_DACO_FOOTER_NOTE = '';

export interface InventoryAlliance {
  id: string;
  fromTenantId: string;
  toTenantId: string;
  toTenantName?: string;
  vehicleIds: string[];
  shareAll: boolean;
  status: 'pending' | 'active' | 'revoked';
  createdAt?: string;
  updatedAt?: string;
}

export interface InventoryFeedJob {
  id: string;
  tenantId: string;
  name: string;
  feedUrl: string;
  format: 'csv' | 'json';
  enabled: boolean;
  lastRunAt?: string | null;
  lastStatus?: 'ok' | 'error' | null;
  lastError?: string | null;
  createdAt?: string;
}
