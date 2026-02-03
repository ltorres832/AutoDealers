const https = require('https');
const fs = require('fs');

// Leer las credenciales
const envContent = fs.readFileSync('.env.local', 'utf8');
const projectId = envContent.match(/FIREBASE_PROJECT_ID=(.+)/)?.[1] || 'autodealers-7f62e';
const privateKeyMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.+?)"/s);
const privateKey = privateKeyMatch ? privateKeyMatch[1].replace(/\\n/g, '\n') : null;
const clientEmail = envContent.match(/FIREBASE_CLIENT_EMAIL=(.+)/)?.[1];

if (!privateKey || !clientEmail) {
  console.error('❌ No se encontraron las credenciales de Firebase en .env.local');
  process.exit(1);
}

// Generar OAuth2 access token usando JWT
const { sign } = require('jsonwebtoken');

const now = Math.floor(Date.now() / 1000);
const claim = {
  iss: clientEmail,
  sub: clientEmail,
  aud: 'https://oauth2.googleapis.com/token',
  iat: now,
  exp: now + 3600,
  scope: 'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase'
};

const jwt = sign(claim, privateKey, { algorithm: 'RS256' });

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔥 HABILITANDO EMAIL/PASSWORD EN FIREBASE');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Intercambiar JWT por access token
const postData = `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`;

const tokenRequest = https.request('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': postData.length
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error('❌ Error obteniendo access token:', data);
      process.exit(1);
    }

    const { access_token } = JSON.parse(data);
    console.log('✅ Access token obtenido\n');

    // Habilitar Email/Password provider
    const configData = JSON.stringify({
      signIn: {
        email: {
          enabled: true,
          passwordRequired: true
        }
      }
    });

    const configRequest = https.request(
      `https://identitytoolkit.googleapis.com/v2/projects/${projectId}/config?updateMask=signIn.email.enabled,signIn.email.passwordRequired`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
          'Content-Length': configData.length
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          if (res.statusCode === 200) {
            console.log('✅ EMAIL/PASSWORD HABILITADO CON ÉXITO');
          } else {
            console.log('⚠️  Respuesta del servidor:', res.statusCode);
            console.log(data);
          }
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('🔐 Ahora puedes hacer login en:');
          console.log('   http://localhost:3001/login\n');
          console.log('📧 Email:    admin@autodealers.com');
          console.log('🔑 Password: Admin123456\n');
        });
      }
    );

    configRequest.on('error', (e) => {
      console.error('❌ Error:', e.message);
    });

    configRequest.write(configData);
    configRequest.end();
  });
});

tokenRequest.on('error', (e) => {
  console.error('❌ Error:', e.message);
});

tokenRequest.write(postData);
tokenRequest.end();


