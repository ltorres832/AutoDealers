'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MembershipCard from '../../components/MembershipCard';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: any;
}

interface User {
  id: string;
  email: string;
  type: 'dealer' | 'seller';
}

export default function PreciosPage() {
  const router = useRouter();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      const data = await response.json();
      
      if (data.authenticated && data.user) {
        setUser(data.user);
        fetchMemberships(data.user.type);
      } else {
        // Redirigir a registro si no está autenticado
        router.push('/registro?redirect=/precios');
      }
    } catch (error) {
      console.error('Error verificando autenticación:', error);
      router.push('/registro?redirect=/precios');
    } finally {
      setCheckingAuth(false);
    }
  }

  const fetchMemberships = async (type: 'dealer' | 'seller') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/public/memberships?type=${type}`, { cache: 'no-store' });
      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error cargando membresías:', error);
      setMemberships([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AutoDealers
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        {checkingAuth ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Verificando acceso...</p>
          </div>
        ) : user ? (
          <>
            <div className="text-center mb-16">
              <h1 className="text-5xl font-bold mb-4">
                Planes y{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Precios
                </span>
              </h1>
              <p className="text-xl text-gray-600 mb-4">
                Elige el plan perfecto para tu negocio. Todos incluyen prueba gratuita de 14 días.
              </p>
              <p className="text-sm text-gray-500">
                Mostrando planes para: <span className="font-semibold">{user.type === 'dealer' ? 'Concesionarios' : 'Vendedores'}</span>
              </p>
            </div>

            {/* Pricing Cards */}
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : memberships.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-xl mb-2">
                  No hay planes disponibles para {user.type === 'dealer' ? 'concesionarios' : 'vendedores'} en este momento.
                </p>
                <p className="text-sm">Por favor, contacta al administrador.</p>
              </div>
            ) : (
              <div className="mb-16">
                <h2 className="text-3xl font-bold mb-8 text-center">
                  Planes para {user.type === 'dealer' ? 'Concesionarios' : 'Vendedores'}
                </h2>
                <div className="grid md:grid-cols-3 gap-8">
                  {memberships.map((membership) => (
                    <MembershipCard
                      key={membership.id}
                      membership={membership}
                      showFeatures={true}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold mb-4">Acceso Restringido</h2>
            <p className="text-gray-600 mb-6">
              Debes estar registrado y autenticado para ver los planes y precios.
            </p>
            <div className="flex gap-4 justify-center">
              <Link
                href="/registro"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
              >
                Registrarse
              </Link>
              <Link
                href="/login"
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        )}

        {/* FAQ Section */}
        <div className="bg-white rounded-2xl p-8 shadow-sm">
          <h2 className="text-3xl font-bold mb-8 text-center">Preguntas Frecuentes</h2>
          <div className="space-y-6">
            {[
              {
                q: '¿Puedo cambiar de plan después?',
                a: 'Sí, puedes actualizar o degradar tu plan en cualquier momento desde el dashboard. Los cambios se aplican inmediatamente.',
              },
              {
                q: '¿Hay descuentos por pago anual?',
                a: 'Sí, ofrecemos 2 meses gratis al pagar anualmente. Contacta a nuestro equipo de ventas para más información.',
              },
              {
                q: '¿Qué pasa si excedo los límites?',
                a: 'Te notificaremos cuando te acerques a los límites. Puedes actualizar tu plan o comprar add-ons según necesites.',
              },
              {
                q: '¿Incluye soporte técnico?',
                a: 'Todos los planes incluyen soporte por email. Los planes Professional y Enterprise incluyen soporte prioritario y chat en vivo.',
              },
            ].map((faq, i) => (
              <div key={i} className="border-b border-gray-200 pb-4">
                <h3 className="font-bold text-lg mb-2">{faq.q}</h3>
                <p className="text-gray-600">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Final */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">¿No estás seguro qué plan elegir?</h2>
          <p className="text-xl mb-8 opacity-90">
            Nuestro equipo está listo para ayudarte a encontrar la mejor solución para tu negocio.
          </p>
          <a
            href="/contacto"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg"
          >
            Contactar Ventas
          </a>
        </div>
      </div>
    </div>
  );
}

