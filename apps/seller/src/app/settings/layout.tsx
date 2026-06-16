'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { loadCurrentSellerUser } from '@/lib/current-seller-user';

const BASE_NAV = [
  { href: '/settings', label: 'Resumen', match: (p: string) => p === '/settings' },
  { href: '/settings/profile', label: 'Perfil', match: (p: string) => p.startsWith('/settings/profile') },
  { href: '/settings/notifications', label: 'Notificaciones', match: (p: string) => p.startsWith('/settings/notifications') },
  { href: '/settings/document-branding', label: 'PDF F&I', match: (p: string) => p.startsWith('/settings/document-branding') },
  { href: '/settings/seller-public-page', label: 'Fotos y videos', match: (p: string) => p.startsWith('/settings/seller-public-page') },
  { href: '/settings/branding', label: 'Marca web', match: (p: string) => p.startsWith('/settings/branding') },
  { href: '/settings/integrations', label: 'Integraciones', match: (p: string) => p.startsWith('/settings/integrations') },
  { href: '/settings/dealer-link', label: 'Concesionario', match: (p: string) => p.startsWith('/settings/dealer-link') },
  { href: '/settings/membership', label: 'Membresía', match: (p: string) => p.startsWith('/settings/membership'), hideForDealerManaged: true },
  { href: '/settings/templates', label: 'Plantillas', match: (p: string) => p.startsWith('/settings/templates') },
  { href: '/settings/policies', label: 'Políticas', match: (p: string) => p.startsWith('/settings/policies') },
] as const;

export default function SellerSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  const [dealerManaged, setDealerManaged] = useState(false);

  useEffect(() => {
    void loadCurrentSellerUser().then((user) => {
      setDealerManaged(Boolean(user?.dealerId));
    });
  }, []);

  const nav = BASE_NAV.filter(
    (item) => !('hideForDealerManaged' in item && item.hideForDealerManaged && dealerManaged)
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col -mx-3 sm:-mx-6 lg:-mx-8">
      <nav
        className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-4"
        aria-label="Secciones de configuración"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto pb-1">
          {nav.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
