import { getFirestore } from '@autodealers/shared';
import * as admin from 'firebase-admin';
import { listBusinessCategories, slugifyBusiness, type BusinessCategory } from './automotive-categories';

function getDb() {
  return getFirestore();
}

export type SpecializationListKind = 'specialties' | 'vehicleScopes';

export interface SpecializationItem {
  slug: string;
  label: string;
  sortOrder: number;
  matchMakes?: string[];
  matchTags?: string[];
}

export interface CategoryTaxonomy {
  categorySlug: string;
  specialties: SpecializationItem[];
  vehicleScopes: SpecializationItem[];
}

export interface VehicleMatchInput {
  make?: string;
  model?: string;
  year?: number;
}

const JAPANESE = ['toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'suzuki', 'lexus', 'infiniti', 'acura', 'isuzu', 'daihatsu'];
const EUROPEAN = ['bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'volvo', 'mini', 'porsche', 'land rover', 'jaguar', 'fiat', 'peugeot', 'renault', 'alfa romeo', 'seat', 'skoda'];
const AMERICAN = ['ford', 'chevrolet', 'chevy', 'gmc', 'dodge', 'jeep', 'chrysler', 'ram', 'cadillac', 'buick', 'lincoln', 'tesla', 'hummer'];
const KOREAN = ['kia', 'hyundai', 'genesis'];
const CHINESE = ['byd', 'chery', 'geely', 'mg', 'great wall', 'haval', 'jetour'];

function item(
  slug: string,
  label: string,
  sortOrder: number,
  extra?: Pick<SpecializationItem, 'matchMakes' | 'matchTags'>
): SpecializationItem {
  return { slug, label, sortOrder, ...extra };
}

function makeItem(slug: string, label: string, sortOrder: number): SpecializationItem {
  return item(slug, label, sortOrder, { matchMakes: [slug.replace(/-/g, ' '), label.toLowerCase()] });
}

export const COMMON_VEHICLE_SCOPES: SpecializationItem[] = [
  item('todas-las-marcas', 'Todas las marcas que atiendo', 1, { matchTags: ['all-makes'] }),
  item('japoneses', 'Japoneses', 2, { matchMakes: JAPANESE, matchTags: ['japoneses'] }),
  item('europeos', 'Europeos', 3, { matchMakes: EUROPEAN, matchTags: ['europeos'] }),
  item('americanos', 'Americanos', 4, { matchMakes: AMERICAN, matchTags: ['americanos'] }),
  item('coreanos', 'Coreanos', 5, { matchMakes: KOREAN, matchTags: ['coreanos'] }),
  item('chinos', 'Chinos', 6, { matchMakes: CHINESE, matchTags: ['chinos'] }),
  makeItem('toyota', 'Toyota', 10),
  makeItem('honda', 'Honda', 11),
  makeItem('nissan', 'Nissan', 12),
  makeItem('kia', 'Kia', 13),
  makeItem('hyundai', 'Hyundai', 14),
  makeItem('ford', 'Ford', 15),
  makeItem('chevrolet', 'Chevrolet', 16),
  makeItem('bmw', 'BMW', 17),
  makeItem('mercedes-benz', 'Mercedes-Benz', 18),
  makeItem('jeep', 'Jeep', 19),
  makeItem('ram', 'Ram', 20),
  makeItem('mazda', 'Mazda', 21),
  makeItem('subaru', 'Subaru', 22),
  item('livianos', 'Vehículos livianos / pasajeros', 30, { matchTags: ['livianos'] }),
  item('suv', 'SUV y crossovers', 31, { matchTags: ['suv'] }),
  item('pickup', 'Pickups', 32, { matchTags: ['pickup'] }),
  item('diesel', 'Diésel', 33, { matchTags: ['diesel'] }),
  item('hibridos', 'Híbridos', 34, { matchTags: ['hibridos'] }),
  item('electricos', 'Eléctricos (EV)', 35, { matchTags: ['electricos'] }),
  item('lujo', 'Vehículos de lujo', 36, { matchTags: ['lujo'] }),
  item('comerciales-livianos', 'Comerciales livianos / vans', 37, { matchTags: ['comerciales'] }),
];

const MOTO_SCOPES: SpecializationItem[] = [
  item('motos-todas', 'Todas las motos', 1, { matchTags: ['motos', 'all-makes'] }),
  item('motos-street', 'Street / naked', 2, { matchTags: ['motos'] }),
  item('motos-sport', 'Sport / pista', 3, { matchTags: ['motos'] }),
  item('motos-scooter', 'Scooter', 4, { matchTags: ['motos'] }),
  item('motos-touring', 'Touring', 5, { matchTags: ['motos'] }),
  item('motos-enduro', 'Enduro / dirt', 6, { matchTags: ['motos'] }),
  item('atv-utv', 'ATV / UTV', 7, { matchTags: ['motos'] }),
  makeItem('honda', 'Honda', 10),
  makeItem('yamaha', 'Yamaha', 11),
  makeItem('kawasaki', 'Kawasaki', 12),
  makeItem('suzuki', 'Suzuki', 13),
  makeItem('harley-davidson', 'Harley-Davidson', 14),
  makeItem('bmw', 'BMW Motorrad', 15),
];

function specs(...labels: string[]): SpecializationItem[] {
  return labels.map((label, index) => item(slugifyBusiness(label), label, index + 1));
}

export const DEFAULT_SPECIALTIES_BY_CATEGORY: Record<string, string[]> = {
  'talleres-mecanicos': [
    'Motores y culatas',
    'Frenos',
    'Aceite y mantenimiento',
    'Transmisión automática',
    'Transmisión manual',
    'Eléctrico y computadoras',
    'Aire acondicionado',
    'Suspensión y dirección',
    'Diagnóstico computarizado',
    'Embrague',
    'Inyectores y combustible',
    'Radiador y enfriamiento',
    'Escapes y emisiones',
    'Baterías y arranque',
    'Híbridos y EV',
    'Afinación',
    'Correa de tiempo',
    'Caja de transferencia / 4x4',
    'Tren delantero',
    'Dirección hidráulica / eléctrica',
    'Turbo y sobrealimentación',
    'Diferencial',
    'Scaner OBD / códigos',
    'Bomba de agua y termostato',
    'Juntas y empaques',
    'Mecánica liviana',
    'Power steering',
  ],
  gomeras: [
    'Gomas nuevas',
    'Gomas usadas',
    'Rotación',
    'Balanceo computarizado',
    'Alineación 2 ruedas',
    'Alineación 4 ruedas',
    'Reparación de ponchadura',
    'Parche y vulcanizado',
    'TPMS',
    'Gomas run-flat',
    'Gomas all-terrain / off-road',
    'Gomas highway / carretera',
    'Montaje y desmontaje',
    'Válvulas y aros',
    'Reparación de aros',
    'Nitrógeno',
    'Gomas 15 y 16 pulgadas',
    'Gomas 17 y 18 pulgadas',
    'Gomas 19 pulgadas o más',
    'Gomas LT / comerciales',
    'Aire e inflado',
    'Wipers',
    'Mecánica liviana',
    'Venta de baterías',
  ],
  detailing: [
    'Detailing completo',
    'Lavado exterior',
    'Lavado interior',
    'Pulido y corrección de pintura',
    'Encerado',
    'Ceramic coating',
    'Mantenimiento de ceramic',
    'Lavado de motor',
    'Ozonización',
    'Restauración de faroles',
    'Limpieza de tapicería',
    'Limpieza de cuero',
    'Clay bar / descontaminación',
    'Tratamiento de plásticos',
    'Limpieza de rines',
    'Servicio a domicilio',
  ],
  hojalateria: [
    'Enderezado',
    'Pintura completa',
    'Pintura de piezas',
    'Colisión / insurance',
    'Granizo y abolladuras PDR',
    'Sustitución de paneles',
    'Preparación de seguro',
    'Pulido post-pintura',
    'Trabajo de marco',
    'Estimado de seguro',
    'Reparación de parachoques',
    'Restauración de pintura',
    'Match de color',
    'Pintura de aros',
  ],
  'tint-wrap': [
    'Tintado de cristales',
    'Tintado cerámico',
    'Wrap completo',
    'Wrap parcial',
    'PPF (paint protection)',
    'Tintado de faroles',
    'Remoción de tint',
    'Chrome delete',
    'Wrap de techo',
    'Wrap de aros / calipers',
    'Remoción de wrap',
    'Tintado legal DTOP',
  ],
  piezas: [
    'Piezas nuevas',
    'Piezas usadas',
    'Piezas OEM',
    'Piezas aftermarket',
    'Accesorios',
    'Entrega / envío',
    'Busqueda por VIN',
    'Motor y transmisión',
    'Frenos y suspensión',
    'Eléctrico',
    'Carrocería',
    'Gomas y aros',
    'Iluminación y faroles',
    'Aceites y químicos',
    'Pedido especial',
  ],
  gruas: [
    'Plataforma',
    'Gancho',
    'Asistencia en carretera',
    'Cambio de goma',
    'Paso de corriente',
    'Remolque de motos',
    'Remolque de pesados',
    'Servicio 24 horas',
    'Traslado entre pueblos',
    'Remolque de EV',
    'Recuperación fuera de carretera',
    'Traslado a subasta / dealer',
    'Winch / arrastre',
  ],
  cristales: [
    'Parabrisas',
    'Cristales laterales',
    'Cristal trasero',
    'Reparación de picadura',
    'Calefacción de cristal',
    'Sensores y cámaras',
    'Servicio a domicilio',
    'Seguros / reclamaciones',
    'Molduras y gomas de cristal',
    'ADAS / calibración',
    'Techo panorámico / sunroof',
    'Cristal laminado / acústico',
  ],
  inspeccion: [
    'Inspección oficial',
    'Marbete',
    'Reinspección',
    'Certificación de emisiones',
    'Inspección de flotas',
    'Inspección previa a compra',
    'Inspección de frenos y luces',
    'Inspección de gomas',
    'Certificado de título / traspaso',
    'Inspección de clásicos',
    'Pre-inspección con corrección',
  ],
  seguros: [
    'Pólizas de auto',
    'Full coverage',
    'Responsabilidad pública',
    'Cotizaciones',
    'Renovaciones',
    'Reclamaciones',
    'Clásicos y modified',
    'Flotas comerciales',
    'Motos',
    'Collision y comprehensive',
    'Gap / gap waiver',
    'Roadside assistance',
    'Seguro de pickup / comercial',
  ],
  'cambio-aceite': [
    'Aceite sintético',
    'Aceite convencional',
    'Aceite high-mileage',
    'Filtro de aceite',
    'Filtro de aire',
    'Filtro de cabina',
    'Rotación de gomas',
    'Inspección de 30 puntos',
    'Líquidos y top-off',
    'Flush de transmisión',
    'Cambio de coolant',
    'Revisión de frenos',
    'Wipers',
  ],
  baterias: [
    'Prueba de batería',
    'Reemplazo',
    'Carga',
    'Alternador',
    'Arranque',
    'Baterías AGM',
    'Baterías EV 12V',
    'Instalación a domicilio',
    'Paso de corriente',
    'Limpieza de bornes',
    'Prueba de sistema de carga',
    'Baterías para diesel',
  ],
  'aire-acondicionado': [
    'Recarga de gas',
    'Diagnóstico de A/C',
    'Compresor',
    'Condensador',
    'Evaporador',
    'Fugas',
    'A/C de híbridos',
    'Filtro de cabina',
    'Secador / receiver',
    'Válvula de expansión',
    'Embrague de compresor',
    'Desinfección de A/C',
    'Conversión R134a / 1234yf',
  ],
  frenos: [
    'Pastillas',
    'Discos / rotors',
    'Tambores',
    'Líquido de frenos',
    'Calipers',
    'Freno de emergencia',
    'ABS',
    'Frenos de pickup',
    'Mangueras de freno',
    'Cilindro maestro',
    'Servo / booster',
    'Frenos cerámicos / performance',
    'Sensor de desgaste',
  ],
  alineacion: [
    'Alineación 2 ruedas',
    'Alineación 4 ruedas',
    'Balanceo',
    'Suspensión',
    'Amortiguadores',
    'Terminales y rotulas',
    'Dirección',
    'Alineación de pickup',
    'Camber / caster / toe',
    'Alineación thrust',
    'Bujes de suspensión',
    'Barras estabilizadoras',
    'Alineación post-colisión',
  ],
  lavado: [
    'Lavado exterior',
    'Lavado interior',
    'Lavado express',
    'Encerado',
    'Aspirado',
    'Lavado de motor',
    'Self-service',
    'Membresía de lavados',
    'Lavado a mano',
    'Lavado de rines y gomas',
    'Secado y detailing express',
    'Lavado de flotas',
    'Servicio a domicilio',
  ],
  audio: [
    'Radio / head unit',
    'Bocinas',
    'Amplificador',
    'Subwoofer',
    'Alarmas',
    'Cámaras y sensores',
    'CarPlay / Android Auto',
    'Aislante acústico',
    'Iluminación LED',
    'Remote start',
    'Pantalla / multimedia',
    'Instalación de dashcam',
    'Integración de volante',
  ],
  electrico: [
    'Diagnóstico computarizado',
    'Check engine',
    'Cableado',
    'Alternador y arranque',
    'Módulos / ECM',
    'Sensores',
    'Cristales eléctricos',
    'Programación de llaves',
    'Eléctrico de híbridos',
    'Fusibles y relays',
    'Luces y faroles',
    'Problemas intermitentes',
    'Red CAN / comunicación',
  ],
  transmision: [
    'Servicio de fluido',
    'Reparación automática',
    'Reparación manual',
    'Embrague',
    'Convertidor de torque',
    'Solenoides',
    'Reconstrucción',
    'Diagnóstico de patinaje',
    '4x4 / transfer case',
    'CVT',
    'Doble embrague / DCT',
    'Sellos y fugas',
    'Programación TCM',
  ],
  escapes: [
    'Mofle',
    'Catalítico',
    'Downpipe',
    'Headers',
    'Fugas de escape',
    'Sensores de oxígeno',
    'Emisiones',
    'Escape performance',
    'Resonador',
    'Flex pipe',
    'DPF / diésel',
    'Soldadura de escape',
    'Eliminación de check engine por escape',
  ],
  'hibridos-ev': [
    'Diagnóstico híbrido',
    'Batería de alto voltaje',
    'Inversor',
    'Cargador a bordo',
    'Enfriamiento de batería',
    'Frenos regenerativos',
    'Servicio programado EV',
    'A/C en EV',
    'Diagnóstico de módulos',
    'Puerto de carga',
    'Cable de carga / EVSE',
    'Aislamiento / megaohmios',
    'Mantenimiento de híbrido Toyota / Honda',
  ],
  motos: [
    'Mecánica general',
    'Gomas de moto',
    'Frenos',
    'Aceite y filtros',
    'Eléctrico',
    'Carburación / inyección',
    'Cadena y sprockets',
    'Suspensión',
    'Piezas de moto',
    'Afinación',
    'Batería de moto',
    'Embrague de moto',
    'Servicio de scooter',
    'Inspección previa a viaje',
  ],
  flotas: [
    'Mantenimiento programado',
    'Frenos de flota',
    'Gomas de flota',
    'Aceite en sitio',
    'Inspección DOT / local',
    'Diagnóstico',
    'Gestión de órdenes',
    'Servicio a patio',
    'Alineación de flota',
    'Baterías de flota',
    'Reportes de costo por unidad',
    'Contratos mensuales',
    'Unidades diésel de flota',
  ],
  'asistencia-vial': [
    'Paso de corriente',
    'Cambio de goma',
    'Gasolina de emergencia',
    'Apertura de auto',
    'Remolque corto',
    'Sobrecalentamiento',
    'Servicio 24 horas',
    'Inflado de goma',
    'Llave olvidada',
    'Auto no prende',
    'Asistencia en autopista',
    'Coordinación con grúa',
  ],
  cerrajeria: [
    'Apertura de vehículos',
    'Copia de llave',
    'Chip / transponder',
    'Llave inteligente',
    'Programación',
    'Cambio de bombín',
    'Ignición',
    'Servicio a domicilio',
    'Llave de proximidad',
    'Remote / control',
    'Extracción de llave rota',
    'Programación de fob',
  ],
  radiadores: [
    'Radiador',
    'Mangueras',
    'Termostato',
    'Bomba de agua',
    'Abanico',
    'Flush de coolant',
    'Calefacción',
    'Fugas de coolant',
    'Radiador de A/C / condensador',
    'Tanque de reserva',
    'Sobrecalentamiento',
    'Coolant de híbridos',
    'Soldadura / recore',
  ],
  emisiones: [
    'Prueba de emisiones',
    'Corrección de códigos',
    'Catalítico',
    'Sensores de O2',
    'EGR',
    'EVAP',
    'Check engine por emisiones',
    'Smoke test',
    'PCV',
    'MAF / MAP',
    'Afinación para pasar inspección',
    'Diagnóstico de readiness',
  ],
};

const GOMERA_SCOPES: SpecializationItem[] = [
  ...COMMON_VEHICLE_SCOPES,
  item('gomas-passenger', 'Gomas passenger / P-metric', 40, { matchTags: ['livianos'] }),
  item('gomas-lt', 'Gomas LT / camión liviano', 41, { matchTags: ['pickup', 'comerciales'] }),
  item('gomas-suv', 'Gomas para SUV', 42, { matchTags: ['suv'] }),
];

export const DEFAULT_SCOPES_BY_CATEGORY: Record<string, SpecializationItem[]> = {
  motos: MOTO_SCOPES,
  gomeras: GOMERA_SCOPES,
  alineacion: GOMERA_SCOPES,
};

export function defaultSpecialtiesForCategory(categorySlug: string): SpecializationItem[] {
  const labels = DEFAULT_SPECIALTIES_BY_CATEGORY[categorySlug];
  if (!labels?.length) {
    throw new Error(`No hay lista de especialidades sembrada para ${categorySlug}`);
  }
  return specs(...labels);
}

export function defaultVehicleScopesForCategory(categorySlug: string): SpecializationItem[] {
  return DEFAULT_SCOPES_BY_CATEGORY[categorySlug] || COMMON_VEHICLE_SCOPES;
}

export function resolveSpecializationLabels(
  slugs: string[] | undefined,
  items: SpecializationItem[] | undefined
): Array<{ slug: string; label: string }> {
  const list = Array.isArray(slugs) ? slugs.filter(Boolean) : [];
  const map = new Map((items || []).map((item) => [item.slug, item.label]));
  return list.map((slug) => ({
    slug,
    label: map.get(slug) || slug.replace(/-/g, ' '),
  }));
}

export function mapSpecializationItems(raw: unknown): SpecializationItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((itemValue, index) => {
      const slug = slugifyBusiness(String(itemValue?.slug || itemValue?.label || itemValue?.id || ''));
      const label = String(itemValue?.label || itemValue?.name || slug).trim();
      if (!slug || !label) return null;
      const matchMakes = Array.isArray(itemValue?.matchMakes)
        ? itemValue.matchMakes.map((v: unknown) => String(v).trim().toLowerCase()).filter(Boolean)
        : undefined;
      const matchTags = Array.isArray(itemValue?.matchTags)
        ? itemValue.matchTags.map((v: unknown) => String(v).trim().toLowerCase()).filter(Boolean)
        : undefined;
      return {
        slug,
        label,
        sortOrder: Number(itemValue?.sortOrder) || index + 1,
        ...(matchMakes?.length ? { matchMakes } : {}),
        ...(matchTags?.length ? { matchTags } : {}),
      } as SpecializationItem;
    })
    .filter((itemValue): itemValue is SpecializationItem => Boolean(itemValue))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'es'));
}

