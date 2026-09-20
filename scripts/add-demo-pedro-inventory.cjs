/**
 * Agrega inventario extra a la cuenta demo Pedro Martínez (mismas marcas, más modelos).
 * No modifica leads, ventas ni otros datos CRM.
 *
 * Uso: node scripts/add-demo-pedro-inventory.cjs
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (!m) continue;
    const key = m[1].trim();
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    projectId: process.env.FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const ts = admin.firestore.FieldValue.serverTimestamp();

const SELLER_ID = 'hUX9H3j2toXfvIz8tEtFNzSgiUW2';
const TENANT_ID = 'NPtFzTw3FyQkb6NPQkdj';

/** Vehículos adicionales — mismas marcas que el inventario demo original. */
const EXTRA_VEHICLES = [
  {
    make: 'Toyota',
    model: 'Corolla',
    year: 2022,
    price: 19900,
    mileage: 28500,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Toyota Corolla 2022 confiable y económica. Bajo consumo, ideal para ciudad. Un solo dueño.',
    photos: ['https://images.unsplash.com/photo-1623869675781-12e04b303285?w=800'],
    views: 156,
  },
  {
    make: 'Toyota',
    model: 'RAV4',
    year: 2023,
    price: 27500,
    mileage: 18200,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Toyota RAV4 2023 AWD. SUV compacta con excelente reventa y espacio para la familia.',
    photos: ['https://images.unsplash.com/photo-1619767886555-efeb975c1da8?w=800'],
    views: 198,
  },
  {
    make: 'Honda',
    model: 'Civic',
    year: 2022,
    price: 21400,
    mileage: 35100,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Honda Civic 2022 Sport. Diseño moderno, manejo ágil y excelente economía de combustible.',
    photos: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    views: 124,
  },
  {
    make: 'Honda',
    model: 'Accord',
    year: 2021,
    price: 24800,
    mileage: 41000,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Honda Accord 2021 EX-L. Sedán amplio con cuero, ideal para ejecutivos y familias.',
    photos: ['https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800'],
    views: 88,
  },
  {
    make: 'Honda',
    model: 'HR-V',
    year: 2023,
    price: 23600,
    mileage: 22800,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Honda HR-V 2023 compacta y versátil. Perfecta para estacionarse fácil y viajar en la isla.',
    photos: ['https://images.unsplash.com/photo-1609521263047-f8f205293bb4?w=800'],
    views: 73,
  },
  {
    make: 'Ford',
    model: 'Explorer',
    year: 2021,
    price: 34500,
    mileage: 39600,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Ford Explorer 2021 XLT. SUV de 3 filas, espacio para toda la familia y tracción confiable.',
    photos: ['https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800'],
    views: 167,
  },
  {
    make: 'Ford',
    model: 'Mustang',
    year: 2022,
    price: 32800,
    mileage: 15400,
    condition: 'used',
    bodyType: 'coupe',
    description:
      'Ford Mustang 2022 EcoBoost. Deportivo icónico con bajo millaje y excelente estado.',
    photos: ['https://images.unsplash.com/photo-1584345609906-2e9a2430a6d7?w=800'],
    views: 312,
  },
  {
    make: 'Ford',
    model: 'Escape',
    year: 2023,
    price: 26400,
    mileage: 12900,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Ford Escape 2023 híbrida suave. SUV compacta con tecnología Ford Co-Pilot360.',
    photos: ['https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800'],
    views: 95,
  },
  {
    make: 'Tesla',
    model: 'Model Y',
    year: 2024,
    price: 42900,
    mileage: 8500,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Tesla Model Y 2024 Long Range. SUV eléctrica con autopilot y carga rápida incluida.',
    photos: ['https://images.unsplash.com/photo-1617788138017-80ad40651399?w=800'],
    views: 221,
  },
  {
    make: 'Tesla',
    model: 'Model S',
    year: 2022,
    price: 58900,
    mileage: 24000,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Tesla Model S 2022 Plaid. Sedán eléctrico de alto rendimiento con interior premium.',
    photos: ['https://images.unsplash.com/photo-1619767886555-efeb975c1da8?w=800'],
    views: 178,
  },
  {
    make: 'BMW',
    model: 'X3',
    year: 2021,
    price: 41200,
    mileage: 31500,
    condition: 'used',
    bodyType: 'suv',
    description:
      'BMW X3 2021 xDrive30i. SUV premium alemana con manejo deportivo y acabados de lujo.',
    photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
    views: 134,
  },
  {
    make: 'BMW',
    model: '330i',
    year: 2022,
    price: 38900,
    mileage: 19800,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'BMW 330i 2022. Sedán deportivo con paquete M Sport y pantalla iDrive de última generación.',
    photos: ['https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800'],
    views: 102,
  },
  {
    make: 'Hyundai',
    model: 'Elantra',
    year: 2023,
    price: 18900,
    mileage: 16400,
    condition: 'used',
    bodyType: 'sedan',
    description:
      'Hyundai Elantra 2023 SEL. Sedán moderno con garantía transferible y bajo costo de mantenimiento.',
    photos: ['https://images.unsplash.com/photo-1617531653332-bd46c24f2068?w=800'],
    views: 61,
  },
  {
    make: 'Hyundai',
    model: 'Santa Fe',
    year: 2021,
    price: 28700,
    mileage: 44200,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Hyundai Santa Fe 2021 Limited. SUV mediana con 3 filas opcionales y equipamiento completo.',
    photos: ['https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800'],
    views: 79,
  },
  {
    make: 'Hyundai',
    model: 'Kona',
    year: 2022,
    price: 22100,
    mileage: 27600,
    condition: 'used',
    bodyType: 'suv',
    description:
      'Hyundai Kona 2022 SEL. SUV subcompacta ágil, ideal para primer vehículo o uso urbano.',
    photos: ['https://images.unsplash.com/photo-1619767886555-efeb975c1da8?w=800'],
    views: 54,
  },
];

