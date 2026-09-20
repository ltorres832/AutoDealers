'use client';

import Link from 'next/link';
import { MI_GARAGE_CAPABILITIES } from '@/lib/mi-garage-copy';

type MiGarageDiscoverCtaProps = {
  /** Banner amplio (inicio) o aviso compacto (servicios y confirmaciones) */
  variant?: 'banner' | 'notice';
};

function CapabilityList({ compact }: { compact?: boolean }) {
  return (
    <ul className={`text-slate-700 ${compact ? 'text-sm space-y-1.5' : 'space-y-2'}`}>
      {MI_GARAGE_CAPABILITIES.map((item) => (
        <li key={item.title} className="flex gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
          <span>{item.short}</span>
        </li>
      ))}
    </ul>
  );
}

export function MiGarageDiscoverCta({ variant = 'banner' }: MiGarageDiscoverCtaProps) {
  if (variant === 'notice') {
    return (
      <aside className="rounded-2xl border border-primary-100 bg-primary-50/70 px-5 py-4">
        <p className="font-bold text-slate-900 mb-1">Mi garage</p>
        <p className="text-sm text-slate-600 mb-3">
          Un espacio opcional para tu vehículo. Nadie te obliga a usarlo ni a crear cuenta.
        </p>
        <CapabilityList compact />
        <div className="flex flex-wrap gap-3 mt-4">
          <Link href="/mi-garage" className="text-sm font-bold text-primary-700 hover:underline">
            Ir a Mi garage
          </Link>
          <Link
            href="/mi-garage/crear-cuenta"
            className="text-sm font-medium text-slate-600 hover:text-primary-700 hover:underline"
          >
            Crear cuenta (opcional)
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <section className="py-10 bg-white border-t border-slate-100" aria-labelledby="mi-garage-cta">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-primary-100 bg-primary-50/60 px-6 py-8 sm:px-10 sm:py-9 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="max-w-2xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary-700 mb-2">
              Para clientes
            </p>
            <h2 id="mi-garage-cta" className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
              Mi garage
            </h2>
            <p className="text-slate-600 font-medium mb-4">
              Un espacio opcional para tu vehículo. Nadie te obliga a usarlo ni a crear cuenta.
            </p>
            <CapabilityList />
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/mi-garage"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 text-white font-bold px-5 py-3 hover:bg-primary-700"
            >
              Ir a Mi garage
            </Link>
            <Link
              href="/mi-garage/crear-cuenta"
              className="inline-flex items-center justify-center rounded-xl border-2 border-primary-200 text-primary-800 font-bold px-5 py-3 hover:border-primary-600"
            >
              Crear cuenta (opcional)
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
