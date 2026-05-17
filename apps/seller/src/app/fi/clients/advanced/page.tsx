'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import FIAdvancedClientForm, {
  type FIAdvancedClientFormData,
} from '@/components/FIAdvancedClientForm';

function splitFullName(full: string): { firstName: string; lastName: string } {
  const t = full.trim();
  if (!t) return { firstName: '', lastName: '' };
  const i = t.indexOf(' ');
  if (i === -1) return { firstName: t, lastName: '' };
  return { firstName: t.slice(0, i).trim(), lastName: t.slice(i + 1).trim() };
}

function parseOptionalInt(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : undefined;
}

function parseOptionalFloat(s: string): number | undefined {
  const t = s.trim();
  if (!t) return undefined;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : undefined;
}

function buildTradeInDetails(fd: FIAdvancedClientFormData) {
  if (!fd.hasTradeIn) return undefined;
  return {
    make: fd.tradeInMake || undefined,
    model: fd.tradeInModel || undefined,
    year: fd.tradeInYear.trim() ? parseOptionalInt(fd.tradeInYear) : undefined,
    estimatedValue: fd.tradeInValue > 0 ? fd.tradeInValue : undefined,
    vin: fd.tradeInVin || undefined,
    mileage: fd.tradeInMileage.trim() ? parseOptionalInt(fd.tradeInMileage) : undefined,
    color: fd.tradeInColor || undefined,
    payoffBalance: fd.tradeInPayoff.trim() ? parseOptionalFloat(fd.tradeInPayoff) : undefined,
    lienholder: fd.tradeInLienholder || undefined,
    titleStatus: fd.tradeInTitleStatus || undefined,
    accidentHistory: fd.tradeInAccidentHistory || undefined,
    notes: fd.tradeInNotes || undefined,
  };
}

function buildAddressLine(fd: FIAdvancedClientFormData): string | undefined {
  const parts = [fd.address, fd.city, fd.state, fd.zipCode].filter(Boolean);
  if (parts.length === 0) return undefined;
  return parts.join(', ');
}

function AdvancedFIClientPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /** Resolución opcional de vehículo por API cuando solo viene vehicleId */
  const [vehicleExtras, setVehicleExtras] = useState<Partial<FIAdvancedClientFormData> | null>(null);

  const vehicleIdParam = searchParams.get('vehicleId');

  useEffect(() => {
    const staticMake = searchParams.get('vehicleMake');
    const vid = vehicleIdParam?.trim();

    if (!vid || staticMake) {
      setVehicleExtras({});
      return;
    }

    let cancelled = false;
    fetch(`/api/vehicles?id=${encodeURIComponent(vid)}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const v = data?.vehicle;
        if (v) {
          setVehicleExtras({
            vehicleMake: v.make ?? '',
            vehicleModel: v.model ?? '',
            vehicleYear: v.year != null ? String(v.year) : '',
            vehiclePrice: typeof v.price === 'number' ? v.price : 0,
          });
        } else {
          setVehicleExtras({});
        }
      })
      .catch(() => {
        if (!cancelled) setVehicleExtras({});
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, vehicleIdParam]);

  const initialData = useMemo((): Partial<FIAdvancedClientFormData> => {
    const cn = searchParams.get('customerName') || '';
    const { firstName, lastName } = splitFullName(cn);
    const vy = searchParams.get('vehicleYear');
    const vp = searchParams.get('vehiclePrice');

    const fromParams: Partial<FIAdvancedClientFormData> = {
      firstName,
      lastName,
      phone: searchParams.get('customerPhone') || '',
      email: searchParams.get('customerEmail') || '',
      vehicleId: vehicleIdParam || undefined,
      vehicleMake: searchParams.get('vehicleMake') || '',
      vehicleModel: searchParams.get('vehicleModel') || '',
      vehicleYear: vy || '',
      vehiclePrice: vp ? parseFloat(vp) || 0 : 0,
    };

    if (!vehicleExtras) return fromParams;

    return {
      ...fromParams,
      ...vehicleExtras,
      vehicleId: fromParams.vehicleId ?? vehicleExtras.vehicleId,
    };
  }, [searchParams, vehicleIdParam, vehicleExtras]);

  const formReady = vehicleExtras !== null;

  async function handleComplete(formData: FIAdvancedClientFormData) {
    const name = `${formData.firstName} ${formData.lastName}`.trim();
    const vehicleYear = formData.vehicleYear.trim()
      ? parseInt(formData.vehicleYear, 10)
      : undefined;

    const identification =
      formData.identificationType && formData.identificationNumber
        ? `${formData.identificationType}: ${formData.identificationNumber}`
        : formData.identificationNumber || undefined;

    let response: Response;
    try {
      response = await fetch('/api/fi/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          phone: formData.phone,
          email: formData.email || undefined,
          address: buildAddressLine(formData),
          identification,
          vehicleId: formData.vehicleId || undefined,
          vehicleMake: formData.vehicleMake || undefined,
          vehicleModel: formData.vehicleModel || undefined,
          vehicleYear:
            vehicleYear !== undefined && Number.isFinite(vehicleYear) ? vehicleYear : undefined,
          vehiclePrice: formData.vehiclePrice > 0 ? formData.vehiclePrice : undefined,
          downPayment: formData.downPayment >= 0 ? formData.downPayment : undefined,
          hasTradeIn: formData.hasTradeIn,
          tradeInDetails: buildTradeInDetails(formData),
        }),
      });
    } catch {
      alert('No se pudo conectar. Revisa tu red e intenta de nuevo.');
      throw new Error('network');
    }

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = typeof err.error === 'string' ? err.error : 'Error al crear cliente';
      alert(msg);
      throw new Error(msg);
    }

    const data = await response.json();
    router.push(`/fi/clients/${data.client.id}/request`);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/fi/clients/new" className="text-blue-600 hover:text-blue-700 text-sm">
          ← Formulario corto
        </Link>
        <Link href="/fi" className="text-blue-600 hover:text-blue-700 text-sm">
          F&amp;I
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">Nuevo cliente F&amp;I (avanzado)</h1>
      <p className="text-gray-600 mb-8">
        Flujo guiado con validación. Los datos de trade-in se envían completos al crear el cliente. Puedes abrir esta
        página desde Casos de cliente con los mismos parámetros de URL que el formulario corto.
      </p>

      {!formReady ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
          Cargando datos del vehículo…
        </div>
      ) : (
        <FIAdvancedClientForm key={vehicleIdParam || 'no-vehicle'} initialData={initialData} onComplete={handleComplete} />
      )}
    </div>
  );
}

export default function AdvancedFIClientPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-gray-500">Cargando formulario…</div>
      }
    >
      <AdvancedFIClientPageContent />
    </Suspense>
  );
}
