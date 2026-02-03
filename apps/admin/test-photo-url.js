/**
 * Script para probar si las URLs de las fotos son accesibles
 */

const https = require('https');
const http = require('http');

const testUrls = [
  'https://storage.googleapis.com/autodealers-7f62e.firebasestorage.app/tenants/4LhImm05bJXLxedYPEmD/vehicles/V9ylwNncg2mOrneBkV3Y/images/images-14.jpeg',
  'https://storage.googleapis.com/autodealers-7f62e.firebasestorage.app/tenants/4LhImm05bJXLxedYPEmD/vehicles/zDPfBvsYDHZayLpVGp4U/images/images-14.jpeg',
];

function testUrl(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (res) => {
      console.log(`\n🔗 URL: ${url}`);
      console.log(`   Status: ${res.statusCode}`);
      console.log(`   Content-Type: ${res.headers['content-type']}`);
      console.log(`   Content-Length: ${res.headers['content-length']}`);
      
      if (res.statusCode === 200) {
        console.log(`   ✅ URL es accesible`);
        resolve(true);
      } else {
        console.log(`   ❌ URL no es accesible (status: ${res.statusCode})`);
        resolve(false);
      }
    });
    
    req.on('error', (error) => {
      console.log(`\n🔗 URL: ${url}`);
      console.log(`   ❌ Error: ${error.message}`);
      resolve(false);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      console.log(`\n🔗 URL: ${url}`);
      console.log(`   ❌ Timeout`);
      resolve(false);
    });
  });
}

async function testAllUrls() {
  console.log('🧪 Probando URLs de fotos...\n');
  
  for (const url of testUrls) {
    await testUrl(url);
  }
  
  console.log('\n✅ Pruebas completadas');
}

testAllUrls();

