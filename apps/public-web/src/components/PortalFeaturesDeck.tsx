'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  DEFAULT_PLATFORM_BRAND_ASSET,
  type PlatformBrandingParsed,
} from '@autodealers/shared/platform-branding-client';
import {
  countPortalFeatures,
  featuresToCsv,
  type PortalFeatureGroup,
} from '@/lib/portal-feature-catalog';

type Props = {
  audienceLabel: string;
  audienceSubtitle: string;
  groups: PortalFeatureGroup[];
  csvFilename: string;
  otherHref: string;
  otherLabel: string;
};

export default function PortalFeaturesDeck({
  audienceLabel,
  audienceSubtitle,
  groups,
  csvFilename,
  otherHref,
  otherLabel,
}: Props) {
  const [brand, setBrand] = useState<PlatformBrandingParsed | null>(null);
  const total = countPortalFeatures(groups);
  const gated = groups.reduce(
    (n, g) => n + g.items.filter((i) => i.gatedByPlan).length,
    0
  );

  useEffect(() => {
    void fetch('/api/public/platform-branding', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.logo) {
          setBrand({
            logo: data.logo,
            favicon: data.favicon || data.logo,
            companyName: data.companyName || 'AutoDealersOnline',
            adminName: data.adminName || '',
            adminPhoto: data.adminPhoto || '',
            logoVersion: data.logoVersion || 0,
          });
        }
      })
      .catch(() => undefined);
  }, []);

  const companyName = brand?.companyName || 'AutoDealersOnline';
  const logoSrc = brand?.logo || DEFAULT_PLATFORM_BRAND_ASSET;

  function downloadCsv() {
    const csv = featuresToCsv(groups, audienceLabel);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function printPdf() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            max-width: none !important;
          }
          .feature-group {
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/funciones" className="text-sm font-medium text-primary-600 hover:underline">
            ← Funciones
          </Link>
          <div className="flex flex-wrap gap-2">
            <Link
              href={otherHref}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              {otherLabel}
            </Link>
            <button
              type="button"
              onClick={downloadCsv}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Descargar CSV
            </button>
            <button
              type="button"
              onClick={printPdf}
              className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-semibold text-white hover:bg-primary-700"
            >
              Imprimir / PDF
            </button>
          </div>
        </div>
      </div>

      <article className="print-sheet mx-auto my-6 max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <header className="border-b border-slate-200 pb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt={companyName}
              className="h-14 w-14 rounded-xl object-contain bg-slate-50 border border-slate-100 p-1"
            />
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-primary-600">
                {companyName}
              </p>
              <h1 className="text-2xl font-bold sm:text-3xl">{audienceLabel}</h1>
              <p className="mt-1 text-sm text-slate-600">{audienceSubtitle}</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
              {total} funciones listadas
            </span>
            {gated > 0 ? (
              <span className="rounded-full bg-amber-50 px-3 py-1 font-medium text-amber-800">
                {gated} pueden requerir plan / membresía
              </span>
            ) : null}
            <span className="rounded-full bg-slate-50 px-3 py-1 text-slate-500">
              Solo módulos reales del panel · {new Date().toLocaleDateString('es')}
            </span>
          </div>
        </header>

        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group.title} className="feature-group">
              <h2 className="mb-3 text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                {group.title}
              </h2>
              <ul className="space-y-2">
                {group.items.map((item) => (
                  <li
                    key={`${group.title}-${item.path}-${item.name}`}
                    className="flex gap-3 rounded-lg border border-slate-100 px-3 py-2.5"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">
                        {item.name}
                        {item.gatedByPlan ? (
                          <span className="ml-2 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                            Plan
                          </span>
                        ) : null}
                      </p>
                      {item.note ? (
                        <p className="text-sm text-slate-600">{item.note}</p>
                      ) : null}
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">{item.path}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>
            Documento generado desde el catálogo real de menús y rutas de {companyName}. Las
            funciones marcadas «Plan» aparecen en el panel y pueden estar limitadas por la
            membresía activa.
          </p>
          <p className="mt-1">
            Panel: {audienceLabel} · {companyName} · autodealers-online.com
          </p>
        </footer>
      </article>
    </div>
  );
}
