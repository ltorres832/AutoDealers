'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { DashboardType } from '@autodealers/core/feature-flags';

interface NavItem {
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

/**
 * Seller sidebar: ALWAYS render every item (fail-open).
 * Do not hide by membership / feature flags. Gating happens on the page
 * via MembershipPageGate (prompt to select/activate membership).
 */
export default function NavigationWithFeatureFlags({
  items,
  sidebarCollapsed,
  onNavigate,
}: NavigationWithFeatureFlagsProps) {
  const pathname = usePathname();

  return (
    <>
      {items.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <Link
            key={`${item.name}-${item.href}`}
            href={item.href}
            onClick={() => onNavigate?.()}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${
              isActive
                ? 'brand-nav-active'
                : 'text-gray-700 hover:bg-primary-50 hover:text-primary-700'
            }`}
            title={sidebarCollapsed ? item.name : undefined}
          >
            <span className={`text-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
              {item.icon}
            </span>
            {!sidebarCollapsed && (
              <>
                <span className="ml-3 flex-1">{item.name}</span>
                {isActive && <div className="h-2 w-2 rounded-full bg-primary-600"></div>}
              </>
            )}
          </Link>
        );
      })}
    </>
  );
}
