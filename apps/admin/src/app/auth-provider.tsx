'use client';

import { useEffect } from 'react';
import { resolveClientAuthToken } from '@/lib/auth-token-client';
import '@/lib/install-fetch-auth';

/**
 * Parchea fetch y valida que la sesión sea de administrador.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    async function ensureAdminSession() {
      const path = window.location.pathname;
      if (path === '/login' || path.startsWith('/login/')) return;

      const token = resolveClientAuthToken();
      if (!token) {
        localStorage.removeItem('authToken');
        document.cookie = 'authToken=; path=/; max-age=0';
        window.location.href = '/login';
        return;
      }

      try {
        const res = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (!res.ok) {
          localStorage.removeItem('authToken');
          document.cookie = 'authToken=; path=/; max-age=0';
          window.location.href = '/login';
          return;
        }

        const data = await res.json();
        if (data.role !== 'admin') {
          localStorage.removeItem('authToken');
          document.cookie = 'authToken=; path=/; max-age=0';
          window.location.href = '/login';
        }
      } catch {
        /* red de prueba; no bloquear si falla puntual */
      }
    }

    void ensureAdminSession();
  }, []);

  return <>{children}</>;
}
