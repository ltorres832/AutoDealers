// Script para crear anuncio de prueba directamente en Firestore
const { createSponsoredContent } = require('./packages/core/src/advertisers');

async function createTestAd() {
  try {
    const advertiserId = '1zSal11IXoUD0QDt6uBwVCEexFD2';
    
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días
    
    const ad = await createSponsoredContent({
      advertiserId: advertiserId,
      advertiserName: 'El Chulo',
      campaignName: 'Demo Pública',
      type: 'banner',
      placement: 'sponsors_section',
      title: 'Banner de Prueba',
      description: 'Este es un anuncio de prueba visible en la home.',
      imageUrl: 'https://via.placeholder.com/900x400?text=Demo+Ad',
      videoUrl: '',
      linkUrl: 'https://example.com',
      linkType: 'external',
      targetLocation: [],
      targetVehicleTypes: [],
      budget: 1,
      budgetType: 'total',
      startDate: now,
      endDate: endDate,
      status: 'active', // Activo para que se vea
    });
    
    console.log('✅ Anuncio de prueba creado con ID:', ad.id);
    console.log('Debería verse en http://localhost:3000/');
    console.log('Estado: active');
    console.log('Placement: sponsors_section');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creando anuncio:', error);
    process.exit(1);
  }
}

createTestAd();
