import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';

function getDb() {
  return getFirestore();
}

export type BusinessModuleKey =
  | 'mechanic'
  | 'tires'
  | 'detailing'
  | 'body'
  | 'tint'
  | 'parts'
  | 'towing'
  | 'glass'
  | 'inspection'
  | 'insurance'
  | 'general';

export interface BusinessCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  moduleKey: BusinessModuleKey;
  seoTitle: string;
  seoDescription: string;
  sortOrder: number;
  isActive: boolean;
  specialties?: Array<{ slug: string; label: string; sortOrder: number; matchMakes?: string[]; matchTags?: string[] }>;
  vehicleScopes?: Array<{ slug: string; label: string; sortOrder: number; matchMakes?: string[]; matchTags?: string[] }>;
  createdAt?: Date;
  updatedAt?: Date;
}

export const DEFAULT_BUSINESS_CATEGORIES: Array<Omit<BusinessCategory, 'id' | 'createdAt' | 'updatedAt'>> = [
  { slug: 'talleres-mecanicos', name: 'Talleres mecánicos', description: 'Diagnóstico, motor, frenos y mantenimiento general', icon: '🔧', moduleKey: 'mechanic', seoTitle: 'Talleres mecánicos en Puerto Rico', seoDescription: 'Encuentra talleres mecánicos cerca de ti.', sortOrder: 1, isActive: true },
  { slug: 'gomeras', name: 'Gomeras y gomas', description: 'Gomas, rotación, alineación y balanceo', icon: '🛞', moduleKey: 'tires', seoTitle: 'Gomeras cerca de ti', seoDescription: 'Gomeras y servicios de gomas.', sortOrder: 2, isActive: true },
  { slug: 'detailing', name: 'Detailing y estética', description: 'Lavado, detailing y estética automotriz', icon: '✨', moduleKey: 'detailing', seoTitle: 'Detailing automotriz', seoDescription: 'Detailing y estética para tu vehículo.', sortOrder: 3, isActive: true },
  { slug: 'hojalateria', name: 'Hojalatería y pintura', description: 'Reparación de colisión, pintura y enderezado', icon: '🎨', moduleKey: 'body', seoTitle: 'Hojalatería y pintura', seoDescription: 'Talleres de hojalatería y pintura.', sortOrder: 4, isActive: true },
  { slug: 'tint-wrap', name: 'Tint, wrap y PPF', description: 'Tintado, wraps y protección de pintura', icon: '🪟', moduleKey: 'tint', seoTitle: 'Tint, wrap y PPF', seoDescription: 'Tintado, wraps y PPF.', sortOrder: 5, isActive: true },
  { slug: 'piezas', name: 'Piezas y accesorios', description: 'Repuestos, accesorios y piezas usadas', icon: '🧩', moduleKey: 'parts', seoTitle: 'Piezas de auto', seoDescription: 'Piezas y accesorios automotrices.', sortOrder: 6, isActive: true },
  { slug: 'gruas', name: 'Grúas y remolque', description: 'Remolque, grúas y asistencia en carretera', icon: '🚛', moduleKey: 'towing', seoTitle: 'Grúas y remolque', seoDescription: 'Servicio de grúas y remolque.', sortOrder: 7, isActive: true },
  { slug: 'cristales', name: 'Cristales y parabrisas', description: 'Cambio y reparación de cristales', icon: '🪟', moduleKey: 'glass', seoTitle: 'Cristales y parabrisas', seoDescription: 'Reparación y cambio de cristales.', sortOrder: 8, isActive: true },
  { slug: 'inspeccion', name: 'Inspección vehicular', description: 'Inspección, marbete y certificaciones', icon: '📋', moduleKey: 'inspection', seoTitle: 'Inspección vehicular', seoDescription: 'Centros de inspección vehicular.', sortOrder: 9, isActive: true },
  { slug: 'seguros', name: 'Seguros de auto', description: 'Pólizas, cotizaciones y renovaciones', icon: '🛡️', moduleKey: 'insurance', seoTitle: 'Seguros de auto', seoDescription: 'Agentes y corredores de seguros de auto.', sortOrder: 10, isActive: true },
  { slug: 'cambio-aceite', name: 'Cambio de aceite', description: 'Aceite, filtros y mantenimiento rápido', icon: '🛢️', moduleKey: 'mechanic', seoTitle: 'Cambio de aceite', seoDescription: 'Cambio de aceite y filtros.', sortOrder: 11, isActive: true },
  { slug: 'baterias', name: 'Baterías', description: 'Prueba, carga y reemplazo de baterías', icon: '🔋', moduleKey: 'parts', seoTitle: 'Baterías de auto', seoDescription: 'Baterías y servicio eléctrico.', sortOrder: 12, isActive: true },
  { slug: 'aire-acondicionado', name: 'Aire acondicionado', description: 'Recarga, diagnóstico y reparación de A/C', icon: '❄️', moduleKey: 'mechanic', seoTitle: 'Aire acondicionado automotriz', seoDescription: 'Servicio de A/C para vehículos.', sortOrder: 13, isActive: true },
  { slug: 'frenos', name: 'Frenos', description: 'Pastillas, discos y sistema de frenos', icon: '🛑', moduleKey: 'mechanic', seoTitle: 'Servicio de frenos', seoDescription: 'Reparación de frenos.', sortOrder: 14, isActive: true },
  { slug: 'alineacion', name: 'Alineación y balanceo', description: 'Alineación, balanceo y suspensión', icon: '⚙️', moduleKey: 'tires', seoTitle: 'Alineación y balanceo', seoDescription: 'Alineación y balanceo de gomas.', sortOrder: 15, isActive: true },
  { slug: 'lavado', name: 'Lavado de autos', description: 'Lavado, encerado y cuidado exterior', icon: '🚿', moduleKey: 'detailing', seoTitle: 'Lavado de autos', seoDescription: 'Lavado y cuidado exterior.', sortOrder: 16, isActive: true },
  { slug: 'audio', name: 'Audio y alarmas', description: 'Car audio, alarmas y accesorios electrónicos', icon: '🔊', moduleKey: 'parts', seoTitle: 'Audio y alarmas', seoDescription: 'Audio, alarmas y electrónica.', sortOrder: 17, isActive: true },
  { slug: 'electrico', name: 'Eléctrico automotriz', description: 'Diagnóstico eléctrico y computadoras', icon: '⚡', moduleKey: 'mechanic', seoTitle: 'Eléctrico automotriz', seoDescription: 'Diagnóstico eléctrico.', sortOrder: 18, isActive: true },
  { slug: 'transmision', name: 'Transmisión', description: 'Reparación y servicio de transmisión', icon: '🔁', moduleKey: 'mechanic', seoTitle: 'Transmisión automotriz', seoDescription: 'Servicio de transmisión.', sortOrder: 19, isActive: true },
  { slug: 'escapes', name: 'Escapes', description: 'Sistema de escape y emisiones', icon: '💨', moduleKey: 'mechanic', seoTitle: 'Escapes', seoDescription: 'Reparación de escapes.', sortOrder: 20, isActive: true },
  { slug: 'hibridos-ev', name: 'Híbridos y eléctricos', description: 'Servicio especializado EV e híbridos', icon: '🔌', moduleKey: 'mechanic', seoTitle: 'Servicio EV e híbridos', seoDescription: 'Talleres para híbridos y eléctricos.', sortOrder: 21, isActive: true },
  { slug: 'motos', name: 'Motocicletas', description: 'Taller, gomas y piezas para motos', icon: '🏍️', moduleKey: 'general', seoTitle: 'Servicios para motos', seoDescription: 'Talleres y piezas para motocicletas.', sortOrder: 22, isActive: true },
  { slug: 'flotas', name: 'Flotas', description: 'Mantenimiento de flotas comerciales', icon: '🚐', moduleKey: 'general', seoTitle: 'Mantenimiento de flotas', seoDescription: 'Servicios para flotas.', sortOrder: 23, isActive: true },
  { slug: 'asistencia-vial', name: 'Asistencia vial', description: 'Auxilio en carretera y batería', icon: '🆘', moduleKey: 'towing', seoTitle: 'Asistencia vial', seoDescription: 'Asistencia vial y auxilio.', sortOrder: 24, isActive: true },
  { slug: 'cerrajeria', name: 'Cerrajería automotriz', description: 'Llaves, chips y apertura de vehículos', icon: '🔑', moduleKey: 'general', seoTitle: 'Cerrajería automotriz', seoDescription: 'Cerrajería para autos.', sortOrder: 25, isActive: true },
  { slug: 'radiadores', name: 'Radiadores', description: 'Enfriamiento, radiadores y mangueras', icon: '🌡️', moduleKey: 'mechanic', seoTitle: 'Radiadores', seoDescription: 'Servicio de radiadores.', sortOrder: 26, isActive: true },
  { slug: 'emisiones', name: 'Emisiones', description: 'Pruebas y corrección de emisiones', icon: '🧪', moduleKey: 'inspection', seoTitle: 'Emisiones vehiculares', seoDescription: 'Pruebas de emisiones.', sortOrder: 27, isActive: true },
];

