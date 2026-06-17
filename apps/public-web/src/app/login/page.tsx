'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { FirebaseError } from 'firebase/app';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseConfig } from '@/lib/firebase-config';
import { ForgotPasswordPanel } from '@/components/ForgotPasswordPanel';
import { isPlatformApexHost, PLATFORM_APP_URLS } from '@/lib/public-production-hosts';

const PROJECT_ID = 'autodealers-7f62e';
const APP_HOSTING_REGION = 'us-central1';

/** Defaults para Firebase App Hosting (`firebase.json` → apphosting.backendId). */
function defaultAppHostingDashboard(
  backendId: 'admin-app' | 'dealer-app' | 'seller-app' | 'advertiser-app',
  path: string
): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  return `https://${backendId}--${PROJECT_ID}.${APP_HOSTING_REGION}.hosted.app${p}`;
}

/**
 * Mapea el rol del documento `users` en Firestore al panel Next.js (una UI por app).
 * `master_dealer`, `dealer_admin` y `manager` usan la app dealer.
 */
function normalizePortalRole(
  role: string | undefined
): 'admin' | 'dealer' | 'seller' | 'advertiser' | null {
  const r = (role || '').trim().toLowerCase();
  if (r === 'admin') return 'admin';
  if (['dealer', 'master_dealer', 'dealer_admin', 'manager'].includes(r)) return 'dealer';
  if (r === 'seller') return 'seller';
  if (r === 'advertiser') return 'advertiser';
  return null;
}


