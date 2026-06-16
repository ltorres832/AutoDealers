'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ForgotPasswordPanel } from '@/components/ForgotPasswordPanel';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('🔥 Autenticando en el servidor...');
      
      const response = await fetch('/api/auth/server-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // Verificar Content-Type antes de parsear JSON
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // Si no es JSON, leer como texto para ver el error
        const text = await response.text();
        console.error('❌ Respuesta no JSON del servidor:', text.substring(0, 500));
        
        // Intentar extraer información útil del error HTML
        let errorMessage = 'Error del servidor';
        if (response.status === 500) {
          errorMessage = 'Error interno del servidor. Por favor, revisa los logs del servidor o contacta al administrador.';
        } else if (response.status === 503) {
          errorMessage = 'Servicio no disponible temporalmente. Por favor, intenta más tarde.';
        } else {
          errorMessage = `Error del servidor (${response.status}). Por favor, intenta más tarde.`;
        }
        
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        throw new Error(data.error || 'Error al autenticar');
      }

      console.log('✅ Autenticación exitosa');
      console.log('💾 Guardando token...');

      // Limpiar tokens de otras apps (seller/dealer Firebase JWT)
      localStorage.removeItem('authToken');
      document.cookie = 'authToken=; path=/; max-age=0';
      document.cookie = 'authToken=; path=/seller; max-age=0';
      document.cookie = 'authToken=; path=/dealer; max-age=0';

      document.cookie = `authToken=${data.token}; path=/; max-age=86400; SameSite=Lax`;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('authApp', 'admin');
      localStorage.setItem('userEmail', data.user.email);
      localStorage.setItem('userId', data.user.uid);

      // Actualizar último acceso
      try {
        await fetch('/api/users/update-last-access', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.token}`,
          },
          credentials: 'include',
        });
        console.log('✅ Último acceso actualizado');
      } catch (error) {
        console.warn('⚠️ No se pudo actualizar último acceso:', error);
        // No bloquear el login si falla
      }

      console.log('🚀 Redirigiendo al dashboard...');

      // Pequeña pausa para asegurar que se guardó todo
      await new Promise(resolve => setTimeout(resolve, 200));

      // Redirigir
      window.location.href = '/admin/global';
      
    } catch (error: any) {
      console.error('❌ Error:', error);
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="brand-login-shell brand-top-accent">
      <header className="brand-login-header">
        <h1 className="text-2xl font-bold tracking-tight">AutoDealers</h1>
        <p className="text-sm text-white/90 mt-1">Panel de Administración</p>
      </header>
      <div className="brand-login-body">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md border-t-4 border-primary-600">
        <div className="text-center mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Iniciar sesión</h2>
          <p className="text-gray-600 text-sm">Acceso restringido a administradores</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded mb-6">
            <p className="font-semibold">❌ Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              📧 Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              placeholder="admin@autodealers.com"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              🔑 Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition"
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary-600 to-primary-600 text-white py-3 px-4 rounded-lg font-medium hover:from-primary-700 hover:to-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando sesión...
              </span>
            ) : (
              '🚀 Iniciar Sesión'
            )}
          </button>
        </form>

        <ForgotPasswordPanel />

        <div className="mt-6 p-4 bg-primary-50 rounded-lg border border-primary-100">
          <p className="text-xs text-gray-600 mb-2 font-medium">💡 Credenciales de prueba:</p>
          <p className="text-xs text-gray-700 font-mono">📧 admin@autodealers.com</p>
          <p className="text-xs text-gray-700 font-mono">🔑 Admin123456</p>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          © 2024 AutoDealers. Todos los derechos reservados.
        </p>
      </div>
      </div>
    </div>
  );
}
