import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import { getPublicReviewsForSeller } from '@autodealers/crm';
import { normalizeWebsiteSettingsFromFirestore } from '@/lib/website-settings-normalize';
import { normalizeMisplacedFirebaseAppHostingUrl } from '@/lib/normalize-app-hosting-url';
import { normalizeVehiclesArray } from '@/lib/vehicle-photos-normalize';
import { isSellerVisibleOnPublicListing } from '@/lib/public-catalog-visibility';
import {
  filterVehiclesForSellerPublicCatalog,
  vehicleBelongsToSeller,
} from '@/lib/seller-public-catalog';
import { normalizePromoVideoUrls } from '@autodealers/shared/promo-video-urls';

// Exportar configuración de runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper para agregar timeout a promesas
function pickSocialMedia(source: unknown): Record<string, string> {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) {
      out[key] = value.trim();
    }
  }
  return out;
}

async function collectTenantIdsForPublicSeller(
  db: ReturnType<typeof getFirestore>,
  sellerId: string,
  sellerData: Record<string, unknown>,
  primaryTenantId: string
): Promise<string[]> {
  const ids = new Set<string>([primaryTenantId]);

  const addRef = async (ref: unknown) => {
    if (typeof ref !== 'string' || !ref.trim()) return;
    const r = ref.trim();
    const tenantDoc = await db.collection('tenants').doc(r).get();
    if (tenantDoc.exists) {
      ids.add(r);
      return;
    }
    const userDoc = await db.collection('users').doc(r).get();
    const tid = userDoc.data()?.tenantId;
    if (typeof tid === 'string' && tid.trim()) ids.add(tid.trim());
  };

  await addRef(sellerData.dealerId);
  if (Array.isArray(sellerData.associatedDealers)) {
    for (const d of sellerData.associatedDealers) {
      await addRef(d);
    }
  }

  return [...ids];
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout después de ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sellerId } = await params;
    console.log(`🚀 GET /api/public/seller/${sellerId} - Iniciando...`);

    if (!sellerId) {
      console.error('❌ No sellerId provided');
      return NextResponse.json({ error: 'ID de vendedor requerido' }, { status: 400 });
    }

    // Obtener Firestore con timeout
    let db;
    try {
      db = await withTimeout(Promise.resolve(getFirestore()), 5000);
    } catch (dbError: any) {
      console.error('❌ Error obteniendo Firestore:', dbError);
      return NextResponse.json(
        { error: 'Error de conexión con la base de datos', details: dbError.message },
        { status: 500 }
      );
    }

    // Obtener información del seller con timeout
    let sellerDoc: any;
    try {
      sellerDoc = await withTimeout(
        db.collection('users').doc(sellerId).get(),
        10000
      );
    } catch (sellerError: any) {
      console.error('❌ Error obteniendo seller:', sellerError);
      return NextResponse.json(
        { error: 'Error al obtener información del vendedor', details: sellerError.message },
        { status: 500 }
      );
    }

    if (!sellerDoc.exists) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const sellerData = sellerDoc.data();
    if (sellerData?.role !== 'seller' || !isSellerVisibleOnPublicListing(sellerData as Record<string, unknown>)) {
      return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 });
    }

    const tenantId = sellerData.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Vendedor no tiene tenant asociado' }, { status: 404 });
    }

    // Obtener información del tenant con timeout
    let tenantDoc;
    try {
      tenantDoc = await withTimeout(
        db.collection('tenants').doc(tenantId).get(),
        10000
      );
    } catch (tenantError: any) {
      console.error('❌ Error obteniendo tenant:', tenantError);
      // Continuar sin tenant data si falla
      tenantDoc = { exists: false, data: () => null } as any;
    }

    const tenantData = tenantDoc.exists ? tenantDoc.data() : null;

    const tenantIds = new Set(
      await collectTenantIdsForPublicSeller(
        db,
        sellerId,
        sellerData as Record<string, unknown>,
        tenantId
      )
    );

    console.log(`📦 Fetching vehicles from tenants: ${[...tenantIds].join(', ')}...`);

    const vehicleDocs: Array<{ id: string; data: () => Record<string, unknown> }> = [];
    try {
      for (const tid of tenantIds) {
        const snap = (await withTimeout(
          db.collection('tenants').doc(tid).collection('vehicles').limit(120).get(),
          15000
        )) as { docs: Array<{ id: string }> };
        for (const doc of snap.docs) {
          if (!vehicleDocs.some((x) => x.id === doc.id)) {
            vehicleDocs.push(doc);
          }
        }
      }
      console.log(`🔍 Total vehicles loaded: ${vehicleDocs.length}`);
    } catch (vehiclesError: any) {
      console.error('❌ Error fetching vehicles:', vehiclesError);
    }

    const allVehiclesSnapshot = { docs: vehicleDocs, size: vehicleDocs.length };

    console.log(`👤 Looking for vehicles with sellerId=${sellerId}`);

    // Mapear todos los vehículos de forma segura
    const allVehicles = allVehiclesSnapshot.docs.map((doc: any) => {
      try {
        const data = doc.data();
        const vehicle = {
          id: doc.id,
          ...data,
          // Asegurar que las fechas se conviertan correctamente
          createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
          soldAt: data.soldAt?.toDate?.() || data.soldAt || undefined,
        };

        // Log detallado de cada vehículo para debugging
        console.log(`🚗 Vehicle ${doc.id}:`, {
          make: vehicle.make,
          model: vehicle.model,
          status: vehicle.status,
          sellerId: vehicle.sellerId || 'NO ASIGNADO',
          assignedTo: vehicle.assignedTo || 'NO ASIGNADO',
          deleted: vehicle.deleted,
        });

        return vehicle;
      } catch (mapError: any) {
        console.error(`❌ Error mapping vehicle ${doc.id}:`, mapError);
        return null;
      }
    }).filter((v: any) => v !== null);

    console.log(`📊 Total vehicles mapped: ${allVehicles.length} of ${allVehiclesSnapshot.size}`);

    const tenantPrimarySellerId =
      tenantData?.sellerInfo &&
      typeof tenantData.sellerInfo === 'object' &&
      typeof (tenantData.sellerInfo as { id?: unknown }).id === 'string'
        ? String((tenantData.sellerInfo as { id: string }).id).trim()
        : '';

    const vehicles = filterVehiclesForSellerPublicCatalog(
      allVehicles.filter((v): v is Record<string, unknown> => v != null),
      sellerId,
      { tenantPrimarySellerId: tenantPrimarySellerId || sellerId }
    );

    console.log(
      `✅ Found ${vehicles.length} vehicles for seller ${sellerId} (sin filtro publishedOnPublicPage; huérfanos si sellerInfo del tenant coincide)`
    );

    if (vehicles.length > 0) {
      console.log(
        `📋 Vehicles found:`,
        vehicles.slice(0, 5).map((v) => ({
          id: v.id,
          make: v.make,
          model: v.model,
          sellerId: v.sellerId,
          status: v.status,
          publishedOnPublicPage: v.publishedOnPublicPage,
        }))
      );
    } else {
      const withSeller = allVehicles.filter((v: Record<string, unknown>) =>
        vehicleBelongsToSeller(v, sellerId)
      );
      console.log(
        `⚠️ Sin vehículos listables. Total cargados: ${allVehicles.length}, atribuibles al vendedor (cualquier estado): ${withSeller.length}, tenantPrimarySellerId=${tenantPrimarySellerId || '—'}`
      );
    }

    // Log de muestra
    if (vehicles.length > 0) {
      console.log(`📝 Sample vehicles (first 3):`, vehicles.slice(0, 3).map((v: any) => ({
        id: v.id,
        make: v.make,
        model: v.model,
        year: v.year,
        status: v.status,
        sellerId: v.sellerId || 'NO ASIGNADO',
        assignedTo: v.assignedTo || 'NO ASIGNADO',
        price: v.price,
      })));
    } else {
      console.log(`⚠️ NO HAY VEHÍCULOS disponibles para el seller ${sellerId} en el tenant ${tenantId}`);
    }

    console.log(`✅ Preparing response with ${vehicles.length} vehicles`);

    const vehiclesOut = normalizeVehiclesArray(
      vehicles.map((v) => ({ ...v } as Record<string, unknown>))
    );

    const publicReviews = await getPublicReviewsForSeller(
      [...tenantIds],
      sellerId,
      12
    );

    const approvedRatings = publicReviews
      .map((r) => Number(r.rating))
      .filter((n) => n >= 1 && n <= 5);
    const sellerRating =
      approvedRatings.length > 0
        ? approvedRatings.reduce((a, b) => a + b, 0) / approvedRatings.length
        : Number(sellerData.sellerRating) || 0;
    const sellerRatingCount =
      approvedRatings.length > 0
        ? approvedRatings.length
        : Number(sellerData.sellerRatingCount) || 0;

    const responseData = {
      seller: {
        id: sellerDoc.id,
        name: sellerData.name || 'Vendedor',
        title: sellerData.title || sellerData.jobTitle || 'Vendedor profesional',
        photo: sellerData.photo || sellerData.photoUrl || '',
        sellerRating,
        sellerRatingCount,
        email: sellerData.email || '',
        phone: sellerData.phone || '',
        whatsapp: sellerData.whatsapp || sellerData.phone || '',
        website: normalizeMisplacedFirebaseAppHostingUrl(
          sellerData.website || tenantData?.website || tenantData?.domain || ''
        ),
        tenantId: tenantId,
        tenantName: tenantData?.name || 'Dealer',
        publicPromoVideoUrls: normalizePromoVideoUrls(
          sellerData.publicPromoVideoUrls,
          sellerData.publicPromoVideoUrl
        ),
        publicPromoVideoUrl:
          normalizePromoVideoUrls(sellerData.publicPromoVideoUrls, sellerData.publicPromoVideoUrl)[0] ||
          '',
        socialMedia: {
          ...pickSocialMedia(tenantData?.socialMedia),
          ...pickSocialMedia(sellerData.socialMedia),
        },
      },
      websiteSettings: normalizeWebsiteSettingsFromFirestore(
        (tenantData?.websiteSettings as Record<string, unknown>) || {}
      ),
      branding: {
        primaryColor:
          (tenantData?.branding as { primaryColor?: string })?.primaryColor || '#2563EB',
        secondaryColor:
          (tenantData?.branding as { secondaryColor?: string })?.secondaryColor || '#1E40AF',
      },
      profile: {
        bio: typeof sellerData.bio === 'string' ? sellerData.bio : '',
        description: typeof sellerData.description === 'string' ? sellerData.description : '',
        address: sellerData.address,
        city: typeof sellerData.city === 'string' ? sellerData.city : '',
        state: typeof sellerData.state === 'string' ? sellerData.state : '',
        zipCode: typeof sellerData.zipCode === 'string' ? sellerData.zipCode : '',
        businessHours:
          (typeof sellerData.businessHours === 'string' && sellerData.businessHours.trim()) ||
          (typeof tenantData?.businessHours === 'string' ? tenantData.businessHours : '') ||
          '',
      },
      vehicles: vehiclesOut,
      reviews: publicReviews.map((r) => ({
        id: r.id,
        customerName: r.customerName,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        photos: r.photos,
        createdAt:
          r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
        response: r.response
          ? {
              text: r.response.text,
              respondedBy: r.response.respondedBy,
              respondedAt:
                r.response.respondedAt instanceof Date
                  ? r.response.respondedAt.toISOString()
                  : r.response.respondedAt,
            }
          : undefined,
      })),
    };

    console.log(`✅ Response ready: seller=${responseData.seller.name}, vehicles=${responseData.vehicles.length}`);

    const jsonResponse = NextResponse.json(responseData, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'private, no-store, must-revalidate',
      },
    });

    console.log(`✅ Sending response with ${responseData.vehicles.length} vehicles`);
    return jsonResponse;
  } catch (error: any) {
    console.error('❌ Error fetching seller data:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error message:', error.message);

    // Intentar devolver una respuesta de error válida
    try {
      return NextResponse.json(
        {
          error: 'Internal server error',
          details: error.message || 'Error desconocido',
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        },
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
          },
        }
      );
    } catch (responseError: any) {
      // Si incluso crear la respuesta falla, devolver texto plano
      console.error('❌ Error creando respuesta de error:', responseError);
      return new NextResponse(
        JSON.stringify({ error: 'Error interno del servidor' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    }
  }
}

