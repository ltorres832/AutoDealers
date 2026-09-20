'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { MiGarageDiscoverCta } from '@/components/MiGarageDiscoverCta';
import { GarageVehicleContextNotice } from '@/components/GarageVehicleContextNotice';
import { readSelectedGarageVehicle, type SelectedGarageVehicle } from '@/lib/garage-selected-vehicle';
import { SpecializationFilter } from '@/components/SpecializationFilter';
import { BusinessLogo } from '@/components/BusinessLogo';

type Business = {
  slug: string;
  name: string;
  categorySlug: string;
  municipality?: string;
  description?: string;
  mobileService?: boolean;
  logoUrl?: string;
};

export default function ServiciosCategoryPage() {
  const params = useParams<{ categorySlug: string }>();
  const categorySlug = String(params?.categorySlug || '');
  const [categoryName, setCategoryName] = useState(categorySlug);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [garageVehicle, setGarageVehicle] = useState<SelectedGarageVehicle | null | undefined>(undefined);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [scopes, setScopes] = useState<string[]>([]);
  const [specialtyOptions, setSpecialtyOptions] = useState<Array<{ slug: string; label: string }>>([]);
  const [scopeOptions, setScopeOptions] = useState<Array<{ slug: string; label: string }>>([]);

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

  useEffect(() => {
    if (!categorySlug || garageVehicle === undefined) return;
    const params = new URLSearchParams({ category: categorySlug });
    if (garageVehicle?.make) params.set('make', garageVehicle.make);
    if (garageVehicle?.model) params.set('model', garageVehicle.model);
    if (garageVehicle?.year) params.set('year', String(garageVehicle.year));
    if (specialties.length) params.set('specialties', specialties.join(','));
    if (scopes.length) params.set('scopes', scopes.join(','));
    fetch(`/api/public/servicios?${params.toString()}`)
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled !== false);
        const cat = (data.categories || []).find((c: any) => c.slug === categorySlug);
        setCategoryName(cat?.name || categorySlug);
        setSpecialtyOptions(cat?.specialties || []);
        setScopeOptions(cat?.vehicleScopes || []);
        setBusinesses(data.businesses || []);
      })
      .catch(() => setEnabled(false));
  }, [categorySlug, garageVehicle, specialties, scopes]);

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/servicios" backLabel="← Servicios" />
      <main className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black text-slate-900 mb-3">{categoryName}</h1>
        <p className="text-slate-600 mb-4">Filtra por tipo de trabajo y tipo de auto. No mostramos negocios que no declararon esa especialidad.</p>
        <div className="grid md:grid-cols-2 gap-3 mb-6">
          <SpecializationFilter label="Tipo de trabajo" options={specialtyOptions} value={specialties} onChange={setSpecialties} />
          <SpecializationFilter label="Tipo de auto" options={scopeOptions} value={scopes} onChange={setScopes} />
        </div>
        <GarageVehicleContextNotice vehicle={garageVehicle} empty={Boolean(garageVehicle && businesses.length === 0)} />
        <div className="mb-8">
          <MiGarageDiscoverCta variant="notice" />
        </div>
        {!enabled ? (
          <p className="text-slate-500">Esta categoría no está disponible.</p>
        ) : businesses.length === 0 ? (
          <p className="text-slate-500">
            {garageVehicle
              ? 'No hay servicios publicados para este vehículo todavía'
              : 'Aún no hay negocios publicados en esta categoría.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {businesses.map((biz) => (
              <Link
                key={biz.slug}
                href={`/servicios/${biz.categorySlug}/${biz.slug}`}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-primary-400"
              >
                <BusinessLogo name={biz.name} logoUrl={biz.logoUrl} className="w-full h-36 mb-4" />
                <h2 className="text-xl font-black mb-1">{biz.name}</h2>
                <p className="text-sm text-slate-500">{biz.municipality || ''}</p>
                {biz.description ? <p className="text-sm text-slate-600 mt-2 line-clamp-3">{biz.description}</p> : null}
              </Link>
            ))}
          </div>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
