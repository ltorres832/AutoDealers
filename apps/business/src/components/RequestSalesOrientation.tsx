'use client';

import { useEffect, useState } from 'react';

export function RequestSalesOrientation() {
  const [assigned, setAssigned] = useState<boolean | null>(null);
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/business/sales-orientation', { credentials: 'include' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!cancelled) setAssigned(res.ok && json.assigned === true);
      })
      .catch(() => {
        if (!cancelled) setAssigned(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (assigned !== true) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      const res = await fetch('/api/business/sales-orientation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'setup', scheduledAt, notes }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'No se pudo pedir la cita');
      setMsg('Cita enviada al empleado de ventas.');
      setNotes('');
    } catch (error) {
      setErr(error instanceof Error ? error.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border p-4 mb-6 space-y-2">
      <h2 className="font-semibold">Pedir cita de configuración</h2>
      <p className="text-xs text-slate-500">
        Solo el dueño de la membresía pide la configuración. La orientación la agenda el empleado.
      </p>
      {err && <p className="text-sm text-red-600">{err}</p>}
      {msg && <p className="text-sm text-green-700">{msg}</p>}
      <div className="grid md:grid-cols-2 gap-2">
        <input
          required
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        />
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notas"
          className="border rounded-lg px-3 py-2 text-sm"
        />
      </div>
      <button disabled={busy} className="text-sm bg-slate-900 text-white px-3 py-2 rounded-lg disabled:opacity-60">
        Pedir cita
      </button>
    </form>
  );
}