function vehicleKey(v) {
  return `${v.make}|${v.model}|${v.year}`.toLowerCase();
}

function nextStockNumber(existing) {
  let max = 0;
  for (const v of existing) {
    const sn = String(v.stockNumber || '');
    const m = sn.match(/^DEMO-(\d+)$/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max;
}

async function main() {
  console.log('\n🚗 Agregando inventario extra para Pedro Martínez...\n');

  const tenantRef = db.collection('tenants').doc(TENANT_ID);
  const tenantSnap = await tenantRef.get();
  if (!tenantSnap.exists) {
    throw new Error(`Tenant no encontrado: ${TENANT_ID}`);
  }

  const vehSnap = await tenantRef.collection('vehicles').where('sellerId', '==', SELLER_ID).get();
  const existing = vehSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const existingKeys = new Set(existing.map((v) => vehicleKey(v)));

  console.log(`Inventario actual: ${existing.length} vehículos`);

  let stockSeq = nextStockNumber(existing);
  let created = 0;
  let skipped = 0;

  for (const v of EXTRA_VEHICLES) {
    const key = vehicleKey(v);
    if (existingKeys.has(key)) {
      console.log(`  ⏭️  Ya existe: ${v.year} ${v.make} ${v.model}`);
      skipped++;
      continue;
    }

    stockSeq += 1;
    const stockNumber = `DEMO-${String(stockSeq).padStart(3, '0')}`;

    await tenantRef.collection('vehicles').doc().set({
      tenantId: TENANT_ID,
      make: v.make,
      model: v.model,
      year: v.year,
      price: v.price,
      currency: 'USD',
      condition: v.condition,
      bodyType: v.bodyType,
      mileage: v.mileage,
      description: v.description,
      photos: v.photos,
      videos: [],
      specifications: {
        transmission: 'automatic',
        fuelType: v.make === 'Tesla' ? 'electric' : 'gasoline',
        bodyType: v.bodyType,
        exteriorColor: 'Varios',
        color: 'Varios',
        doors: v.bodyType === 'coupe' ? 2 : 4,
        seats: v.bodyType === 'pickup' ? 5 : 5,
        hasAccidents: false,
        stockNumber,
      },
      stockNumber,
      status: 'available',
      publishedOnPublicPage: false,
      sellerId: SELLER_ID,
      sellerCommissionType: 'percentage',
      insuranceCommissionType: 'percentage',
      accessoriesCommissionType: 'percentage',
      views: v.views,
      lastViewedAt: ts,
      createdAt: ts,
      updatedAt: ts,
    });

    console.log(`  ✅ ${stockNumber}: ${v.year} ${v.make} ${v.model} — $${v.price.toLocaleString()}`);
    created++;
    existingKeys.add(key);
  }

  const finalSnap = await tenantRef.collection('vehicles').where('sellerId', '==', SELLER_ID).get();
  console.log(`\n📦 Total inventario Pedro: ${finalSnap.size} vehículos (${created} nuevos, ${skipped} omitidos)\n`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
