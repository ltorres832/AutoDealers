'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  ensureFirebaseClientAuth,
  isFirebaseClientReady,
} from '@/lib/ensure-firebase-client-auth';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

export interface ReferralRow {
  id: string;
  referrerId: string;
  referredId?: string;
  referredEmail: string;
  referralCode: string;
  membershipType: string;
  userType: string;
  status: string;
  referrerType?: string;
  rewardStatus: {
    discountApplied: boolean;
    freeMonthApplied: boolean;
    promotionsAvailable: number;
    bannersAvailable: number;
    promotionsUsed: number;
    bannersUsed: number;
  };
  createdAt: string;
  confirmedAt?: string;
  rewardsGrantedAt?: string;
}

export interface ReferralStats {
  total: number;
  pending: number;
  confirmed: number;
  rewarded: number;
  cancelled: number;
}

function toIso(v: unknown): string | undefined {
  if (!v) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object' && 'toDate' in v) {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return undefined;
}

function normalizeReferral(id: string, raw: Record<string, unknown>): ReferralRow {
  const rs = (raw.rewardStatus as Partial<ReferralRow['rewardStatus']>) || {};
  return {
    id,
    referrerId: String(raw.referrerId || ''),
    referredId: raw.referredId ? String(raw.referredId) : undefined,
    referredEmail: String(raw.referredEmail || ''),
    referralCode: String(raw.referralCode || ''),
    membershipType: String(raw.membershipType || ''),
    userType: String(raw.userType || ''),
    status: String(raw.status || 'pending'),
    referrerType: raw.referrerType ? String(raw.referrerType) : undefined,
    rewardStatus: {
      discountApplied: !!rs.discountApplied,
      freeMonthApplied: !!rs.freeMonthApplied,
      promotionsAvailable: Number(rs.promotionsAvailable) || 0,
      bannersAvailable: Number(rs.bannersAvailable) || 0,
      promotionsUsed: Number(rs.promotionsUsed) || 0,
      bannersUsed: Number(rs.bannersUsed) || 0,
    },
    createdAt: toIso(raw.createdAt) || new Date().toISOString(),
    confirmedAt: toIso(raw.confirmedAt),
    rewardsGrantedAt: toIso(raw.rewardsGrantedAt),
  };
}

function computeStats(rows: ReferralRow[]): ReferralStats {
  return {
    total: rows.length,
    pending: rows.filter((r) => r.status === 'pending').length,
    confirmed: rows.filter((r) => r.status === 'confirmed').length,
    rewarded: rows.filter((r) => r.status === 'rewarded').length,
    cancelled: rows.filter((r) => r.status === 'cancelled').length,
  };
}

export function useRealtimeReferrals(filter?: { status?: string; referrerId?: string }) {
  const [allReferrals, setAllReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'firestore' | 'api'>('firestore');

  const loadFromApi = useCallback(async () => {
    const res = await fetchWithAuth('/api/admin/referrals?limit=500');
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Error ${res.status}`);
    }
    const rows = ((data.referrals || []) as Record<string, unknown>[]).map((r) =>
      normalizeReferral(String(r.id || ''), r)
    );
    setAllReferrals(rows);
    setSource('api');
    setError(null);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;
    let finished = false;

    const finish = () => {
      if (!cancelled && !finished) {
        finished = true;
        setLoading(false);
      }
    };

    async function start() {
      setLoading(true);
      setError(null);
      finished = false;

      try {
        if (!isFirebaseClientReady()) {
          await loadFromApi();
          finish();
          return;
        }

        const authed = await ensureFirebaseClientAuth();
        if (!authed || cancelled) {
          await loadFromApi();
          finish();
          return;
        }

        const q = query(
          collection(db, 'referrals'),
          orderBy('createdAt', 'desc'),
          limit(500)
        );

        const fallbackTimer = window.setTimeout(async () => {
          if (cancelled || finished) return;
          try {
            await loadFromApi();
            setError(null);
          } catch (apiErr) {
            setError(apiErr instanceof Error ? apiErr.message : 'Error cargando referidos');
          } finally {
            finish();
          }
        }, 10000);

        unsubscribe = onSnapshot(
          q,
          (snapshot) => {
            window.clearTimeout(fallbackTimer);
            const rows = snapshot.docs.map((doc) =>
              normalizeReferral(doc.id, doc.data() as Record<string, unknown>)
            );
            setAllReferrals(rows);
            setSource('firestore');
            setError(null);
            finish();
          },
          async (err) => {
            window.clearTimeout(fallbackTimer);
            console.error('Error listening to referrals:', err);
            if (cancelled) return;
            try {
              await loadFromApi();
              setError(null);
            } catch (apiErr) {
              setError(apiErr instanceof Error ? apiErr.message : err.message);
            } finally {
              finish();
            }
          }
        );
      } catch (err) {
        if (cancelled) return;
        try {
          await loadFromApi();
        } catch (apiErr) {
          setError(apiErr instanceof Error ? apiErr.message : 'Error cargando referidos');
        } finally {
          finish();
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [loadFromApi]);

  const stats = useMemo(() => computeStats(allReferrals), [allReferrals]);

  const referrals = useMemo(() => {
    let rows = allReferrals;
    if (filter?.status && filter.status !== 'all') {
      rows = rows.filter((r) => r.status === filter.status);
    }
    if (filter?.referrerId) {
      rows = rows.filter((r) => r.referrerId === filter.referrerId);
    }
    return rows;
  }, [allReferrals, filter?.status, filter?.referrerId]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await loadFromApi();
    } finally {
      setLoading(false);
    }
  }, [loadFromApi]);

  return { referrals, allReferrals, stats, loading, error, source, refresh };
}
