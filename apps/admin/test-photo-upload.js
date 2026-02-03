const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Cargar credenciales desde .env.local
const envPath = path.join(__dirname, '.env.local');
let projectId, clientEmail, privateKey;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let currentKey = null;
  let currentValue = '';
  let inMultiline = false;
  let quoteChar = null;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.startsWith('#')) continue;
    
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex > 0 && !inMultiline) {
      if (currentKey && currentValue) {
        const finalValue = currentValue.trim();
        if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
        if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
        if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
      }
      
      currentKey = trimmed.substring(0, equalIndex).trim();
      let value = trimmed.substring(equalIndex + 1).trim();
      
      if ((value.startsWith('"') && !value.endsWith('"')) || 
          (value.startsWith("'") && !value.endsWith("'"))) {
        inMultiline = true;
        quoteChar = value[0];
        currentValue = value.substring(1);
      } else {
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        currentValue = value;
        if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = currentValue;
        if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = currentValue;
        if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = currentValue;
        currentKey = null;
        currentValue = '';
      }
    } else if (inMultiline) {
      if (trimmed.endsWith(quoteChar) && trimmed.length > 1) {
        currentValue += '\n' + trimmed.slice(0, -1);
        if (currentKey) {
          const finalValue = currentValue.trim();
          if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
          if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
          if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
        }
        currentKey = null;
        currentValue = '';
        inMultiline = false;
        quoteChar = null;
      } else {
        currentValue += '\n' + line;
      }
    }
  }
  
  if (currentKey && currentValue) {
    const finalValue = currentValue.trim();
    if (currentKey === 'FIREBASE_PROJECT_ID' && !projectId) projectId = finalValue;
    if (currentKey === 'FIREBASE_CLIENT_EMAIL' && !clientEmail) clientEmail = finalValue;
    if (currentKey === 'FIREBASE_PRIVATE_KEY' && !privateKey) privateKey = finalValue;
  }
}

if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

if (!projectId || !clientEmail || !privateKey) {
  console.error('❌ Error: Credenciales de Firebase no encontradas');
  process.exit(1);
}

// Inicializar Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    storageBucket: 'autodealers-7f62e.firebasestorage.app',
  });
  console.log('✅ Firebase Admin inicializado');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log('✅ Firebase Admin ya estaba inicializado');
  } else {
    console.error('❌ Error inicializando Firebase:', error.message);
    process.exit(1);
  }
}

const db = admin.firestore();
const storage = admin.storage();

async function testPhotoUpload() {
  console.log('\n🧪 PROBANDO SUBIDA DE FOTO DIRECTAMENTE...\n');
  
  try {
    // Obtener un vehículo existente
    const tenantsSnapshot = await db.collection('tenants').limit(1).get();
    if (tenantsSnapshot.empty) {
      console.error('❌ No hay tenants en la base de datos');
      process.exit(1);
    }
    
    const tenantId = tenantsSnapshot.docs[0].id;
    console.log(`📦 Usando tenant: ${tenantId}`);
    
    const vehiclesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .limit(1)
      .get();
    
    if (vehiclesSnapshot.empty) {
      console.error('❌ No hay vehículos en este tenant');
      process.exit(1);
    }
    
    const vehicleId = vehiclesSnapshot.docs[0].id;
    const vehicleData = vehiclesSnapshot.docs[0].data();
    console.log(`🚗 Usando vehículo: ${vehicleData.make} ${vehicleData.model} (${vehicleId})`);
    console.log(`📸 Fotos actuales: ${vehicleData.photos?.length || 0}`);
    
    // Crear una imagen de prueba (1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Intentar subir la foto
    console.log('\n📤 Intentando subir foto de prueba...');
    const bucketName = 'autodealers-7f62e.firebasestorage.app';
    const bucket = storage.bucket(bucketName);
    
    const timestamp = Date.now();
    const filePath = `tenants/${tenantId}/vehicles/${vehicleId}/images/test_${timestamp}.png`;
    const fileRef = bucket.file(filePath);
    
    console.log(`📁 Ruta del archivo: ${filePath}`);
    
    await fileRef.save(testImageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          tenantId,
          vehicleId,
          uploadedAt: new Date().toISOString(),
        },
      },
    });
    
    console.log('✅ Archivo guardado en Storage');
    
    await fileRef.makePublic();
    console.log('✅ Archivo hecho público');
    
    const publicUrl = `https://storage.googleapis.com/${bucketName}/${encodeURIComponent(filePath)}`;
    console.log(`✅ URL pública: ${publicUrl}`);
    
    // Intentar actualizar el vehículo con esta URL
    console.log('\n🔄 Intentando actualizar vehículo con la nueva foto...');
    const currentPhotos = vehicleData.photos || [];
    const newPhotos = [...currentPhotos, publicUrl];
    
    console.log(`📸 Fotos antes: ${currentPhotos.length}`);
    console.log(`📸 Fotos después: ${newPhotos.length}`);
    
    await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .update({
        photos: newPhotos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    
    console.log('✅ Vehículo actualizado en Firestore');
    
    // Verificar que se guardó
    const updatedDoc = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('vehicles')
      .doc(vehicleId)
      .get();
    
    const updatedData = updatedDoc.data();
    console.log(`\n✅ Verificación:`);
    console.log(`   Fotos guardadas: ${updatedData?.photos?.length || 0}`);
    console.log(`   Última foto: ${updatedData?.photos?.[updatedData.photos.length - 1]}`);
    
    if (updatedData?.photos?.length === newPhotos.length) {
      console.log('\n✅✅✅ ÉXITO: Las fotos se guardaron correctamente!');
    } else {
      console.error('\n❌❌❌ ERROR: Las fotos NO se guardaron correctamente!');
      console.error(`   Esperadas: ${newPhotos.length}`);
      console.error(`   Guardadas: ${updatedData?.photos?.length || 0}`);
    }
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error);
    console.error('Stack:', error.stack);
  }
  
  process.exit(0);
}

testPhotoUpload();

