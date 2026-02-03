'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardSidebar() {
  const pathname = usePathname();

  const menuItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/ads', label: 'Mis Anuncios', icon: '📢' },
    { href: '/dashboard/ads/create', label: 'Crear Anuncio', icon: '➕' },
    { href: '/dashboard/metrics', label: 'Métricas', icon: '📈' },
    // { href: '/dashboard/plan', label: 'Plan y Facturación', icon: '💳' }, // Deshabilitado temporalmente
    { href: '/dashboard/billing', label: 'Métodos de Pago', icon: '🏦' },
    { href: '/dashboard/payments', label: 'Historial de Pagos', icon: '💰' },
    { href: '/dashboard/profile', label: 'Mi Perfil', icon: '👤' },
  ];

  return (
    <aside className="w-64 bg-white shadow-lg min-h-screen">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Panel Anunciante</h2>
      </div>
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}

