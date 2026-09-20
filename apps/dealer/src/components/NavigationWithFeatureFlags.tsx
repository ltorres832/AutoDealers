'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardType } from '@autodealers/core/feature-flags';
import { useMembershipPlanRevision } from '@/hooks/useMembershipPlanRevision';

export interface NavItem {
  name: string;
  href: string;
  icon: string;
  featureKey: string | null;
}

interface NavigationWithFeatureFlagsProps {
  items: NavItem[];
  sidebarCollapsed: boolean;
  dashboard?: DashboardType;
  onNavigate?: () => void;
}

const MEMBERSHIP_HREF = '/settings/membership';

/**
 * Muestra TODOS los ítems del menú.
 * Si el plan no incluye el módulo → se ve igual, con badge "Plan" y CTA a membresía.
 * Nunca ocultamos funciones: el dealer tiene que ver el producto completo para querer comprarlo.
 */
export default function NavigationWithFeatureFlags({
  items,
  sidebarCollapsed,
  dashboard = 'dealer',
  onNavigate,
}: NavigationWithFeatureFlagsProps) {
  const pathname = usePathname();
  const planRevision = useMembershipPlanRevision();
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  const gatedKeys = useMemo(
    () =>
      [...new Set(items.map((item) => item.featureKey).filter((k): k is string => Boolean(k)))],
    [items]
  );

  useEffect(() => {
    if (gatedKeys.length === 0) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    async function checkFeatures() {
      try {
        const response = await fetch('/api/feature-flags/batch', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dashboard, featureKeys: gatedKeys }),
        });
        if (cancelled) return;

        if (response.ok) {
          const data = (await response.json()) as { features?: Record<string, boolean> };
          const next: Record<string, boolean> = {};
          for (const key of gatedKeys) {
            next[key] = data.features?.[key] === true;
          }
          setEnabledFeatures(next);
        } else {
          const fallback: Record<string, boolean> = {};
          for (const key of gatedKeys) {
            fallback[key] = false;
          }
          setEnabledFeatures(fallback);
        }
      } catch {
        if (!cancelled) {
          const fallback: Record<string, boolean> = {};
          for (const key of gatedKeys) {
            fallback[key] = false;
          }
          setEnabledFeatures(fallback);
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }

    void checkFeatures();
    return () => {
      cancelled = true;
    };
  }, [dashboard, gatedKeys, planRevision]);

  return (
    <>
      {items.map((item) => {
        const gated = Boolean(item.featureKey);
        const enabled = !gated || (loaded && enabledFeatures[item.featureKey!] === true);
        // Mientras carga flags, mostrar el ítem como disponible (no parpadeo / no ocultar)
        const locked = gated && loaded && !enabled;

        const isActive =
          !locked &&
          (pathname === item.href || Boolean(pathname?.startsWith(item.href + '/')));
        const href = locked ? MEMBERSHIP_HREF : item.href;
        const title = locked
          ? `${item.name} — incluido en tu membresía. Activa o mejora tu plan`
          : item.name;

        return (
          <Link
            key={item.href}
            href={href}
            onClick={() => onNavigate?.()}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${
              locked
                ? 'text-gray-500 hover:bg-amber-50 hover:text-amber-900'
                : isActive
                  ? 'brand-nav-active'
                  : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
            }`}
            title={sidebarCollapsed ? title : undefined}
          >
            <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
              {item.icon}
            </span>
            {!sidebarCollapsed && (
              <>
                <span className="ml-3 flex-1 truncate">{item.name}</span>
                {locked ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                    Plan
                  </span>
                ) : isActive ? (
                  <div className="h-2 w-2 rounded-full bg-primary-600" />
                ) : null}
              </>
            )}
          </Link>
        );
      })}
    </>
  );
}
