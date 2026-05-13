'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';

export interface AuthUser {
  userId: string;
  tenantId: string;
  email: string;
  role: string;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetchWithAuth('/api/user', {});
        if (!response.ok) {
          setUser(null);
          return;
        }
        const data = await response.json();
        const u = data.user;
        if (!u?.id) {
          setUser(null);
          return;
        }
        const tenantId =
          getDealerActiveTenantId(u.tenantId as string | undefined) ||
          (u.tenantId as string | undefined)?.trim() ||
          '';
        setUser({
          userId: u.id,
          tenantId,
          email: u.email || '',
          role: u.role || 'dealer',
        });
      } catch (error) {
        console.error('Error fetching user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    void fetchUser();
  }, []);

  return { user, loading };
}
