'use client';

import Link from 'next/link';
import { CARIBE_MOTORS_DEMO_PROMO } from '@/lib/demo-promo-dealer';
import { resolveDealerUrl } from '@autodealers/shared/platform-urls';

const dealerLoginUrl = `${resolveDealerUrl()}/login`;

export default function CaribeMotorsDemoPromoClient() {
  const demo = CARIBE_MOTORS_DEMO_PROMO;
  const ready = Boolean(demo.dealerId) && !String(demo.dealerId).startsWith('PLACEHOLDER');

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
              Cuenta real de demostración de concesionario con inventario y equipo.
              Independiente de la página{' '}
              <Link href="/demo-dealer" className="font-bold text-primary-700 underline">
                /demo-dealer
              </Link>{' '}
              (vista estática de marketing).
            </p>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">
              Entrar al panel dealer
            </p>
            <p className="mt-2 text-sm">
              <span className="font-bold text-slate-700">Email:</span> {demo.email}
            </p>
            <p className="text-sm">
              <span className="font-bold text-slate-700">Contraseña:</span> {demo.password}
            </p>
            <a
              href={dealerLoginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-primary-700"
            >
              Abrir panel de concesionario
            </a>
          </div>
        </div>
      </div>

      {!ready ? (
        <div className="mx-auto max-w-xl px-4 py-20 text-center text-slate-600">
          <p className="text-lg font-semibold text-slate-900">Demo dealer pendiente de seed</p>
          <p className="mt-2 text-sm">
            Ejecuta <code className="rounded bg-slate-100 px-1">node scripts/seed-demo-dealer.cjs</code> para
            crear la cuenta.
          </p>
        </div>
      ) : (
        <iframe
          title={`${demo.businessName} — página pública`}
          src={`/dealer/${demo.dealerId}`}
          className="min-h-[calc(100vh-8rem)] w-full border-0 bg-white"
        />
      )}
    </div>
  );
}
