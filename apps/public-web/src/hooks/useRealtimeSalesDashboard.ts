'use client';

import { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '@/lib/firebase-config';
import { ensureSalesFirebaseClientAuth } from '@/lib/ensure-sales-firebase-client-auth';

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof (value as { toDate?: () => Date }).toDate === 'function') {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  return null;
}

function portalLoginUrl(role: string): string {
  const domain = process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'autodealers-online.com';
  if (role === 'dealer') {
    return process.env.NEXT_PUBLIC_DEALER_URL
      ? `${process.env.NEXT_PUBLIC_DEALER_URL.replace(/\/$/, '')}/login`
      : `https://dealer.${domain}/login`;
  }
  if (role === 'business') {
    return process.env.NEXT_PUBLIC_BUSINESS_URL
      ? `${process.env.NEXT_PUBLIC_BUSINESS_URL.replace(/\/$/, '')}/login`
      : `https://business.${domain}/login`;
  }
  return process.env.NEXT_PUBLIC_SELLER_URL
    ? `${process.env.NEXT_PUBLIC_SELLER_URL.replace(/\/$/, '')}/login`
    : `https://seller.${domain}/login`;
}

export type SalesRealtimeSlice = {
  accounts?: Array<Record<string, unknown>>;
  commissions?: Array<Record<string, unknown>>;
  visits?: Array<Record<string, unknown>>;
  appointments?: Array<Record<string, unknown>>;
  notifications?: Array<Record<string, unknown>>;
  paymentLinks?: Array<Record<string, unknown>>;
  employeePatch?: {
    commissionRulesAccepted?: boolean;
    stats?: Record<string, number>;
    stripeConnectAccountId?: string | null;
    stripeConnectOnboardingComplete?: boolean;
    stripeConnectPayoutsEnabled?: boolean;
  };
  nextPayout?: {
    amount: number;
    type: string;
    status: string;
    eligibleAt: string | null;
    isDue: boolean;
  } | null;
};

function mapAccount(id: string, data: Record<string, unknown>) {
  const role = String(data.role || 'seller');
  return {
    id,
    role,
    tenantId: String(data.tenantId || ''),
    userId: String(data.userId || ''),
    email: String(data.email || ''),
    name: String(data.name || ''),
    companyName: data.companyName ? String(data.companyName) : undefined,
    membershipId: data.membershipId ? String(data.membershipId) : undefined,
    loginUrl: portalLoginUrl(role),
    createdAt: toIso(data.createdAt),
  };
}

function mapCommission(id: string, data: Record<string, unknown>) {
  return {
    id,
    type: String(data.type || ''),
    status: String(data.status || ''),
    amount: Number(data.amount || 0),
    adKind: data.adKind ? String(data.adKind) : undefined,
    eligibleAt: toIso(data.eligibleAt),
    paidAt: toIso(data.paidAt),
    payoutError: data.payoutError ? String(data.payoutError) : undefined,
    createdAt: toIso(data.createdAt),
  };
}

function mapVisit(id: string, data: Record<string, unknown>) {
  return {
    id,
    notes: String(data.notes || ''),
    visitedAt: toIso(data.visitedAt),
    tenantId: data.tenantId ? String(data.tenantId) : null,
    accountId: data.accountId ? String(data.accountId) : null,
    contactName: data.contactName ? String(data.contactName) : undefined,
    contactPhone: data.contactPhone != null ? String(data.contactPhone) : null,
    contactEmail: data.contactEmail != null ? String(data.contactEmail) : null,
    companyName: data.companyName != null ? String(data.companyName) : null,
    prospectRole: data.prospectRole ? String(data.prospectRole) : undefined,
    prospectRelation: data.prospectRelation ? String(data.prospectRelation) : undefined,
    membershipSold: data.membershipSold === true,
  };
}

function mapAppointment(id: string, data: Record<string, unknown>) {
  return {
    id,
    kind: String(data.kind || ''),
    scheduledAt: toIso(data.scheduledAt),
    notes: String(data.notes || ''),
    requestedBy: String(data.requestedBy || ''),
    status: String(data.status || ''),
    contactName: data.contactName ? String(data.contactName) : undefined,
    contactPhone: data.contactPhone != null ? String(data.contactPhone) : null,
    companyName: data.companyName != null ? String(data.companyName) : null,
    prospectRole: data.prospectRole ? String(data.prospectRole) : undefined,
    prospectRelation: data.prospectRelation ? String(data.prospectRelation) : undefined,
  };
}

function mapNotification(id: string, data: Record<string, unknown>) {
  return {
    id,
    title: String(data.title || ''),
    message: String(data.message || ''),
    read: data.read === true,
    createdAt: toIso(data.createdAt),
  };
}

function mapPaymentLink(id: string, data: Record<string, unknown>) {
  return {
    id,
    checkoutUrl: data.checkoutUrl ? String(data.checkoutUrl) : undefined,
    status: data.status ? String(data.status) : undefined,
    createdAt: toIso(data.createdAt),
  };
}

