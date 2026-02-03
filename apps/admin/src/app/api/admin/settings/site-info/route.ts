import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const docRef = db.collection('site_config').doc('public_site_info');
    const doc = await docRef.get();

    if (doc.exists) {
      return NextResponse.json({ siteInfo: doc.data() });
    }

    // Retornar valores por defecto si no existe
    return NextResponse.json({
      siteInfo: {
        name: 'AutoDealers',
        description: 'La plataforma completa para encontrar y comprar vehículos. Miles de opciones verificadas.',
        logo: 'AD',
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
            { label: 'Concesionarios', href: '#dealers' },
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
      },
    });
  } catch (error: any) {
    console.error('Error fetching site info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { siteInfo } = await request.json();

    if (!siteInfo) {
      return NextResponse.json({ error: 'siteInfo es requerido' }, { status: 400 });
    }

    const docRef = db.collection('site_config').doc('public_site_info');
    await docRef.set(
      {
        ...siteInfo,
        updatedAt: new Date(),
        updatedBy: auth.userId,
      },
      { merge: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error saving site info:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


