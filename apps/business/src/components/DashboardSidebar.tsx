'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function DashboardSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const menuItems = [
    { href: '/dashboard', label: 'Inicio', icon: '📊' },
    { href: '/dashboard/leads', label: 'CRM / Leads', icon: '📞' },
    { href: '/dashboard/appointments', label: 'Citas', icon: '📅' },
    { href: '/dashboard/services', label: 'Servicios', icon: '🧰' },
    { href: '/dashboard/estimates', label: 'Estimados', icon: '📝' },
    { href: '/dashboard/invoices', label: 'Facturas', icon: '🧾' },
    { href: '/dashboard/payments', label: 'Cobros AutoDealers', icon: '💳' },
    { href: '/dashboard/membership', label: 'Membresía', icon: '⭐' },
    { href: '/dashboard/profile', label: 'Perfil público', icon: '👤' },
  ];

  return (
    <>
      <div
        role="presentation"
        className={`fixed inset-0 z-40 bg-black/40 md:hidden ${mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transition-transform md:static md:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 font-black">Panel de negocio</div>
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                pathname === item.href ? 'bg-primary-50 text-primary-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
