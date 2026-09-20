'use client';

import Link from 'next/link';
import { garageVehicleLabel, type SelectedGarageVehicle } from '@/lib/garage-selected-vehicle';

export function GarageVehicleContextNotice({
  vehicle,
  empty,
}: {
  vehicle?: SelectedGarageVehicle | null;
  empty?: boolean;
}) {
  const label = garageVehicleLabel(vehicle);
  if (!label) return null;
  return (
    <div className="rounded-2xl border border-primary-100 bg-primary-50/70 px-5 py-4 mb-6">
      <p className="font-bold text-slate-900">
        {empty
          ? 'No hay servicios publicados para este vehículo todavía'
          : `Mostrando solo lo relacionado con tu ${label}`}
      </p>
      <p className="text-sm text-slate-600 mt-1">
        Si cambias de carro en Mi garage, estas sugerencias cambian.{' '}
        <Link href="/mi-garage" className="font-bold text-primary-700 hover:underline">
          Cambiar vehículo
        </Link>
      </p>
    </div>
  );
}
