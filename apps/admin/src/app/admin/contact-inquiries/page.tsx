'use client';

import { useCallback, useEffect, useState } from 'react';

type InquiryStatus = 'new' | 'read' | 'replied' | 'archived';

interface ContactInquiryRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  businessType: string;
  message: string;
  status: InquiryStatus;
  source: string;
  adminNotes: string | null;
  createdAt: string | null;
}

const STATUS_LABEL: Record<InquiryStatus, string> = {
  new: 'Nuevo',
  read: 'Leído',
  replied: 'Respondido',
  archived: 'Archivado',
};

const STATUS_CLASS: Record<InquiryStatus, string> = {
  new: 'bg-primary-100 text-primary-800',
  read: 'bg-blue-100 text-blue-800',
  replied: 'bg-green-100 text-green-800',
  archived: 'bg-slate-100 text-slate-600',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es');
  } catch {
    return iso;
  }
}

export default function AdminContactInquiriesPage() {
  const [items, setItems] = useState<ContactInquiryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | InquiryStatus>('all');
  const [selected, setSelected] = useState<ContactInquiryRow | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = filter === 'all' ? '' : `?status=${filter}`;
      const r = await fetch(`/api/admin/contact-inquiries${q}`, { cache: 'no-store' });
      if (!r.ok) return;
      const j = await r.json();
      setItems((j.items || []) as ContactInquiryRow[]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  function openDetail(row: ContactInquiryRow) {
    setSelected(row);
    setNotes(row.adminNotes || '');
    if (row.status === 'new') {
      void patchStatus(row.id, 'read', row.adminNotes);
    }
  }

  async function patchStatus(
    id: string,
    status: InquiryStatus,
    adminNotes?: string | null
  ) {
    setSaving(true);
    try {
      const r = await fetch(`/api/admin/contact-inquiries/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(adminNotes !== undefined ? { adminNotes } : {}),
        }),
      });
      if (!r.ok) {
        alert('No se pudo actualizar');
        return;
      }
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status,
                adminNotes: adminNotes ?? it.adminNotes,
              }
            : it
        )
      );
      if (selected?.id === id) {
        setSelected((s) =>
          s ? { ...s, status, adminNotes: adminNotes ?? s.adminNotes } : s
        );
      }
    } finally {
      setSaving(false);
    }
  }

  const newCount = items.filter((i) => i.status === 'new').length;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Mensajes de contacto</h1>
        <p className="text-sm text-gray-600 mt-1">
          Formulario de la home pública y página /contacto. Los nuevos envíos generan
          notificación en el panel y email al contacto configurado en{' '}
          <span className="font-medium">Info del Sitio</span>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(['all', 'new', 'read', 'replied', 'archived'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              filter === s
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {s === 'all' ? 'Todos' : STATUS_LABEL[s]}
            {s === 'new' && newCount > 0 ? ` (${newCount})` : ''}
          </button>
        ))}
        <button
          type="button"
          onClick={() => load()}
          className="ml-auto px-4 py-2 text-sm text-primary-600 hover:underline"
        >
          Actualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-10 text-center text-gray-500">
          No hay mensajes{filter !== 'all' ? ` con estado «${STATUS_LABEL[filter as InquiryStatus]}»` : ''}.
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="text-left px-4 py-3">Fecha</th>
                <th className="text-left px-4 py-3">Nombre</th>
                <th className="text-left px-4 py-3">Contacto</th>
                <th className="text-left px-4 py-3">Mensaje</th>
                <th className="text-left px-4 py-3">Estado</th>
                <th className="text-right px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                    {formatDate(row.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3">
                    <a href={`mailto:${row.email}`} className="text-primary-600 hover:underline block">
                      {row.email}
                    </a>
                    {row.phone ? (
                      <a href={`tel:${row.phone}`} className="text-gray-500 text-xs block">
                        {row.phone}
                      </a>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 max-w-xs truncate text-gray-600">{row.message}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_CLASS[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="text-primary-600 hover:underline font-medium"
                    >
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h2 className="text-xl font-bold">{selected.name}</h2>
                <p className="text-sm text-gray-500">{formatDate(selected.createdAt)}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <p>
                <span className="font-medium">Email:</span>{' '}
                <a href={`mailto:${selected.email}`} className="text-primary-600">
                  {selected.email}
                </a>
              </p>
              {selected.phone ? (
                <p>
                  <span className="font-medium">Teléfono:</span>{' '}
                  <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                </p>
              ) : null}
              <p>
                <span className="font-medium">Tipo:</span> {selected.businessType}
              </p>
              <p>
                <span className="font-medium">Origen:</span> {selected.source}
              </p>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 whitespace-pre-wrap">
                {selected.message}
              </div>
            </div>

            <label className="block text-sm font-medium mb-1">Notas internas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full border rounded-lg px-3 py-2 text-sm mb-4"
              placeholder="Seguimiento del equipo…"
            />

            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${selected.email}?subject=Re: AutoDealers contacto`}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
              >
                Responder por email
              </a>
              <button
                type="button"
                disabled={saving}
                onClick={() => patchStatus(selected.id, 'replied', notes || null)}
                className="px-4 py-2 border border-green-600 text-green-700 rounded-lg text-sm disabled:opacity-50"
              >
                Marcar respondido
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => patchStatus(selected.id, 'archived', notes || null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Archivar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
