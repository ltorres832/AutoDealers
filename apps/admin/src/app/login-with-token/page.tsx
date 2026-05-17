'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirebaseWebClientConfig } from '@autodealers/shared/firebase-web-client-config';

export const dynamic = 'force-dynamic';

const firebaseConfig = getFirebaseWebClientConfig();

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

export default function LoginWithTokenPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full"><p className="text-center">Cargando...</p></div></div>}>
      <LoginWithTokenPage />
    </Suspense>
  );
}

function LoginWithTokenPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Verificando token...');
  const [error, setError] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No se proporcionó un token. Genera uno usando: node check-firebase-auth.js');
      return;
    }

    async function loginWithToken() {
      try {
        setStatus('🔑 Autenticando con custom token...');
        const userCredential = await signInWithCustomToken(auth, token || '');
        
        setStatus('✅ Login exitoso! Obteniendo ID token...');
        const idToken = await userCredential.user.getIdToken();
        
        // Guardar token
        document.cookie = `authToken=${idToken}; path=/; max-age=86400; SameSite=Lax`;
        localStorage.setItem('authToken', idToken);
        localStorage.setItem('userEmail', userCredential.user.email || '');
        
        setStatus('💾 Token guardado! Redirigiendo...');
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        router.push('/admin/global');
        router.refresh();
      } catch (error: any) {
        console.error('Error:', error);
        setError(`Error al autenticar: ${error.message}`);
      }
    }

    loginWithToken();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">🔐 Login con Custom Token</h1>
        
        {error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            <p className="font-semibold">❌ Error:</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
            <p className="font-semibold">⏳ {status}</p>
          </div>
        )}
      </div>
    </div>
  );
}


