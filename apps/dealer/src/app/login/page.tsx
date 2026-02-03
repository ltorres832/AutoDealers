'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const router = useRouter();

  // Verificar si hay un tiempo de espera guardado en localStorage
  useEffect(() => {
    const savedRetryAfter = localStorage.getItem('login_retry_after');
    if (savedRetryAfter) {
      const retryTime = parseInt(savedRetryAfter, 10);
      const now = Date.now();
      if (retryTime > now) {
        const secondsLeft = Math.ceil((retryTime - now) / 1000);
        setRetryAfter(secondsLeft);
        
        // Actualizar el contador cada segundo
        const interval = setInterval(() => {
          const newRetryTime = parseInt(localStorage.getItem('login_retry_after') || '0', 10);
          const newNow = Date.now();
          if (newRetryTime > newNow) {
            const newSecondsLeft = Math.ceil((newRetryTime - newNow) / 1000);
            setRetryAfter(newSecondsLeft);
          } else {
            setRetryAfter(null);
            localStorage.removeItem('login_retry_after');
            clearInterval(interval);
          }
        }, 1000);
        
        return () => clearInterval(interval);
      } else {
        localStorage.removeItem('login_retry_after');
      }
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Prevenir múltiples envíos simultáneos
    if (isSubmitting || loading) {
      return;
    }
    
    setIsSubmitting(true);
    setLoading(true);
    setError('');

    if (!auth) {
      setError('Firebase no está configurado. Por favor, configura las variables de entorno NEXT_PUBLIC_FIREBASE_*');
      setLoading(false);
      setIsSubmitting(false);
      return;
    }

    try {
      // Verificar si hay un tiempo de espera activo
      const savedRetryAfter = localStorage.getItem('login_retry_after');
      if (savedRetryAfter) {
        const retryTime = parseInt(savedRetryAfter, 10);
        const now = Date.now();
        if (retryTime > now) {
          const secondsLeft = Math.ceil((retryTime - now) / 1000);
          throw new Error(`Por favor espera ${secondsLeft} segundos antes de intentar nuevamente.`);
        } else {
          localStorage.removeItem('login_retry_after');
        }
      }

      // Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener un token fresco (sin forzar renovación para evitar cuota)
      const token = await userCredential.user.getIdToken(false);
      
      // Verificar que el token sea válido
      if (!token || token.length < 200) {
        throw new Error('Error al obtener token de autenticación. Por favor, intenta nuevamente.');
      }
      
      if (!token.startsWith('eyJ')) {
        throw new Error('Error: El token obtenido no tiene el formato correcto. Por favor, intenta nuevamente.');
      }
      
      console.log('✅ Token obtenido correctamente, longitud:', token.length);

      // Validar usuario con la API (verifica estado y rol)
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userCredential.user.uid,
          token: token,
        }),
      });

      if (!loginResponse.ok) {
        const contentType = loginResponse.headers.get('content-type');
        let errorMessage = 'Error al validar usuario';
        
        if (contentType && contentType.includes('application/json')) {
          try {
            const loginData = await loginResponse.json();
            errorMessage = loginData.error || `Error ${loginResponse.status}: ${loginResponse.statusText}`;
          } catch (parseError) {
            errorMessage = `Error ${loginResponse.status}: ${loginResponse.statusText}`;
          }
        } else {
          // Intentar leer el texto de la respuesta
          try {
            const text = await loginResponse.text();
            errorMessage = text || `Error ${loginResponse.status}: ${loginResponse.statusText}`;
          } catch (readError) {
            errorMessage = `Error ${loginResponse.status}: ${loginResponse.statusText}`;
          }
        }
        
        console.error('❌ Error en login API:', {
          status: loginResponse.status,
          statusText: loginResponse.statusText,
          error: errorMessage,
        });
        
        throw new Error(errorMessage);
      }

      const loginData = await loginResponse.json();

      // Verificar que sea dealer
      if (loginData.user?.role !== 'dealer') {
        throw new Error('Solo dealers pueden acceder aquí');
      }

      // LIMPIAR TODAS LAS COOKIES DE AUTENTICACIÓN ANTES DE GUARDAR LA NUEVA
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Esperar un momento para asegurar que las cookies se borren
      await new Promise(resolve => setTimeout(resolve, 100));

      // Limpiar cookies viejas primero
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Guardar token en cookie con configuración adecuada
      const isSecure = window.location.protocol === 'https:';
      const cookieValue = encodeURIComponent(token);
      
      // Guardar con un nombre específico para dealer
      document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      
      console.log('✅ Token guardado en cookie, longitud:', token.length);
      
      // Esperar para asegurar que la cookie se guarde y Firebase Auth se sincronice
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Usar window.location.href para hacer un hard redirect completo
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Mensajes de error más específicos
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        errorMessage = 'Email o contraseña incorrectos. Por favor, verifica tus credenciales.';
      } else if (err.code === 'auth/user-disabled') {
        errorMessage = 'Tu cuenta ha sido deshabilitada. Contacta al administrador.';
      } else if (err.code === 'auth/too-many-requests') {
        errorMessage = 'Demasiados intentos fallidos. Por favor, espera unos minutos antes de intentar nuevamente.';
      } else if (err.code === 'auth/quota-exceeded') {
        // Establecer un tiempo de espera de 5 minutos (300 segundos)
        const retryTime = Date.now() + (5 * 60 * 1000);
        localStorage.setItem('login_retry_after', retryTime.toString());
        setRetryAfter(300);
        
        errorMessage = 'Se ha excedido la cuota de autenticación de Firebase. Por favor, espera 5 minutos antes de intentar nuevamente. Si el problema persiste, contacta al administrador o verifica tu plan de Firebase.';
        
        // Actualizar el contador cada segundo
        const interval = setInterval(() => {
          const newRetryTime = parseInt(localStorage.getItem('login_retry_after') || '0', 10);
          const newNow = Date.now();
          if (newRetryTime > newNow) {
            const newSecondsLeft = Math.ceil((newRetryTime - newNow) / 1000);
            setRetryAfter(newSecondsLeft);
          } else {
            setRetryAfter(null);
            localStorage.removeItem('login_retry_after');
            clearInterval(interval);
          }
        }, 1000);
        
        // Limpiar el intervalo después de 5 minutos
        setTimeout(() => {
          clearInterval(interval);
        }, 5 * 60 * 1000);
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
      setIsSubmitting(false);
      
      // Si es un error de cuota, esperar antes de permitir otro intento
      if (err.code === 'auth/quota-exceeded' || err.code === 'auth/too-many-requests') {
        // Deshabilitar el botón por 30 segundos
        setTimeout(() => {
          setIsSubmitting(false);
        }, 30000);
      } else {
        // Para otros errores, permitir reintento inmediato
        setIsSubmitting(false);
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión - Dealer
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tus credenciales para acceder
          </p>
        </div>
        
        {!auth && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded">
            <p className="font-semibold mb-2">⚠️ Firebase no está configurado</p>
            <p className="text-sm mb-2">
              Para usar el sistema de login, necesitas configurar Firebase. Crea un archivo{' '}
              <code className="bg-yellow-100 px-1 rounded">.env.local</code> en{' '}
              <code className="bg-yellow-100 px-1 rounded">apps/dealer/</code> con las siguientes variables:
            </p>
            <ul className="text-xs list-disc list-inside space-y-1 mt-2">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
              <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
            </ul>
            <p className="text-xs mt-2">
              Obtén estos valores de tu proyecto en{' '}
              <a 
                href="https://console.firebase.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-yellow-900 underline font-medium"
              >
                Firebase Console
              </a>
            </p>
          </div>
        )}
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              <p className="font-semibold mb-1">{error}</p>
              {retryAfter !== null && retryAfter > 0 && (
                <p className="text-sm mt-2">
                  ⏱️ Puedes intentar nuevamente en: <strong>{Math.floor(retryAfter / 60)}:{(retryAfter % 60).toString().padStart(2, '0')}</strong>
                </p>
              )}
              {error.includes('cuota') && (
                <div className="mt-3 text-xs bg-red-100 p-2 rounded">
                  <p className="font-semibold mb-1">💡 Soluciones:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Espera 5 minutos antes de intentar nuevamente</li>
                    <li>Verifica en Firebase Console si se alcanzó el límite de usuarios</li>
                    <li>Considera actualizar tu plan de Firebase si es necesario</li>
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || isSubmitting || (retryAfter !== null && retryAfter > 0)}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading || isSubmitting 
                ? 'Iniciando sesión...' 
                : (retryAfter !== null && retryAfter > 0)
                  ? `Espera ${Math.floor(retryAfter / 60)}:${(retryAfter % 60).toString().padStart(2, '0')}`
                  : 'Iniciar Sesión'}
            </button>
            {(loading || isSubmitting) && (
              <p className="mt-2 text-xs text-center text-gray-500">
                Por favor espera, no cierres esta página...
              </p>
            )}
          </div>
        </form>

        {/* Enlace para crear usuario de prueba (solo en desarrollo) */}
        {process.env.NODE_ENV !== 'production' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-2">
              ¿No tienes una cuenta?
            </p>
            <div className="flex gap-2">
              <a
                href="/test/create-user"
                className="flex-1 text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Crear Usuario de Prueba
              </a>
              <span className="text-gray-400">|</span>
              <a
                href="http://localhost:3000/register"
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Registrarse
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

