'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';

interface Advertiser {
  id: string;
  email: string;
  companyName: string;
  plan: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    fetchAdvertiser();
  }, []);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  async function fetchAdvertiser() {
    try {
      const response = await fetch('/api/advertiser/me');
      
      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        // Si no es JSON, probablemente es HTML (error o redirección)
        if (response.status === 401 || response.status === 403 || response.status === 0) {
          router.push('/login');
          return;
        }
        console.error('Expected JSON but got:', contentType);
        // Si el servidor no responde, podría ser que no esté corriendo
        if (response.status === 0 || !response.ok) {
          console.error('Server might not be running or connection failed');
        }
        return;
      }
      
      const data = await response.json();
      
      if (response.ok) {
        setAdvertiser(data.advertiser);
      } else if (response.status === 401 || response.status === 403) {
        router.push('/login');
      } else {
        console.error('Error fetching advertiser:', data);
      }
    } catch (error: any) {
      console.error('Error fetching advertiser:', error);
      // Si es un error de conexión
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error('Cannot connect to server. Make sure it is running on port 3004');
        // No redirigir, solo mostrar error en consola
      } else if (error.message && (error.message.includes('JSON') || error.message.includes('DOCTYPE'))) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/advertiser/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] bg-gray-50">
      <button
        type="button"
        aria-label="Abrir menú"
        className={`fixed left-3 top-3 z-[60] flex h-11 w-11 items-center justify-center rounded-lg border border-gray-200 bg-white shadow-md md:hidden ${
          mobileNavOpen ? 'hidden' : ''
        }`}
        onClick={() => setMobileNavOpen(true)}
      >
        <svg className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <DashboardSidebar mobileOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="border-b border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 px-4 py-4 pl-14 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:pl-6">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl">
                {advertiser?.companyName || 'Dashboard'}
              </h1>
              <p className="text-xs text-gray-600 sm:text-sm">
                {advertiser?.plan
                  ? `Plan ${advertiser.plan}`
                  : 'Pago por anuncio · Sin suscripción mensual'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <span className="max-w-[200px] truncate text-xs text-gray-600 sm:max-w-xs sm:text-sm">
                {advertiser?.email}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

