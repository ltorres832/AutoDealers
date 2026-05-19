/** Agrupa inventario del vendedor por marca y familia de modelo (página pública morada). */

export type SellerGroupedVehicle = {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency: string;
  photos?: string[];
  images?: string[];
  mileage?: number;
  condition: string;
  description?: string;
  status?: string;
  showSoldBadge?: boolean;
  showPublicSoldBadge?: boolean;
  specifications?: {
    trim?: string;
  };
};

export type SellerInventoryVariantGroup = {
  slug: string;
  label: string;
  vehicles: SellerGroupedVehicle[];
};

export type SellerInventoryModelFamily = {
  slug: string;
  model: string;
  totalCount: number;
  variants: SellerInventoryVariantGroup[];
};

export type SellerInventoryMakeGroup = {
  slug: string;
  make: string;
  models: SellerInventoryModelFamily[];
};

function primaryModelToken(raw: string): string {
  const s = (raw || '').trim() || 'Sin modelo';
  const first = s.split(/\s*(?:[,;/|]|\s+y\s+)\s*/i)[0]?.trim();
  return first || s;
}

function modelFamilyKey(rawModel: string): string {
  const primary = primaryModelToken(rawModel);
  let key = primary.replace(/\s+/g, ' ').trim();
  key = key.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const TRAIL =
    /\s+(lx\+?|ex\+?|sx\+?|se|le|xl|xle|xls|limited|premium|platinum|titanium|sport|touring|ultimate|denali|overland|trailhawk|n\.?\s*line|hybrid|phev|awd|fwd|4x4|4wd|2wd|2\.0t|1\.6t|1\.5t|v6|v8|diesel|turbo|gt-line|sr5|sr|trd|max|xlr|ls|lt|rs|ss)\s*$/i;
  for (let i = 0; i < 6; i++) {
    const n = key.replace(TRAIL, '').trim();
    if (n === key) break;
    key = n;
  }
  return key.toLowerCase();
}

function variantDisplayLabel(v: SellerGroupedVehicle): string {
  const m = (v.model || '').trim() || 'Sin modelo';
  const specTrim = v.specifications?.trim;
  const t = typeof specTrim === 'string' ? specTrim.trim() : '';
  if (t && !m.toLowerCase().includes(t.toLowerCase())) {
    return `${m} ${t}`.replace(/\s+/g, ' ').trim();
  }
  return m;
}

function pickShortestLabel(labels: string[]): string {
  const u = [...new Set(labels.map((l) => l.trim()).filter(Boolean))];
  if (!u.length) return 'Sin modelo';
  return u.reduce((a, b) => (a.length <= b.length ? a : b));
}

export function groupSellerInventoryByMakeAndModel(
  vehicles: SellerGroupedVehicle[]
): SellerInventoryMakeGroup[] {
  type VariantBucket = { label: string; items: SellerGroupedVehicle[] };
  type FamilyBucket = { byVariant: Map<string, VariantBucket> };
  type MakeBucket = { displayMake: string; byFamily: Map<string, FamilyBucket> };
  const byMakeKey = new Map<string, MakeBucket>();

  for (const v of vehicles) {
    const rawMake = (v.make || '').trim() || 'Sin marca';
    const makeKey = rawMake.toLowerCase();
    const familyKey = modelFamilyKey(v.model || '');
    const variantKey = variantDisplayLabel(v).toLowerCase();
    const variantLabel = variantDisplayLabel(v);

    let makeBucket = byMakeKey.get(makeKey);
    if (!makeBucket) {
      makeBucket = { displayMake: rawMake, byFamily: new Map() };
      byMakeKey.set(makeKey, makeBucket);
    } else if (rawMake.length > makeBucket.displayMake.length) {
      makeBucket.displayMake = rawMake;
    }

    let familyBucket = makeBucket.byFamily.get(familyKey);
    if (!familyBucket) {
      familyBucket = { byVariant: new Map() };
      makeBucket.byFamily.set(familyKey, familyBucket);
    }

    let variantBucket = familyBucket.byVariant.get(variantKey);
    if (!variantBucket) {
      variantBucket = { label: variantLabel, items: [] };
      familyBucket.byVariant.set(variantKey, variantBucket);
    } else if (variantLabel.length < variantBucket.label.length) {
      variantBucket.label = variantLabel;
    }
    variantBucket.items.push(v);
  }

  const sortVehicles = (items: SellerGroupedVehicle[]) =>
    [...items].sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return (b.price || 0) - (a.price || 0);
    });

  return [...byMakeKey.entries()]
    .sort(([ka], [kb]) => ka.localeCompare(kb, 'es', { sensitivity: 'base' }))
    .map(([makeKey, makeBucket]) => ({
      slug: makeKey,
      make: makeBucket.displayMake,
      models: [...makeBucket.byFamily.entries()]
        .sort(([fa], [fb]) => fa.localeCompare(fb, 'es', { sensitivity: 'base' }))
        .map(([familyKey, familyBucket]) => {
          const variants = [...familyBucket.byVariant.entries()]
            .sort(([va], [vb]) => va.localeCompare(vb, 'es', { sensitivity: 'base' }))
            .map(([vk, { label, items }]) => ({
              slug: vk,
              label,
              vehicles: sortVehicles(items),
            }));
          const allInFamily = variants.flatMap((x) => x.vehicles);
          const familyTitle = pickShortestLabel(
            allInFamily.map((x) => primaryModelToken(x.model || ''))
          );
          return {
            slug: familyKey,
            model: familyTitle,
            totalCount: allInFamily.length,
            variants,
          };
        }),
    }));
}
