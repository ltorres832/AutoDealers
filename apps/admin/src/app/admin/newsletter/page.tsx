'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type AudienceRow = {
  email: string;
  name?: string;
  role?: string;
  sources: string[];
  status: 'active' | 'unsubscribed';
  subscribedAt?: string;
};

type Campaign = {
  id: string;
  subject: string;
  audience: string;
  totalRecipients: number;
  successful: number;
  failed: number;
  sentAt: string | null;
};

function sourceLabel(sources: string[]): string {
  const labels: string[] = [];
  if (sources.includes('landing_footer')) labels.push('Newsletter web');
  if (sources.includes('user_registration')) labels.push('Usuario registrado');
  if (sources.includes('admin_sync')) labels.push('Sync admin');
  if (sources.includes('admin_import')) labels.push('Importado');
  return labels.join(' · ') || sources.join(', ');
}

export default function AdminNewsletterPage() {
  const [audience, setAudience] = useState<AudienceRow[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    unsubscribed: 0,
    newsletterOnly: 0,
    registeredUsers: 0,
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sendAudience, setSendAudience] = useState<'all_active' | 'newsletter_only' | 'users_only'>(
    'all_active'
  );
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const [audRes, campRes] = await Promise.all([
        fetch('/api/admin/newsletter/audience', { credentials: 'include' }),
        fetch('/api/admin/newsletter/campaigns', { credentials: 'include' }),
      ]);
      const audData = await audRes.json().catch(() => ({}));
      const campData = await campRes.json().catch(() => ({}));
      if (!audRes.ok) throw new Error(audData.error || 'Error cargando audiencia');
      setAudience(audData.audience || []);
      setStats(audData.stats || stats);
      setCampaigns(campData.campaigns || []);
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e instanceof Error ? e.message : 'Error al cargar datos',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return audience;
    return audience.filter(
      (r) =>
        r.email.includes(q) ||
        (r.name || '').toLowerCase().includes(q) ||
        (r.role || '').toLowerCase().includes(q)
    );
  }, [audience, search]);

  async function handleSync() {
    setSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter/sync', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al sincronizar');
      setFeedback({
        type: 'ok',
        text: `Sincronizado: ${data.added} nuevos, ${data.updated} actualizados (${data.totalUsers} usuarios en plataforma).`,
      });
      await load();
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e instanceof Error ? e.message : 'Error al sincronizar',
      });
    } finally {
      setSyncing(false);
    }
  }

  async function handleSend() {
    if (!subject.trim() || !bodyHtml.trim()) {
      setFeedback({ type: 'err', text: 'Completa asunto y contenido del boletín.' });
      return;
    }
    if (
      !confirm(
        '¿Enviar este boletín a la audiencia seleccionada? Esta acción enviará emails reales.'
      )
    ) {
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/admin/newsletter/send', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, bodyHtml, audience: sendAudience }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error al enviar');
      setFeedback({
        type: 'ok',
        text: `Boletín enviado: ${data.successful}/${data.total} exitosos${data.failed ? `, ${data.failed} fallidos` : ''}.`,
      });
      setSubject('');
      setBodyHtml('');
      await load();
    } catch (e) {
      setFeedback({
        type: 'err',
        text: e instanceof Error ? e.message : 'Error al enviar boletín',
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Newsletter y boletines</h1>
          <p className="text-gray-600 mt-1">
            Suscriptores del footer + emails de usuarios registrados en la plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white font-medium hover:bg-primary-700 disabled:opacity-50"
        >
          {syncing ? 'Sincronizando…' : 'Sincronizar usuarios registrados'}
        </button>
      </div>

      {feedback ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total emails', value: stats.total },
          { label: 'Activos', value: stats.active },
          { label: 'Solo newsletter web', value: stats.newsletterOnly },
          { label: 'Usuarios plataforma', value: stats.registeredUsers },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Enviar boletín</h2>
          <p className="text-sm text-gray-600">
            Usa HTML simple en el cuerpo (párrafos, enlaces, listas). Requiere email configurado en
            General y credenciales.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Novedades AutoDealers — junio 2026"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Audiencia</label>
            <select
              value={sendAudience}
              onChange={(e) =>
                setSendAudience(e.target.value as 'all_active' | 'newsletter_only' | 'users_only')
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            >
              <option value="all_active">Todos (activos)</option>
              <option value="newsletter_only">Solo suscriptores del footer</option>
              <option value="users_only">Solo usuarios registrados</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contenido (HTML)</label>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
              placeholder="<p>Hola,</p><p>Te compartimos las últimas novedades...</p>"
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={sending}
            className="w-full py-3 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 disabled:opacity-50"
          >
            {sending ? 'Enviando…' : 'Enviar boletín'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de envíos</h2>
          {campaigns.length === 0 ? (
            <p className="text-gray-500 text-sm">Aún no hay boletines enviados.</p>
          ) : (
            <ul className="space-y-3 max-h-[420px] overflow-y-auto">
              {campaigns.map((c) => (
                <li key={c.id} className="border border-gray-100 rounded-lg p-3 text-sm">
                  <p className="font-semibold text-gray-900">{c.subject}</p>
                  <p className="text-gray-500 mt-1">
                    {c.sentAt ? new Date(c.sentAt).toLocaleString('es') : '—'} ·{' '}
                    {c.successful}/{c.totalRecipients} enviados
                    {c.failed ? ` · ${c.failed} fallidos` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-gray-900">Audiencia ({filtered.length})</h2>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar email, nombre o rol…"
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-72"
          />
        </div>
        {loading ? (
          <p className="p-8 text-center text-gray-500">Cargando…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Nombre</th>
                  <th className="px-4 py-3 font-semibold">Rol</th>
                  <th className="px-4 py-3 font-semibold">Origen</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((row) => (
                  <tr key={row.email} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{row.email}</td>
                    <td className="px-4 py-3 text-gray-600">{row.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{row.role || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{sourceLabel(row.sources)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                          row.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {row.status === 'active' ? 'Activo' : 'Baja'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
