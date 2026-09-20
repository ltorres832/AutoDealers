'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { normalizeVin, isValidVinFormat } from '@autodealers/core/vin';
import { buildPublicVehicleDetailHref } from '@/lib/public-vehicle-detail-href';

type VinHit = {
  id: string;
  tenantId: string;
  make?: string;
  model?: string;
  year?: number;
  price?: number;
  mileage?: number;
  photos?: string[];
  tenantName?: string;
  sellerId?: string;
  href?: string;
};

type Props = {
  /** Compacto para hero; `standalone` para página dedicada */
  variant?: 'hero' | 'standalone';
  className?: string;
};

function sanitizeVinInput(raw: string): string {
  return normalizeVin(raw).replace(/[^A-HJ-NPR-Z0-9]/g, '').slice(0, 17);
}

export default function VinPlatformSearch({ variant = 'hero', className = '' }: Props) {
  const router = useRouter();
  const [vin, setVin] = useState('');
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState('');
  const [hits, setHits] = useState<VinHit[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<{ reset: () => void } | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  function openHit(hit: VinHit) {
    const href =
      hit.href ||
      buildPublicVehicleDetailHref({
        vehicleId: hit.id,
        tenantId: hit.tenantId,
        sellerId: hit.sellerId,
        source: 'marketplace',
      });
    router.push(href);
  }

  async function lookup(vinRaw: string) {
    const cleaned = sanitizeVinInput(vinRaw);
    setVin(cleaned);
    setError('');
    setHits([]);
    if (!isValidVinFormat(cleaned)) {
      setError('Ingresa un VIN válido de 17 caracteres.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(
        `/api/public/vehicles/by-vin?vin=${encodeURIComponent(cleaned)}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo buscar el VIN');
      }
      const list = (data.vehicles || []) as VinHit[];
      if (list.length === 0) {
        setError('No hay vehículos con ese VIN publicados en la plataforma.');
        return;
      }
      if (list.length === 1) {
        openHit(list[0]);
        return;
      }
      setHits(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al buscar');
    } finally {
      setBusy(false);
    }
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
    setHits([]);
    try {
      stopScan();
      setScanning(true);
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      const listDevices =
        (
          BrowserMultiFormatReader as unknown as {
            listVideoInputDevices?: () => Promise<Array<{ deviceId: string; label: string }>>;
          }
        ).listVideoInputDevices ??
        (async () =>
          (await navigator.mediaDevices.enumerateDevices()).filter(
            (d) => d.kind === 'videoinput'
          ));
      const devices = await listDevices();
      const back =
        devices.find((d) => /back|rear|environment|trasera/i.test(d.label)) ||
        devices[devices.length - 1];
      const result = await reader.decodeOnceFromVideoDevice(
        back?.deviceId,
        videoRef.current!
      );
      const raw = sanitizeVinInput(String(result.getText() || ''));
      stopScan();
      if (raw.length < 11) {
        setError('Código leído pero no parece un VIN. Pégalo manualmente.');
        return;
      }
      await lookup(raw);
    } catch (err) {
      stopScan();
      setError(
        err instanceof Error && /NotAllowedError|Permission/i.test(err.name + err.message)
          ? 'Permiso de cámara denegado. Pega el VIN y pulsa Buscar.'
          : 'No se pudo escanear. Pega el VIN y pulsa Buscar.'
      );
    }
  }

  const shell =
    variant === 'hero'
      ? ''
      : 'bg-white rounded-2xl border border-gray-200 p-6 shadow-sm';

  return (
    <div className={`${shell} ${className}`}>
      {variant === 'standalone' && !className.includes('!p-0') ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
          <div>
            <p className="text-sm font-bold text-gray-900">Buscar por VIN</p>
            <p className="text-xs text-gray-500">
              Escanea o pega el VIN para ver si el vehículo está en AutoDealers
            </p>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-3">
          Escanea el código o pega el VIN de 17 caracteres para abrir la ficha del vehículo en la
          plataforma.
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={vin}
          onChange={(e) => setVin(sanitizeVinInput(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void lookup(vin);
            }
          }}
          placeholder="VIN de 17 caracteres"
          maxLength={17}
          className="flex-1 h-12 px-4 font-mono text-sm bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-primary-600 text-gray-900 uppercase tracking-wider"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void lookup(vin)}
            disabled={busy || vin.length < 11}
            className="flex-1 sm:flex-none h-12 px-5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm disabled:opacity-50"
          >
            {busy ? 'Buscando…' : 'Buscar VIN'}
          </button>
          <button
            type="button"
            onClick={() => void scanFromCamera()}
            disabled={busy || scanning}
            className="h-12 px-4 rounded-xl border-2 border-gray-200 hover:border-primary-400 text-gray-700 font-semibold text-sm disabled:opacity-50"
          >
            {scanning ? 'Escaneando…' : 'Cámara'}
          </button>
          {scanning ? (
            <button
              type="button"
              onClick={stopScan}
              className="h-12 px-3 rounded-xl border border-red-200 text-red-700 text-sm font-medium"
            >
              Detener
            </button>
          ) : null}
        </div>
      </div>

      {scanning ? (
        <video
          ref={videoRef}
          className="mt-3 w-full max-w-md rounded-xl border bg-black aspect-video"
          muted
          playsInline
        />
      ) : null}

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {hits.length > 1 ? (
        <ul className="mt-4 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            {hits.length} vehículos con este VIN:
          </p>
          {hits.map((hit) => {
            const title = [hit.year, hit.make, hit.model].filter(Boolean).join(' ') || 'Vehículo';
            const photo = hit.photos?.[0];
            return (
              <li key={`${hit.tenantId}-${hit.id}`}>
                <button
                  type="button"
                  onClick={() => openHit(hit)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary-400 hover:bg-primary-50/40 text-left transition-colors"
                >
                  <div className="w-16 h-12 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                    {photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{title}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {hit.tenantName || hit.tenantId}
                      {typeof hit.price === 'number'
                        ? ` · $${hit.price.toLocaleString('en-US')}`
                        : ''}
                    </p>
                  </div>
                  <span className="text-primary-600 text-sm font-semibold shrink-0">Ver →</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
