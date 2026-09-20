'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit as fsLimit } from 'firebase/firestore';
import { db } from '@/lib/firebase-client-base';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { getDealerActiveTenantId } from '@/lib/dealer-tenant-storage';

type RequestRow = {
  id: string;
  status: string;
  contact: { name: string; phone: string; email: string };
  vehicle: {
    make: string;
    model: string;
    year: number;
    mileage: number;
    color: string;
    photos: string[];
    vin?: string;
    notes?: string;
  };
  offer?: { amount: number; currency: string; status: string; message?: string } | null;
  publicToken: string;
  subdomain?: string;
  createdAt?: { toDate?: () => Date } | string | Date;
  lastMessagePreview?: string;
};

type Msg = {
  id: string;
  fromClient: boolean;
  fromUserName?: string;
  content: string;
  createdAt: string | Date;
};

function formatWhen(v: RequestRow['createdAt']): string {
  try {
    if (!v) return '';
    if (typeof v === 'object' && v && 'toDate' in v && typeof v.toDate === 'function') {
      return v.toDate().toLocaleString('es');
    }
    return new Date(v as string | Date).toLocaleString('es');
  } catch {
    return '';
  }
}

export default function SellToDealerInboxPage() {
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchWithAuth('/api/user', {})
      .then((r) => r.json())
      .then((d) => {
        const tid = getDealerActiveTenantId(d.user?.tenantId ?? null);
        setTenantId(tid);
      })
      .catch(() => setTenantId(null));
  }, []);

  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(
      collection(db, 'tenants', tenantId, 'sell_to_dealer_requests'),
      orderBy('createdAt', 'desc'),
      fsLimit(100)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: RequestRow[] = [];
        snap.forEach((doc) => {
          list.push({ id: doc.id, ...(doc.data() as Omit<RequestRow, 'id'>) });
        });
        setRows(list);
        setLoading(false);
        setSelectedId((prev) => prev || list[0]?.id || null);
      },
      (err) => {
        console.error(err);
        setError('No se pudo cargar en tiempo real');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [tenantId]);

  const selected = useMemo(
    () => rows.find((r) => r.id === selectedId) || null,
    [rows, selectedId]
  );

  useEffect(() => {
    if (!tenantId || !selectedId || !db) {
      setMessages([]);
      return;
    }
    const q = query(
      collection(db, 'tenants', tenantId, 'sell_to_dealer_requests', selectedId, 'messages'),
      orderBy('createdAt', 'asc'),
      fsLimit(300)
    );
    const unsub = onSnapshot(q, (snap) => {
      const list: Msg[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        list.push({
          id: doc.id,
          fromClient: Boolean(d.fromClient),
          fromUserName: d.fromUserName,
          content: String(d.content || ''),
          createdAt: d.createdAt?.toDate?.() || d.createdAt || new Date(),
        });
      });
      setMessages(list);
    });
    return () => unsub();
  }, [tenantId, selectedId]);

  async function sendMessage() {
    if (!selectedId || !draft.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/sell-to-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          requestId: selectedId,
          content: draft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setDraft('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function sendOffer() {
    if (!selectedId) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/sell-to-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'offer',
          requestId: selectedId,
          amount: Number(offerAmount),
          message: offerMessage || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setOfferAmount('');
      setOfferMessage('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Autos que clientes quieren vender</h1>
        <p className="text-gray-600 mt-1">
          Solicitudes de venta al dealer (no trade-in). Tiempo real: chat y ofertas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[70vh]">
        <div className="lg:col-span-1 border rounded-xl bg-white overflow-hidden flex flex-col">
          <div className="px-3 py-2 border-b font-semibold text-sm bg-slate-50">
            Solicitudes ({rows.length})
          </div>
          <div className="overflow-y-auto flex-1">
            {rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">Aún no hay solicitudes.</p>
            ) : (
              rows.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full text-left px-3 py-3 border-b hover:bg-slate-50 ${
                    selectedId === r.id ? 'bg-primary-50 border-l-4 border-l-primary-600' : ''
                  }`}
                >
                  <p className="font-semibold text-sm truncate">
                    {r.vehicle?.year} {r.vehicle?.make} {r.vehicle?.model}
                  </p>
                  <p className="text-xs text-gray-600 truncate">{r.contact?.name}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {r.status} · {formatWhen(r.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="lg:col-span-2 border rounded-xl bg-white p-4 flex flex-col min-h-[70vh]">
          {!selected ? (
            <p className="text-gray-500 m-auto">Selecciona una solicitud</p>
          ) : (
            <>
              <div className="border-b pb-4 mb-4">
                <div className="flex flex-wrap gap-4">
                  {selected.vehicle.photos?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selected.vehicle.photos[0]}
                      alt=""
                      className="w-28 h-20 object-cover rounded-lg border"
                    />
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-bold">
                      {selected.vehicle.year} {selected.vehicle.make} {selected.vehicle.model}
                    </h2>
                    <p className="text-sm text-gray-600">
                      {selected.vehicle.mileage?.toLocaleString()} mi · {selected.vehicle.color}
                      {selected.vehicle.vin ? ` · VIN ${selected.vehicle.vin}` : ''}
                    </p>
                    <p className="text-sm mt-1">
                      <strong>{selected.contact.name}</strong> · {selected.contact.phone} ·{' '}
                      {selected.contact.email}
                    </p>
                    <p className="text-xs text-primary-700 mt-1">Estado: {selected.status}</p>
                  </div>
                </div>
                {selected.vehicle.photos?.length > 1 ? (
                  <div className="flex gap-2 mt-3 overflow-x-auto">
                    {selected.vehicle.photos.slice(1).map((p) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={p} src={p} alt="" className="w-16 h-12 object-cover rounded border" />
                    ))}
                  </div>
                ) : null}
                {selected.vehicle.notes ? (
                  <p className="text-sm text-gray-600 mt-2">{selected.vehicle.notes}</p>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-64">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                      m.fromClient ? 'bg-slate-100' : 'bg-primary-600 text-white ml-auto'
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 mb-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Responder al cliente…"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      void sendMessage();
                    }
                  }}
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void sendMessage()}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
                >
                  Enviar
                </button>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Hacer oferta de compra</h3>
                {selected.offer?.status === 'pending' ? (
                  <p className="text-sm text-emerald-700 mb-2">
                    Oferta activa: {selected.offer.currency}{' '}
                    {Number(selected.offer.amount).toLocaleString('en-US')}
                  </p>
                ) : null}
                {selected.offer?.status === 'accepted' ? (
                  <p className="text-sm text-primary-700 mb-2 font-medium">
                    Cliente aceptó — esperando cita de cierre.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <input
                    type="number"
                    min={1}
                    value={offerAmount}
                    onChange={(e) => setOfferAmount(e.target.value)}
                    placeholder="Monto USD"
                    className="border rounded-lg px-3 py-2 text-sm w-36"
                  />
                  <input
                    value={offerMessage}
                    onChange={(e) => setOfferMessage(e.target.value)}
                    placeholder="Mensaje (opcional)"
                    className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[160px]"
                  />
                  <button
                    type="button"
                    disabled={busy || !offerAmount}
                    onClick={() => void sendOffer()}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    Enviar oferta
                  </button>
                </div>
              </div>

              {error ? <p className="text-sm text-red-600 mt-3">{error}</p> : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
