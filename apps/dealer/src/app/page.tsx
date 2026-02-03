'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar rol del usuario antes de redirigir
    async function verifyAndRedirect() {
      try {
        // Verificar si hay token en cookies
        const cookies = document.cookie.split(';');
        const authTokenCookie = cookies.find(c => c.trim().startsWith('authToken='));
        
        if (!authTokenCookie) {
          // No hay token, ir a login
          router.push('/login');
          setLoading(false);
          return;
        }

        // Verificar rol del usuario
        const userResponse = await fetch('/api/user', {
          credentials: 'include',
        });

        if (!userResponse.ok) {
          if (userResponse.status === 403) {
            // Usuario no es dealer, limpiar cookies y redirigir
            console.error('❌ Usuario no es dealer');
            document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            alert('Solo dealers pueden acceder a este dashboard.');
            router.push('/login');
            setLoading(false);
            return;
          }
          // Otro error, ir a login
          router.push('/login');
          setLoading(false);
          return;
        }

        const userData = await userResponse.json();
        
        if (userData.user?.role !== 'dealer') {
          // Usuario no es dealer, limpiar cookies y redirigir
          console.error('❌ Usuario no es dealer, rol:', userData.user?.role);
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          alert('Solo dealers pueden acceder a este dashboard.');
          router.push('/login');
          setLoading(false);
          return;
        }

        // Usuario es dealer, redirigir a dashboard
        router.push('/dashboard');
        setLoading(false);
      } catch (error) {
        console.error('Error verifying user:', error);
        router.push('/login');
        setLoading(false);
      }
    }

    // Timeout de seguridad
    const timeout = setTimeout(() => {
      setLoading(false);
      router.push('/login');
    }, 5000);

    if (!auth) {
      clearTimeout(timeout);
      router.push('/login');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        clearTimeout(timeout);
        if (user) {
          // Verificar rol antes de redirigir
          await verifyAndRedirect();
        } else {
          router.push('/login');
          setLoading(false);
        }
      }, (error) => {
        console.error('Auth error:', error);
        clearTimeout(timeout);
        router.push('/login');
        setLoading(false);
      });

      return () => {
        clearTimeout(timeout);
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up auth listener:', error);
      clearTimeout(timeout);
      router.push('/login');
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return null;
}





