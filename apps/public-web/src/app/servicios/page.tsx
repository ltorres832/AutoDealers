'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { MiGarageDiscoverCta } from '@/components/MiGarageDiscoverCta';
import { GarageVehicleContextNotice } from '@/components/GarageVehicleContextNotice';
import {
  readSelectedGarageVehicle,
  serviciosHrefForVehicle,
  type SelectedGarageVehicle,
} from '@/lib/garage-selected-vehicle';
import { SpecializationFilter } from '@/components/SpecializationFilter';
import { BusinessLogo } from '@/components/BusinessLogo';

type Category = {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
  specialties?: Array<{ slug: string; label: string }>;
  vehicleScopes?: Array<{ slug: string; label: string }>;
};
type Business = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName?: string;
  municipality?: string;
  city?: string;
  mobileService?: boolean;
  verified?: boolean;
  description?: string;
  logoUrl?: string;
};

export default function ServiciosIndexPage() {
  const [enabled, setEnabled] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [mobile, setMobile] = useState(false);
  const [garageVehicle, setGarageVehicle] = useState<SelectedGarageVehicle | null | undefined>(undefined);
  const [fetched, setFetched] = useState(false);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery: SelectedGarageVehicle = {
      id: params.get('vehicleId') || '',
      year: params.get('year') ? Number(params.get('year')) : undefined,
      make: params.get('make') || undefined,
      model: params.get('model') || undefined,
    };
    setGarageVehicle(fromQuery.make || fromQuery.model || fromQuery.year ? fromQuery : readSelectedGarageVehicle());
  }, []);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (category) params.set('category', category);
    if (municipality) params.set('municipality', municipality);
    if (mobile) params.set('mobile', '1');
    if (garageVehicle?.make) params.set('make', garageVehicle.make);
    if (garageVehicle?.model) params.set('model', garageVehicle.model);
    if (garageVehicle?.year) params.set('year', String(garageVehicle.year));
    if (specialties.length) params.set('specialties', specialties.join(','));
    if (scopes.length) params.set('scopes', scopes.join(','));
    return params.toString();
  }, [q, category, municipality, mobile, garageVehicle, specialties, scopes]);

  useEffect(() => {
    if (garageVehicle === undefined) return;
    fetch(`/api/public/servicios${query ? `?${query}` : ''}`)
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled !== false);
        setCategories(data.categories || []);
        setBusinesses(data.businesses || []);
        setFetched(true);
      })
      .catch(() => setEnabled(false));
  }, [query, garageVehicle]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/" />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-slate-900 mb-3">Servicios para tu vehículo</h1>
        <p className="text-slate-600 mb-6">
          Filtra por tipo de trabajo y tipo de auto. Solo aparecen negocios publicados que
          declararon esas especialidades. Un taller de solo frenos no sale si buscas motores.
        </p>
        <GarageVehicleContextNotice
          vehicle={garageVehicle}
          empty={Boolean(fetched && garageVehicle && businesses.length === 0)}
        />
        <div className="mb-8">
          <MiGarageDiscoverCta variant="notice" />
        </div>

        {!enabled ? (
          <p className="text-slate-500">El directorio de servicios no está disponible todavía.</p>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-8">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar negocio"
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                <option value="">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <input
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
                placeholder="Municipio"
                className="rounded-xl border border-slate-200 px-4 py-3"
              />
              <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-3 bg-white">
                <input type="checkbox" checked={mobile} onChange={(e) => setMobile(e.target.checked)} />
                Servicio a domicilio
              </label>
              <SpecializationFilter
                label="Tipo de trabajo"
                options={
                  category
                    ? categories.find((c) => c.slug === category)?.specialties || []
                    : categories.flatMap((c) => c.specialties || []).filter((item, i, all) => all.findIndex((x) => x.slug === item.slug) === i)
                }
                value={specialties}
                onChange={setSpecialties}
              />
              <SpecializationFilter
                label="Tipo de auto"
                options={
                  category
                    ? categories.find((c) => c.slug === category)?.vehicleScopes || []
                    : categories.flatMap((c) => c.vehicleScopes || []).filter((item, i, all) => all.findIndex((x) => x.slug === item.slug) === i)
                }
                value={scopes}
                onChange={setScopes}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={serviciosHrefForVehicle(garageVehicle, cat.slug)}
                  className="bg-white rounded-2xl border border-slate-100 p-4 hover:border-primary-400"
                >
                  <div className="text-xl mb-1">{cat.icon || '🚗'}</div>
                  <div className="font-bold">{cat.name}</div>
                </Link>
              ))}
            </div>

            {businesses.length === 0 ? (
              <p className="text-slate-500">
                {garageVehicle
                  ? 'No hay servicios publicados para este vehículo todavía'
                  : 'Aún no hay negocios publicados con esos filtros.'}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {businesses.map((biz) => (
                  <Link
                    key={`${biz.categorySlug}-${biz.slug}`}
                    href={`/servicios/${biz.categorySlug}/${biz.slug}`}
                    className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-primary-400"
                  >
                    <BusinessLogo name={biz.name} logoUrl={biz.logoUrl} className="w-full h-36 mb-4" />
                    <h2 className="text-xl font-black mb-1">{biz.name}</h2>
                    <p className="text-sm text-slate-500 mb-2">
                      {biz.categoryName} {biz.municipality ? `· ${biz.municipality}` : ''}
                    </p>
                    {biz.description ? (
                      <p className="text-sm text-slate-600 line-clamp-3">{biz.description}</p>
                    ) : null}
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
