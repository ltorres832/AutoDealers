'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Timeout de seguridad para evitar loading infinito
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
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeout);
        if (user) {
          router.push('/dashboard');
        } else {
          router.push('/login');
        }
        setLoading(false);
      }, (error) => {
        // Manejar errores de autenticación
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