function mapCategory(id: string, data: FirebaseFirestore.DocumentData): BusinessCategory {
  return {
    id,
    slug: String(data.slug || ''),
    name: String(data.name || ''),
    description: String(data.description || ''),
    icon: String(data.icon || '🚗'),
    moduleKey: (data.moduleKey || 'general') as BusinessModuleKey,
    seoTitle: String(data.seoTitle || data.name || ''),
    seoDescription: String(data.seoDescription || data.description || ''),
    sortOrder: Number(data.sortOrder) || 0,
    isActive: data.isActive !== false,
    specialties: Array.isArray(data.specialties) ? data.specialties : [],
    vehicleScopes: Array.isArray(data.vehicleScopes) ? data.vehicleScopes : [],
    createdAt: data.createdAt?.toDate?.() || undefined,
    updatedAt: data.updatedAt?.toDate?.() || undefined,
  };
}

export async function listBusinessCategories(activeOnly = true): Promise<BusinessCategory[]> {
  const snap = await getDb().collection('business_categories').get();
  const items = snap.docs.map((doc) => mapCategory(doc.id, doc.data() || {}));
  items.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'));
  return activeOnly ? items.filter((c) => c.isActive) : items;
}

export async function getBusinessCategoryBySlug(slug: string): Promise<BusinessCategory | null> {
  const normalized = slugifyBusiness(slug);
  if (!normalized) return null;
  const snap = await getDb()
    .collection('business_categories')
    .where('slug', '==', normalized)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return mapCategory(snap.docs[0].id, snap.docs[0].data() || {});
}

