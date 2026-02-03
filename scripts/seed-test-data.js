// Script para agregar datos de prueba a Firebase
// Ejecutar con: node scripts/seed-test-data.js

const admin = require('firebase-admin');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Inicializar Firebase Admin
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    console.log('✅ Firebase Admin inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase Admin:', error);
    process.exit(1);
  }
}

const db = admin.firestore();

async function seedTestData() {
  try {
    console.log('\n🌱 Iniciando seed de datos de prueba...\n');

    // 1. Crear un tenant de prueba (dealer)
    console.log('📝 Creando tenant de prueba...');
    const tenantRef = db.collection('tenants').doc();
    const tenantId = tenantRef.id;
    
    await tenantRef.set({
      name: 'Auto Premium Motors',
      type: 'dealer',
      status: 'active',
      subdomain: 'autopremium',
      description: 'Concesionario de vehículos premium y seminuevos',
      phone: '+1-555-0123',
      email: 'contacto@autopremium.com',
      address: 'Av. Principal 123, Ciudad',
      website: 'https://autopremium.com',
      logo: 'https://via.placeholder.com/200x200?text=Auto+Premium',
      dealerRating: 4.8,
      dealerRatingCount: 127,
      publishedVehiclesCount: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    
    console.log('✅ Tenant creado:', tenantId);

    // 2. Crear vehículos de prueba
    console.log('\n📝 Creando vehículos de prueba...');
    
    const vehicles = [
      {
        make: 'Toyota',
        model: 'Camry',
        year: 2023,
        price: 28500,
        currency: 'USD',
        condition: 'new',
        mileage: 0,
        description: 'Toyota Camry 2023 completamente nuevo, con tecnología híbrida y todas las características de seguridad.',
        photos: [
          'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800',
          'https://images.unsplash.com/photo-1621007947876-e4ece0d9097c?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Híbrido',
          bodyType: 'Sedán',
          doors: 4,
          passengers: 5,
          color: 'Plata',
          vin: 'JTDBAMFV123456789',
        },
        stockNumber: 'CAM2023001',
        status: 'available',
        publishedOnPublicPage: true,
      },
      {
        make: 'Honda',
        model: 'CR-V',
        year: 2022,
        price: 32900,
        currency: 'USD',
        condition: 'used',
        mileage: 15000,
        description: 'Honda CR-V 2022 en excelente estado, un solo dueño, mantenimiento al día.',
        photos: [
          'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800',
          'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd7?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Gasolina',
          bodyType: 'SUV',
          doors: 5,
          passengers: 5,
          color: 'Negro',
          vin: 'JHMRW1F84MC123456',
        },
        stockNumber: 'CRV2022001',
        status: 'available',
        publishedOnPublicPage: true,
      },
      {
        make: 'Ford',
        model: 'F-150',
        year: 2023,
        price: 45900,
        currency: 'USD',
        condition: 'new',
        mileage: 0,
        description: 'Ford F-150 2023, la pickup más vendida de América. Motor V8, 4x4, con todas las opciones.',
        photos: [
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800',
          'https://images.unsplash.com/photo-1533473359331-0135ef1b58c0?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Gasolina',
          bodyType: 'Pickup',
          doors: 4,
          passengers: 5,
          color: 'Azul',
          vin: '1FTEW1EP5KFA12345',
        },
        stockNumber: 'F152023001',
        status: 'available',
        publishedOnPublicPage: true,
      },
      {
        make: 'Tesla',
        model: 'Model 3',
        year: 2023,
        price: 42990,
        currency: 'USD',
        condition: 'new',
        mileage: 0,
        description: 'Tesla Model 3 2023, vehículo 100% eléctrico con autopilot. Cero emisiones, alto rendimiento.',
        photos: [
          'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
          'https://images.unsplash.com/photo-1560958089-b8a1929cea90?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Eléctrico',
          bodyType: 'Sedán',
          doors: 4,
          passengers: 5,
          color: 'Blanco',
          vin: '5YJ3E1EA9KF123456',
        },
        stockNumber: 'TES2023001',
        status: 'available',
        publishedOnPublicPage: true,
      },
      {
        make: 'BMW',
        model: 'X5',
        year: 2022,
        price: 62500,
        currency: 'USD',
        condition: 'used',
        mileage: 22000,
        description: 'BMW X5 2022, SUV de lujo con interior de cuero, sistema de sonido premium y todas las opciones.',
        photos: [
          'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800',
          'https://images.unsplash.com/photo-1555215695-3004980ad54f?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Gasolina',
          bodyType: 'SUV',
          doors: 5,
          passengers: 7,
          color: 'Negro',
          vin: '5UXCR6C05M9D12345',
        },
        stockNumber: 'BMW2022001',
        status: 'available',
        publishedOnPublicPage: true,
      },
      {
        make: 'Mercedes-Benz',
        model: 'C-Class',
        year: 2023,
        price: 48900,
        currency: 'USD',
        condition: 'new',
        mileage: 0,
        description: 'Mercedes-Benz Clase C 2023, elegancia y tecnología alemana en un sedán de lujo.',
        photos: [
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800',
          'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d9?w=800',
        ],
        specifications: {
          transmission: 'Automática',
          fuelType: 'Gasolina',
          bodyType: 'Sedán',
          doors: 4,
          passengers: 5,
          color: 'Plata',
          vin: 'WDDZF4KB1LA123456',
        },
        stockNumber: 'MER2023001',
        status: 'available',
        publishedOnPublicPage: true,
      },
    ];

    let vehicleCount = 0;
    for (const vehicle of vehicles) {
      const vehicleRef = db.collection('tenants').doc(tenantId).collection('vehicles').doc();
      await vehicleRef.set({
        ...vehicle,
        tenantId,
        tenantName: 'Auto Premium Motors',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      vehicleCount++;
      console.log(`✅ Vehículo ${vehicleCount}/6 creado: ${vehicle.year} ${vehicle.make} ${vehicle.model}`);
    }

    // Actualizar contador de vehículos publicados en el tenant
    await tenantRef.update({
      publishedVehiclesCount: vehicleCount,
    });

    // 3. Crear promociones de prueba
    console.log('\n📝 Creando promociones de prueba...');
    
    const promotions = [
      {
        name: '¡Oferta Especial SUVs!',
        description: 'Descuento del 10% en todos nuestros SUVs. Válido por tiempo limitado.',
        discount: {
          type: 'percentage',
          value: 10,
        },
        promotionScope: 'dealer',
        status: 'active',
        views: 0,
        clicks: 0,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
      {
        name: 'Financiamiento 0% APR',
        description: 'Financiamiento sin intereses en vehículos selectos. Aprobación inmediata.',
        promotionScope: 'dealer',
        status: 'active',
        views: 0,
        clicks: 0,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 días
      },
    ];

    let promoCount = 0;
    for (const promo of promotions) {
      const promoRef = db.collection('tenants').doc(tenantId).collection('promotions').doc();
      await promoRef.set({
        ...promo,
        tenantId,
        tenantName: 'Auto Premium Motors',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      promoCount++;
      console.log(`✅ Promoción ${promoCount}/2 creada: ${promo.name}`);
    }

    console.log('\n✅ ¡Seed completado exitosamente!\n');
    console.log('📊 Resumen:');
    console.log(`   - Tenant ID: ${tenantId}`);
    console.log(`   - Vehículos creados: ${vehicleCount}`);
    console.log(`   - Promociones creadas: ${promoCount}`);
    console.log('\n🎉 Ahora recarga la página web para ver los datos.\n');

  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

// Ejecutar el seed
seedTestData()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });


