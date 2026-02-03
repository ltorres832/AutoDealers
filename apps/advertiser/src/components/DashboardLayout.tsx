'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from './DashboardSidebar';

interface Advertiser {
  id: string;
  email: string;
  companyName: string;
  plan: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [advertiser, setAdvertiser] = useState<Advertiser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdvertiser();
  }, []);

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <DashboardSidebar />
      <div className="flex-1 flex flex-col">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-6 py-4 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {advertiser?.companyName || 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-600">
                {advertiser?.plan ? `Plan ${advertiser.plan}` : 'Sin plan - Selecciona un plan para crear anuncios'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{advertiser?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

