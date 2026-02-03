const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde el archivo .env.local en la raíz
const envPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  
  envLines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

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

// Mapeo completo de modelos comunes a bodyType
// Formato: 'modelo': 'bodyType'
const modelToBodyType = {
  // Kia
  'sportage': 'suv',
  'sorento': 'suv',
  'telluride': 'suv',
  'carnival': 'minivan',
  'rio': 'sedan',
  'forte': 'sedan',
  'optima': 'sedan',
  'k5': 'sedan',
  'stinger': 'sedan',
  'niro': 'crossover',
  'ev6': 'electric',
  'ev9': 'electric',
  'soul': 'hatchback',
  'cerato': 'sedan',
  'picanto': 'hatchback',
  
  // Toyota
  'camry': 'sedan',
  'corolla': 'sedan',
  'prius': 'hybrid',
  'rav4': 'suv',
  'highlander': 'suv',
  '4runner': 'suv',
  'land cruiser': 'suv',
  'sequoia': 'suv',
  'tacoma': 'pickup-truck',
  'tundra': 'pickup-truck',
  'sienna': 'minivan',
  'yaris': 'hatchback',
  'avalon': 'sedan',
  'venza': 'crossover',
  'c-hr': 'crossover',
  'bZ4X': 'electric',
  
  // Honda
  'accord': 'sedan',
  'civic': 'sedan',
  'cr-v': 'suv',
  'pilot': 'suv',
  'passport': 'suv',
  'ridgeline': 'pickup-truck',
  'odyssey': 'minivan',
  'fit': 'hatchback',
  'hr-v': 'crossover',
  'element': 'suv',
  
  // Ford
  'f-150': 'pickup-truck',
  'f-250': 'pickup-truck',
  'f-350': 'pickup-truck',
  'ranger': 'pickup-truck',
  'mustang': 'coupe',
  'explorer': 'suv',
  'escape': 'suv',
  'edge': 'suv',
  'expedition': 'suv',
  'bronco': 'suv',
  'fusion': 'sedan',
  'focus': 'sedan',
  'taurus': 'sedan',
  'transit': 'van',
  'econoline': 'van',
  'fiesta': 'hatchback',
  'mach-e': 'electric',
  
  // Chevrolet
  'silverado': 'pickup-truck',
  'colorado': 'pickup-truck',
  'tahoe': 'suv',
  'suburban': 'suv',
  'traverse': 'suv',
  'equinox': 'suv',
  'trax': 'suv',
  'blazer': 'suv',
  'malibu': 'sedan',
  'impala': 'sedan',
  'cruze': 'sedan',
  'camaro': 'coupe',
  'corvette': 'coupe',
  'express': 'van',
  'bolt': 'electric',
  'volt': 'plug-in-hybrid',
  
  // Nissan
  'altima': 'sedan',
  'sentra': 'sedan',
  'maxima': 'sedan',
  'rogue': 'suv',
  'pathfinder': 'suv',
  'armada': 'suv',
  'frontier': 'pickup-truck',
  'titan': 'pickup-truck',
  'versa': 'sedan',
  'murano': 'crossover',
  'juke': 'crossover',
  'leaf': 'electric',
  'ariya': 'electric',
  
  // BMW
  '3 series': 'sedan',
  '5 series': 'sedan',
  '7 series': 'sedan',
  'x1': 'suv',
  'x3': 'suv',
  'x5': 'suv',
  'x7': 'suv',
  'z4': 'convertible',
  'i3': 'electric',
  'i4': 'electric',
  'ix': 'electric',
  
  // Mercedes-Benz
  'c-class': 'sedan',
  'e-class': 'sedan',
  's-class': 'sedan',
  'glc': 'suv',
  'gle': 'suv',
  'gls': 'suv',
  'g-class': 'suv',
  'sprinter': 'van',
  'metris': 'van',
  'eqs': 'electric',
  'eqb': 'electric',
  
  // Audi
  'a3': 'sedan',
  'a4': 'sedan',
  'a6': 'sedan',
  'a8': 'sedan',
  'q3': 'suv',
  'q5': 'suv',
  'q7': 'suv',
  'q8': 'suv',
  'tt': 'coupe',
  'r8': 'coupe',
  'e-tron': 'electric',
  
  // Volkswagen
  'jetta': 'sedan',
  'passat': 'sedan',
  'golf': 'hatchback',
  'tiguan': 'suv',
  'atlas': 'suv',
  'id.4': 'electric',
  'id.buzz': 'electric',
  
  // Hyundai
  'elantra': 'sedan',
  'sonata': 'sedan',
  'accent': 'sedan',
  'tucson': 'suv',
  'santa fe': 'suv',
  'palisade': 'suv',
  'kona': 'crossover',
  'ioniq': 'electric',
  'ioniq 5': 'electric',
  'ioniq 6': 'electric',
  
  // Mazda
  'mazda3': 'sedan',
  'mazda6': 'sedan',
  'cx-3': 'suv',
  'cx-5': 'suv',
  'cx-9': 'suv',
  'cx-30': 'crossover',
  'mx-5': 'convertible',
  
  // Subaru
  'impreza': 'sedan',
  'legacy': 'sedan',
  'outback': 'wagon',
  'forester': 'suv',
  'crosstrek': 'crossover',
  'ascent': 'suv',
  
  // Jeep
  'wrangler': 'suv',
  'grand cherokee': 'suv',
  'cherokee': 'suv',
  'compass': 'suv',
  'renegade': 'suv',
  'gladiator': 'pickup-truck',
  
  // Ram
  '1500': 'pickup-truck',
  '2500': 'pickup-truck',
  '3500': 'pickup-truck',
  'promaster': 'van',
  
  // GMC
  'sierra': 'pickup-truck',
  'yukon': 'suv',
  'acadia': 'suv',
  'terrain': 'suv',
  'savana': 'van',
  
  // Dodge
  'challenger': 'coupe',
  'charger': 'sedan',
  'durango': 'suv',
  'journey': 'suv',
  'grand caravan': 'minivan',
  'ram': 'pickup-truck',
  
  // Lexus
  'es': 'sedan',
  'is': 'sedan',
  'ls': 'sedan',
  'rx': 'suv',
  'gx': 'suv',
  'lx': 'suv',
  'nx': 'crossover',
  'ux': 'crossover',
  
  // Acura
  'tlx': 'sedan',
  'ilx': 'sedan',
  'rdx': 'suv',
  'mdx': 'suv',
  
  // Infiniti
  'q50': 'sedan',
  'q60': 'coupe',
  'qx50': 'suv',
  'qx60': 'suv',
  'qx80': 'suv',
  
  // Cadillac
  'ct4': 'sedan',
  'ct5': 'sedan',
  'xt4': 'suv',
  'xt5': 'suv',
  'xt6': 'suv',
  'escalade': 'suv',
  
  // Volvo
  's60': 'sedan',
  's90': 'sedan',
  'xc40': 'suv',
  'xc60': 'suv',
  'xc90': 'suv',
  
  // Tesla
  'model 3': 'electric',
  'model s': 'electric',
  'model x': 'electric',
  'model y': 'electric',
  'cybertruck': 'pickup-truck',
  
  // Porsche
  '911': 'coupe',
  'cayenne': 'suv',
  'macan': 'suv',
  'panamera': 'sedan',
  'taycan': 'electric',
  
  // Otros modelos comunes
  'wagon': 'wagon',
  'van': 'van',
  'minivan': 'minivan',
  'convertible': 'convertible',
  'coupe': 'coupe',
  'hatchback': 'hatchback',
};

