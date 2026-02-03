'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '../../lib/auth-client';

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const redirectTo = searchParams.get('redirect');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [landingConfig, setLandingConfig] = useState<any>({
    login: {
      registerDealerText: 'Regístrate como Dealer',
      registerSellerText: 'Regístrate como Vendedor',
    },
  });

  useEffect(() => {
    if (registered) {
      // Mostrar mensaje de éxito temporalmente
      setTimeout(() => {
        // El mensaje desaparecerá después de unos segundos
      }, 5000);
    }
  }, [registered]);

  useEffect(() => {
    fetchLandingConfig();
  }, []);

  async function fetchLandingConfig() {
    try {
      const response = await fetch('/api/public/landing-config');
      if (response.ok) {
        const data = await response.json();
        setLandingConfig(data);
      }
    } catch (error) {
      console.error('Error fetching landing config:', error);
    }
  }

  // Función para redirigir según el rol (detección automática)
  function redirectByRole(role: string) {
    if (typeof window === 'undefined') return;
    
    // Si hay un redirect específico, usarlo primero
    if (redirectTo) {
      router.push(redirectTo);
      return;
    }
    
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // Detectar si estamos en localhost o en producción
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
    const isFirebase = hostname.includes('.web.app') || hostname.includes('.firebaseapp.com');
    
    let targetUrl = '';
    
    // En producción (Firebase), usar las URLs de los sites de Firebase Hosting
    if (isFirebase && !isLocalhost) {
      // Extraer el project ID del hostname (ej: autodealers-7f62e.web.app -> autodealers-7f62e)
      const projectId = hostname.split('.')[0];
      
      switch (role) {
        case 'admin':
          // Usar el site de admin-panel de Firebase Hosting
          // Site ID: autodealers-admin (según .firebaserc)
          targetUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `https://autodealers-admin.web.app/admin/dashboard`;
          break;
        case 'dealer':
          // Usar el site de dealer-dashboard de Firebase Hosting
          // Site ID: autodealers-dealer (según .firebaserc)
          targetUrl = process.env.NEXT_PUBLIC_DEALER_URL || `https://autodealers-dealer.web.app/dashboard`;
          break;
        case 'seller':
          // Usar el site de seller-dashboard de Firebase Hosting
          // Site ID: autodealers-seller (según .firebaserc)
          targetUrl = process.env.NEXT_PUBLIC_SELLER_URL || `https://autodealers-seller.web.app/dashboard`;
          break;
        default:
          setError('Rol de usuario no reconocido');
          setLoading(false);
          return;
      }
    } 
    // En desarrollo local, usar los puertos locales
    else if (isLocalhost) {
      switch (role) {
        case 'admin':
          targetUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `http://localhost:3001/admin/dashboard`;
          break;
        case 'dealer':
          targetUrl = process.env.NEXT_PUBLIC_DEALER_URL || `http://localhost:3002/dashboard`;
          break;
        case 'seller':
          targetUrl = process.env.NEXT_PUBLIC_SELLER_URL || `http://localhost:3003/dashboard`;
          break;
        default:
          setError('Rol de usuario no reconocido');
          setLoading(false);
          return;
      }
    }
    // En producción con dominio personalizado
    else {
      switch (role) {
        case 'admin':
          targetUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `${protocol}//admin.${hostname}/admin/dashboard`;
          break;
        case 'dealer':
          targetUrl = process.env.NEXT_PUBLIC_DEALER_URL || `${protocol}//app.${hostname}/dashboard`;
          break;
        case 'seller':
          targetUrl = process.env.NEXT_PUBLIC_SELLER_URL || `${protocol}//seller.${hostname}/dashboard`;
          break;
        default:
          setError('Rol de usuario no reconocido');
          setLoading(false);
          return;
      }
    }
    
    console.log(`🔄 Redirigiendo usuario con rol "${role}" a: ${targetUrl}`);
    
    // Redirigir al dashboard correspondiente
    window.location.href = targetUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    setLoading(true);

    try {
      // Autenticar directamente con el API del servidor (evita problemas de Firebase Auth del cliente)
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      // Verificar Content-Type antes de parsear
      const contentType = loginResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await loginResponse.text();
        console.error('Response is not JSON:', text.substring(0, 200));
        throw new Error('Error al validar usuario: respuesta inválida del servidor');
      }

      let loginData;
      try {
        loginData = await loginResponse.json();
      } catch (jsonError) {
        console.error('Error parsing login response:', jsonError);
        throw new Error('Error al procesar respuesta del servidor');
      }

      if (!loginResponse.ok) {
        throw new Error(loginData.error || loginData.message || 'Error al iniciar sesión');
      }

      // El token ya está guardado en cookie por el API del servidor
      // No necesitamos llamar a set-token separadamente

      // Redirigir según el rol del usuario (detectado automáticamente)
      const role = loginData.user?.role;
      if (role) {
        redirectByRole(role);
      } else {
        setError('No se pudo determinar el rol del usuario');
        setLoading(false);
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al iniciar sesión');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Iniciar Sesión
          </h1>
          <p className="text-gray-600">
            Accede a tu cuenta. El sistema detectará automáticamente tu tipo de usuario
          </p>
        </div>

        {registered && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            ¡Registro exitoso! Ahora puedes iniciar sesión.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              ¿No tienes cuenta?
            </p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <Link 
                href="/register?type=dealer" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {landingConfig?.login?.registerDealerText || 'Regístrate como Dealer'}
              </Link>
              <span className="text-gray-400 hidden sm:inline">|</span>
              <Link 
                href="/register?type=seller" 
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                {landingConfig?.login?.registerSellerText || 'Regístrate como Vendedor'}
              </Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}

