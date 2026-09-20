'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  submitted: 'Pendiente',
  under_review: 'En revisión',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  active: 'Activo',
  suspended: 'Suspendido',
};

function formatWhen(value?: string | Date | null) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('es-PR', { dateStyle: 'medium', timeStyle: 'short' });
}

function isAccepted(app: any) {
  return Boolean(app?.accepted || app?.acceptedAgreement || app?.acceptedAt || app?.agreementAcceptedAt);
}

export default function AdminPaymentApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [fees, setFees] = useState({ cardBps: 350, klarnaBps: 1000, affirmBps: 1000 });
  const [feeLabels, setFeeLabels] = useState({ card: '3.5%', klarna: '10%', affirm: '10%' });
  const [platformMethods, setPlatformMethods] = useState<any[]>([]);
  const [agreement, setAgreement] = useState({ title: '', text: '', version: '' });
  const [selected, setSelected] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function load() {
    const res = await fetchWithAuth('/api/admin/payment-applications');
    const data = await res.json();
    setApplications(data.applications || []);
    if (data.fees) setFees(data.fees);
    if (data.feeLabels) setFeeLabels(data.feeLabels);
    if (data.platformMethods) setPlatformMethods(data.platformMethods);
    if (data.agreement) setAgreement(data.agreement);
  }

  useEffect(() => {
    void load();
  }, []);

  async function review(applicationId: string, status: string) {
    setError('');
    const res = await fetchWithAuth('/api/admin/payment-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, status, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || 'No se pudo actualizar la solicitud');
      return;
    }
    setMessage(status === 'approved' ? 'Solicitud aprobada. El negocio debe completar Stripe Connect.' : 'Solicitud actualizada.');
    setSelected(null);
    void load();
  }

  async function saveFees() {
    await fetchWithAuth('/api/admin/payment-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fees }),
    });
    setMessage('Tarifas actualizadas. 350 bps = 3.5%.');
    void load();
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-2">Solicitudes de cobro</h1>
      <p className="text-gray-600 mb-4">
        Los negocios solicitan AutoDealers Payments desde su panel (Cobros AutoDealers). Aquí ves si aceptaron el acuerdo, la fecha, la versión y las tarifas: tarjeta, Klarna y Affirm.
      </p>
      <Link href="/admin/automotive-businesses" className="text-sm text-primary-700 font-semibold mb-6 inline-block">
        Ver negocios automotrices
      </Link>

      {message ? <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">{message}</div> : null}
      {error ? <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">{error}</div> : null}

      <div className="bg-white rounded-xl p-5 mb-6 border">
        <h2 className="font-bold mb-3">Tarifas de plataforma</h2>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {(platformMethods.length
            ? platformMethods
            : [
                { key: 'card', label: 'Tarjeta', feeLabel: feeLabels.card },
                { key: 'klarna', label: 'Klarna', feeLabel: feeLabels.klarna },
                { key: 'affirm', label: 'Affirm', feeLabel: feeLabels.affirm },
              ]
          ).map((method: any) => (
            <div key={method.key} className="rounded-xl border bg-gray-50 p-4">
              <div className="font-black">{method.label}</div>
              <div className="text-2xl font-black text-primary-700">{method.feeLabel}</div>
              <p className="text-xs text-gray-500 mt-1">El cliente paga el total; el negocio recibe el neto.</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Tarifas vigentes: tarjeta <strong>{feeLabels.card}</strong>, Klarna <strong>{feeLabels.klarna}</strong>, Affirm <strong>{feeLabels.affirm}</strong>.
          Klarna y Affirm se muestran al cliente solo si el negocio tiene cobros activos.
        </p>
        <div className="grid md:grid-cols-3 gap-4">
          <label className="text-sm">
            Tarjeta (bps) — {(fees.cardBps / 100).toFixed(2)}%
            <input className="border rounded px-3 py-2 w-full" type="number" value={fees.cardBps} onChange={(e) => setFees({ ...fees, cardBps: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Klarna (bps) — {(fees.klarnaBps / 100).toFixed(2)}%
            <input className="border rounded px-3 py-2 w-full" type="number" value={fees.klarnaBps} onChange={(e) => setFees({ ...fees, klarnaBps: Number(e.target.value) })} />
          </label>
          <label className="text-sm">
            Affirm (bps) — {(fees.affirmBps / 100).toFixed(2)}%
            <input className="border rounded px-3 py-2 w-full" type="number" value={fees.affirmBps} onChange={(e) => setFees({ ...fees, affirmBps: Number(e.target.value) })} />
          </label>
        </div>
        <button onClick={() => void saveFees()} className="mt-4 px-4 py-2 bg-primary-600 text-white rounded">
          Guardar tarifas
        </button>
      </div>

      <div className="bg-white rounded-xl p-5 mb-6 border">
        <h2 className="font-bold mb-2">{agreement.title || 'Acuerdo que ve el negocio'}</h2>
        <p className="text-xs text-gray-500 mb-2">Versión {agreement.version || '—'}. Este es el texto vigente. En cada solicitud guardamos la versión, la fecha y una copia o hash de lo que aceptaron.</p>
        <div className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
          {agreement.text || 'Cargando…'}
        </div>
      </div>

      {applications.length === 0 ? (
        <p className="text-gray-500">No hay solicitudes. Cuando un negocio pulse Solicitar cobros, aparece aquí.</p>
      ) : (
        <table className="w-full bg-white rounded-xl overflow-hidden">
          <thead className="text-left text-sm bg-gray-50">
            <tr>
              <th className="p-3">Negocio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Acuerdo</th>
              <th className="p-3">Métodos</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {applications.map((app) => {
              const accepted = isAccepted(app);
              return (
                <tr key={app.id} className="border-t">
                  <td className="p-3">
                    <div className="font-medium">{app.businessName}</div>
                    <div className="text-xs text-gray-500">{app.tenantId}</div>
                  </td>
                  <td className="p-3">{STATUS_LABELS[app.status] || app.status}</td>
                  <td className="p-3">
                    {accepted ? (
                      <div>
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          Acuerdo aceptado
                        </span>
                        <div className="text-xs text-gray-500 mt-1">
                          {formatWhen(app.acceptedAt || app.agreementAcceptedAt) || 'Fecha registrada'}
                          {app.agreementVersion ? ` · v. ${app.agreementVersion}` : ''}
                        </div>
                      </div>
                    ) : (
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        Acuerdo no aceptado
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm">{Array.isArray(app.requestedMethods) && app.requestedMethods.length ? app.requestedMethods.join(', ') : 'Tarjeta'}</td>
                  <td className="p-3 space-x-2">
                    <button className="text-primary-700 text-sm" onClick={() => { setSelected(app); setNotes(app.notes || ''); }}>
                      Ver detalle
                    </button>
                    <button
                      className="text-green-700 text-sm disabled:opacity-40"
                      disabled={!accepted}
                      title={accepted ? 'Aprobar solicitud' : 'No se puede aprobar sin acuerdo aceptado'}
                      onClick={() => void review(app.id, 'approved')}
                    >
                      Aprobar
                    </button>
                    <button className="text-red-700 text-sm" onClick={() => void review(app.id, 'rejected')}>Rechazar</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-2">{selected.businessName}</h3>
            <p className="text-sm text-gray-600 mb-3">
              Estado: {STATUS_LABELS[selected.status] || selected.status}<br />
              Tenant: {selected.tenantId}
            </p>
            {isAccepted(selected) ? (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                <div className="font-semibold text-emerald-800">Acuerdo aceptado</div>
                <div className="text-sm text-emerald-900">
                  Fecha: {formatWhen(selected.acceptedAt || selected.agreementAcceptedAt) || 'registrada'}<br />
                  Versión: {selected.agreementVersion || '—'}<br />
                  {selected.agreementHash ? `Hash: ${String(selected.agreementHash).slice(0, 16)}…` : null}
                  {selected.feesSnapshot ? (
                    <>
                      <br />
                      Tarifas al aceptar: tarjeta {(selected.feesSnapshot.cardBps / 100).toFixed(2)}%, Klarna {(selected.feesSnapshot.klarnaBps / 100).toFixed(2)}%, Affirm {(selected.feesSnapshot.affirmBps / 100).toFixed(2)}%
                    </>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900 text-sm">
                Acuerdo no aceptado. No se puede aprobar esta solicitud hasta que el negocio marque la casilla y confirme.
              </div>
            )}
            <div className="text-sm bg-gray-50 rounded-xl p-3 max-h-40 overflow-y-auto whitespace-pre-wrap mb-3">
              {selected.agreementText || agreement.text}
            </div>
            <label className="text-sm block mb-3">
              Notas internas
              <textarea className="border rounded w-full px-3 py-2 mt-1" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </label>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-40"
                disabled={!isAccepted(selected)}
                onClick={() => void review(selected.id, 'approved')}
              >
                Aprobar
              </button>
              <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => void review(selected.id, 'rejected')}>Rechazar</button>
              <button className="px-4 py-2 border rounded" onClick={() => setSelected(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
