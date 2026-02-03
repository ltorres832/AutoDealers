const https = require('https');

const adData = JSON.stringify({
  campaignName: 'Demo Pública',
  title: 'Banner de Prueba',
  description: 'Este es un anuncio de prueba visible en la home.',
  type: 'banner',
  placement: 'sponsors_section',
  mediaType: 'image',
  imageUrl: 'https://via.placeholder.com/900x400?text=Demo+Ad',
  linkUrl: 'https://example.com',
  linkType: 'external',
  targetLocation: [],
  targetVehicleTypes: [],
  price: 1,
  durationDays: 7
});

const createOptions = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/admin/advertisers/1zSal11IXoUD0QDt6uBwVCEexFD2/ads',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': adData.length
  }
};

console.log('Creando anuncio de prueba...');

const createReq = https.request(createOptions, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.success) {
        const adId = response.ad.id;
        console.log('Anuncio creado con ID:', adId);

        console.log('Activando anuncio...');

        const activateData = JSON.stringify({ status: 'active' });
        const activateOptions = {
          hostname: 'localhost',
          port: 3001,
          path: `/api/admin/advertisers/1zSal11IXoUD0QDt6uBwVCEexFD2/ads/${adId}`,
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': activateData.length
          }
        };

        const activateReq = https.request(activateOptions, (activateRes) => {
          console.log('Anuncio activado. Status:', activateRes.statusCode);
          console.log('Debería verse en http://localhost:3000/');
        });

        activateReq.on('error', (e) => console.error('Error activando:', e));
        activateReq.write(activateData);
        activateReq.end();
      } else {
        console.log('Error creando anuncio:', response.error);
      }
    } catch (e) {
      console.log('Error parseando respuesta:', body);
    }
  });
});

createReq.on('error', (e) => console.error('Error creando anuncio:', e));
createReq.write(adData);
createReq.end();
