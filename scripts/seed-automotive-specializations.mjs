#!/usr/bin/env node
/**
 * Sembrar especialidades y alcance vehicular en business_categories.
 * Idempotente: agrega ítems faltantes por slug; no borra ediciones de admin.
 * Completa matchMakes/matchTags en ítems sembrados que aún no los tienen.
 */
import admin from 'firebase-admin';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e';

const JAPANESE = ['toyota', 'honda', 'nissan', 'mazda', 'subaru', 'mitsubishi', 'suzuki', 'lexus', 'infiniti', 'acura', 'isuzu', 'daihatsu'];
const EUROPEAN = ['bmw', 'mercedes-benz', 'mercedes', 'audi', 'volkswagen', 'vw', 'volvo', 'mini', 'porsche', 'land rover', 'jaguar', 'fiat', 'peugeot', 'renault', 'alfa romeo', 'seat', 'skoda'];
const AMERICAN = ['ford', 'chevrolet', 'chevy', 'gmc', 'dodge', 'jeep', 'chrysler', 'ram', 'cadillac', 'buick', 'lincoln', 'tesla', 'hummer'];
const KOREAN = ['kia', 'hyundai', 'genesis'];
const CHINESE = ['byd', 'chery', 'geely', 'mg', 'great wall', 'haval', 'jetour'];

