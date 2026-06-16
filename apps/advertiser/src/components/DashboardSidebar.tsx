'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface DashboardSidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function DashboardSidebar({ mobileOpen, onClose }: DashboardSidebarProps) {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/ads', label: 'Mis Anuncios', icon: '📢' },
    { href: '/dashboard/ads/create', label: 'Crear Anuncio', icon: '➕' },
    { href: '/dashboard/metrics', label: 'Métricas', icon: '📈' },
    { href: '/dashboard/billing', label: 'Métodos de Pago', icon: '🏦' },
    { href: '/dashboard/payments', label: 'Historial de Pagos', icon: '💰' },
    { href: '/dashboard/profile', label: 'Mi Perfil', icon: '👤' },
  ];

  return (
    <>
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 md:hidden ${
          mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,90vw)] min-h-0 flex-col border-r border-gray-200 bg-white shadow-lg transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:translate-x-0 md:shadow-lg ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 p-4 md:p-6">
          <h2 className="text-lg font-bold text-gray-900 md:text-xl">Panel Anunciante</h2>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
            aria-label="Cerrar menú"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 md:p-4">
          <ul className="space-y-1 md:space-y-2">
            {menuItems.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors md:px-4 ${
                      isActive
                        ? 'bg-primary-50 font-semibold text-primary-600'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}
