'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { startVinCameraScan, VIN_SCAN_TIP, VIN_TEXT_REGION, type VinCameraScanHandle, type VinScanMode } from '@autodealers/core/vin-camera-scan';

import type { VinDecodeResult as VinResult } from '@autodealers/shared/vehicle-equipment';

type Props = {
  value: string;
  onChange: (vin: string) => void;
  onDecoded: (result: VinResult) => void;
  enabled?: boolean;
  required?: boolean;
};

export default function VinDecodeField({ value, onChange, onDecoded, enabled = true, required = true }: Props) {
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [scanMode, setScanMode] = useState<VinScanMode>('text');
  const [scanStatus, setScanStatus] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scanRef = useRef<VinCameraScanHandle | null>(null);
  const callbacksRef = useRef({ onChange, decodeVinValue });
  const requestId = useRef(0);
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { requestId.current++; if (lookupTimer.current) clearTimeout(lookupTimer.current); }, []);

  useEffect(() => {
    callbacksRef.current = { onChange, decodeVinValue };
  });

  useEffect(() => {
    if (!scanning || !enabled || !videoRef.current) return;
    const handle = startVinCameraScan({
      video: videoRef.current,
      mode: scanMode,
      onStatus: setScanStatus,
      onDetected: (vin) => {
        setScanning(false);
        setScanStatus('');
        callbacksRef.current.onChange(vin);
        void callbacksRef.current.decodeVinValue(vin);
      },
      onTimeout: () => {
        setScanning(false);
        setScanStatus('');
        setError(scanMode === 'text' ? VIN_SCAN_TIP : 'No se detectó un código de barras con VIN. Acerca la etiqueta o cambia a Letras y números.');
      },
      onError: (message) => {
        setScanning(false);
        setScanStatus('');
        setError(message);
      },
    });
    scanRef.current = handle;
    return () => {
      handle.stop();
      if (scanRef.current === handle) scanRef.current = null;
    };
  }, [scanning, scanMode, enabled]);

  async function decodeVinValue(vinRaw: string) {
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    const currentRequest = ++requestId.current;
    setBusy(true);
    setError('');
    setOk('');
    try {
      const res = await fetchWithAuth('/api/vehicles/decode-vin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vin: vinRaw }),
      });
      const json = await res.json();
      if (currentRequest !== requestId.current) return;
      if (!res.ok) throw new Error(json.error || 'No se pudo decodificar');
      onDecoded({ ...(json.result || {}), vin: json.vin || vinRaw.trim().toUpperCase() });
      // Optional: expose grouped specifications to parent via onDecoded as well
      // Parent can read `specificationsRaw` or `groupedSpecifications` from result
      setOk('Ficha del VIN cargada. Revisa el equipamiento y completa los datos pendientes.');
      if (json.result?.warnings?.length) setError(json.result.warnings.join(' '));
    } catch (err) {
      if (currentRequest === requestId.current) setError(err instanceof Error ? err.message : 'Error');
    } finally {
      if (currentRequest === requestId.current) setBusy(false);
    }
  }

  function changeVinInput(raw: string) {
    const vin = raw.toUpperCase().replace(/[\s-]/g, '').slice(0, 17);
    onChange(vin);
    setOk(''); setError('');
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    if (enabled && /^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) {
      lookupTimer.current = setTimeout(() => void callbacksRef.current.decodeVinValue(vin), 500);
    }
  }

  function stopScan() {
    scanRef.current?.stop();
    scanRef.current = null;
    setScanning(false);
    setScanStatus('');
  }

  function scanFromCamera() {
    setError('');
    setOk('');
    setScanStatus('Abriendo cámara…');
    setScanning(true);
  }

  if (!enabled) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-800">
          VIN {required ? <span className="text-red-600">*</span> : null}
        </label>
        <input disabled={busy} value={value} onChange={(e) => changeVinInput(e.target.value)} placeholder="VIN (17 caracteres)" className="w-full border rounded-lg px-3 py-2" maxLength={32} required={required} />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-800">
        VIN (Quick VIN) {required ? <span className="text-red-600">*</span> : null}
      </label>
      <div className="flex flex-wrap gap-2">
        <input disabled={busy} value={value} onChange={(e) => changeVinInput(e.target.value)} placeholder="17 caracteres" className="flex-1 min-w-[160px] border rounded-lg px-3 py-2 font-mono" maxLength={32} required={required} />
        <button type="button" onClick={() => void decodeVinValue(value)} disabled={busy || scanning || value.trim().length !== 17} className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50">
          {busy ? '…' : 'Decodificar'}
        </button>
        <button type="button" onClick={scanFromCamera} disabled={busy || scanning} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">
          {scanning ? 'Escaneando…' : 'Cámara'}
        </button>
        {scanning ? <button type="button" onClick={stopScan} className="px-3 py-2 rounded-lg border text-sm text-red-700">Detener</button> : null}
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        Leer con cámara:
        <select aria-label="Tipo de lectura del VIN" value={scanMode} onChange={(event) => setScanMode(event.target.value as VinScanMode)} disabled={busy} className="rounded border px-2 py-1">
          <option value="text">Letras y números</option>
          <option value="barcode">Código de barras</option>
        </select>
      </label>
      {scanning ? (
        <div className="relative w-full max-w-md overflow-hidden rounded-lg border bg-black">
          <video ref={videoRef} className="block w-full" muted playsInline autoPlay />
          {scanMode === 'text' ? (
            <div aria-hidden="true" className="pointer-events-none absolute rounded border-2 border-emerald-400"
              style={{ left: VIN_TEXT_REGION.x * 100 + '%', top: VIN_TEXT_REGION.y * 100 + '%', width: VIN_TEXT_REGION.width * 100 + '%', height: VIN_TEXT_REGION.height * 100 + '%' }} />
          ) : null}
        </div>
      ) : null}
      {scanning && scanStatus ? <p role="status" className="text-xs text-slate-600">{scanStatus}</p> : null}
      <p className="text-xs text-slate-500">
        Apunta a los 17 caracteres del VIN dentro del recuadro. La lectura completa marca, modelo y año automáticamente. Si usas la etiqueta, puedes elegir Código de barras.
      </p>
      {error ? <p role="alert" className="text-xs text-red-600">{error}</p> : null}
      {ok ? <p role="status" className="text-xs text-green-700">{ok}</p> : null}
    </div>
  );
}