const SPECIALTIES = {
  'talleres-mecanicos': ['Motores y culatas','Frenos','Aceite y mantenimiento','Transmisión automática','Transmisión manual','Eléctrico y computadoras','Aire acondicionado','Suspensión y dirección','Diagnóstico computarizado','Embrague','Inyectores y combustible','Radiador y enfriamiento','Escapes y emisiones','Baterías y arranque','Híbridos y EV','Afinación','Correa de tiempo','Caja de transferencia / 4x4','Tren delantero','Dirección hidráulica / eléctrica','Turbo y sobrealimentación','Diferencial','Scaner OBD / códigos','Bomba de agua y termostato','Juntas y empaques','Mecánica liviana','Power steering'],
  gomeras: ['Gomas nuevas','Gomas usadas','Rotación','Balanceo computarizado','Alineación 2 ruedas','Alineación 4 ruedas','Reparación de ponchadura','Parche y vulcanizado','TPMS','Gomas run-flat','Gomas all-terrain / off-road','Gomas highway / carretera','Montaje y desmontaje','Válvulas y aros','Reparación de aros','Nitrógeno','Gomas 15 y 16 pulgadas','Gomas 17 y 18 pulgadas','Gomas 19 pulgadas o más','Gomas LT / comerciales','Aire e inflado','Wipers','Mecánica liviana','Venta de baterías'],
  detailing: ['Detailing completo','Lavado exterior','Lavado interior','Pulido y corrección de pintura','Encerado','Ceramic coating','Mantenimiento de ceramic','Lavado de motor','Ozonización','Restauración de faroles','Limpieza de tapicería','Limpieza de cuero','Clay bar / descontaminación','Tratamiento de plásticos','Limpieza de rines','Servicio a domicilio'],
  hojalateria: ['Enderezado','Pintura completa','Pintura de piezas','Colisión / insurance','Granizo y abolladuras PDR','Sustitución de paneles','Preparación de seguro','Pulido post-pintura','Trabajo de marco','Estimado de seguro','Reparación de parachoques','Restauración de pintura','Match de color','Pintura de aros'],
  'tint-wrap': ['Tintado de cristales','Tintado cerámico','Wrap completo','Wrap parcial','PPF (paint protection)','Tintado de faroles','Remoción de tint','Chrome delete','Wrap de techo','Wrap de aros / calipers','Remoción de wrap','Tintado legal DTOP'],
  piezas: ['Piezas nuevas','Piezas usadas','Piezas OEM','Piezas aftermarket','Accesorios','Entrega / envío','Busqueda por VIN','Motor y transmisión','Frenos y suspensión','Eléctrico','Carrocería','Gomas y aros','Iluminación y faroles','Aceites y químicos','Pedido especial'],
  gruas: ['Plataforma','Gancho','Asistencia en carretera','Cambio de goma','Paso de corriente','Remolque de motos','Remolque de pesados','Servicio 24 horas','Traslado entre pueblos','Remolque de EV','Recuperación fuera de carretera','Traslado a subasta / dealer','Winch / arrastre'],
  cristales: ['Parabrisas','Cristales laterales','Cristal trasero','Reparación de picadura','Calefacción de cristal','Sensores y cámaras','Servicio a domicilio','Seguros / reclamaciones','Molduras y gomas de cristal','ADAS / calibración','Techo panorámico / sunroof','Cristal laminado / acústico'],
  inspeccion: ['Inspección oficial','Marbete','Reinspección','Certificación de emisiones','Inspección de flotas','Inspección previa a compra','Inspección de frenos y luces','Inspección de gomas','Certificado de título / traspaso','Inspección de clásicos','Pre-inspección con corrección'],
  seguros: ['Pólizas de auto','Full coverage','Responsabilidad pública','Cotizaciones','Renovaciones','Reclamaciones','Clásicos y modified','Flotas comerciales','Motos','Collision y comprehensive','Gap / gap waiver','Roadside assistance','Seguro de pickup / comercial'],
  'cambio-aceite': ['Aceite sintético','Aceite convencional','Aceite high-mileage','Filtro de aceite','Filtro de aire','Filtro de cabina','Rotación de gomas','Inspección de 30 puntos','Líquidos y top-off','Flush de transmisión','Cambio de coolant','Revisión de frenos','Wipers'],
  baterias: ['Prueba de batería','Reemplazo','Carga','Alternador','Arranque','Baterías AGM','Baterías EV 12V','Instalación a domicilio','Paso de corriente','Limpieza de bornes','Prueba de sistema de carga','Baterías para diesel'],
  'aire-acondicionado': ['Recarga de gas','Diagnóstico de A/C','Compresor','Condensador','Evaporador','Fugas','A/C de híbridos','Filtro de cabina','Secador / receiver','Válvula de expansión','Embrague de compresor','Desinfección de A/C','Conversión R134a / 1234yf'],
  frenos: ['Pastillas','Discos / rotors','Tambores','Líquido de frenos','Calipers','Freno de emergencia','ABS','Frenos de pickup','Mangueras de freno','Cilindro maestro','Servo / booster','Frenos cerámicos / performance','Sensor de desgaste'],
  alineacion: ['Alineación 2 ruedas','Alineación 4 ruedas','Balanceo','Suspensión','Amortiguadores','Terminales y rotulas','Dirección','Alineación de pickup','Camber / caster / toe','Alineación thrust','Bujes de suspensión','Barras estabilizadoras','Alineación post-colisión'],
  lavado: ['Lavado exterior','Lavado interior','Lavado express','Encerado','Aspirado','Lavado de motor','Self-service','Membresía de lavados','Lavado a mano','Lavado de rines y gomas','Secado y detailing express','Lavado de flotas','Servicio a domicilio'],
  audio: ['Radio / head unit','Bocinas','Amplificador','Subwoofer','Alarmas','Cámaras y sensores','CarPlay / Android Auto','Aislante acústico','Iluminación LED','Remote start','Pantalla / multimedia','Instalación de dashcam','Integración de volante'],
  electrico: ['Diagnóstico computarizado','Check engine','Cableado','Alternador y arranque','Módulos / ECM','Sensores','Cristales eléctricos','Programación de llaves','Eléctrico de híbridos','Fusibles y relays','Luces y faroles','Problemas intermitentes','Red CAN / comunicación'],
  transmision: ['Servicio de fluido','Reparación automática','Reparación manual','Embrague','Convertidor de torque','Solenoides','Reconstrucción','Diagnóstico de patinaje','4x4 / transfer case','CVT','Doble embrague / DCT','Sellos y fugas','Programación TCM'],
  escapes: ['Mofle','Catalítico','Downpipe','Headers','Fugas de escape','Sensores de oxígeno','Emisiones','Escape performance','Resonador','Flex pipe','DPF / diésel','Soldadura de escape','Eliminación de check engine por escape'],
  'hibridos-ev': ['Diagnóstico híbrido','Batería de alto voltaje','Inversor','Cargador a bordo','Enfriamiento de batería','Frenos regenerativos','Servicio programado EV','A/C en EV','Diagnóstico de módulos','Puerto de carga','Cable de carga / EVSE','Aislamiento / megaohmios','Mantenimiento de híbrido Toyota / Honda'],
  motos: ['Mecánica general','Gomas de moto','Frenos','Aceite y filtros','Eléctrico','Carburación / inyección','Cadena y sprockets','Suspensión','Piezas de moto','Afinación','Batería de moto','Embrague de moto','Servicio de scooter','Inspección previa a viaje'],
  flotas: ['Mantenimiento programado','Frenos de flota','Gomas de flota','Aceite en sitio','Inspección DOT / local','Diagnóstico','Gestión de órdenes','Servicio a patio','Alineación de flota','Baterías de flota','Reportes de costo por unidad','Contratos mensuales','Unidades diésel de flota'],
  'asistencia-vial': ['Paso de corriente','Cambio de goma','Gasolina de emergencia','Apertura de auto','Remolque corto','Sobrecalentamiento','Servicio 24 horas','Inflado de goma','Llave olvidada','Auto no prende','Asistencia en autopista','Coordinación con grúa'],
  cerrajeria: ['Apertura de vehículos','Copia de llave','Chip / transponder','Llave inteligente','Programación','Cambio de bombín','Ignición','Servicio a domicilio','Llave de proximidad','Remote / control','Extracción de llave rota','Programación de fob'],
  radiadores: ['Radiador','Mangueras','Termostato','Bomba de agua','Abanico','Flush de coolant','Calefacción','Fugas de coolant','Radiador de A/C / condensador','Tanque de reserva','Sobrecalentamiento','Coolant de híbridos','Soldadura / recore'],
  emisiones: ['Prueba de emisiones','Corrección de códigos','Catalítico','Sensores de O2','EGR','EVAP','Check engine por emisiones','Smoke test','PCV','MAF / MAP','Afinación para pasar inspección','Diagnóstico de readiness'],
};

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function scope(slug, label, sortOrder, extra = {}) {
  return { slug, label, sortOrder, ...extra };
}

