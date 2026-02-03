const https = require('https');
const fs = require('fs');
const { sign } = require('jsonwebtoken');

// Leer credenciales
const envContent = fs.readFileSync('.env.local', 'utf8');
const projectId = envContent.match(/FIREBASE_PROJECT_ID=(.+)/)?.[1] || 'autodealers-7f62e';
const privateKeyMatch = envContent.match(/FIREBASE_PRIVATE_KEY="(.+?)"/s);
const privateKey = privateKeyMatch ? privateKeyMatch[1].replace(/\\n/g, '\n') : null;
const clientEmail = envContent.match(/FIREBASE_CLIENT_EMAIL=(.+)/)?.[1];

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🔧 CORRIGIENDO FIREBASE APIS');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Generar JWT
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

// Obtener access token
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
  res.on('end', async () => {
    const { access_token } = JSON.parse(data);
    console.log('✅ Access token obtenido\n');

    // APIs que necesitamos habilitar
    const apisToEnable = [
      'identitytoolkit.googleapis.com',
      'firebaseauth.googleapis.com',
      'securetoken.googleapis.com'
    ];

    console.log('🔄 Habilitando APIs necesarias...\n');

    for (const api of apisToEnable) {
      await enableAPI(access_token, projectId, api);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TODAS LAS APIS HABILITADAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⏳ Espera 30 segundos para que los cambios se propaguen...\n');
    
    setTimeout(() => {
      console.log('✅ Listo! Ahora intenta hacer login de nuevo:\n');
      console.log('   http://localhost:3001/login\n');
    }, 30000);
  });
});

tokenRequest.write(postData);
tokenRequest.end();

function enableAPI(accessToken, projectId, apiName) {
  return new Promise((resolve) => {
    const req = https.request(
      `https://serviceusage.googleapis.com/v1/projects/${projectId}/services/${apiName}:enable`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      },
      (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200 || res.statusCode === 409) {
            console.log(`✅ ${apiName} habilitada`);
          } else {
            console.log(`⚠️  ${apiName}: ${res.statusCode}`);
          }
          resolve();
        });
      }
    );

    req.on('error', (e) => {
      console.error(`❌ Error habilitando ${apiName}:`, e.message);
      resolve();
    });

    req.end();
  });
}


