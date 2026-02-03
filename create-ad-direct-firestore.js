// Crear anuncio directamente usando Firebase Admin
// Este script asume que Firebase ya está inicializado en el proceso de admin

// Simplemente ejecuta esto en la consola del navegador cuando estés en admin/sponsored-content
// O usa este código en la consola de Node.js si tienes acceso a Firebase

console.log(`
Para crear el anuncio de prueba, ejecuta esto en la consola del navegador
cuando estés en http://localhost:3001/admin/sponsored-content:

fetch('/api/admin/advertisers/1zSal11IXoUD0QDt6uBwVCEexFD2/ads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
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
  })
})
.then(r => r.json())
.then(data => {
  if (data.success) {
    const adId = data.ad.id;
    console.log('Anuncio creado:', adId);
    // Activar
    return fetch(\`/api/admin/advertisers/1zSal11IXoUD0QDt6uBwVCEexFD2/ads/\${adId}\`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' })
    });
  }
})
.then(r => r.json())
.then(() => console.log('✅ Anuncio activado. Debería verse en http://localhost:3000/'));
`);

// Alternativa: crear directamente en Firestore usando el admin panel
console.log(`
O ve a http://localhost:3001/admin/advertisers/1zSal11IXoUD0QDt6uBwVCEexFD2/ads/create
y crea el anuncio manualmente con estos datos:
- Título: Banner de Prueba
- Descripción: Este es un anuncio de prueba visible en la home.
- Tipo: banner
- Ubicación: sponsors_section
- Imagen: https://via.placeholder.com/900x400?text=Demo+Ad
- Link: https://example.com
- Duración: 7 días
- Precio: 1

Luego actívalo desde admin/sponsored-content
`);
