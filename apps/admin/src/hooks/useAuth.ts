'use client';

import { useState, useEffect } from 'react';

interface AuthData {
  userId?: string;
  email?: string;
  role?: string;
  tenantId?: string;
  dealerId?: string;
}

export function useAuth() {
  const [auth, setAuth] = useState<AuthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAuth() {
      try {
        const token = localStorage.getItem('authToken') || 
                      document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];
        
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setAuth(data);
        }
      } catch (error) {
        console.error('Error obteniendo auth:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchAuth();
  }, []);

  return { auth, loading };
}


