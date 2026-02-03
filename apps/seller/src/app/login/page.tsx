'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { cleanupInvalidTokens } from '@/lib/cleanup-invalid-tokens';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // NO hacer nada en el login - dejar que el usuario inicie sesión normalmente

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!auth) {
      setError('Firebase no está configurado. Por favor, configura las variables de entorno NEXT_PUBLIC_FIREBASE_*');
      setLoading(false);
      return;
    }

    try {
      // Autenticar con Firebase Auth (verifica credenciales)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Obtener un token fresco (forzar renovación para asegurar que sea válido)
      const token = await userCredential.user.getIdToken(true);
      
      // Verificar que el token sea válido (debe tener más de 200 caracteres para ser un JWT válido)
      if (!token) {
        throw new Error('Error al obtener token de autenticación. Por favor, intenta nuevamente.');
      }
      
      if (token.length < 200) {
        console.error('❌ Token demasiado corto:', token.length);
        console.error('❌ Token recibido:', token);
        throw new Error(`Error: El token obtenido es demasiado corto (${token.length} caracteres). Por favor, intenta nuevamente.`);
      }
      
      // Verificar que el token tenga formato JWT válido
      if (!token.startsWith('eyJ')) {
        console.error('❌ Token no tiene formato JWT válido');
        console.error('❌ Token preview:', token.substring(0, 100));
        throw new Error('Error: El token obtenido no tiene el formato correcto. Por favor, intenta nuevamente.');
      }
      
      console.log('✅ Token obtenido correctamente, longitud:', token.length);

      // Validar usuario con la API (verifica estado y rol)
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userCredential.user.uid,
        }),
      });

      const loginData = await loginResponse.json();

      if (!loginResponse.ok) {
        throw new Error(loginData.error || 'Error al validar usuario');
      }

      // Verificar que sea seller
      if (loginData.user?.role !== 'seller') {
        throw new Error('Solo vendedores pueden acceder aquí');
      }

      // LIMPIAR TODAS LAS COOKIES DE AUTENTICACIÓN ANTES DE GUARDAR LA NUEVA
      // Esto asegura que no haya tokens de otras apps (advertiser, admin, etc.)
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/seller; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/advertiser; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/admin; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Esperar un momento para asegurar que las cookies se borren
      await new Promise(resolve => setTimeout(resolve, 100));

      // Guardar token en cookie con configuración adecuada
      // Usar encodeURIComponent para asegurar que caracteres especiales se manejen correctamente
      const isSecure = window.location.protocol === 'https:';
      const cookieValue = encodeURIComponent(token);
      
      // Guardar con un nombre específico para seller para evitar conflictos
      document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${isSecure ? '; Secure' : ''}`;
      
      console.log('✅ Token guardado en cookie, longitud:', token.length);
      console.log('✅ Token preview:', token.substring(0, 50) + '...');
      console.log('✅ Token es Firebase ID token:', token.length > 800 && token.startsWith('eyJ'));
      
      // Esperar para asegurar que la cookie se guarde
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        errorMessage = 'Demasiados intentos fallidos. Por favor, intenta más tarde.';
      } else if (err.code === 'auth/network-request-failed') {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión - Vendedor
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
              <code className="bg-yellow-100 px-1 rounded">apps/seller/</code> con las siguientes variables:
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
              {error}
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
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
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

