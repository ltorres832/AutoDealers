'use client';

import { doc, getDoc } from 'firebase/firestore';

export type SellerClientUser = {
  id: string;
  userId?: string;
  name?: string;
  email?: string;
  role: string;
  tenantId?: string;
  dealerId?: string;
  isIndependentWorkspace?: boolean;
  mustChangePassword?: boolean;
  createdByAdmin?: boolean;
  adminMembershipSelectionRequired?: boolean;
  adminMembershipAccess?: 'granted' | 'required';
};

/** Perfil del vendedor vía API; si falla (cookie admin, etc.), lee Firestore con Firebase Auth. */
export async function loadCurrentSellerUser(): Promise<SellerClientUser | null> {
  try {
    const res = await fetch('/api/user', { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      if (data.user?.role === 'seller') {
        const id = data.user.id || data.user.userId;
        if (id && data.user.tenantId) {
          return {
            ...data.user,
            id,
            isIndependentWorkspace: data.user.isIndependentWorkspace === true,
            mustChangePassword: data.user.mustChangePassword === true,
            createdByAdmin: data.user.createdByAdmin === true,
            adminMembershipSelectionRequired:
              data.user.adminMembershipSelectionRequired === true,
            adminMembershipAccess: data.user.adminMembershipAccess,
          };
        }
      }
    }
  } catch {
    /* fallback */
  }

  try {
    const { auth, db } = await import('@/lib/firebase-client');
    const cu = auth?.currentUser;
    if (!cu || !db) return null;

    const snap = await getDoc(doc(db, 'users', cu.uid));
    if (!snap.exists()) return null;

    const d = snap.data();
    if (d?.role !== 'seller' || !d?.tenantId) return null;

    return {
      id: cu.uid,
      userId: cu.uid,
      email: (d.email as string) || cu.email || '',
      name: (d.name as string) || cu.displayName || 'Vendedor',
      role: 'seller',
      tenantId: d.tenantId as string,
      dealerId: d.dealerId as string | undefined,
      mustChangePassword: d.mustChangePassword === true,
      createdByAdmin: d.createdByAdmin === true,
      adminMembershipSelectionRequired: d.adminMembershipSelectionRequired === true,
      adminMembershipAccess: d.adminMembershipAccess as 'granted' | 'required' | undefined,
    };
  } catch {
    return null;
  }
}