// Función para inferir bodyType basado en el modelo
function inferBodyTypeFromModel(make, model) {
  if (!model) return null;
  
  const modelLower = String(model).toLowerCase().trim();
  const makeLower = String(make || '').toLowerCase().trim();
  
  // Buscar coincidencia exacta primero
  for (const [key, bodyType] of Object.entries(modelToBodyType)) {
    if (modelLower === key || modelLower.includes(key)) {
      return bodyType;
    }
  }
  
  // Buscar por palabras clave comunes
  if (modelLower.includes('pickup') || modelLower.includes('truck') || modelLower.includes('f-') || modelLower.includes('silverado') || modelLower.includes('ram')) {
    return 'pickup-truck';
  }
  
  if (modelLower.includes('van') || modelLower.includes('transit') || modelLower.includes('sprinter') || modelLower.includes('promaster')) {
    return 'van';
  }
  
  if (modelLower.includes('minivan') || modelLower.includes('odyssey') || modelLower.includes('sienna') || modelLower.includes('carnival')) {
    return 'minivan';
  }
  
  if (modelLower.includes('convertible') || modelLower.includes('cabrio') || modelLower.includes('roadster')) {
    return 'convertible';
  }
  
  if (modelLower.includes('coupe') || modelLower.includes('sport') || modelLower.includes('gt')) {
    return 'coupe';
  }
  
  if (modelLower.includes('wagon') || modelLower.includes('estate') || modelLower.includes('tourer')) {
    return 'wagon';
  }
  
  if (modelLower.includes('hatchback') || modelLower.includes('hatch')) {
    return 'hatchback';
  }
  
  if (modelLower.includes('electric') || modelLower.includes('ev') || modelLower.includes('e-') || modelLower.includes('bolt') || modelLower.includes('leaf') || modelLower.includes('ioniq')) {
    return 'electric';
  }
  
  if (modelLower.includes('hybrid') || modelLower.includes('prius') || modelLower.includes('niro')) {
    return 'hybrid';
  }
  
  if (modelLower.includes('suv') || modelLower.includes('crossover') || modelLower.includes('x') || modelLower.includes('cr-') || modelLower.includes('rav')) {
    return 'suv';
  }
  
  // Por defecto, si no se puede determinar, usar 'sedan' (más común)
  return 'sedan';
}

