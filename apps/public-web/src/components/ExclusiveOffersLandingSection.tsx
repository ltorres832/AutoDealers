'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  gradientClassForKey,
  type ExclusiveOffersSectionConfigClient,
  type ExclusiveOfferCardConfig,
} from '@/lib/exclusive-offers-ui';

function CardCta({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const className =
    'mt-auto w-full px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-xl text-center block';
  if (!href) {
    return <span className={`${className} cursor-default opacity-90`}>{label}</span>;
  }
  if (href.startsWith('/')) {
    return (
      <Link href={href} className={className}>
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {label}
    </a>
  );
}

function OfferCard({ card }: { card: ExclusiveOfferCardConfig }) {
  const color = gradientClassForKey(card.gradientKey);
  return (
    <div className="group relative h-[450px] rounded-[3rem] overflow-hidden shadow-2xl hover:shadow-primary-500/20 transition-all duration-700 hover:-translate-y-4">
      <div
        className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90 group-hover:opacity-100 transition-opacity`}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white z-10">
        <div className="text-7xl mb-8 transform group-hover:scale-110 transition-transform duration-500 select-none" aria-hidden>
          {card.icon || '✨'}
        </div>
        <span className="px-4 py-1 bg-black/20 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-6 border border-white/10">
          {card.badge}
        </span>
        <h4 className="text-3xl font-black mb-4 leading-tight">{card.title}</h4>
        <p className="text-white/80 text-base font-medium leading-relaxed mb-8">{card.description}</p>
        <CardCta href={card.buttonHref} label={card.buttonLabel} />
      </div>
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-3xl transition-all duration-700" />
    </div>
  );
}

export default function ExclusiveOffersLandingSection() {
  const [cfg, setCfg] = useState<ExclusiveOffersSectionConfigClient | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/public/exclusive-offers-config');
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setCfg(data);
        } else if (!cancelled) {
          setCfg({ enabled: false, badgeLabel: '', title: '', subtitle: '', cards: [] });
        }
      } catch {
        if (!cancelled) setCfg({ enabled: false, badgeLabel: '', title: '', subtitle: '', cards: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!cfg) {
    return null;
  }

  if (!cfg.enabled || !cfg.cards.length) {
    return null;
  }

  return (
    <section id="promotions" className="py-24 bg-slate-50 relative overflow-hidden border-t border-slate-200">
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-primary-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 border border-amber-200 rounded-full mb-6 shadow-sm">
            <span className="text-amber-700 font-bold text-[10px] uppercase tracking-[0.2em] flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              {cfg.badgeLabel}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">{cfg.title}</h2>
          {cfg.subtitle ? (
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">{cfg.subtitle}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {cfg.cards.map((card, idx) => (
            <OfferCard key={`${card.title}-${idx}`} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
