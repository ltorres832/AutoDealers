const https = require('http');

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('🧪 TEST DE FLUJO DE AUTENTICACIÓN');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

async function testAuthFlow() {
  try {
    // Paso 1: Login
    console.log('📝 Paso 1: Intentando login...');
    const loginData = JSON.stringify({
      email: 'admin@autodealers.com',
      password: 'Admin123456'
    });

    const loginResponse = await makeRequest('/api/auth/server-login', 'POST', loginData);
    
    if (!loginResponse.success) {
      console.error('❌ Login falló:', loginResponse);
      return;
    }

    console.log('✅ Login exitoso');
    console.log(`🎫 Token recibido: ${loginResponse.token.substring(0, 30)}...`);
    console.log(`👤 Usuario: ${loginResponse.user.email} (${loginResponse.user.role})`);

    const token = loginResponse.token;

    // Paso 2: Verificar que el token funciona
    console.log('\n📝 Paso 2: Verificando autenticación con el token...');
    const debugResponse = await makeRequest('/api/auth/debug', 'GET', null, token);
    
    console.log('📊 Respuesta de debug:');
    console.log(JSON.stringify(debugResponse, null, 2));

    if (debugResponse.sessionExists) {
      console.log('\n✅ Sesión existe en Firestore');
    } else {
      console.log('\n❌ Sesión NO existe en Firestore');
    }

    // Paso 3: Intentar acceder a una API protegida
    console.log('\n📝 Paso 3: Intentando acceder a API protegida...');
    const templatesResponse = await makeRequest('/api/admin/communication-templates', 'GET', null, token);
    
    if (templatesResponse.error) {
      console.error('❌ Error al acceder a API protegida:', templatesResponse.error);
    } else {
      console.log('✅ API protegida accesible');
      console.log(`📋 Templates encontrados: ${templatesResponse.templates?.length || 0}`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ TEST COMPLETADO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ ERROR EN EL TEST:', error.message);
    console.error(error);
  }
}

function makeRequest(path, method, body, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(body);
    }

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Invalid JSON', status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });
}

testAuthFlow();


