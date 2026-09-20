'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { GarageVehicleForm, type GarageVehicleFormValues } from '@/components/GarageVehicleForm';
import { writeSelectedGarageVehicle } from '@/lib/garage-selected-vehicle';

export default function AgregarVehiculoGaragePage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem('garageToken') || '';
    setToken(stored);
    fetch(`/api/public/garage${stored ? `?token=${encodeURIComponent(stored)}` : ''}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        setAuthenticated(data?.authenticated === true);
        if (data?.garage?.accessToken) {
          window.localStorage.setItem('garageToken', data.garage.accessToken);
          setToken(data.garage.accessToken);
        }
      })
      .catch(() => undefined);
  }, []);

  async function handleSubmit(values: GarageVehicleFormValues) {
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/public/garage/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token,
          year: values.year,
          make: values.make,
          model: values.model,
          trim: values.trim || undefined,
          mileage: values.mileage || undefined,
          vin: values.vin || undefined,
          plate: values.plate || undefined,
          color: values.color || undefined,
          notes: values.notes || undefined,
          email: values.email || undefined,
          phone: values.phone || undefined,
          insuranceDueAt: values.insuranceDueAt || undefined,
          inspectionDueAt: values.inspectionDueAt || undefined,
          marbeteDueAt: values.marbeteDueAt || undefined,
          lastTireRotationAt: values.lastTireRotationAt || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo guardar el vehículo');
        setSubmitting(false);
        return;
      }
      if (data?.garage?.accessToken) {
        window.localStorage.setItem('garageToken', data.garage.accessToken);
      }
      if (data?.selectedVehicle) {
        writeSelectedGarageVehicle(data.selectedVehicle);
      }
      router.push('/mi-garage');
    } catch {
      setError('No se pudo guardar el vehículo. Inténtalo de nuevo.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/mi-garage" backLabel="← Mi garage" />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 mb-2">
          Para clientes
        </p>
        <h1 className="text-4xl font-black mb-3">Agregar vehículo</h1>
        <p className="text-slate-600 mb-8">
          Lo guardamos en Mi garage y lo dejamos seleccionado para sugerirte talleres, gomeras y
          piezas de ese carro. No te enviamos a un panel de negocio.
        </p>
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <GarageVehicleForm
            authenticated={authenticated}
            askContact={!authenticated && !token}
            submitting={submitting}
            error={error}
            onSubmit={handleSubmit}
          />
        </div>
        <p className="text-sm text-slate-500 mt-6">
          <Link href="/mi-garage" className="font-bold text-primary-700 hover:underline">
            Volver a Mi garage
          </Link>
        </p>
      </main>
      <LandingFooter />
    </div>
  );
}
