'use client';

import { useState, useEffect } from 'react';

interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'dealer' | 'seller';
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const { fetchWithAuth } = await import('@/lib/fetch-with-auth');
        const response = await fetchWithAuth('/api/auth/me', {});
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, []);

  return { user, loading };
}