function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('network-request-failed') || m.includes('failed to fetch') || m.includes('network error')) {
    return 'No se pudo conectar. Comprueba tu conexión, desactiva bloqueadores que impidan cargar el sitio e inténtalo de nuevo.';
  }
  if (m.includes('invalid-credential') || m.includes('wrong-password') || m.includes('invalid login')) {
    return 'Email o contraseña incorrectos';
  }
  if (m.includes('user-not-found') || m.includes('email not found')) {
    return 'Email o contraseña incorrectos';
  }
  if (m.includes('too-many-requests')) {
    return 'Demasiados intentos. Espera unos minutos e intenta de nuevo.';
  }
  if (m.includes('firebase') || m.includes('auth/')) {
    return 'No se pudo completar el acceso. Inténtalo de nuevo o contacta al soporte.';
  }
  return message;
}

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
  const [showDomainHelp, setShowDomainHelp] = useState(false);
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

  function redirectByRole(role: string) {
    if (typeof window === 'undefined') return;

    if (redirectTo) {
      router.push(redirectTo);
      return;
    }

    const portal = normalizePortalRole(role);
    if (!portal) {
      setError('Rol de usuario no reconocido o sin panel (admin, dealer, seller, advertiser).');
      setLoading(false);
      return;
    }

    const hostname = window.location.hostname;
    const protocol = window.location.protocol;

    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
    const isFirebase =
      hostname.includes('.web.app') ||
      hostname.includes('.firebaseapp.com') ||
      hostname.includes('.hosted.app');
    const useConfiguredPortalUrls = (isFirebase && !isLocalhost) || isPlatformApexHost(hostname);

    let targetUrl = '';

    if (useConfiguredPortalUrls) {
      switch (portal) {
        case 'admin':
          targetUrl =
            process.env.NEXT_PUBLIC_ADMIN_URL || `${PLATFORM_APP_URLS.admin}/dashboard`;
          break;
        case 'dealer':
          targetUrl =
            process.env.NEXT_PUBLIC_DEALER_URL || `${PLATFORM_APP_URLS.dealer}/dashboard`;
          break;
        case 'seller':
          targetUrl =
            process.env.NEXT_PUBLIC_SELLER_URL || `${PLATFORM_APP_URLS.seller}/dashboard`;
          break;
        case 'advertiser':
          targetUrl =
            process.env.NEXT_PUBLIC_ADVERTISER_URL || `${PLATFORM_APP_URLS.advertiser}/dashboard`;
          break;
      }
    } else if (isLocalhost) {
      switch (portal) {
        case 'admin':
          targetUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001/dashboard';
          break;
        case 'dealer':
          targetUrl = process.env.NEXT_PUBLIC_DEALER_URL || 'http://localhost:3002/dashboard';
          break;
        case 'seller':
          targetUrl = process.env.NEXT_PUBLIC_SELLER_URL || 'http://localhost:3003/dashboard';
          break;
        case 'advertiser':
          targetUrl = process.env.NEXT_PUBLIC_ADVERTISER_URL || 'http://localhost:3004/dashboard';
          break;
      }
    } else {
      switch (portal) {
        case 'admin':
          targetUrl = process.env.NEXT_PUBLIC_ADMIN_URL || `${protocol}//admin.${hostname}/dashboard`;
          break;
        case 'dealer':
          targetUrl = process.env.NEXT_PUBLIC_DEALER_URL || `${protocol}//dealers.${hostname.replace(/^www\./, '')}/dashboard`;
          break;
        case 'seller':
          targetUrl = process.env.NEXT_PUBLIC_SELLER_URL || `${protocol}//sellers.${hostname.replace(/^www\./, '')}/dashboard`;
          break;
        case 'advertiser':
          targetUrl =
            process.env.NEXT_PUBLIC_ADVERTISER_URL || `${protocol}//ads.${hostname.replace(/^www\./, '')}/dashboard`;
          break;
      }
    }

    if (!targetUrl) {
      setError('No se pudo determinar la URL del panel.');
      setLoading(false);
      return;
    }

    console.log(`🔄 Redirigiendo (Firestore role="${role}" → ${portal}): ${targetUrl}`);

    window.location.href = targetUrl;
  }

  async function handleLoginResponse(
    loginResponse: Response,
    onFailSignOut?: () => Promise<void>
  ): Promise<boolean> {
    const loginData = await loginResponse.json().catch(() => ({})) as {
      error?: string;
      message?: string;
    };

    const contentType = loginResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      if (onFailSignOut) await onFailSignOut();
      console.error('Login response is not JSON');
      throw new Error('Error al validar usuario: respuesta inválida del servidor');
    }

    if (!loginResponse.ok) {
      if (onFailSignOut) await onFailSignOut();
      const msg = loginData.error || loginData.message || 'Error al iniciar sesión';
      setError(msg);
      setLoading(false);
      return false;
    }

    const role = loginData.user?.role;
    if (role) {
      redirectByRole(role);
    } else {
      setError('No se pudo determinar el rol del usuario');
      setLoading(false);
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setShowDomainHelp(false);

    setLoading(true);

    try {
      const email = formData.email.trim();
      const password = formData.password;

      if (!firebaseConfig.apiKey?.trim()) {
        setError('El servicio de acceso no está disponible. Recarga la página o contacta al soporte.');
        setLoading(false);
        return;
      }

      if (!auth) {
        setError('No pudimos cargar el acceso a tu cuenta. Recarga la página e inténtalo de nuevo.');
        setLoading(false);
        return;
      }

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        const token = await cred.user.getIdToken();

        const loginResponse = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        await handleLoginResponse(loginResponse, () => signOut(auth));
      } catch (error) {
        if (
          error instanceof FirebaseError &&
          error.code === 'auth/network-request-failed'
        ) {
          const loginResponse = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, serverAuthFallback: true }),
          });
          await handleLoginResponse(loginResponse);
          return;
        }
        throw error;
      }
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
      if (error instanceof FirebaseError) {
        switch (error.code) {
          case 'auth/wrong-password':
          case 'auth/user-not-found':
          case 'auth/invalid-credential':
          case 'auth/invalid-email':
            setError('Email o contraseña incorrectos');
            return;
          case 'auth/too-many-requests':
            setError('Demasiados intentos. Espera unos minutos e intenta de nuevo.');
            return;
          case 'auth/unauthorized-domain':
            setShowDomainHelp(true);
            setError('Este sitio no está autorizado para iniciar sesión. Contacta al soporte.');
            return;
          default:
            setError(mapAuthError(error.message || 'Error al iniciar sesión'));
            return;
        }
      }
      const raw = error instanceof Error ? error.message : 'Error al iniciar sesión';
      setError(mapAuthError(raw));
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex justify-between gap-3 items-start">
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => {
                  setError('');
                  setShowDomainHelp(false);
                }}
                className="text-red-600 hover:text-red-800 font-medium shrink-0"
                aria-label="Cerrar mensaje"
              >
                ✕
              </button>
            </div>
          )}

          {showDomainHelp && (
            <div className="bg-amber-50 border border-amber-200 text-amber-950 rounded-lg px-4 py-3 text-sm">
              Si accedes desde un enlace o dominio nuevo, puede que tu cuenta aún no esté habilitada
              en este sitio. Contacta al soporte de AutoDealers para que revisen el acceso.
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

          <ForgotPasswordPanel />

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