export async function upsertBusinessCategory(
  input: Partial<BusinessCategory> & { name: string }
): Promise<BusinessCategory> {
  const slug = slugifyBusiness(input.slug || input.name);
  const payload = {
    slug,
    name: input.name.trim(),
    description: String(input.description || '').trim(),
    icon: String(input.icon || '🚗'),
    moduleKey: (input.moduleKey || 'general') as BusinessModuleKey,
    seoTitle: String(input.seoTitle || input.name).trim(),
    seoDescription: String(input.seoDescription || input.description || '').trim(),
    sortOrder: Number(input.sortOrder) || 0,
    isActive: input.isActive !== false,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const ref = input.id
    ? getDb().collection('business_categories').doc(input.id)
    : getDb().collection('business_categories').doc();

  const existing = await ref.get();
  await ref.set(
    existing.exists
      ? payload
      : { ...payload, createdAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );

  const saved = await ref.get();
  return mapCategory(ref.id, saved.data() || {});
}

export async function ensureDefaultBusinessCategories(): Promise<number> {
  const existing = await listBusinessCategories(false);
  const bySlug = new Set(existing.map((c) => c.slug));
  let created = 0;
  for (const category of DEFAULT_BUSINESS_CATEGORIES) {
    if (bySlug.has(category.slug)) continue;
    await upsertBusinessCategory(category);
    created += 1;
  }
  return created;
}

export function slugifyBusiness(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
