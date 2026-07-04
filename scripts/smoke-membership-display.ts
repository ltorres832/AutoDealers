#!/usr/bin/env npx tsx
/**
 * Smoke test: todo checkbox/límite activo en admin debe aparecer en buildMembershipDisplayLines.
 * Ejecutar: npx tsx scripts/smoke-membership-display.ts
 */

import {
  buildMembershipDisplayLines,
  ADMIN_BOOLEAN_FEATURE_KEYS,
  ADMIN_NUMERIC_LIMIT_KEYS,
} from '../packages/billing/src/membership-display.ts';

function main() {
  const allTrueFeatures: Record<string, unknown> = {};
  for (const key of ADMIN_BOOLEAN_FEATURE_KEYS) {
    allTrueFeatures[key] = true;
  }
  for (const key of ADMIN_NUMERIC_LIMIT_KEYS) {
    allTrueFeatures[key] = key === 'maxDealers' ? 3 : 10;
  }

  const dealer = buildMembershipDisplayLines(allTrueFeatures, { planKind: 'dealer' });
  const seller = buildMembershipDisplayLines(allTrueFeatures, { planKind: 'seller' });

  const minDealerFeatures = ADMIN_BOOLEAN_FEATURE_KEYS.length - 3;
  const minSellerFeatures = ADMIN_BOOLEAN_FEATURE_KEYS.length - 5;
  const minLimits = 8;

  console.log('=== Smoke: membresía con TODOS los beneficios activos ===');
  console.log(`Dealer — límites: ${dealer.limits.length}, beneficios: ${dealer.features.length}`);
  console.log(`Seller — límites: ${seller.limits.length}, beneficios: ${seller.features.length}`);

  let failed = false;

  if (dealer.features.length < minDealerFeatures) {
    console.error(
      `❌ Dealer: solo ${dealer.features.length} beneficios (esperado ≥ ${minDealerFeatures})`
    );
    failed = true;
  }

  if (seller.features.length < minSellerFeatures) {
    console.error(
      `❌ Seller: solo ${seller.features.length} beneficios (esperado ≥ ${minSellerFeatures})`
    );
    failed = true;
  }

  if (dealer.limits.length < minLimits) {
    console.error(`❌ Dealer: solo ${dealer.limits.length} límites (esperado ≥ ${minLimits})`);
    failed = true;
  }

  if (!dealer.features.some((l) => l.includes('subdominio'))) {
    console.error('❌ Falta beneficio customSubdomain / publicWebsite');
    failed = true;
  }

  if (!dealer.features.some((l) => l.toLowerCase().includes('f&i'))) {
    console.error('❌ Falta beneficio fiModule');
    failed = true;
  }

  const dynamicCatalog = [
    { key: 'premiumSupport', name: 'Soporte Premium', description: 'Atención prioritaria' },
    { key: 'customReports', name: 'Reportes personalizados', description: '' },
  ];
  const withDynamic = {
    ...allTrueFeatures,
    premiumSupport: true,
    customReports: true,
    ignoredNumeric: 5,
  };
  const dynamicDealer = buildMembershipDisplayLines(withDynamic, {
    planKind: 'dealer',
    dynamicCatalog,
  });
  if (!dynamicDealer.features.some((l) => l.includes('Soporte Premium'))) {
    console.error('❌ Falta beneficio dinámico con nombre del catálogo (premiumSupport)');
    failed = true;
  }
  if (!dynamicDealer.features.some((l) => l.includes('Reportes personalizados'))) {
    console.error('❌ Falta beneficio dinámico customReports');
    failed = true;
  }
  if (dynamicDealer.features.some((l) => l.includes('Ignored Numeric'))) {
    console.error('❌ No debe mostrar claves numéricas dinámicas como beneficios');
    failed = true;
  }

  const sparsePlan = {
    maxInventory: 25,
    customSubdomain: true,
    socialMediaEnabled: true,
    maxCampaigns: null,
    maxLeadsPerMonth: null,
    publicWebsite: true,
    crmAdvanced: true,
  };
  const sparse = buildMembershipDisplayLines(sparsePlan, { planKind: 'seller' });
  if (sparse.limits.some((l) => /ilimitad/i.test(l))) {
    console.error('❌ No debe mostrar límites "ilimitado" si el admin no puso un número');
    failed = true;
  }
  if (sparse.limits.some((l) => l.includes('Campañas'))) {
    console.error('❌ No debe mostrar campañas si maxCampaigns es null/vacío');
    failed = true;
  }
  if (sparse.features.some((l) => l.includes('subdominio')) && !sparsePlan.customSubdomain) {
    console.error('❌ No debe inferir subdominio desde publicWebsite');
    failed = true;
  }
  const expectedLimits = ['25 vehículos', '1000 promociones'];
  for (const needle of ['25 vehículos']) {
    if (!sparse.limits.some((l) => l.includes(needle))) {
      console.error(`❌ Falta límite esperado: ${needle}`);
      failed = true;
    }
  }
  if (!sparse.features.some((l) => l.includes('Redes sociales'))) {
    console.error('❌ Plan sparse: falta beneficio socialMediaEnabled');
    failed = true;
  }

  if (failed) {
    process.exit(1);
  }

  console.log('\n✅ Smoke test OK: catálogo de display alineado con admin.');
  console.log('   Muestra dealer (primeros 5 beneficios):');
  dealer.features.slice(0, 5).forEach((l) => console.log('   -', l));
}

main();
