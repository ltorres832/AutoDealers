import { NextResponse } from 'next/server';
import { getFirestore } from '../../../../lib/firebase-admin';

export const dynamic = 'force-dynamic';

function yearOptions(): number[] {
  const max = new Date().getFullYear() + 1;
  const years: number[] = [];
  for (let year = max; year >= 1985; year -= 1) years.push(year);
  return years;
}

export async function GET() {
  const years = yearOptions();
  try {
    const snap = await getFirestore()
      .collectionGroup('vehicles')
      .select('make', 'model', 'year', 'trim', 'version')
      .limit(500)
      .get();

    const makes = new Set<string>();
    const modelsByMake: Record<string, Set<string>> = {};
    const trimsByMakeModel: Record<string, Set<string>> = {};

    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const make = String(data.make || '').trim();
      const model = String(data.model || '').trim();
      const trim = String(data.trim || data.version || '').trim();
      if (!make) continue;
      makes.add(make);
      if (!modelsByMake[make]) modelsByMake[make] = new Set();
      if (model) modelsByMake[make].add(model);
      if (make && model && trim) {
        const key = `${make}||${model}`;
        if (!trimsByMakeModel[key]) trimsByMakeModel[key] = new Set();
        trimsByMakeModel[key].add(trim);
      }
    }

    return NextResponse.json({
      years,
      makes: Array.from(makes).sort((a, b) => a.localeCompare(b, 'es')),
      modelsByMake: Object.fromEntries(
        Object.entries(modelsByMake).map(([make, models]) => [
          make,
          Array.from(models).sort((a, b) => a.localeCompare(b, 'es')),
        ])
      ),
      trimsByMakeModel: Object.fromEntries(
        Object.entries(trimsByMakeModel).map(([key, trims]) => [
          key,
          Array.from(trims).sort((a, b) => a.localeCompare(b, 'es')),
        ])
      ),
    });
  } catch (error) {
    console.warn('Vehicle catalog fallback:', error);
    return NextResponse.json({
      years,
      makes: [],
      modelsByMake: {},
      trimsByMakeModel: {},
    });
  }
}