export function mergeSpecializationSeed(
  existing: SpecializationItem[],
  seed: SpecializationItem[]
): { items: SpecializationItem[]; added: number; patched: number } {
  const bySlug = new Map(existing.map((itemValue) => [itemValue.slug, itemValue]));
  let added = 0;
  let patched = 0;
  for (const next of seed) {
    const current = bySlug.get(next.slug);
    if (!current) {
      bySlug.set(next.slug, next);
      added += 1;
      continue;
    }
    const needsMakes = !current.matchMakes?.length && Boolean(next.matchMakes?.length);
    const needsTags = !current.matchTags?.length && Boolean(next.matchTags?.length);
    if (!needsMakes && !needsTags) continue;
    bySlug.set(next.slug, {
      ...current,
      ...(needsMakes ? { matchMakes: next.matchMakes } : {}),
      ...(needsTags ? { matchTags: next.matchTags } : {}),
    });
    patched += 1;
  }
  const items = Array.from(bySlug.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, 'es')
  );
  return { items, added, patched };
}

export function taxonomyFromCategory(category: Pick<BusinessCategory, 'slug'> & {
  specialties?: SpecializationItem[];
  vehicleScopes?: SpecializationItem[];
}): CategoryTaxonomy {
  const specialties = category.specialties?.length
    ? category.specialties
    : defaultSpecialtiesForCategory(category.slug);
  const vehicleScopes = category.vehicleScopes?.length
    ? category.vehicleScopes
    : defaultVehicleScopesForCategory(category.slug);
  return { categorySlug: category.slug, specialties, vehicleScopes };
}

