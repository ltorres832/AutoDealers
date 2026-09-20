'use client';

import Link from 'next/link';
import SellerPublicCatalogPage from '@/components/SellerPublicCatalogPage';
import { PEDRO_MARTINEZ_DEMO_PROMO } from '@/lib/demo-promo-seller';
import { resolveSellerUrl } from '@autodealers/shared/platform-urls';

const sellerLoginUrl = `${resolveSellerUrl()}/login`;

export default function PedroMartinezDemoPromoPage() {
  const demo = PEDRO_MARTINEZ_DEMO_PROMO;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-4">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-800">
              Cuenta demo en vivo — promoción
            </p>
            <h1 className="mt-1 text-2xl font-black text-slate-900">
              {demo.name} · {demo.businessName}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Esta es la cuenta real de demostración con inventario, reseñas y perfil público.
              Es independiente de la página{' '}
              <Link href="/demo-vendedor" className="font-bold text-primary-700 underline">
                /demo-vendedor
              </Link>{' '}
              (vista estática de marketing).
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Entrar al panel vendedor
            </p>
            <p className="mt-2 text-sm">
              <span className="font-bold text-slate-700">Email:</span> {demo.email}
            </p>
            <p className="text-sm">
              <span className="font-bold text-slate-700">Contraseña:</span> {demo.password}
            </p>
            <a
              href={sellerLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary-700"
            >
              Abrir panel de vendedor
            </a>
          </div>
        </div>
      </div>

      <SellerPublicCatalogPage sellerId={demo.sellerId} standaloneSellerSite />
    </div>
  );
}
