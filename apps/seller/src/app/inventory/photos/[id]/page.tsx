'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  PHOTO_GUIDE_ANGLES,
  DYNAMIC_SCENE_PRESETS,
  type VehiclePhotoSlot,
} from '@autodealers/inventory/client';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';

export default function VehiclePhotoGuidePage() {
  const params = useParams();
  const vehicleId = String(params.id || '');
  const photoGuideEnabled = useFeatureFlag('photo_guide');
  const bgEnabled = useFeatureFlag('bg_remover');
  const scenesEnabled = useFeatureFlag('dynamic_scenes');
  const [slots, setSlots] = useState<VehiclePhotoSlot[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sceneId, setSceneId] = useState('white');

  const load = useCallback(async () => {
    const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete?kind=photos`, {});
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Error');
    setSlots(json.slots || []);
  }, [vehicleId]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Error'));
  }, [load]);

  async function uploadOriginal(angleId: string, file: File) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'vehicle');
      form.append('vehicleId', vehicleId);
      const up = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error || 'No se pudo subir');
      const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'upsert_slot', angleId, originalUrl: upJson.url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setSlots(json.slots || []);
      setMessage('Foto original guardada (no se recorta ni se borra).');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function uploadEdited(angleId: string, file: File) {
    setBusy(true);
    setError('');
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'vehicle');
      form.append('vehicleId', vehicleId);
      const up = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error || 'No se pudo subir');
      const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_edited',
          angleId,
          editedUrl: upJson.url,
          sceneId: scenesEnabled ? sceneId : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setSlots(json.slots || []);
      setMessage('Versión editada guardada. El original sigue intacto.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function autoRemoveBg(angleId: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const res = await fetchWithAuth(`/api/vehicles/${vehicleId}/remove-bg`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ angleId, sceneId }),
      });
      const json = await res.json();
      if (res.ok) {
        setSlots(json.slots || []);
        setMessage('Fondo quitado y escena aplicada (servidor). El original no se tocó.');
        return;
      }

      // Fallback navegador si falta API key en App Hosting
      if (res.status !== 503 && json.code !== 'NO_API_KEY') {
        throw new Error(json.error || 'Error al quitar fondo');
      }

      setMessage('Procesando en el navegador (sin API key de servidor)…');
      const slot = slots.find((s) => s.angleId === angleId);
      const sourceUrl = slot?.originalUrl;
      if (!sourceUrl) throw new Error('Primero sube la foto original');

      const { removeBackgroundClient } = await import('@/lib/client-remove-bg');
      const blob = await removeBackgroundClient(sourceUrl, sceneId);
      const file = new File([blob], `edited-${angleId}.jpg`, { type: 'image/jpeg' });
      const form = new FormData();
      form.append('file', file);
      form.append('type', 'vehicle');
      form.append('vehicleId', vehicleId);
      const up = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' });
      const upJson = await up.json();
      if (!up.ok) throw new Error(upJson.error || 'No se pudo subir la versión editada');

      const save = await fetchWithAuth(`/api/vehicles/${vehicleId}/compete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_edited',
          angleId,
          editedUrl: upJson.url,
          sceneId: scenesEnabled ? sceneId : null,
        }),
      });
      const saveJson = await save.json();
      if (!save.ok) throw new Error(saveJson.error || 'Error al guardar edición');
      setSlots(saveJson.slots || []);
      setMessage('Fondo quitado en el navegador y escena aplicada. El original no se tocó.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  const slotFor = (angleId: string) => slots.find((s) => s.angleId === angleId);

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/inventory" className="text-sm text-slate-600 hover:underline">
            ← Inventario
          </Link>
          <h1 className="text-2xl font-bold mt-1">Guía de fotos</h1>
          <p className="text-sm text-slate-600">
            Sigue los ángulos. El archivo original siempre se conserva; la versión editada es opcional.
          </p>
        </div>
      </div>

      {!photoGuideEnabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm">
          La guía de fotos está desactivada en feature flags. Actívala en Admin → Feature flags (`photo_guide`).
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">{message}</div> : null}

      {bgEnabled || scenesEnabled ? (
        <div className="bg-white border rounded-xl p-4 space-y-2">
          <p className="text-sm font-medium">Escena / fondo (sobre la versión editada)</p>
          <select
            value={sceneId}
            onChange={(e) => setSceneId(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm"
            disabled={!scenesEnabled}
          >
            {DYNAMIC_SCENE_PRESETS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            Sube una versión sin fondo o con fondo aplicado. No reemplaza el original.
          </p>
        </div>
      ) : null}

      <div className="grid md:grid-cols-2 gap-4">
        {PHOTO_GUIDE_ANGLES.map((angle) => {
          const slot = slotFor(angle.id);
          return (
            <div key={angle.id} className="bg-white border rounded-xl p-4 space-y-3">
              <div>
                <p className="font-semibold">{angle.label}</p>
                <p className="text-xs text-slate-500">{angle.hint}</p>
              </div>
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                {slot?.editedUrl || slot?.originalUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={slot.editedUrl || slot.originalUrl}
                    alt={angle.label}
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-slate-400">Sin foto</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <label className="px-3 py-1.5 rounded-lg bg-slate-900 text-white cursor-pointer disabled:opacity-50">
                  Subir original
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void uploadOriginal(angle.id, f);
                      e.target.value = '';
                    }}
                  />
                </label>
                {bgEnabled || scenesEnabled ? (
                  <label className="px-3 py-1.5 rounded-lg border cursor-pointer">
                    Versión editada
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={busy || !slot?.originalUrl}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void uploadEdited(angle.id, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                ) : null}
                {bgEnabled ? (
                  <button
                    type="button"
                    disabled={busy || !slot?.originalUrl}
                    onClick={() => void autoRemoveBg(angle.id)}
                    className="px-3 py-1.5 rounded-lg bg-violet-700 text-white text-sm disabled:opacity-50"
                  >
                    Quitar fondo IA
                  </button>
                ) : null}
              </div>
              {slot?.originalUrl ? (
                <p className="text-[11px] text-slate-400 break-all">Original OK</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
