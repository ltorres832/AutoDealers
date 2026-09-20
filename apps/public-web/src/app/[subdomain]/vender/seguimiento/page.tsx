'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase-config';

const TRACKING = 'sellToDealerTracking';

type Offer = {
  amount: number;
  currency: string;
  message?: string | null;
  status: string;
};

type Msg = {
  id: string;
  fromClient: boolean;
  fromUserName?: string | null;
  content: string;
  createdAt: string;
};

export default function VenderSeguimientoPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const subdomain = String(params.subdomain || '');
  const token = searchParams.get('token') || '';

  const [status, setStatus] = useState('');
  const [offer, setOffer] = useState<Offer | null>(null);
  const [vehicleSummary, setVehicleSummary] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [contact, setContact] = useState({ name: '', phone: '', email: '' });

  const refresh = useCallback(async () => {
    if (!token) return;
    const res = await fetch(`/api/public/sell-to-dealer/${encodeURIComponent(token)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No encontrado');
    setStatus(data.request.status);
    setOffer(data.request.offer || null);
    setContact(data.request.contact);
    setVehicleSummary(
      `${data.request.vehicle.year} ${data.request.vehicle.make} ${data.request.vehicle.model}`
    );
    setMessages(data.messages || []);
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void refresh().catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [token, refresh]);

  useEffect(() => {
    if (!token || !db) return;
    const unsub = onSnapshot(doc(db, TRACKING, token), (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      if (d.status) setStatus(String(d.status));
      if (d.vehicleSummary) setVehicleSummary(String(d.vehicleSummary));
      if (d.offer) setOffer(d.offer as Offer);
      void refresh().catch(() => undefined);
    });
    return () => unsub();
  }, [token, refresh]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/public/sell-to-dealer/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'message', content: draft.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setDraft('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function respondOffer(decision: 'accept_offer' | 'reject_offer') {
    setBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/public/sell-to-dealer/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      await refresh();
      if (decision === 'accept_offer' && data.appointmentHref) {
        router.push(data.appointmentHref);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-600">Falta el token de seguimiento.</p>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    new: 'Nueva — el dealer la está revisando',
    in_review: 'En revisión',
    offer_sent: 'Oferta recibida',
    offer_accepted: 'Oferta aceptada — agenda tu cita',
    offer_rejected: 'Oferta rechazada',
    appointment_scheduled: 'Cita agendada',
    closed: 'Cerrada',
    cancelled: 'Cancelada',
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex gap-3 items-center">
          <PublicBackButton className="text-primary-600 font-medium">← Volver</PublicBackButton>
          <h1 className="font-bold text-slate-900">Seguimiento de tu venta</h1>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white rounded-2xl border p-5">
          <p className="text-sm text-slate-500">Vehículo</p>
          <p className="text-xl font-bold text-slate-900">{vehicleSummary || '—'}</p>
          <p className="mt-2 text-sm">
            Estado:{' '}
            <span className="font-semibold text-primary-700">
              {statusLabel[status] || status || '…'}
            </span>
          </p>
        </div>

        {offer && offer.status === 'pending' ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <p className="font-bold text-emerald-900 text-lg">
              Oferta del dealer: {offer.currency}{' '}
              {Number(offer.amount).toLocaleString('en-US')}
            </p>
            {offer.message ? <p className="text-sm text-emerald-800 mt-1">{offer.message}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void respondOffer('accept_offer')}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
              >
                Aceptar y agendar cita
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void respondOffer('reject_offer')}
                className="px-4 py-2.5 rounded-xl border border-emerald-300 text-emerald-900 font-semibold disabled:opacity-50"
              >
                Rechazar
              </button>
            </div>
          </div>
        ) : null}

        {status === 'offer_accepted' ? (
          <div className="bg-primary-50 border border-primary-200 rounded-2xl p-5">
            <p className="font-semibold text-primary-900">
              Oferta aceptada. Agenda la cita para completar la transacción en el dealer.
            </p>
            <Link
              href={`/${subdomain}/appointment?sellToDealerToken=${encodeURIComponent(token)}&name=${encodeURIComponent(contact.name)}&phone=${encodeURIComponent(contact.phone)}&email=${encodeURIComponent(contact.email)}&type=consultation&notes=${encodeURIComponent(`Cierre compra auto cliente: ${vehicleSummary}`)}`}
              className="inline-block mt-3 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-semibold"
            >
              Agendar cita ahora
            </Link>
          </div>
        ) : null}

        <div className="bg-white rounded-2xl border p-5">
          <h2 className="font-bold mb-3">Chat con el dealer</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <p className="text-sm text-slate-500">Aún no hay mensajes.</p>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-xl px-3 py-2 text-sm max-w-[85%] ${
                    m.fromClient
                      ? 'ml-auto bg-primary-600 text-white'
                      : 'mr-auto bg-slate-100 text-slate-800'
                  }`}
                >
                  {!m.fromClient && m.fromUserName ? (
                    <p className="text-[10px] opacity-70 mb-0.5">{m.fromUserName}</p>
                  ) : null}
                  <p>{m.content}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un mensaje…"
              className="flex-1 border rounded-xl px-3 py-2"
            />
            <button
              type="submit"
              disabled={busy || !draft.trim()}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </main>
    </div>
  );
}
