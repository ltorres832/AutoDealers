'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';

export interface RealtimeProfile {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  photo: string;
  bio: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  website: string;
  description: string;
  businessHours: string;
  socialMedia: Record<string, string>;
  sellerRating: number;
  sellerRatingCount: number;
}

const emptyProfile: RealtimeProfile = {
  name: '',
  email: '',
  phone: '',
  photo: '',
  bio: '',
  address: '',
  city: '',
  state: '',
  zipCode: '',
  country: '',
  website: '',
  description: '',
  businessHours: '',
  socialMedia: {},
  sellerRating: 0,
  sellerRatingCount: 0,
};

export function useRealtimeProfile(tenantId?: string, userId?: string) {
  const [profile, setProfile] = useState<RealtimeProfile>(emptyProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !userId || !db) {
      setProfile(emptyProfile);
      setLoading(false);
      return;
    }

    let tenantData: Record<string, unknown> = {};
    let userData: Record<string, unknown> = {};
    let tenantReady = false;
    let userReady = false;

    function merge() {
      if (!tenantReady || !userReady) return;
      const addr = (tenantData.address || {}) as Record<string, string | undefined>;
      setProfile({
        userId,
        name:
          (typeof userData.name === 'string' && userData.name.trim()) ||
          (typeof tenantData.name === 'string' && tenantData.name) ||
          '',
        email:
          (typeof userData.email === 'string' && userData.email.trim()) ||
          (tenantData.contactEmail as string) ||
          '',
        phone:
          (typeof userData.phone === 'string' && userData.phone.trim()) ||
          (tenantData.contactPhone as string) ||
          '',
        photo: (userData.photo as string) || (userData.profilePhoto as string) || '',
        bio: (userData.bio as string) || '',
        address: typeof addr.street === 'string' ? addr.street : '',
        city: typeof addr.city === 'string' ? addr.city : '',
        state: typeof addr.state === 'string' ? addr.state : '',
        zipCode: typeof addr.zipCode === 'string' ? addr.zipCode : '',
        country: typeof addr.country === 'string' ? addr.country : '',
        website: (tenantData.website as string) || '',
        description: (tenantData.description as string) || '',
        businessHours: (tenantData.businessHours as string) || '',
        socialMedia: (tenantData.socialMedia as Record<string, string>) || {},
        sellerRating: Number(userData.sellerRating) || 0,
        sellerRatingCount: Number(userData.sellerRatingCount) || 0,
      });
      setLoading(false);
    }

    const unsubTenant = onSnapshot(doc(db, 'tenants', tenantId), (snap) => {
      tenantData = snap.exists() ? snap.data() : {};
      tenantReady = true;
      merge();
    });

    const unsubUser = onSnapshot(doc(db, 'users', userId), (snap) => {
      userData = snap.exists() ? snap.data() : {};
      userReady = true;
      merge();
    });

    return () => {
      unsubTenant();
      unsubUser();
    };
  }, [tenantId, userId]);

  return { profile, loading };
}
