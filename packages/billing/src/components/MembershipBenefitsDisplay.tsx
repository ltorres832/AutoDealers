'use client';

import { useEffect, useState } from 'react';
import {
  buildMembershipDisplayLines,
  type DynamicFeatureCatalogEntry,
  type MembershipPlanKind,
} from '../membership-display';

export interface MembershipBenefitsDisplayProps {
  features: Record<string, unknown> | undefined;
  planKind?: MembershipPlanKind;
  /** Catálogo de features dinámicas (si el padre ya lo cargó). */
  dynamicCatalog?: DynamicFeatureCatalogEntry[];
  /** Ruta para cargar catálogo si no se pasa dynamicCatalog. */
  catalogUrl?: string;
  hideSectionTitles?: boolean;
  maxFeatureHeight?: string;
  className?: string;
}

export function MembershipBenefitsDisplay({
  features,
  planKind = 'dealer',
  dynamicCatalog,
  catalogUrl = '/api/membership/dynamic-feature-catalog',
  hideSectionTitles = false,
  maxFeatureHeight,
  className = '',
}: MembershipBenefitsDisplayProps) {
  const [catalog, setCatalog] = useState<DynamicFeatureCatalogEntry[]>(dynamicCatalog || []);

  useEffect(() => {
    if (dynamicCatalog?.length) {
      setCatalog(dynamicCatalog);
      return;
    }
    let cancelled = false;
    void fetch(catalogUrl, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : { features: [] }))
      .then((data: { features?: DynamicFeatureCatalogEntry[] }) => {
        if (!cancelled) setCatalog(data.features || []);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      });
    return () => {
      cancelled = true;
    };
  }, [catalogUrl, dynamicCatalog]);

  const { limits, features: featureLines } = buildMembershipDisplayLines(features, {
    planKind,
    dynamicCatalog: catalog,
  });

  if (limits.length === 0 && featureLines.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      {limits.length > 0 && (
        <div className={featureLines.length > 0 ? 'mb-4' : ''}>
          {!hideSectionTitles && (
            <h4 className="text-sm font-semibold text-gray-700 mb-2">📊 Límites</h4>
          )}
          <ul className="space-y-1">
            {limits.map((line, i) => (
              <li key={`limit-${i}`} className="text-sm text-gray-700 leading-snug">
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}
      {featureLines.length > 0 && (
        <div>
          {!hideSectionTitles && (
            <h4 className="text-sm font-semibold text-gray-700 mb-2">✅ Incluye</h4>
          )}
          <ul
            className={`space-y-1 ${maxFeatureHeight ? 'overflow-y-auto pr-1' : ''}`}
            style={maxFeatureHeight ? { maxHeight: maxFeatureHeight } : undefined}
          >
            {featureLines.map((line, i) => (
              <li key={`feat-${i}`} className="text-sm text-gray-700 leading-snug">
                <span className="text-green-600 mr-1">✓</span>
                {line.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D]+\s*/u, '')}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
