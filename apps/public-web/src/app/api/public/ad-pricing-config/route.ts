import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/shared';

const db = getFirestore();

const DEFAULT_BANNERS = {
  hero: { prices: { 7: 199, 15: 349, 30: 599 } },
  sidebar: { prices: { 7: 99, 15: 149, 30: 299 } },
  between_content: { prices: { 7: 149, 15: 249, 30: 449 } },
  sponsors_section: { prices: { 7: 79, 15: 129, 30: 229 } },
};

const PLACEMENT_LABELS: Record<string, string> = {
  hero: 'Hero (rotación)',
  sidebar: 'Barra lateral',
  between_content: 'Entre contenido',
  sponsors_section: 'Patrocinadores',
};

export async function GET(_request: NextRequest) {
  try {
    const configDoc = await db.collection('admin_config').doc('pricing').get();
    const config = configDoc.exists ? configDoc.data() : null;
    const banners = config?.banners ?? DEFAULT_BANNERS;
    const currency = config?.currency ?? 'USD';
    const taxRate = config?.taxRate ?? 0;

    const placements = Object.entries(banners as Record<string, { prices?: Record<string, number> }>)
      .filter(([, value]) => value?.prices)
      .map(([key, value]) => {
        const prices = value.prices ?? {};
        const minPrice = Math.min(...Object.values(prices).map(Number));
        return {
          id: key,
          label: PLACEMENT_LABELS[key] ?? key,
          prices,
          fromPrice: Number.isFinite(minPrice) ? minPrice : null,
        };
      });

    return NextResponse.json({ currency, taxRate, placements });
  } catch (error: unknown) {
    console.error('Error fetching ad pricing config:', error);
    const placements = Object.entries(DEFAULT_BANNERS).map(([key, value]) => ({
      id: key,
      label: PLACEMENT_LABELS[key] ?? key,
      prices: value.prices,
      fromPrice: Math.min(...Object.values(value.prices)),
    }));
    return NextResponse.json({ currency: 'USD', taxRate: 0, placements });
  }
}
