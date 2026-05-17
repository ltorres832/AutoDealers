import { NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';
import {
  DEFAULT_BRAND_LOGO_PATH,
  normalizePublicSiteLogoField,
} from '../../../../lib/default-brand-logo';

export const revalidate = 300; // Revalidar cada 5 minutos

export async function GET() {
  try {
    const db = getFirestore();
    const docRef = db.collection('site_config').doc('public_site_info');
    const doc = await docRef.get();

    if (doc.exists) {
      const siteInfo = normalizePublicSiteLogoField({
        ...(doc.data() as Record<string, unknown>),
      });
      return NextResponse.json({ siteInfo }, {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      });
    }

    // Valores por defecto si no existe configuración
    return NextResponse.json({
      siteInfo: normalizePublicSiteLogoField({
        name: 'AutoDealers',
        description: 'La plataforma completa para encontrar y comprar vehículos. Miles de opciones verificadas.',
        logo: DEFAULT_BRAND_LOGO_PATH,
        tagline: 'Plataforma de Confianza',
        contact: {
          phone: '+1 (555) 123-4567',
          email: 'info@autodealers.com',
          address: '1234 Avenida Principal, Ciudad',
          hours: 'Lun-Vie: 9AM-7PM | Sáb: 9AM-5PM',
          whatsapp: '1234567890',
        },
        copyright: {
          year: 2025,
          company: 'AutoDealers',
          text: 'Todos los derechos reservados.',
        },
        disclaimer: 'Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas.',
        footerLinks: {
          navigation: [
            { label: 'Vehículos', href: '#vehicles' },
            { label: 'Promociones', href: '#promotions' },
            { label: 'Concesionarios', href: '/dealers?tab=concesionarios' },
            { label: 'Vendedores', href: '/dealers?tab=vendedores' },
            { label: 'Contacto', href: '#contact' },
          ],
          legal: [
            { label: 'Privacidad', href: '/privacidad' },
            { label: 'Términos', href: '/terminos' },
            { label: 'Cookies', href: '/cookies' },
          ],
        },
        statistics: {
          satisfiedCustomers: '10,000+',
          averageRating: '4.9/5',
          satisfactionRate: '99.8%',
          verifiedVehicles: '',
          certifiedDealers: '',
          warrantyIncluded: '',
          supportAvailable: '',
        },
        statisticsVisibility: {
          satisfiedCustomers: true,
          averageRating: true,
          satisfactionRate: true,
          verifiedVehicles: true,
          certifiedDealers: true,
          warrantyIncluded: true,
          supportAvailable: true,
        },
      }),
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('Error fetching site info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


