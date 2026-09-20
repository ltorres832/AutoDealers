'use client';

import { useEffect, useState } from 'react';
import { StripePaymentForm } from '@autodealers/shared/client';

type Plan = {
  id: string;
  label: string;
  targetType: 'vehicle' | 'seller' | 'dealer';
  kind: 'featured' | 'boost_24h';
  durationHours: number;
  price: number;
  currency: 'usd';
};

export default function FeaturedPurchaseModal({
  targetType,
  targetId,
  title,
  onClose,
  onSuccess,
}: {
  targetType: 'vehicle' | 'dealer';
  targetId: string;
  title: string;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selected, setSelected] = useState<Plan | null>(null);
  const [payment, setPayment] = useState<{ clientSecret: string; requestId: string } | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/featured/options', { credentials: 'include' });
      const data = await res.json();
      const available = (data.plans || []).filter((p: Plan) => p.targetType === targetType);
      setPlans(available);
      setSelected(available[0] || null);
    })();
  }, [targetType]);

  async function startPayment() {
    if (!selected) return;
    setMessage('');
    const res = await fetch('/api/featured/purchase', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: selected.id, targetType, targetId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'No se pudo crear el pago');
      return;
    }
    setPayment({ clientSecret: data.clientSecret, requestId: data.requestId });
  }

  async function confirm(paymentIntentId: string) {
    if (!payment) return;
    const res = await fetch('/api/featured/confirm-payment', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId, requestId: payment.requestId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || 'Pago confirmado, pero no se pudo activar');
      return;
    }
    setMessage('Destacado activado automáticamente.');
    onSuccess?.();
    setTimeout(onClose, 1200);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">Destacar / Boost</h2>
            <p className="text-sm text-gray-600">{title}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-900">×</button>
        </div>
        {message ? <div className="mb-4 rounded bg-blue-50 p-3 text-sm text-blue-800">{message}</div> : null}
        {!payment ? (
          <div className="space-y-4">
            {plans.map((plan) => (
              <label key={plan.id} className="flex cursor-pointer items-center justify-between rounded-lg border p-3 hover:bg-gray-50">
                <span>
                  <input
                    type="radio"
                    name="featured-plan"
                    checked={selected?.id === plan.id}
                    onChange={() => setSelected(plan)}
                    className="mr-2"
                  />
                  {plan.label}
                </span>
                <strong>${plan.price.toFixed(2)}</strong>
              </label>
            ))}
            <button
              onClick={() => void startPayment()}
              disabled={!selected}
              className="w-full rounded-lg bg-primary-600 px-4 py-2 font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Continuar al pago
            </button>
          </div>
        ) : selected ? (
          <StripePaymentForm
            amount={selected.price}
            description={selected.label}
            clientSecret={payment.clientSecret}
            publishableKeyUrl="/api/settings/membership/payment/publishable-key"
            onSuccess={(id) => void confirm(id)}
            onError={setMessage}
          />
        ) : null}
      </div>
    </div>
  );
}