function makeScope(slug, label, sortOrder) {
  return scope(slug, label, sortOrder, { matchMakes: [slug.replace(/-/g, ' '), label.toLowerCase()] });
}

const COMMON_SCOPES = [
  scope('todas-las-marcas', 'Todas las marcas que atiendo', 1, { matchTags: ['all-makes'] }),
  scope('japoneses', 'Japoneses', 2, { matchMakes: JAPANESE, matchTags: ['japoneses'] }),
  scope('europeos', 'Europeos', 3, { matchMakes: EUROPEAN, matchTags: ['europeos'] }),
  scope('americanos', 'Americanos', 4, { matchMakes: AMERICAN, matchTags: ['americanos'] }),
  scope('coreanos', 'Coreanos', 5, { matchMakes: KOREAN, matchTags: ['coreanos'] }),
  scope('chinos', 'Chinos', 6, { matchMakes: CHINESE, matchTags: ['chinos'] }),
  makeScope('toyota', 'Toyota', 10),
  makeScope('honda', 'Honda', 11),
  makeScope('nissan', 'Nissan', 12),
  makeScope('kia', 'Kia', 13),
  makeScope('hyundai', 'Hyundai', 14),
  makeScope('ford', 'Ford', 15),
  makeScope('chevrolet', 'Chevrolet', 16),
  makeScope('bmw', 'BMW', 17),
  makeScope('mercedes-benz', 'Mercedes-Benz', 18),
  makeScope('jeep', 'Jeep', 19),
  makeScope('ram', 'Ram', 20),
  makeScope('mazda', 'Mazda', 21),
  makeScope('subaru', 'Subaru', 22),
  scope('livianos', 'Vehículos livianos / pasajeros', 30, { matchTags: ['livianos'] }),
  scope('suv', 'SUV y crossovers', 31, { matchTags: ['suv'] }),
  scope('pickup', 'Pickups', 32, { matchTags: ['pickup'] }),
  scope('diesel', 'Diésel', 33, { matchTags: ['diesel'] }),
  scope('hibridos', 'Híbridos', 34, { matchTags: ['hibridos'] }),
  scope('electricos', 'Eléctricos (EV)', 35, { matchTags: ['electricos'] }),
  scope('lujo', 'Vehículos de lujo', 36, { matchTags: ['lujo'] }),
  scope('comerciales-livianos', 'Comerciales livianos / vans', 37, { matchTags: ['comerciales'] }),
];

const MOTO_SCOPES = [
  scope('motos-todas', 'Todas las motos', 1, { matchTags: ['motos', 'all-makes'] }),
  scope('motos-street', 'Street / naked', 2, { matchTags: ['motos'] }),
  scope('motos-sport', 'Sport / pista', 3, { matchTags: ['motos'] }),
  scope('motos-scooter', 'Scooter', 4, { matchTags: ['motos'] }),
  scope('motos-touring', 'Touring', 5, { matchTags: ['motos'] }),
  scope('motos-enduro', 'Enduro / dirt', 6, { matchTags: ['motos'] }),
  scope('atv-utv', 'ATV / UTV', 7, { matchTags: ['motos'] }),
  makeScope('honda', 'Honda', 10),
  makeScope('yamaha', 'Yamaha', 11),
  makeScope('kawasaki', 'Kawasaki', 12),
  makeScope('suzuki', 'Suzuki', 13),
  makeScope('harley-davidson', 'Harley-Davidson', 14),
  scope('bmw', 'BMW Motorrad', 15, { matchMakes: ['bmw'] }),
];

