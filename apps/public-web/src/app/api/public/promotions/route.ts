import { NextRequest, NextResponse } from 'next/server';
import { getActivePromotions, hasAdCreativeMedia } from '@autodealers/core';
import { getFirestore } from '../../../../lib/firebase-admin';
import {
  isDemoPromoAccount,
  isTenantEligibleForPublicCatalog,
} from '@/lib/public-catalog-visibility';

export const dynamic = 'force-dynamic';

const SYSTEM_TENANT_ID = 'system';

async function loadActivePromotionsSafe(tenantId: string): Promise<any[]> {
  try {
    const promotions = await getActivePromotions(tenantId);
    return (promotions || []).map((item: any) => ({ ...item, tenantId: item.tenantId || tenantId }));
  } catch {
    return [];
  }
}

function promoDateMs(value: unknown): number {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: () => Date }).toDate === 'function') {
    return (value as { toDate: () => Date }).toDate().getTime();
  }
  const parsed = new Date(value as string);
  return Number.isFinite(parsed.getTime()) ? parsed.getTime() : 0;
}

function isPromoExpired(item: Record<string, unknown>, now = Date.now()): boolean {
  const end = promoDateMs(item.endDate);
  const expires = promoDateMs(item.expiresAt);
  if (end && end < now) return true;
  if (expires && expires < now) return true;
  return false;
}

function isOwnerPublicPromo(
  item: Record<string, unknown>,
  ownerTenantId: string,
  sellerId?: string | null
): boolean {
  const itemTenant = String(item.tenantId || '');
  if (itemTenant && itemTenant !== ownerTenantId) return false;
  if (isPromoExpired(item)) return false;
  if (sellerId) {
    const owner = String(item.ownerId || item.sellerId || '');
    if (owner && owner !== sellerId) return false;
  }
  const discount = item.discount as { value?: number } | undefined;
  return (
    item.isPaid === true ||
    item.isFreePromotion === true ||
    item.publishOnLandingPage === true ||
    Boolean(item.placement) ||
    hasAdCreativeMedia(item) ||
    Boolean(discount && Number(discount.value) > 0)
  );
}

export async function GET(request: NextRequest) {
  try {
    const db = getFirestore();
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '12');
    const tenantId = searchParams.get('tenantId'); // Opcional: filtrar por tenant específico
    const placement = searchParams.get('placement');
    const ownerOnly = searchParams.get('ownerOnly') === 'true';
    const sellerId = searchParams.get('sellerId');

    let allPromotions: any[] = [];
    const systemPromotions = await loadActivePromotionsSafe(SYSTEM_TENANT_ID);

    if (tenantId) {
      const tenantSnap = await db.collection('tenants').doc(tenantId).get();
      const tenantData = (tenantSnap.exists ? tenantSnap.data() : {}) as Record<string, unknown>;
      if (!isTenantEligibleForPublicCatalog(tenantData, tenantId)) {
        // Tenant demo/oculto: no devolver sus promos, pero sí las globales del sistema
        allPromotions = ownerOnly ? [] : systemPromotions;
      } else {
        const promotions = await loadActivePromotionsSafe(tenantId);
        allPromotions = ownerOnly ? promotions : [...promotions, ...systemPromotions];
      }
    } else {
      // OPTIMIZADO: Si no hay tenantId, obtener promociones de todos los tenants activos en paralelo
      const tenantsSnapshot = await db
        .collection('tenants')
        .where('status', '==', 'active')
        .limit(20) // Limitar tenants para mejorar rendimiento
        .get();

      // Hacer todas las consultas en paralelo con timeout
      const publicTenantDocs = tenantsSnapshot.docs.filter((tenantDoc: any) =>
        isTenantEligibleForPublicCatalog(tenantDoc.data() as Record<string, unknown>, tenantDoc.id)
      );
      const promotionPromises = publicTenantDocs.map(async (tenantDoc: any) => {
        const tId = tenantDoc.id;
        try {
          const timeoutPromise = new Promise<any[]>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout')), 3000);
          });

          const promotionsPromise = getActivePromotions(tId);
          const promotions = await Promise.race([promotionsPromise, timeoutPromise]) as any[];
          return promotions;
        } catch (error: any) {
          // Si es error de índice o timeout, retornar array vacío
          if (error.code === 9 ||
            error.message?.includes('index') ||
            error.message?.includes('Timeout') ||
            error.details?.includes('index')) {
            return [];
          }
          console.error(`Error fetching promotions for tenant ${tId}:`, error);
          return [];
        }
      });

      // Esperar todas las consultas en paralelo con timeout total
      const allPromotionsArrays = await Promise.race([
        Promise.all(promotionPromises),
        new Promise<any[][]>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout total')), 8000);
        })
      ]).catch(() => {
        // Retornar resultados parciales si hay timeout
        return Promise.allSettled(promotionPromises).then(results =>
          results
            .filter((r): r is PromiseFulfilledResult<any[]> => r.status === 'fulfilled')
            .map(r => r.value)
        );
      });

      allPromotions = [...(allPromotionsArrays || []).flat(), ...systemPromotions];
    }

    if (placement && !ownerOnly) {
      try {
        const groupSnap = await db
          .collectionGroup('promotions')
          .where('status', '==', 'active')
          .where('placement', '==', placement)
          .limit(Math.max(limit * 4, 40))
          .get();
        const extras = groupSnap.docs.map((doc) => {
          const data = doc.data();
          const pathParts = doc.ref.path.split('/');
          const tenantFromPath = pathParts[0] === 'tenants' ? pathParts[1] : data.tenantId;
          return {
            id: doc.id,
            ...data,
            tenantId: data.tenantId || tenantFromPath,
            startDate: data.startDate?.toDate?.() || data.startDate,
            endDate: data.endDate?.toDate?.() || data.endDate,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
          };
        });
        allPromotions = [...allPromotions, ...extras];
      } catch {
        // Índice compuesto puede faltar; el resto de fuentes alcanza.
      }
    }

    const seenPromoIds = new Set<string>();
    allPromotions = allPromotions.filter((item: any) => {
      const key = String(item?.id || '');
      if (key && seenPromoIds.has(key)) return false;
      if (key) seenPromoIds.add(key);
      return !isDemoPromoAccount(item as Record<string, unknown>, item?.tenantId || item?.id);
    });

    // Ordenar por fecha de inicio (más recientes primero) y limitar
    let sortedPromotions = allPromotions
      .sort((a: any, b: any) => {
        const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
        const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
        return dateB - dateA;
      });

    if (ownerOnly && tenantId) {
      sortedPromotions = sortedPromotions.filter((item: any) =>
        isOwnerPublicPromo(item as Record<string, unknown>, tenantId, sellerId)
      );
    } else if (placement) {
      sortedPromotions = sortedPromotions.filter(
        (item: any) => item.placement === placement && !isPromoExpired(item as Record<string, unknown>)
      );
    } else {
      sortedPromotions = sortedPromotions.filter((item: any) => !isPromoExpired(item as Record<string, unknown>));
    }

    sortedPromotions = sortedPromotions.slice(0, limit);

    return NextResponse.json({ promotions: sortedPromotions }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );
  }
}

