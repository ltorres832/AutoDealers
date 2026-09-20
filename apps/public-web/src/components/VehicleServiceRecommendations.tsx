'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { writeSelectedGarageVehicle } from '@/lib/garage-selected-vehicle';
import { BusinessLogo } from '@/components/BusinessLogo';

type Group = {
  categorySlug: string;
  title: string;
  emptyMessage: string;
  businesses: Array<{ slug: string; name: string; categorySlug: string; municipality?: string; logoUrl?: string }>;
};

export default function VehicleServiceRecommendations({
  year,
  make,
  model,
  municipality,
}: {
  year?: number | string;
  make?: string;
  model?: string;
  municipality?: string;
}) {
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    if (!make && !model) return;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('garageToken') || '' : '';
    fetch('/api/public/garage/recognize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, make, model, municipality, source: 'listing', token: token || undefined }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.garage?.accessToken) {
          window.localStorage.setItem('garageToken', data.garage.accessToken);
        }
        if (data?.garage?.selectedVehicleId || make) {
          writeSelectedGarageVehicle({
            id: data?.garage?.selectedVehicleId || '',
            year: year ? Number(year) : undefined,
            make,
            model,
          });
        }
        if (Array.isArray(data?.suggestions?.groups)) {
          setGroups(data.suggestions.groups);
        } else {
          setGroups([]);
        }
      })
      .catch(() => setGroups(null));
  }, [year, make, model, municipality]);

  if (!groups) return null;
  if (!make && !model) return null;

  const label = [year, make, model].filter(Boolean).join(' ');

  return (
    <section className="mt-10 rounded-3xl border border-slate-100 bg-white p-6 sm:p-8">
      <h2 className="text-2xl font-black text-slate-900 mb-2">
        Servicios para tu {label || 'vehículo'}
      </h2>
      <p className="text-slate-600 mb-3">
        Sugerencias de negocios realmente registrados. No hace falta crear una cuenta.
      </p>
      <p className="text-sm text-slate-600 mb-6">
        Guardamos tu vehículo en Mi garage.{' '}
        <Link href="/mi-garage" className="font-bold text-primary-700 hover:underline">
          Ver Mi garage
        </Link>
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map((group) => (
          <div key={group.categorySlug} className="rounded-2xl border border-slate-100 p-5">
            <h3 className="font-bold text-slate-900 mb-3">{group.title}</h3>
            {group.businesses.length === 0 ? (
              <p className="text-sm text-slate-500">{group.emptyMessage}</p>
            ) : (
              <ul className="space-y-2">
                {group.businesses.slice(0, 4).map((biz) => (
                  <li key={biz.slug}>
                    <Link
                      href={`/servicios/${biz.categorySlug}/${biz.slug}`}
                      className="flex items-center gap-2 text-primary-700 font-medium hover:underline"
                    >
                      <BusinessLogo name={biz.name} logoUrl={biz.logoUrl} className="w-8 h-8" />
                      <span>
                        {biz.name}
                        {biz.municipality ? ` · ${biz.municipality}` : ''}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