const GOMERA_SCOPES = [
  ...COMMON_SCOPES,
  scope('gomas-passenger', 'Gomas passenger / P-metric', 40, { matchTags: ['livianos'] }),
  scope('gomas-lt', 'Gomas LT / camión liviano', 41, { matchTags: ['pickup', 'comerciales'] }),
  scope('gomas-suv', 'Gomas para SUV', 42, { matchTags: ['suv'] }),
];

const SCOPES = {
  motos: MOTO_SCOPES,
  gomeras: GOMERA_SCOPES,
  alineacion: GOMERA_SCOPES,
};

function toItems(labels) {
  return labels.map((label, index) => ({ slug: slugify(label), label, sortOrder: index + 1 }));
}

const LEGACY_SCOPE_SLUGS = {
  'todas-las-marcas-que-atiendo': 'todas-las-marcas',
  'vehiculos-livianos-pasajeros': 'livianos',
  'suv-y-crossovers': 'suv',
  pickups: 'pickup',
  'electricos-ev': 'electricos',
  'vehiculos-de-lujo': 'lujo',
  'comerciales-livianos-vans': 'comerciales-livianos',
  'gomas-passenger-p-metric': 'gomas-passenger',
  'gomas-lt-camion-liviano': 'gomas-lt',
  'gomas-para-suv': 'gomas-suv',
  'todas-las-motos': 'motos-todas',
  'street-naked': 'motos-street',
  'sport-pista': 'motos-sport',
  scooter: 'motos-scooter',
  touring: 'motos-touring',
  'enduro-dirt': 'motos-enduro',
  'bmw-motorrad': 'bmw',
};

function dropLegacyDuplicates(items) {
  const canonical = new Set(items.map((item) => item.slug));
  return items.filter((item) => {
    const next = LEGACY_SCOPE_SLUGS[item.slug];
    return !next || !canonical.has(next);
  });
}

function mergeItems(existing, seed) {
  const bySlug = new Map((Array.isArray(existing) ? existing : []).map((item) => [String(item.slug || ''), item]));
  let added = 0;
  let patched = 0;
  for (const next of seed) {
    if (!next.slug) continue;
    const current = bySlug.get(next.slug);
    if (!current) {
      bySlug.set(next.slug, next);
      added += 1;
      continue;
    }
    const needsMakes = !(Array.isArray(current.matchMakes) && current.matchMakes.length) && Array.isArray(next.matchMakes) && next.matchMakes.length;
    const needsTags = !(Array.isArray(current.matchTags) && current.matchTags.length) && Array.isArray(next.matchTags) && next.matchTags.length;
    if (!needsMakes && !needsTags) continue;
    bySlug.set(next.slug, {
      ...current,
      ...(needsMakes ? { matchMakes: next.matchMakes } : {}),
      ...(needsTags ? { matchTags: next.matchTags } : {}),
    });
    patched += 1;
  }
  return { items: Array.from(bySlug.values()), added, patched };
}

export async function seedAutomotiveSpecializations(db) {
  const snap = await db.collection('business_categories').get();
  const counts = {};
  let updated = 0;
  let addedItems = 0;
  let patchedItems = 0;
  for (const doc of snap.docs) {
    const data = doc.data() || {};
    const slug = String(data.slug || '');
    const specSeed = toItems(SPECIALTIES[slug] || []);
    const scopeSeed = SCOPES[slug] || COMMON_SCOPES;
    if (!specSeed.length) continue;
    const specialties = mergeItems(data.specialties, specSeed);
    const vehicleScopes = mergeItems(data.vehicleScopes, scopeSeed);
    vehicleScopes.items = dropLegacyDuplicates(vehicleScopes.items);
    const cleanedLegacy =
      Array.isArray(data.vehicleScopes) && vehicleScopes.items.length !== data.vehicleScopes.length;
    if (
      specialties.added ||
      vehicleScopes.added ||
      specialties.patched ||
      vehicleScopes.patched ||
      cleanedLegacy ||
      !Array.isArray(data.specialties) ||
      !data.specialties.length
    ) {
      await doc.ref.set(
        { specialties: specialties.items, vehicleScopes: vehicleScopes.items, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
      updated += 1;
      addedItems += specialties.added + vehicleScopes.added;
      patchedItems += specialties.patched + vehicleScopes.patched;
    }
    counts[slug] = { specialties: specialties.items.length, vehicleScopes: vehicleScopes.items.length };
  }
  return { updated, addedItems, patchedItems, counts, categories: Object.keys(counts).length };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.includes('seed-automotive-specializations')) {
  if (!admin.apps.length) admin.initializeApp({ projectId: PROJECT_ID });
  const result = await seedAutomotiveSpecializations(admin.firestore());
  console.log(JSON.stringify({ ok: true, project: PROJECT_ID, ...result }, null, 2));
}
