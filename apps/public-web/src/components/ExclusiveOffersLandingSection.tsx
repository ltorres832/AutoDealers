'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import StarRating from './StarRating';
import {
  gradientClassForKey,
  type ExclusiveOffersSectionConfigClient,
  type ExclusiveOfferCardConfig,
} from '@/lib/exclusive-offers-ui';

interface PublicPromotion {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  discount?: {
    type: 'percentage' | 'fixed' | string;
    value: number;
  };
  tenantId?: string;
  tenantName?: string;
  vehicleId?: string;
  promotionScope?: 'vehicle' | 'dealer' | 'seller' | string;
  imageUrl?: string;
  images?: string[];
  sellerRating?: number;
  sellerRatingCount?: number;
  dealerRating?: number;
  dealerRatingCount?: number;
}

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

function promoImage(promotion: PublicPromotion): string {
  if (promotion.imageUrl?.trim()) return promotion.imageUrl;
  const first = Array.isArray(promotion.images) ? promotion.images.find((u) => typeof u === 'string' && u.trim()) : '';
  return first || '';
}

function handlePromotionClick(promotion: PublicPromotion) {
  fetch(`/api/public/promotions/${promotion.id}/click`, { method: 'POST' }).catch(() => {});
  if (promotion.vehicleId && promotion.tenantId) {
    window.location.href = `/${promotion.tenantId}/vehicle/${promotion.vehicleId}`;
  } else if (promotion.tenantId && (promotion.promotionScope === 'dealer' || promotion.promotionScope === 'seller')) {
    window.location.href = `/${promotion.tenantId}`;
  }
}

export default function ExclusiveOffersLandingSection() {
  const [cfg, setCfg] = useState<ExclusiveOffersSectionConfigClient | null>(null);
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [cfgRes, promoRes] = await Promise.all([
          fetch('/api/public/exclusive-offers-config'),
          fetch('/api/public/promotions?limit=12', { cache: 'no-store' }),
        ]);
        if (!cancelled) {
          if (cfgRes.ok) {
            setCfg(await cfgRes.json());
          } else {
            setCfg({ enabled: false, badgeLabel: '', title: '', subtitle: '', cards: [] });
          }
          if (promoRes.ok) {
            const data = await promoRes.json();
            setPromotions(Array.isArray(data.promotions) ? data.promotions : []);
          } else {
            setPromotions([]);
          }
        }
      } catch {
        if (!cancelled) {
          setCfg({ enabled: false, badgeLabel: '', title: '', subtitle: '', cards: [] });
          setPromotions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const cmsCards = cfg?.enabled && cfg.cards.length ? cfg.cards : [];
  const badge = cfg?.badgeLabel?.trim() || 'Promociones Especiales';
  const title = cfg?.title?.trim() || 'Ofertas Exclusivas';
  const subtitle =
    cfg?.subtitle?.trim() || 'Promociones verificadas de nuestros concesionarios certificados';

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
              {badge}
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">{title}</h2>
          {subtitle ? (
            <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">{subtitle}</p>
          ) : null}
        </div>

        {promotions.length > 0 ? (
          <div className="mb-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {promotions.slice(0, 12).map((promotion, index) => {
              const img = promoImage(promotion);
              const name = promotion.name || promotion.title || 'Promoción';
              return (
                <div
                  key={promotion.id}
                  onClick={() => handlePromotionClick(promotion)}
                  className="group bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden border-2 border-transparent hover:border-yellow-400 transform hover:-translate-y-2"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {img ? (
                    <div className="relative h-56 overflow-hidden">
                      <img
                        src={img}
                        alt={name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                      {promotion.discount?.value ? (
                        <div className="absolute bottom-4 left-4">
                          <div className="bg-white/95 backdrop-blur-sm px-4 py-2 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {promotion.discount.type === 'percentage'
                                ? `${promotion.discount.value}% OFF`
                                : `$${promotion.discount.value} OFF`}
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="relative h-56 bg-slate-100 flex items-center justify-center">
                      <span className="text-sm text-slate-400">Promoción</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-xl mb-2 group-hover:text-blue-600 transition line-clamp-2">
                      {name}
                    </h3>
                    {promotion.description ? (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">{promotion.description}</p>
                    ) : null}
                    {promotion.tenantName ? (
                      <p className="text-xs text-gray-500 font-medium mb-3">De: {promotion.tenantName}</p>
                    ) : null}
                    {(promotion.sellerRating || promotion.dealerRating) ? (
                      <StarRating
                        rating={promotion.sellerRating || promotion.dealerRating || 0}
                        count={promotion.sellerRatingCount || promotion.dealerRatingCount || 0}
                        size="sm"
                        showCount
                      />
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}

        {cmsCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {cmsCards.map((card, idx) => (
              <OfferCard key={`${card.title}-${idx}`} card={card} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
