const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID || 'autodealers-7f62e',
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'firebase-adminsdk-fbsvc@autodealers-7f62e.iam.gserviceaccount.com',
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || require('fs').readFileSync('.env.local', 'utf8').match(/FIREBASE_PRIVATE_KEY="(.+?)"/s)[1].replace(/\\n/g, '\n')
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function resetPassword() {
  console.log('🔥 Reseteando password del admin...\n');
  
  const email = 'admin@autodealers.com';
  const newPassword = 'Admin123456';
  
  try {
    // Obtener usuario
    const user = await admin.auth().getUserByEmail(email);
    
    // Actualizar password
    await admin.auth().updateUser(user.uid, {
      password: newPassword
    });
    
    console.log('✅ Password actualizado exitosamente\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ CREDENCIALES DEL ADMIN');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email:    ' + email);
    console.log('🔑 Password: ' + newPassword);
    console.log('🔗 Login:    http://localhost:3001/login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

resetPassword();


