'use client';

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type Props = {
  vehicleId: string;
  label: string;
  onClose: () => void;
};

export default function ShareVehicleModal({ vehicleId, label, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [absoluteUrl, setAbsoluteUrl] = useState('');
  const [qrImageUrl, setQrImageUrl] = useState('');
  const [whatsappShareUrl, setWhatsappShareUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete?kind=share`, {});
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Error');
        if (cancelled) return;
        setAbsoluteUrl(json.absoluteUrl || '');
        setQrImageUrl(json.qrImageUrl || '');
        setWhatsappShareUrl(json.whatsappShareUrl || '');
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vehicleId]);

  async function copy() {
    if (!absoluteUrl) return;
    await navigator.clipboard.writeText(absoluteUrl);
  }

  async function openLabel() {
    try {
      const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'daco_label' }),
      });
      const html = await res.text();
      if (!res.ok) throw new Error('No se pudo generar la etiqueta');
      const w = window.open('', '_blank');
      if (w) {
        w.document.write(html);
        w.document.close();
      }
    } catch {
      setError('No se pudo abrir la etiqueta');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
        <div className="flex justify-between items-start gap-3">
          <div>
            <h2 className="font-semibold text-lg">Compartir vehículo</h2>
            <p className="text-sm text-slate-600">{label}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500">
            ✕
          </button>
        </div>
        {loading ? (
          <p className="text-sm text-slate-500">Cargando link…</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <p className="text-xs break-all bg-slate-50 border rounded-lg p-3">{absoluteUrl}</p>
            {qrImageUrl ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrImageUrl} alt="QR" className="w-40 h-40 object-contain" />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copy}
                className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm"
              >
                Copiar link
              </button>
              {whatsappShareUrl ? (
                <a
                  href={whatsappShareUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg border text-sm"
                >
                  WhatsApp
                </a>
              ) : null}
              <a
                href={absoluteUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-2 rounded-lg border text-sm"
              >
                Abrir landing
              </a>
              <button type="button" onClick={openLabel} className="px-3 py-2 rounded-lg border border-orange-200 bg-orange-50 text-orange-900 text-sm font-medium">
                🏷️ Etiqueta DACO
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
