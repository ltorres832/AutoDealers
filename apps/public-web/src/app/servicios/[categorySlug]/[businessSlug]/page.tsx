'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { MiGarageDiscoverCta } from '@/components/MiGarageDiscoverCta';
import { BusinessLogo } from '@/components/BusinessLogo';
import { BusinessServiceCard } from '@/components/BusinessServiceCard';
import Link from 'next/link';
import { readSelectedGarageVehicle } from '@/lib/garage-selected-vehicle';
import type { PublicAutomotiveBusiness, PublicBusinessService } from '@/lib/business-catalog';

export default function ServicioBusinessPage() {
  const params = useParams<{ categorySlug: string; businessSlug: string }>();
  const categorySlug = String(params.categorySlug || '');
  const businessSlug = String(params.businessSlug || '');
  const [business, setBusiness] = useState<PublicAutomotiveBusiness | null>(null);
  const [services, setServices] = useState<PublicBusinessService[]>([]);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    year: '',
    make: '',
    model: '',
    message: '',
  });

  useEffect(() => {
    fetch(`/api/public/servicios/${encodeURIComponent(categorySlug)}/${encodeURIComponent(businessSlug)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No encontrado');
        setBusiness(data.business);
        setServices(data.services || []);
      })
      .catch((err) => setError(err.message));
    const selected = readSelectedGarageVehicle();
    if (selected) {
      setForm((current) => ({
        ...current,
        year: current.year || (selected.year ? String(selected.year) : ''),
        make: current.make || selected.make || '',
        model: current.model || selected.model || '',
      }));
    }
  }, [categorySlug, businessSlug]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('garageToken') || '' : '';
    const res = await fetch('/api/public/servicios/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: business.id, ...form, token: token || undefined }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo enviar');
      return;
    }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/servicios" backLabel="← Servicios" />
      <main className="max-w-5xl mx-auto px-4 py-12">
        {error && !business ? <p className="text-red-600">{error}</p> : null}
        {business ? (
          <>
            <div className="flex flex-col sm:flex-row gap-5 items-start mb-6">
              <BusinessLogo
                name={business.name}
                logoUrl={business.logoUrl}
                className="w-28 h-28"
                rounded="rounded-2xl"
              />
              <div>
                <p className="text-sm uppercase tracking-widest text-primary-700 font-bold mb-2">
                  {business.categoryName}
                  {business.verified ? ' · Verificado' : ''}
                </p>
                <h1 className="text-4xl font-black text-slate-900 mb-2">{business.name}</h1>
                <p className="text-slate-600 mb-3">
                  {[business.address, business.municipality || business.city].filter(Boolean).join(' · ')}
                  {business.mobileService ? ' · Servicio a domicilio' : ''}
                </p>
                {business.hours ? <p className="text-sm text-slate-600 mb-3">Horario: {business.hours}</p> : null}
                {business.description ? <p className="text-slate-700 whitespace-pre-wrap">{business.description}</p> : null}
              </div>
            </div>
            {business.phone ? (
              <p className="mb-6">
                <a className="text-primary-700 font-bold" href={`tel:${business.phone}`}>
                  {business.phone}
                </a>
              </p>
            ) : null}
            {(business.specialtyLabels?.length || business.vehicleScopeLabels?.length) ? (
              <div className="mb-8 space-y-3">
                {business.specialtyLabels?.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Trabajos</p>
                    <div className="flex flex-wrap gap-1.5">
                      {business.specialtyLabels.map((item) => (
                        <span key={item.slug} className="px-2.5 py-1 rounded-full bg-primary-50 text-primary-800 text-xs font-semibold">
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {business.vehicleScopeLabels?.length ? (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5">Vehículos que atienden</p>
                    <div className="flex flex-wrap gap-1.5">
                      {business.vehicleScopeLabels.map((item) => (
                        <span key={item.slug} className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mb-10">
              <h2 className="text-2xl font-black mb-4">Servicios</h2>
              {services.length > 0 ? (
                <div className="grid grid-cols-1 gap-5">
                  {services.map((svc) => (
                    <BusinessServiceCard
                      key={svc.id}
                      service={svc}
                      detailHref={`/servicios/${categorySlug}/${businessSlug}/${svc.id}`}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-slate-500">Este negocio aún no publicó servicios.</p>
              )}
            </div>

            <div className="mb-8">
              <MiGarageDiscoverCta variant="notice" />
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 p-6 sm:p-8">
              <h2 className="text-2xl font-black mb-4">Pedir cita o cotización</h2>
              {sent ? (
                <div className="space-y-3">
                  <p className="text-green-700 font-medium">
                    Solicitud enviada. El negocio te contactará. Guardamos tu vehículo en Mi garage.
                  </p>
                  <p className="text-sm text-slate-600">
                    Si diste email o teléfono, podrás ver el historial más adelante.{' '}
                    <Link href="/mi-garage" className="font-bold text-primary-700 hover:underline">
                      Ir a Mi garage
                    </Link>
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input required className="rounded-xl border px-4 py-3" placeholder="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input required className="rounded-xl border px-4 py-3" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  <input className="rounded-xl border px-4 py-3" placeholder="Email (opcional)" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <input className="rounded-xl border px-4 py-3" placeholder="Año" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
                  <input className="rounded-xl border px-4 py-3" placeholder="Marca" value={form.make} onChange={(e) => setForm({ ...form, make: e.target.value })} />
                  <input className="rounded-xl border px-4 py-3" placeholder="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
                  <textarea className="md:col-span-2 rounded-xl border px-4 py-3" placeholder="¿Qué necesita tu vehículo?" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                  {error ? <p className="md:col-span-2 text-red-600">{error}</p> : null}
                  <button className="md:col-span-2 rounded-xl bg-primary-600 text-white font-bold py-3 hover:bg-primary-700">
                    Enviar solicitud
                  </button>
                </form>
              )}
            </div>
          </>
        ) : null}
      </main>
      <LandingFooter />
    </div>
  );
}
