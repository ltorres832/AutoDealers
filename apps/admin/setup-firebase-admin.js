/**
 * Script interactivo para configurar Firebase Admin
 * Ejecutar: node apps/admin/setup-firebase-admin.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env.local');

console.log('\n═══════════════════════════════════════════════');
console.log('  🔥 CONFIGURACIÓN DE FIREBASE ADMIN');
console.log('═══════════════════════════════════════════════\n');

console.log('PASOS PARA OBTENER LAS CREDENCIALES:\n');
console.log('1. Ve a: https://console.firebase.google.com/');
console.log('2. Selecciona tu proyecto: autodealers-7f62e');
console.log('3. Haz clic en el ⚙️  (Configuración) → "Configuración del proyecto"');
console.log('4. Ve a la pestaña "Cuentas de servicio"');
console.log('5. Haz clic en "Generar nueva clave privada"');
console.log('6. Se descargará un archivo JSON\n');

console.log('═══════════════════════════════════════════════\n');

rl.question('¿Ya descargaste el archivo JSON? (s/n): ', (answer) => {
  if (answer.toLowerCase() !== 's') {
    console.log('\n❌ Por favor descarga el archivo JSON primero.');
    console.log('   Luego ejecuta este script de nuevo.\n');
    rl.close();
    return;
  }

  rl.question('\nPega la ruta completa al archivo JSON descargado: ', (jsonPath) => {
    try {
      // Limpiar la ruta (remover comillas si las hay)
      const cleanPath = jsonPath.replace(/["']/g, '').trim();
      
      if (!fs.existsSync(cleanPath)) {
        console.log('\n❌ ERROR: No se encuentra el archivo:', cleanPath);
        rl.close();
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(cleanPath, 'utf8'));

      // Validar que tenga los campos necesarios
      if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        console.log('\n❌ ERROR: El archivo JSON no tiene el formato correcto.');
        console.log('   Asegúrate de descargar el archivo desde "Cuentas de servicio".\n');
        rl.close();
        return;
      }

      // Generar el contenido del .env.local
      const envContent = `# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=${serviceAccount.project_id}
FIREBASE_CLIENT_EMAIL=${serviceAccount.client_email}
FIREBASE_PRIVATE_KEY="${serviceAccount.private_key}"

# Firebase Client SDK (Web)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=autodealers-7f62e.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=autodealers-7f62e
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=autodealers-7f62e.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=857179023916
NEXT_PUBLIC_FIREBASE_APP_ID=1:857179023916:web:6919fe5ae77f78d3b1bf89
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-411Q33HFJF
`;

      // Guardar el archivo
      fs.writeFileSync(envPath, envContent);

      console.log('\n✅ ¡CONFIGURACIÓN COMPLETADA!');
      console.log(`\n   Archivo creado: ${envPath}\n`);
      console.log('CREDENCIALES CONFIGURADAS:');
      console.log(`   • Project ID: ${serviceAccount.project_id}`);
      console.log(`   • Client Email: ${serviceAccount.client_email}`);
      console.log(`   • Private Key: ✓ Configurada\n`);
      console.log('═══════════════════════════════════════════════');
      console.log('  🚀 SIGUIENTE PASO');
      console.log('═══════════════════════════════════════════════\n');
      console.log('1. Reinicia el servidor admin:');
      console.log('   Ctrl+C en el terminal del servidor');
      console.log('   Luego: npm run dev\n');
      console.log('2. Recarga la página en el navegador\n');

      rl.close();
    } catch (error) {
      console.log('\n❌ ERROR:', error.message);
      console.log('\n   Verifica que el archivo sea un JSON válido.\n');
      rl.close();
    }
  });
});