export async function ensureDefaultSpecializations(): Promise<{ updated: number; addedItems: number }> {
  const categories = await listBusinessCategories(false);
  let updated = 0;
  let addedItems = 0;
  for (const category of categories) {
    const currentSpecialties = mapSpecializationItems((category as BusinessCategory & { specialties?: unknown }).specialties);
    const currentScopes = mapSpecializationItems((category as BusinessCategory & { vehicleScopes?: unknown }).vehicleScopes);
    const specialties = mergeSpecializationSeed(currentSpecialties, defaultSpecialtiesForCategory(category.slug));
    const vehicleScopes = mergeSpecializationSeed(currentScopes, defaultVehicleScopesForCategory(category.slug));
    if (
      !specialties.added &&
      !vehicleScopes.added &&
      !specialties.patched &&
      !vehicleScopes.patched &&
      currentSpecialties.length &&
      currentScopes.length
    ) {
      continue;
    }
    await getDb().collection('business_categories').doc(category.id).set(
      {
        specialties: specialties.items,
        vehicleScopes: vehicleScopes.items,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    updated += 1;
    addedItems += specialties.added + vehicleScopes.added;
  }
  return { updated, addedItems };
}

export async function getCategoryTaxonomy(categorySlug: string): Promise<CategoryTaxonomy | null> {
  const normalized = slugifyBusiness(categorySlug);
  const snap = await getDb().collection('business_categories').where('slug', '==', normalized).limit(1).get();
  if (snap.empty) {
    if (!DEFAULT_SPECIALTIES_BY_CATEGORY[normalized] && !DEFAULT_SCOPES_BY_CATEGORY[normalized]) {
      return null;
    }
    return {
      categorySlug: normalized,
      specialties: defaultSpecialtiesForCategory(normalized),
      vehicleScopes: defaultVehicleScopesForCategory(normalized),
    };
  }
  const data = snap.docs[0].data() || {};
  return {
    categorySlug: String(data.slug || normalized),
    specialties: mapSpecializationItems(data.specialties).length
      ? mapSpecializationItems(data.specialties)
      : defaultSpecialtiesForCategory(normalized),
    vehicleScopes: mapSpecializationItems(data.vehicleScopes).length
      ? mapSpecializationItems(data.vehicleScopes)
      : defaultVehicleScopesForCategory(normalized),
  };
}

export async function listAllCategoryTaxonomies(activeOnly = true): Promise<CategoryTaxonomy[]> {
  const categories = await listBusinessCategories(activeOnly);
  return categories.map((category) =>
    taxonomyFromCategory({
      slug: category.slug,
      specialties: mapSpecializationItems((category as BusinessCategory & { specialties?: unknown }).specialties),
      vehicleScopes: mapSpecializationItems((category as BusinessCategory & { vehicleScopes?: unknown }).vehicleScopes),
    })
  );
}

export async function upsertSpecializationItem(input: {
  categoryId: string;
  kind: SpecializationListKind;
  slug?: string;
  label: string;
  sortOrder?: number;
  matchMakes?: string[];
  matchTags?: string[];
}): Promise<SpecializationItem> {
  const ref = getDb().collection('business_categories').doc(input.categoryId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Categoría no encontrada.');
  const data = snap.data() || {};
  const field = input.kind;
  const current = mapSpecializationItems(data[field]);
  const slug = slugifyBusiness(input.slug || input.label);
  if (!slug) throw new Error('El nombre del ítem es requerido.');
  const nextItem: SpecializationItem = {
    slug,
    label: input.label.trim(),
    sortOrder: Number(input.sortOrder) || (current.find((i) => i.slug === slug)?.sortOrder ?? current.length + 1),
    ...(input.matchMakes?.length ? { matchMakes: input.matchMakes.map((v) => v.toLowerCase()) } : {}),
    ...(input.matchTags?.length ? { matchTags: input.matchTags.map((v) => v.toLowerCase()) } : {}),
  };
  const items = current.some((i) => i.slug === slug)
    ? current.map((i) => (i.slug === slug ? { ...i, ...nextItem, matchMakes: nextItem.matchMakes || i.matchMakes, matchTags: nextItem.matchTags || i.matchTags } : i))
    : [...current, nextItem];
  await ref.set(
    { [field]: items, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return nextItem;
}

export async function deleteSpecializationItem(input: {
  categoryId: string;
  kind: SpecializationListKind;
  slug: string;
}): Promise<void> {
  const ref = getDb().collection('business_categories').doc(input.categoryId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Categoría no encontrada.');
  const data = snap.data() || {};
  const field = input.kind;
  const items = mapSpecializationItems(data[field]).filter((itemValue) => itemValue.slug !== input.slug);
  await ref.set(
    { [field]: items, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
}

export async function reorderSpecializationItems(input: {
  categoryId: string;
  kind: SpecializationListKind;
  slugs: string[];
}): Promise<SpecializationItem[]> {
  const ref = getDb().collection('business_categories').doc(input.categoryId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error('Categoría no encontrada.');
  const data = snap.data() || {};
  const field = input.kind;
  const current = mapSpecializationItems(data[field]);
  const bySlug = new Map(current.map((itemValue) => [itemValue.slug, itemValue]));
  const items = input.slugs
    .map((slug, index) => {
      const found = bySlug.get(slug);
      return found ? { ...found, sortOrder: index + 1 } : null;
    })
    .filter((itemValue): itemValue is SpecializationItem => Boolean(itemValue));
  for (const leftover of current) {
    if (!items.some((itemValue) => itemValue.slug === leftover.slug)) {
      items.push({ ...leftover, sortOrder: items.length + 1 });
    }
  }
  await ref.set(
    { [field]: items, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    { merge: true }
  );
  return items;
}

export function normalizeSlugList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map((itemValue) => slugifyBusiness(String(itemValue || ''))).filter(Boolean))
  );
}

export function inferVehicleMatchTags(vehicle?: VehicleMatchInput): string[] {
  const make = String(vehicle?.make || '').trim().toLowerCase();
  const model = String(vehicle?.model || '').trim().toLowerCase();
  const tags = new Set<string>(['livianos']);
  if (!make && !model) return [];
  if (JAPANESE.some((itemValue) => make.includes(itemValue))) tags.add('japoneses');
  if (EUROPEAN.some((itemValue) => make.includes(itemValue))) tags.add('europeos');
  if (AMERICAN.some((itemValue) => make.includes(itemValue))) tags.add('americanos');
  if (KOREAN.some((itemValue) => make.includes(itemValue))) tags.add('coreanos');
  if (CHINESE.some((itemValue) => make.includes(itemValue))) tags.add('chinos');
  if (/(suv|cr-v|rav4|pilot|highlander|explorer|escape|equinox|tahoe|suburban|4runner|pathfinder)/.test(model)) {
    tags.add('suv');
  }
  if (/(pickup|silverado|f-150|f150|sierra|ram |tundra|tacoma|frontier|colorado|ranger)/.test(`${make} ${model}`)) {
    tags.add('pickup');
  }
  if (/(tesla|leaf|bolt|ioniq|ev |mach-e|lyriq)/.test(`${make} ${model}`)) tags.add('electricos');
  if (/(hybrid|hibrido|prius|insight)/.test(`${make} ${model}`)) tags.add('hibridos');
  if (/(moto|motorcycle|yamaha|kawasaki|harley)/.test(make)) {
    tags.delete('livianos');
    tags.add('motos');
  }
  return Array.from(tags);
}

export function vehicleScopeMatchesVehicle(
  scope: SpecializationItem,
  vehicle?: VehicleMatchInput
): boolean {
  if (!vehicle?.make && !vehicle?.model) return true;
  if (scope.matchTags?.includes('all-makes') || scope.slug === 'todas-las-marcas') return true;
  const make = String(vehicle.make || '').trim().toLowerCase();
  const tags = inferVehicleMatchTags(vehicle);
  if (scope.matchMakes?.some((itemValue) => make === itemValue || make.includes(itemValue) || itemValue.includes(make))) {
    return true;
  }
  if (make && (scope.slug === slugifyBusiness(make) || scope.label.toLowerCase() === make)) {
    return true;
  }
  if (scope.matchTags?.some((tag) => tags.includes(tag))) return true;
  return false;
}

export function declaredListMatches(
  declaredSlugs: string[],
  taxonomyItems: SpecializationItem[],
  vehicle?: VehicleMatchInput
): boolean {
  if (!declaredSlugs.length) return false;
  const bySlug = new Map(taxonomyItems.map((itemValue) => [itemValue.slug, itemValue]));
  return declaredSlugs.some((slug) => {
    const itemValue = bySlug.get(slug);
    if (!itemValue) {
      const make = String(vehicle?.make || '').trim().toLowerCase();
      return Boolean(make && (slug === slugifyBusiness(make) || slug.includes(make)));
    }
    return vehicleScopeMatchesVehicle(itemValue, vehicle);
  });
}

export function hasAnyDeclared(slugs?: string[]): boolean {
  return Array.isArray(slugs) && slugs.length > 0;
}

export function matchesSpecialtyFilter(declaredSlugs: string[], requestedSlugs: string[]): boolean {
  if (!requestedSlugs.length) return true;
  if (!declaredSlugs.length) return false;
  const have = new Set(declaredSlugs);
  return requestedSlugs.some((slug) => have.has(slug));
}
