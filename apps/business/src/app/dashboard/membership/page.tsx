'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MembershipBenefitsDisplay } from '@autodealers/billing/client';
import DashboardLayout from '@/components/DashboardLayout';

type Plan = {
  id: string;
  name: string;
  description?: string;
  price: number;
  billingCycle?: string;
  features?: Record<string, unknown>;
};

function BusinessMembershipContent() {
  const searchParams = useSearchParams();
  const [current, setCurrent] = useState<Plan | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');

  const success = searchParams.get('success') === 'true';
  const canceled = searchParams.get('canceled') === 'true';

  async function load() {
    const res = await fetch('/api/business/membership', { cache: 'no-store' });
    const data = await res.json();
    setCurrent(data.current || null);
    setPlans(data.plans || []);
    setSubscription(data.subscription || null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function subscribe(membershipId: string) {
    setPayingId(membershipId);
    setError('');
    try {
      const res = await fetch('/api/business/membership/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ membershipId }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error || 'No se pudo abrir Stripe Checkout');
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar el pago');
      setPayingId('');
    }
  }

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-black mb-2">Membresía</h1>
      <p className="text-slate-600 mb-6">
        Planes para talleres, gomeras y servicios automotrices. El pago se hace con Stripe en vivo.
      </p>

      {success ? (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-800">
          Pago recibido. Tu plan se activa en unos segundos.
        </div>
      ) : null}
      {canceled ? (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
          El checkout se canceló. Puedes intentar de nuevo cuando quieras.
        </div>
      ) : null}
      {error ? (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <p className="text-slate-500">Cargando planes…</p>
      ) : (
        <>
          <div className="mb-8 rounded-2xl border bg-white p-5">
            <p className="text-sm text-slate-500">Plan actual</p>
            <p className="text-2xl font-black">{current?.name || 'Sin plan asignado'}</p>
            {subscription ? (
              <p className="mt-1 text-sm text-slate-600">
                Estado: {subscription.status}
                {subscription.billingSource === 'admin_grant' ? ' · cortesía de admin' : ''}
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const active = current?.id === plan.id;
              return (
                <div key={plan.id} className="rounded-2xl border bg-white p-5">
                  <h2 className="text-xl font-black">{plan.name}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {plan.description || 'Para talleres, gomeras y servicios automotrices'}
                  </p>
                  <p className="mt-4 text-3xl font-black">
                    ${Number(plan.price || 0)}
                    <span className="text-base font-medium text-slate-500">/mes</span>
                  </p>
                  <div className="mt-4">
                    <MembershipBenefitsDisplay
                      features={plan.features}
                      planKind="business"
                      hideSectionTitles
                      catalogUrl=""
                    />
                  </div>
                  <button
                    disabled={active || payingId === plan.id}
                    onClick={() => void subscribe(plan.id)}
                    className="mt-5 w-full rounded-xl bg-primary-600 py-2.5 font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {active ? 'Plan actual' : payingId === plan.id ? 'Abriendo Stripe…' : 'Pagar con Stripe'}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default function BusinessMembershipPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <p className="text-slate-500">Cargando membresía…</p>
        </DashboardLayout>
      }
    >
      <BusinessMembershipContent />
    </Suspense>
  );
}
