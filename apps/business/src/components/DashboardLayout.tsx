'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';
import { ShopProfileBadge } from './ShopProfileBadge';
import { MustChangePasswordGate } from './MustChangePasswordGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [gateUser, setGateUser] = useState<{ email?: string; mustChangePassword?: boolean } | null>(null);

  useEffect(() => {
    fetch('/api/business/me')
      .then(async (res) => {
        if (res.status === 401) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        const data = await res.json();
        setName(data.business?.name || 'Negocio');
        setLogoUrl(data.business?.logoUrl || '');
        setGateUser(data.user || null);
        setReady(true);
      })
      .catch(() => router.push('/login'));
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <DashboardSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 min-w-0">
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <button className="md:hidden" onClick={() => setMobileNavOpen(true)}>
            Menú
          </button>
          <div className="flex items-center gap-3 font-bold">
            <ShopProfileBadge name={name} logoUrl={logoUrl} size="sm" />
            {name}
          </div>
          <button
            className="text-sm text-primary-700"
            onClick={async () => {
              await fetch('/api/business/logout', { method: 'POST' });
              router.push('/login');
            }}
          >
            Salir
          </button>
        </header>
        <main className="p-6">
          <MustChangePasswordGate user={gateUser}>{children}</MustChangePasswordGate>
        </main>
      </div>
    </div>
  );
}
