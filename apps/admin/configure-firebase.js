/**
 * Script para configurar Firebase Admin automáticamente
 * Ejecutar: node apps/admin/configure-firebase.js
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');

// Credenciales del archivo JSON proporcionado
const serviceAccount = {
  project_id: "autodealers-7f62e",
  client_email: "firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCpj7Z1y81+zBFQ\ncD39bTEMYe/tJn9X/1HBKUOOy71LAyxzOTTMR3UTP0QiHxwCK0tYItZpAvI6LzGP\n6wQyovB0mU5sTz43MNMBbg5cBy3/788riD86WMdFUba6zjnfZZkyG+5hkMwRQvyb\nMD9QK993/4vnADqMngn9Fsy9Ai7FEFFAT2oum2d7AGdOidBlN60AbzGV4gwLgPGK\niciFQPcTGsLWBDzv1Z5S3n9Hbvxo/8wKVrOqX8P0l+EFtnC1rW0aOP0qZJhailB1\n+sRg9mGEvDd6cz/avSQocOId9Hr7sOef0zUDSRGy/KHjGac52X54v7ODfAQGyHVr\nAynDVIM1AgMBAAECggEAIR5vsFr2IKfZ0ukVhphLDgTcIOlV0rmNPaoiZrQPXWU5\ni6j3EdZ8PN3s4DBM33SW4xhs4jZ/2xMIPnjUSVKvnkqqeXfR6mRINp2JQvrpBnZP\n9AwI84vPIlBHXX316ldVIKc5fMeUQGPh5Kr8Ftv26mCY8i4GgZxFzbAkHd/dBELt\n2yxvXAYIGnJzRjBNxbWS9uqenFA61KUNEFNmvZMbHEsfomkU5i6pzOGFNhqcRr5Z\nMfDf0TdT5iN4U+bUn9G6L0naZ39tIvJ6fTzaqExFdEJmJx6x2MjeGg0ZKrMxfWky\njy5DPGAaFiXP8fal5D7eEzEjrV4C+oQpvmLktGPVyQKBgQDd0x31pld8+M7DghTH\ndLBIutvtm8uSTm4khHladkzoR7xtlnEmRwiYf5W/118tEr9E4ZbPopeMHwJLBeGJ\nhz5WuqHUfTCDYyJ19q4QDQjo7pdRcnLsQjKVmUAwamA92TXycPhMM9yagCqQMblt\nOqrBYkwopY8bGL1MKU/DCTdrCQKBgQDDr02xYSouFcTparOKwv6fCJUHptsZ5EYE\nybLLSI7cKhVQUB1BFOSuhQHhTurRyOICfbz7En5a6bX0aAhKHhpVEH1FhJL/p7uo\n7QQuRczEliCH046xoXn3EeDo0oFKht2c0M3fMWvTkCg6KjyoEo5mz8LdjALugkwN\nWi/FrP+lzQKBgDMsdBnqoP5Mq+6AgOiuq8hrizcanPEItPIpuZE7/2wKuJaTgVDy\nTDJaJKLYPbW5QHTUkiUeflWuBapnFevTTndVoOXTZ7C32whZuzgquaZ6/F+mxopo\njyDh9OP2dnNuO7rNgwqZYEgoTylqvztKsH/ifG1YHFaE846xbRwycR15AoGBAK2j\nG1SfPFdiV7UrSh+CAX/KlLsScu6ZoQvUkgNR4fo4mWsHe73pNTYqrc1oQnNeRjYh\nrpQ3B8nSAfPacCicZ489r3sFNY8HHjy5+/C3XQi/kiQUNFUoTNpQkfrl93XTEEh6\n+4LmDqDPFPLv0ZztwlA2YNpHx74t/iAG+8bzSHGtAoGBAMLsJNP/AcVAwrg8JVm9\ndIAoup7UB81raLkCP4uFr4v2+FHxHvRxHNjtMWF+rgEsnYYoMBhc8DXedCP56Dtk\nIlCS2eOyInGPBaFmbk9Qr0bm30MwGMSVsESMF7Xa7XFIUKcpXxE/KmUHCTnUePE8\n/jVv98kDVrRKqhxBaHBLvaZn\n-----END PRIVATE KEY-----\n"
};

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

try {
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
  console.log('✅ El error "Firebase Admin no está configurado" debería desaparecer\n');
} catch (error) {
  console.error('\n❌ ERROR:', error.message);
  console.log('\n   Intenta crear el archivo manualmente:\n');
  console.log('   1. Crea un archivo llamado .env.local en: apps/admin/');
  console.log('   2. Copia el contenido del script configure-firebase.js\n');
}


