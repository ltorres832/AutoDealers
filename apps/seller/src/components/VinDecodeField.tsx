'use client';

import { useRef, useState } from 'react';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { BrowserMultiFormatReader } from '@zxing/library';

type VinResult = {
  make?: string;
  model?: string;
  year?: number;
  bodyType?: string;
  engine?: string;
  fuelType?: string;
  transmission?: string;
  doors?: number;
};

type Props = {
  value: string;
  onChange: (vin: string) => void;
  onDecoded: (result: VinResult) => void;
  enabled?: boolean;
  required?: boolean;
};

export default function VinDecodeField({
  value,
  onChange,
  onDecoded,
  enabled = true,
  required = true,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function decodeVinValue(vinRaw: string) {
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
      if (!res.ok) throw new Error(json.error || 'No se pudo decodificar');
      onDecoded(json.result || {});
      setOk('VIN decodificado. Revisa marca, modelo y año.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  async function decode() {
    await decodeVinValue(value);
  }

  function stopScan() {
    readerRef.current?.reset();
    readerRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }

  async function scanFromCamera() {
    setError('');
    setOk('');
    try {
      stopScan();
      setScanning(true);
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const back =
        devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) || devices[devices.length - 1];
      const deviceId = back?.deviceId;
      const result = await reader.decodeOnceFromVideoDevice(deviceId, videoRef.current!);
      const raw = String(result.getText() || '')
        .toUpperCase()
        .replace(/[^A-HJ-NPR-Z0-9]/g, '');
      stopScan();
      if (raw.length < 11) {
        setError('Código leído pero no parece un VIN. Pégalo manualmente.');
        return;
      }
      const vin = raw.slice(0, 17);
      onChange(vin);
      setOk(`VIN leído: ${vin}`);
      await decodeVinValue(vin);
    } catch (err) {
      stopScan();
      setError(
        err instanceof Error && /NotAllowedError|Permission/i.test(err.name + err.message)
          ? 'Permiso de cámara denegado. Pega el VIN y pulsa Decodificar.'
          : 'No se pudo escanear. Pega el VIN y pulsa Decodificar.'
      );
    }
  }

  if (!enabled) {
    return (
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-800">
          VIN {required ? <span className="text-red-600">*</span> : null}
        </label>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="VIN (17 caracteres)"
          className="w-full border rounded-lg px-3 py-2"
          maxLength={17}
          required={required}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-800">
        VIN (Quick VIN) {required ? <span className="text-red-600">*</span> : null}
      </label>
      <div className="flex flex-wrap gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          placeholder="17 caracteres"
          className="flex-1 min-w-[160px] border rounded-lg px-3 py-2 font-mono"
          maxLength={17}
          required={required}
        />
        <button
          type="button"
          onClick={() => void decode()}
          disabled={busy || value.trim().length < 11}
          className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm disabled:opacity-50"
        >
          {busy ? '…' : 'Decodificar'}
        </button>
        <button
          type="button"
          onClick={() => void scanFromCamera()}
          disabled={busy || scanning}
          className="px-3 py-2 rounded-lg border text-sm"
        >
          {scanning ? 'Escaneando…' : 'Cámara'}
        </button>
        {scanning ? (
          <button type="button" onClick={stopScan} className="px-3 py-2 rounded-lg border text-sm text-red-700">
            Detener
          </button>
        ) : null}
      </div>
      {scanning ? (
        <video ref={videoRef} className="w-full max-w-md rounded-lg border bg-black aspect-video" muted playsInline />
      ) : null}
      <p className="text-xs text-slate-500">
        Escanea el código del cristal/puerta o pega el VIN. Completa marca/modelo/año automáticamente.
      </p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {ok ? <p className="text-xs text-green-700">{ok}</p> : null}
    </div>
  );
}
