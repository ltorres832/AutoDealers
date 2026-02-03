'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  icon: string;
  featureKey: string | null;
}

interface NavigationWithFeatureFlagsProps {
  items: NavItem[];
  sidebarCollapsed: boolean;
}

export default function NavigationWithFeatureFlags({
  items,
  sidebarCollapsed,
}: NavigationWithFeatureFlagsProps) {
  const pathname = usePathname();
  const [enabledFeatures, setEnabledFeatures] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Verificar todas las features de una vez
    const checkFeatures = async () => {
      const features: Record<string, boolean> = {};
      
      for (const item of items) {
        if (item.featureKey) {
          try {
            const response = await fetch(
              `/api/feature-flags/check?dashboard=seller&featureKey=${item.featureKey}`,
              { credentials: 'include' }
            );
            if (response.ok) {
              const data = await response.json();
              features[item.featureKey] = data.enabled !== false;
            } else {
              features[item.featureKey] = true; // Por defecto habilitado
            }
          } catch (error) {
            features[item.featureKey] = true; // Por defecto habilitado
          }
        }
      }
      
      setEnabledFeatures(features);
    };

    checkFeatures();
  }, [items]);

  return (
    <>
      {items.map((item) => {
        // Si tiene featureKey, verificar si está habilitado
        if (item.featureKey && !enabledFeatures[item.featureKey]) {
          return null; // No mostrar si está deshabilitado
        }

        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'} px-4 py-3 rounded-lg transition-all ${
              isActive
                ? 'bg-primary-50 text-primary-700 font-medium shadow-sm'
                : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
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

