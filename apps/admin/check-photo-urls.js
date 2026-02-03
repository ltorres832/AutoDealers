/**
 * Script para verificar las URLs de las fotos de los vehículos
 * Uso: node apps/admin/check-photo-urls.js
 */

const fs = require('fs');
const path = require('path');

// Cargar variables de entorno desde .env.local (mismo método que create-admin-user.js)
function loadEnv() {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    let currentKey = null;
    let currentValue = '';
    let inQuotes = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.includes('=') && !inQuotes) {
        if (currentKey) {
          process.env[currentKey] = currentValue.trim();
          currentValue = '';
        }
        
        const equalIndex = trimmed.indexOf('=');
        currentKey = trimmed.substring(0, equalIndex).trim();
        let value = trimmed.substring(equalIndex + 1).trim();
        
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
          process.env[currentKey] = value;
          currentKey = null;
        } else if (value.startsWith('"') || value.startsWith("'")) {
          inQuotes = true;
          currentValue = value.substring(1);
        } else {
          process.env[currentKey] = value;
          currentKey = null;
        }
      } else if (inQuotes) {
        if (trimmed.endsWith('"') || trimmed.endsWith("'")) {
          currentValue += '\n' + trimmed.slice(0, -1);
          process.env[currentKey] = currentValue.trim();
          currentKey = null;
          currentValue = '';
          inQuotes = false;
        } else {
          currentValue += '\n' + trimmed;
        }
      }
    }
    
    if (currentKey) {
      process.env[currentKey] = currentValue.trim();
    }
  }
}

loadEnv();

const admin = require('firebase-admin');

async function checkPhotoUrls() {
  try {
    if (!admin.apps.length) {
      const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      };

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    }

    const db = admin.firestore();
    const storage = admin.storage();

    console.log('🔍 Buscando vehículos con fotos...\n');

    // Obtener todos los vehículos de todos los tenants
    const tenantsSnapshot = await db.collection('tenants').get();
    
    let totalVehicles = 0;
    let vehiclesWithPhotos = 0;
    let vehiclesWithInvalidUrls = 0;

    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId = tenantDoc.id;
      const vehiclesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('vehicles')
        .get();

      for (const vehicleDoc of vehiclesSnapshot.docs) {
        totalVehicles++;
        const vehicleData = vehicleDoc.data();
        const photos = vehicleData.photos || [];

        if (photos.length > 0) {
          vehiclesWithPhotos++;
          console.log(`\n📸 Vehículo: ${vehicleData.year} ${vehicleData.make} ${vehicleData.model}`);
          console.log(`   ID: ${vehicleDoc.id}`);
          console.log(`   Tenant: ${tenantId}`);
          console.log(`   Fotos: ${photos.length}`);

          for (let i = 0; i < Math.min(photos.length, 3); i++) {
            const photoUrl = photos[i];
            console.log(`\n   Foto ${i + 1}:`);
            console.log(`   URL: ${photoUrl}`);
            
            // Verificar si la URL es de Firebase Storage
            if (photoUrl.includes('storage.googleapis.com') || photoUrl.includes('firebasestorage')) {
              // Extraer el path del archivo de la URL
              let filePath = '';
              if (photoUrl.includes('storage.googleapis.com')) {
                const match = photoUrl.match(/storage\.googleapis\.com\/[^\/]+\/(.+)/);
                if (match) {
                  filePath = decodeURIComponent(match[1]);
                }
              }
              
              if (filePath) {
                console.log(`   Path: ${filePath}`);
                
                // Verificar si el archivo existe en Storage
                try {
                  // Intentar múltiples nombres de bucket
                  let bucket = null;
                  const possibleBucketNames = [
                    'autodealers-7f62e.firebasestorage.app',
                    'autodealers-7f62e.appspot.com',
                    'autodealers-7f62e',
                  ];
                  
                  for (const bucketName of possibleBucketNames) {
                    try {
                      bucket = storage.bucket(bucketName);
                      if (bucket && bucket.name) {
                        break;
                      }
                    } catch (err) {
                      continue;
                    }
                  }
                  
                  if (!bucket) {
                    bucket = storage.bucket(); // Usar bucket por defecto
                  }
                  
                  const file = bucket.file(filePath);
                  const [exists] = await file.exists();
                  
                  if (exists) {
                    // Verificar si es público
                    const [metadata] = await file.getMetadata();
                    const isPublic = metadata.acl && metadata.acl.some((entry) => 
                      entry.entity === 'allUsers' && entry.role === 'READER'
                    );
                    
                    console.log(`   ✅ Archivo existe`);
                    console.log(`   ${isPublic ? '✅' : '❌'} Es público: ${isPublic}`);
                    
                    if (!isPublic) {
                      console.log(`   ⚠️  Archivo NO es público, haciéndolo público...`);
                      try {
                        await file.makePublic();
                        console.log(`   ✅ Archivo hecho público`);
                      } catch (makePublicError) {
                        console.error(`   ❌ Error haciendo público: ${makePublicError.message}`);
                      }
                    }
                    
                    // Generar nueva URL pública
                    try {
                      const [signedUrl] = await file.getSignedUrl({
                        action: 'read',
                        expires: '03-09-2025',
                      });
                      console.log(`   🔗 Nueva URL (signed): ${signedUrl.substring(0, 80)}...`);
                    } catch (signedError) {
                      console.warn(`   ⚠️  No se pudo generar signed URL: ${signedError.message}`);
                    }
                  } else {
                    console.log(`   ❌ Archivo NO existe en Storage`);
                    vehiclesWithInvalidUrls++;
                  }
                } catch (storageError) {
                  console.error(`   ❌ Error verificando Storage: ${storageError.message}`);
                  vehiclesWithInvalidUrls++;
                }
              } else {
                console.log(`   ⚠️  No se pudo extraer path de la URL`);
              }
            } else {
              console.log(`   ⚠️  URL no es de Firebase Storage`);
            }
          }
        }
      }
    }

    console.log('\n═══════════════════════════════════════════════');
    console.log('  📊 RESUMEN');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`Total vehículos: ${totalVehicles}`);
    console.log(`Vehículos con fotos: ${vehiclesWithPhotos}`);
    console.log(`Vehículos con URLs inválidas: ${vehiclesWithInvalidUrls}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkPhotoUrls().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});

