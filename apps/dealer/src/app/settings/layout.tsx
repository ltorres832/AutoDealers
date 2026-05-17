'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/settings', label: 'Resumen', match: (p: string) => p === '/settings' },
  { href: '/settings/profile', label: 'Perfil', match: (p: string) => p.startsWith('/settings/profile') },
  { href: '/settings/crm-lead-routing', label: 'CRM — Leads', match: (p: string) => p.startsWith('/settings/crm-lead-routing') },
  { href: '/settings/crm-sla', label: 'CRM SLA', match: (p: string) => p.startsWith('/settings/crm-sla') },
  { href: '/settings/ai', label: 'IA', match: (p: string) => p.startsWith('/settings/ai') },
  { href: '/settings/integrations', label: 'Integraciones', match: (p: string) => p.startsWith('/settings/integrations') },
  { href: '/settings/membership', label: 'Membresía', match: (p: string) => p.startsWith('/settings/membership') },
  { href: '/settings/fi-manager', label: 'F&I', match: (p: string) => p.startsWith('/settings/fi-manager') },
  { href: '/settings/corporate-emails', label: 'Emails', match: (p: string) => p.startsWith('/settings/corporate-emails') },
  { href: '/settings/website', label: 'Sitio web', match: (p: string) => p.startsWith('/settings/website') },
  { href: '/settings/branding', label: 'Marca', match: (p: string) => p.startsWith('/settings/branding') },
  { href: '/settings/document-branding', label: 'Docs PDF', match: (p: string) => p.startsWith('/settings/document-branding') },
  { href: '/settings/templates', label: 'Plantillas', match: (p: string) => p.startsWith('/settings/templates') },
  { href: '/settings/policies', label: 'Políticas', match: (p: string) => p.startsWith('/settings/policies') },
] as const;

export default function DealerSettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-white/80 md:px-4"
        aria-label="Secciones de configuración"
      >
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {NAV.map((item) => {
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
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}
