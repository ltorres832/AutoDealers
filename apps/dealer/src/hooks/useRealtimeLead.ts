'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-client-base';
import type { Lead } from '@autodealers/crm';

function parseUnknownDate(v: unknown): Date | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }
  if (v && typeof v === 'object' && '_seconds' in (v as object)) {
    return new Date((v as { _seconds: number })._seconds * 1000);
  }
  return undefined;
}

export function reviveLead(raw: Record<string, unknown>): Lead {
  const interactions = Array.isArray(raw.interactions)
    ? (raw.interactions as Record<string, unknown>[]).map((x) => ({
        ...x,
        createdAt: parseUnknownDate(x.createdAt) ?? new Date(),
      }))
    : [];
  let score = raw.score;
  if (score && typeof score === 'object') {
    const sr = score as Record<string, unknown>;
    score = {
      ...sr,
      lastUpdated: parseUnknownDate(sr.lastUpdated) ?? new Date(),
    };
  }
  return {
    ...(raw as object),
    interactions,
    score: score as Lead['score'],
    createdAt: parseUnknownDate(raw.createdAt) ?? new Date(),
    updatedAt: parseUnknownDate(raw.updatedAt) ?? new Date(),
    lastContactDate: raw.lastContactDate ? parseUnknownDate(raw.lastContactDate) ?? null : null,
    nextFollowUpDate: raw.nextFollowUpDate ? parseUnknownDate(raw.nextFollowUpDate) ?? null : null,
  } as Lead;
}

export function useRealtimeLead(tenantId: string | undefined, leadId: string) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tenantId || !leadId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    const leadRef = doc(db, 'tenants', tenantId, 'leads', leadId);
    const unsubscribe = onSnapshot(
      leadRef,
      (snap) => {
        if (snap.exists()) {
          setLead(reviveLead({ id: snap.id, ...snap.data() }));
        } else {
          setLead(null);
          setError('Lead no encontrado');
        }
        setLoading(false);
      },
      (err) => {
        console.error('Error en listener de lead:', err);
        setError(err.message || 'Error al cargar el lead');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, leadId]);

  return { lead, loading, error };
}
