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

const db = admin.firestore();

async function createAdmin() {
  console.log('🔥 Creando usuario admin...\n');
  
  const email = 'admin@autodealers.com';
  const password = 'Admin123456';
  
  try {
    // Crear usuario en Auth
    let user;
    try {
      user = await admin.auth().createUser({
        email,
        password,
        displayName: 'Super Admin'
      });
      console.log('✅ Usuario creado en Firebase Auth');
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        user = await admin.auth().getUserByEmail(email);
        console.log('ℹ️  Usuario ya existe en Auth');
      } else {
        throw error;
      }
    }
    
    // Crear documento en Firestore
    await db.collection('users').doc(user.uid).set({
      email,
      displayName: 'Super Admin',
      role: 'admin',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('✅ Documento creado en Firestore\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ADMIN CREADO CON ÉXITO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📧 Email:    ' + email);
    console.log('🔑 Password: ' + password);
    console.log('🔗 Login:    http://localhost:3001/login\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdmin();