async function updateVehicleBodyTypes() {
  try {
    console.log('🔍 Buscando vehículos sin bodyType...\n');
    
    const tenantsSnapshot = await db.collection('tenants').where('status', '==', 'active').get();
    let totalUpdated = 0;
    let totalSkipped = 0;
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const tenantData = tenantDoc.data();
      console.log(`📂 Procesando tenant: ${tenantData.name || tenantId}`);
      
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();
      
      for (const vehicleDoc of vehiclesSnapshot.docs) {
        const vehicleData = vehicleDoc.data();
        const vehicleId = vehicleDoc.id;
        
        // Verificar si ya tiene bodyType
        const currentBodyType = vehicleData.bodyType || vehicleData.specifications?.bodyType;
        const forceUpdate = process.argv.includes('--force') || process.argv.includes('-f');
        
        // Inferir el bodyType correcto basado en el modelo
        const inferredBodyType = inferBodyTypeFromModel(vehicleData.make, vehicleData.model);
        let finalBodyType = inferredBodyType || 'sedan';
        
        // Si ya tiene bodyType y no es --force, verificar si es correcto
        if (currentBodyType && currentBodyType.trim() !== '' && currentBodyType !== 'undefined' && !forceUpdate) {
          // Si el bodyType actual es correcto, no actualizar
          const normalizedCurrent = String(currentBodyType).trim().toLowerCase();
          const normalizedInferred = String(finalBodyType).trim().toLowerCase();
          if (normalizedCurrent === normalizedInferred) {
            console.log(`   ⏭️  ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Ya tiene bodyType correcto: "${currentBodyType}"`);
            totalSkipped++;
            continue;
          } else {
            // Si el bodyType actual es diferente al inferido, actualizar
            console.log(`   🔄 ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - bodyType actual: "${currentBodyType}" → nuevo: "${finalBodyType}"`);
          }
        } else if (currentBodyType && !forceUpdate) {
          console.log(`   ⏭️  ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Ya tiene bodyType: "${currentBodyType}"`);
          totalSkipped++;
          continue;
        } else if (!inferredBodyType) {
          console.log(`   ⚠️  ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - No se pudo inferir bodyType, usando 'sedan' por defecto`);
          finalBodyType = 'sedan';
        }
        
        // Actualizar el vehículo con el bodyType final
        await db
          .collection('tenants')
          .doc(tenantId)
          .collection('vehicles')
          .doc(vehicleId)
          .update({
            bodyType: finalBodyType,
            specifications: {
              ...vehicleData.specifications,
              bodyType: finalBodyType,
            }
          });
        
        const modelLower = String(vehicleData.model || '').toLowerCase();
        const detectionMethod = Object.keys(modelToBodyType).some(key => modelLower.includes(key)) ? 'mapeo directo' : 'inferencia inteligente';
        console.log(`   ✅ ${vehicleData.year} ${vehicleData.make} ${vehicleData.model} - Actualizado a bodyType: "${finalBodyType}" (${detectionMethod})`);
        totalUpdated++;
      }
    }
    
    console.log(`\n✅ Script completado:`);
    console.log(`   - Vehículos actualizados: ${totalUpdated}`);
    console.log(`   - Vehículos que ya tenían bodyType: ${totalSkipped}`);
    console.log(`\n🎉 Ahora recarga la página web para ver los cambios.`);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVehicleBodyTypes().then(() => {
  console.log('\n✅ Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

