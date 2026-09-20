'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  DEFAULT_PLATFORM_BRAND_ASSET,
} from '@autodealers/shared/platform-branding-client';
import {
  countPortalFeatures,
  DEALER_FEATURE_GROUPS,
  SELLER_FEATURE_GROUPS,
} from '@/lib/portal-feature-catalog';

export default function FuncionesIndexPage() {
  const [logo, setLogo] = useState(DEFAULT_PLATFORM_BRAND_ASSET);
  const [company, setCompany] = useState('AutoDealersOnline');

  useEffect(() => {
    void fetch('/api/public/platform-branding', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.logo) setLogo(d.logo);
        if (d?.companyName) setCompany(d.companyName);
      })
      .catch(() => undefined);
  }, []);

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logo}
            alt={company}
            className="mx-auto h-16 w-16 rounded-xl object-contain border border-slate-100 bg-slate-50 p-1"
          />
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Funciones de la plataforma</h1>
          <p className="mt-2 text-slate-600">
            Listas reales de módulos del panel Dealer y del panel Vendedor — listas para presentar e
            imprimir / guardar como PDF.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 text-left">
            <Link
              href="/funciones/dealer"
              className="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 hover:border-primary-400 transition"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-700">
                Panel Dealer
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">Funciones del concesionario</p>
              <p className="mt-2 text-sm text-slate-600">
                {countPortalFeatures(DEALER_FEATURE_GROUPS)} ítems del menú, inventario y
                configuración
              </p>
            </Link>
            <Link
              href="/funciones/vendedor"
              className="rounded-xl border-2 border-slate-200 bg-slate-50 p-5 hover:border-slate-400 transition"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                Panel Vendedor
              </p>
              <p className="mt-1 text-xl font-bold text-slate-900">Funciones del vendedor</p>
              <p className="mt-2 text-sm text-slate-600">
                {countPortalFeatures(SELLER_FEATURE_GROUPS)} ítems del menú y configuración
              </p>
            </Link>
          </div>

          <p className="mt-8 text-xs text-slate-400">
            {company} · Solo funciones existentes en el código de las apps
          </p>
        </div>
      </div>
    </div>
  );
}
