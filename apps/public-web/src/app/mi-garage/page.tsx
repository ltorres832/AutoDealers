'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { MI_GARAGE_CAPABILITIES } from '@/lib/mi-garage-copy';
import {
  garageVehicleLabel,
  serviciosHrefForVehicle,
  writeSelectedGarageVehicle,
  type SelectedGarageVehicle,
} from '@/lib/garage-selected-vehicle';
import { buildPublicVehicleDetailHref } from '@/lib/public-vehicle-detail-href';
import { BusinessLogo } from '@/components/BusinessLogo';

type GarageVehicle = SelectedGarageVehicle & {
  mileage?: number;
  plate?: string;
  color?: string;
  source?: string;
};

type RelatedListing = {
  id: string;
  tenantId?: string;
  year?: number;
  make?: string;
  model?: string;
  price?: number;
};

export default function MiGaragePage() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [related, setRelated] = useState<RelatedListing[]>([]);
  const [relatedLoaded, setRelatedLoaded] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem('garageToken') || '' : '';
    const fromUrl = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') || '' : '';
    setToken(fromUrl || stored);
  }, []);

  useEffect(() => {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    fetch(`/api/public/garage${query}`, { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          // Redirigir a login si no está autenticado
          if (typeof window !== 'undefined') {
            window.location.href = '/login?redirect=/mi-garage';
          }
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (!json) return;
        setData(json);
        if (json?.garage?.accessToken) {
          window.localStorage.setItem('garageToken', json.garage.accessToken);
        }
        if (json?.selectedVehicle) {
          writeSelectedGarageVehicle(json.selectedVehicle);
        }
      })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [token]);

  const authenticated = data?.authenticated === true;
  const vehicles: GarageVehicle[] = data?.garage?.vehicles || [];
  const selectedId = data?.selectedVehicle?.id || data?.garage?.selectedVehicleId || vehicles[0]?.id || '';
  const selectedVehicle = useMemo(
    () => vehicles.find((v) => v.id === selectedId) || data?.selectedVehicle || null,
    [vehicles, selectedId, data?.selectedVehicle]
  );
  const suggestionGroups = data?.suggestions?.groups || [];
  const selectedLabel = garageVehicleLabel(selectedVehicle);

  useEffect(() => {
    if (!selectedVehicle?.make) {
      setRelated([]);
      setRelatedLoaded(true);
      return;
    }
    setRelatedLoaded(false);
    const params = new URLSearchParams();
    params.set('make', selectedVehicle.make);
    if (selectedVehicle.model) params.set('model', selectedVehicle.model);
    params.set('limit', '8');
    fetch(`/api/public/vehicles?${params.toString()}`, { cache: 'no-store' })
      .then((res) => res.json())
      .then((json) => {
        const list = Array.isArray(json?.vehicles) ? json.vehicles : [];
        setRelated(list.slice(0, 8));
      })
      .catch(() => setRelated([]))
      .finally(() => setRelatedLoaded(true));
  }, [selectedVehicle?.id, selectedVehicle?.make, selectedVehicle?.model, selectedVehicle?.year]);

  async function selectVehicle(vehicleId: string) {
    if (!vehicleId || vehicleId === selectedId) return;
    setSwitching(true);
    try {
      const res = await fetch('/api/public/garage/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, vehicleId }),
      });
      const json = await res.json();
      if (res.ok) {
        setData(json);
        if (json?.garage?.accessToken) {
          window.localStorage.setItem('garageToken', json.garage.accessToken);
        }
        if (json?.selectedVehicle) {
          writeSelectedGarageVehicle(json.selectedVehicle);
        }
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/" />
      <main className="max-w-4xl mx-auto px-4 py-12">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 mb-2">
          Para clientes
        </p>
        <h1 className="text-4xl font-black mb-3">Mi garage</h1>
        <p className="text-slate-600 mb-6 max-w-2xl">
          Agrega tu vehículo a mano. Si tienes varios, elige uno: talleres, gomeras y piezas se
          muestran solo para ese carro. No es obligatorio crear cuenta.
        </p>

        <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 mb-8" aria-labelledby="garage-para-que">
          <h2 id="garage-para-que" className="text-lg font-bold text-slate-900 mb-4">
            Qué puedes hacer aquí
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {MI_GARAGE_CAPABILITIES.map((item) => (
              <li key={item.title}>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="text-sm text-slate-600 mt-1">{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

        {!authenticated ? (
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 mb-3">
              <Link
                href="/mi-garage/agregar"
                className="inline-flex items-center rounded-xl bg-primary-600 text-white font-bold px-5 py-3 hover:bg-primary-700"
              >
                Agregar vehículo
              </Link>
              <Link
                href="/mi-garage/crear-cuenta"
                className="inline-flex items-center rounded-xl border-2 border-primary-100 text-primary-700 font-bold px-5 py-3 hover:border-primary-600"
              >
                Crear cuenta (opcional)
              </Link>
              <Link
                href="/login?redirect=/mi-garage"
                className="inline-flex items-center rounded-xl border-2 border-slate-200 text-slate-700 font-bold px-5 py-3 hover:border-primary-600"
              >
                Ya tengo cuenta
              </Link>
            </div>
            <p className="text-sm text-slate-500">
              Sin cuenta también funciona: usamos el email o teléfono de tu consulta y un enlace en
              este dispositivo.
            </p>
          </div>
        ) : (
          <div className="mb-8 flex flex-wrap gap-3 items-center">
            <Link
              href="/mi-garage/agregar"
              className="inline-flex items-center rounded-xl bg-primary-600 text-white font-bold px-5 py-3 hover:bg-primary-700"
            >
              Agregar vehículo
            </Link>
            <p className="text-sm text-slate-500">Sesión iniciada. Tus vehículos quedan en esta cuenta.</p>
          </div>
        )}

        {!loaded ? (
          <p className="text-slate-500">Cargando…</p>
        ) : !data?.garage ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Todavía no hay un vehículo aquí</h2>
            <p className="text-slate-600 mb-4">
              Agrégalo a mano con año, marca y modelo para reconocer servicios. También se crea si
              preguntas por un anuncio o pides una cita.
            </p>
            <p className="text-sm text-slate-500 mb-5">Siguiente paso: agrega tu vehículo o mira anuncios.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/mi-garage/agregar"
                className="inline-flex items-center rounded-xl bg-primary-600 text-white font-bold px-4 py-2.5 hover:bg-primary-700"
              >
                Agregar vehículo
              </Link>
              <Link
                href="/search"
                className="inline-flex items-center rounded-xl border-2 border-primary-100 text-primary-700 font-bold px-4 py-2.5 hover:border-primary-600"
              >
                Ver anuncios
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mb-8">
              <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-xl font-bold">Tus vehículos</h2>
                  <p className="text-sm text-slate-600">
                    El seleccionado es el que usa las sugerencias. Puedes tener varios.
                  </p>
                </div>
                <Link href="/mi-garage/agregar" className="text-sm font-bold text-primary-700 hover:underline">
                  Agregar otro
                </Link>
              </div>
              {vehicles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
                  <p className="text-slate-600">
                    Este garage aún no tiene un vehículo. Agrégalo a mano para ver talleres y piezas.
                  </p>
                  <Link
                    href="/mi-garage/agregar"
                    className="inline-flex mt-4 text-sm font-bold text-primary-700 hover:underline"
                  >
                    Agregar vehículo
                  </Link>
                </div>
              ) : (
                <ul className="space-y-2">
                  {vehicles.map((v) => {
                    const label = garageVehicleLabel(v) || 'Vehículo';
                    const checked = v.id === selectedId;
                    return (
                      <li key={v.id}>
                        <label
                          className={`flex items-start gap-3 bg-white rounded-xl border p-4 cursor-pointer ${
                            checked ? 'border-primary-500 ring-1 ring-primary-200' : 'border-slate-200'
                          }`}
                        >
                          <input
                            type="radio"
                            name="selectedVehicle"
                            checked={checked}
                            disabled={switching}
                            onChange={() => selectVehicle(v.id)}
                            className="mt-1"
                          />
                          <span>
                            <span className="font-bold text-slate-900 block">{label}</span>
                            <span className="text-sm text-slate-500">
                              {[
                                v.mileage != null ? `${Number(v.mileage).toLocaleString()} mi` : '',
                                v.color,
                                v.plate ? `Tablilla ${v.plate}` : '',
                                checked ? 'Seleccionado' : '',
                              ]
                                .filter(Boolean)
                                .join(' · ')}
                            </span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-bold mb-2">Recordatorios</h2>
              {vehicles.length === 0 ? (
                <p className="text-slate-600">
                  Cuando se guarde un vehículo, programamos avisos de seguro, inspección, marbete y
                  rotación de gomas.
                </p>
              ) : (
                <p className="text-slate-600 mb-3">
                  {selectedLabel
                    ? `Los avisos de ${selectedLabel} usan las fechas que guardaste o plazos típicos.`
                    : 'Con un vehículo guardado, te recordamos estas fechas.'}
                </p>
              )}
              <ul className="text-sm text-slate-700 space-y-1.5">
                <li>Seguro</li>
                <li>Inspección vehicular</li>
                <li>Marbete</li>
                <li>Rotación de gomas (unos 6 meses)</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-bold mb-2">
                {selectedLabel ? `Sugerencias para tu ${selectedLabel}` : 'Sugerencias de negocios'}
              </h2>
              <p className="text-sm text-slate-600 mb-4">
                Solo negocios publicados en AutoDealers, filtrados para el vehículo seleccionado. Si
                una categoría está vacía, es que aún no hay ninguno registrado para ese carro.
              </p>
              {switching ? <p className="text-sm text-slate-500 mb-3">Actualizando sugerencias…</p> : null}
              {suggestionGroups.length === 0 ? (
                <p className="text-slate-500">
                  {selectedLabel
                    ? 'No hay servicios publicados para este vehículo todavía'
                    : 'Aún no hay sugerencias. Agrega un vehículo para ver talleres y gomeras registrados.'}
                </p>
              ) : (
                suggestionGroups.map((group: any) => (
                  <div key={group.categorySlug} className="mb-6">
                    <h3 className="font-bold mb-2">{group.title}</h3>
                    {group.businesses?.length ? (
                      <ul className="space-y-1">
                        {group.businesses.map((biz: any) => (
                          <li key={biz.slug}>
                            <Link
                              className="flex items-center gap-2 text-primary-700"
                              href={`/servicios/${biz.categorySlug}/${biz.slug}`}
                            >
                              <BusinessLogo name={biz.name} logoUrl={biz.logoUrl} className="w-8 h-8" />
                              {biz.name}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {group.emptyMessage || 'No hay servicios publicados para este vehículo todavía'}
                      </p>
                    )}
                  </div>
                ))
              )}
              {selectedVehicle ? (
                <Link
                  href={serviciosHrefForVehicle(selectedVehicle)}
                  className="inline-flex items-center rounded-xl border-2 border-primary-100 text-primary-700 font-bold px-4 py-2.5 hover:border-primary-600"
                >
                  Ver servicios de este vehículo
                </Link>
              ) : null}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-2">Anuncios y piezas relacionadas</h2>
              <p className="text-sm text-slate-600 mb-4">
                Inventario publicado con la misma marca y modelo. No inventamos compatibilidad.
              </p>
              {!relatedLoaded ? (
                <p className="text-slate-500">Buscando anuncios de este vehículo…</p>
              ) : related.length === 0 ? (
                <p className="text-slate-500">
                  No hay anuncios publicados para este vehículo todavía
                </p>
              ) : (
                <ul className="space-y-2">
                  {related.map((item) => (
                    <li key={item.id} className="bg-white rounded-xl border border-slate-200 p-4">
                      <Link
                        href={
                          item.tenantId
                            ? buildPublicVehicleDetailHref({
                                vehicleId: item.id,
                                tenantId: item.tenantId,
                                source: 'marketplace',
                              })
                            : '/search'
                        }
                        className="font-semibold text-primary-700 hover:underline"
                      >
                        {garageVehicleLabel(item) || 'Vehículo'}
                        {item.price != null ? ` · $${Number(item.price).toLocaleString()}` : ''}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
