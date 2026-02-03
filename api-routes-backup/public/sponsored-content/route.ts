import { NextRequest, NextResponse } from 'next/server';

// Usamos require para evitar problemas de resolución en build
const { getActiveSponsoredContent, filterContentByTargeting, getFirestore } = require('@autodealers/core') as any;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const adId = searchParams.get('adId') || undefined;
    const placement = searchParams.get('placement') || undefined;
    const limit = parseInt(searchParams.get('limit') || '6');
    const includeApproved = searchParams.get('includeApproved') === 'true';

    // Si se pasa adId, devolver ese anuncio aunque no esté active (para preview puntual)
    if (adId) {
      const db = getFirestore();
      const snap = await db.collection('sponsored_content').doc(adId).get();
      if (!snap.exists) {
        return NextResponse.json({ content: [] });
      }
      const data = snap.data();
      return NextResponse.json({
        content: [
          {
            id: snap.id,
            ...data,
            startDate: data?.startDate?.toDate?.() || data?.startDate,
            endDate: data?.endDate?.toDate?.() || data?.endDate,
          },
        ],
      });
    }

    // Targeting opcional
    const userLocation = searchParams.get('location') || request.headers.get('x-user-location') || undefined;
    const userVehicleType = searchParams.get('vehicleType') || request.headers.get('x-vehicle-type') || undefined;
    const useAdvancedTargeting = searchParams.get('advancedTargeting') === 'true';

    // Si se solicita incluir aprobados además de activos, hacemos queries separadas y filtramos por fechas
    if (includeApproved && !adId) {
      const db = getFirestore();
      const now = new Date();
      const statuses = ['active', 'approved'];
      let items: any[] = [];

      for (const status of statuses) {
        let q = db.collection('sponsored_content').where('status', '==', status);
        if (placement) q = q.where('placement', '==', placement);
        const snap = await q.limit(limit * 3).get();
        snap.forEach((doc: any) => {
          const data = doc.data();
          const start = data?.startDate?.toDate?.() || data?.startDate;
          const end = data?.endDate?.toDate?.() || data?.endDate;
          if (start && start > now) return;
          if (end && end < now) return;
          items.push({
            id: doc.id,
            ...data,
            startDate: start,
            endDate: end,
            createdAt: data?.createdAt?.toDate?.() || data?.createdAt || new Date(0),
          });
        });
      }

      // Ordenar por createdAt desc y recortar
      items = items
        .sort((a, b) => (b.createdAt as any) - (a.createdAt as any))
        .slice(0, limit);

      // Targeting opcional
      const userLocation = searchParams.get('location') || request.headers.get('x-user-location') || undefined;
      const userVehicleType = searchParams.get('vehicleType') || request.headers.get('x-vehicle-type') || undefined;
      const useAdvancedTargeting = searchParams.get('advancedTargeting') === 'true';

      let filteredContent = items;
      if (userLocation || userVehicleType) {
        filteredContent = filterContentByTargeting(
          items,
          { userLocation, userVehicleType },
          useAdvancedTargeting
        );
      }

      return NextResponse.json({ content: filteredContent });
    }

    const content = await getActiveSponsoredContent(placement, limit * 2); // Obtener más para filtrar

    let filteredContent = content;
    if (userLocation || userVehicleType) {
      filteredContent = filterContentByTargeting(
        content,
        { userLocation, userVehicleType },
        useAdvancedTargeting
      );
    }

    filteredContent = filteredContent.slice(0, limit);

    return NextResponse.json({ content: filteredContent });
  } catch (error: any) {
    console.error('Error fetching sponsored content:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error.message },
      { status: 500 }
    );
  }
}