function computeNextPayout(
  commissions: Array<{ amount: number; type: string; status: string; eligibleAt: string | null }>
) {
  const now = Date.now();
  const next = commissions
    .filter((item) => item.status === 'pending_hold' || item.status === 'payable')
    .sort(
      (a, b) =>
        (a.eligibleAt ? new Date(a.eligibleAt).getTime() : 0) -
        (b.eligibleAt ? new Date(b.eligibleAt).getTime() : 0)
    )[0];
  if (!next) return null;
  return {
    amount: next.amount,
    type: next.type,
    status: next.status,
    eligibleAt: next.eligibleAt,
    isDue: (next.eligibleAt ? new Date(next.eligibleAt).getTime() : 0) <= now,
  };
}

/**
 * Listeners Firestore (true realtime) para el dashboard de ventas.
 */
export function useRealtimeSalesDashboard(
  employeeId: string | null | undefined,
  onSlice: (slice: SalesRealtimeSlice) => void
): { realtimeReady: boolean; realtimeError: string | null } {
  const [realtimeReady, setRealtimeReady] = useState(false);
  const [realtimeError, setRealtimeError] = useState<string | null>(null);
  const onSliceRef = useRef(onSlice);
  onSliceRef.current = onSlice;

  useEffect(() => {
    if (!employeeId) return;

    let cancelled = false;
    const unsubs: Unsubscribe[] = [];
    const state: {
      accounts?: ReturnType<typeof mapAccount>[];
      commissions?: ReturnType<typeof mapCommission>[];
      visits?: ReturnType<typeof mapVisit>[];
      appointments?: ReturnType<typeof mapAppointment>[];
      notifications?: ReturnType<typeof mapNotification>[];
      paymentLinks?: ReturnType<typeof mapPaymentLink>[];
    } = {};

    function emit() {
      const slice: SalesRealtimeSlice = { ...state };
      if (state.commissions) {
        slice.nextPayout = computeNextPayout(state.commissions);
      }
      onSliceRef.current(slice);
    }

    async function start() {
      const ok = await ensureSalesFirebaseClientAuth();
      if (cancelled) return;
      if (!ok || !db) {
        setRealtimeError('Firebase client no disponible; se usa API.');
        setRealtimeReady(false);
        return;
      }

      setRealtimeReady(true);
      setRealtimeError(null);
      const eid = employeeId;

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_accounts'), where('employeeId', '==', eid)),
          (snap) => {
            state.accounts = snap.docs
              .map((d) => mapAccount(d.id, d.data() as Record<string, unknown>))
              .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            emit();
          },
          (err) => {
            console.error('[sales] accounts listener', err);
            setRealtimeError(err.message);
          }
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_commissions'), where('employeeId', '==', eid)),
          (snap) => {
            state.commissions = snap.docs
              .map((d) => mapCommission(d.id, d.data() as Record<string, unknown>))
              .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            emit();
          },
          (err) => console.error('[sales] commissions listener', err)
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_visits'), where('employeeId', '==', eid)),
          (snap) => {
            state.visits = snap.docs.map((d) => mapVisit(d.id, d.data() as Record<string, unknown>));
            emit();
          },
          (err) => console.error('[sales] visits listener', err)
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_appointments'), where('employeeId', '==', eid)),
          (snap) => {
            state.appointments = snap.docs.map((d) =>
              mapAppointment(d.id, d.data() as Record<string, unknown>)
            );
            emit();
          },
          (err) => console.error('[sales] appointments listener', err)
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_notifications'), where('employeeId', '==', eid)),
          (snap) => {
            state.notifications = snap.docs
              .map((d) => mapNotification(d.id, d.data() as Record<string, unknown>))
              .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
            emit();
          },
          (err) => console.error('[sales] notifications listener', err)
        )
      );

      unsubs.push(
        onSnapshot(
          query(collection(db, 'sales_employee_payment_links'), where('employeeId', '==', eid)),
          (snap) => {
            state.paymentLinks = snap.docs.map((d) =>
              mapPaymentLink(d.id, d.data() as Record<string, unknown>)
            );
            emit();
          },
          (err) => console.error('[sales] payment_links listener', err)
        )
      );

      unsubs.push(
        onSnapshot(doc(db, 'sales_employees', eid), (snap) => {
          if (!snap.exists()) return;
          const data = snap.data() as Record<string, unknown>;
          onSliceRef.current({
            employeePatch: {
              commissionRulesAccepted: Boolean(data.commissionRulesAcceptedAt),
              stats: (data.stats as Record<string, number>) || undefined,
              stripeConnectAccountId: data.stripeConnectAccountId
                ? String(data.stripeConnectAccountId)
                : null,
              stripeConnectOnboardingComplete: data.stripeConnectOnboardingComplete === true,
              stripeConnectPayoutsEnabled: data.stripeConnectPayoutsEnabled === true,
            },
          });
        })
      );
    }

    void start();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => {
        try {
          u();
        } catch {
          /* ignore */
        }
      });
    };
  }, [employeeId]);

  return { realtimeReady, realtimeError };
}
