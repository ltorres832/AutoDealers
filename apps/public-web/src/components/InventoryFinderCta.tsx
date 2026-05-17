'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Cfg {
  enabled: boolean;
  title: string;
  description: string;
  primarySmallLabel: string;
  primaryMainLabel: string;
  primaryHoverHint: string;
  primaryHref: string;
  secondaryLabel: string;
  secondaryHref: string;
  footerText: string;
  showFooterPulse: boolean;
}

function NavButton({
  href,
  className,
  children,
}: {
  href: string;
  className: string;
  children: React.ReactNode;
}) {
  if (!href) {
    return (
      <div className={`${className} cursor-not-allowed opacity-60`} role="presentation">
        {children}
      </div>
    );
  }
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

export default function InventoryFinderCta({ publishedVehicleCount }: { publishedVehicleCount: number }) {
  const [cfg, setCfg] = useState<Cfg | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/inventory-finder-cta-config');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCfg(data);
        } else if (!cancelled) {
          setCfg(null);
        }
      } catch {
        if (!cancelled) setCfg(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!cfg?.enabled) {
    return null;
  }

  const footer =
    cfg.footerText?.replace(/\{\{count\}\}/g, publishedVehicleCount.toLocaleString()) ?? '';

  const primaryInner = (
    <>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/0 via-blue-400/10 to-blue-600/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      <div className="flex flex-col items-start relative z-10">
        {cfg.primarySmallLabel ? (
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 mb-2">
            {cfg.primarySmallLabel}
          </span>
        ) : null}
        {cfg.primaryMainLabel ? (
          <span className="text-xl font-black uppercase tracking-[0.1em]">{cfg.primaryMainLabel}</span>
        ) : null}
        {cfg.primaryHoverHint ? (
          <div className="mt-2 text-xs font-medium text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            {cfg.primaryHoverHint}
          </div>
        ) : null}
      </div>
      <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xl group-hover:scale-110 group-hover:rotate-[360deg] transition-all duration-700 border border-white/20 relative z-10">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
        </svg>
      </div>
    </>
  );

  const primaryClass =
    'group relative flex items-center gap-8 px-12 py-10 bg-slate-900 text-white rounded-[3rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.4)] hover:shadow-blue-900/40 transition-all duration-700 hover:-translate-y-3 active:scale-95 overflow-hidden border border-white/10';

  return (
    <div className="mt-32 flex flex-col items-center relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl -z-10" />

      <div className="flex flex-col items-center text-center mb-12">
        <div className="w-16 h-1 bg-gradient-to-r from-transparent via-blue-600 to-transparent rounded-full mb-8" />
        {cfg.title ? (
          <h4 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase tracking-widest">
            {cfg.title}
          </h4>
        ) : null}
        {cfg.description ? (
          <p className="text-slate-500 font-medium max-w-lg leading-relaxed">{cfg.description}</p>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center">
        <NavButton href={cfg.primaryHref} className={primaryClass}>
          {primaryInner}
        </NavButton>

        {cfg.secondaryLabel ? (
          <NavButton
            href={cfg.secondaryHref}
            className="group flex items-center gap-4 px-10 py-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl hover:shadow-slate-200 hover:-translate-y-2 transition-all duration-500 font-black text-sm uppercase tracking-widest text-slate-900"
          >
            {cfg.secondaryLabel}
            <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
              <svg
                className="w-5 h-5 text-slate-400 group-hover:text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1 1 0 01-2-2V6a2 2 0 012-2H5a2 2 0 012 2v6a2 2 0 01-2 2h2v4l2-2z"
                />
              </svg>
            </div>
          </NavButton>
        ) : null}
      </div>

      {footer ? (
        <div className="mt-16 flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
          {cfg.showFooterPulse ? (
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" aria-hidden />
          ) : null}
          <span>{footer}</span>
        </div>
      ) : null}
    </div>
  );
}
