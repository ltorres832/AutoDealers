'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { getAdvertiserLoginForCreateUrl } from '@/config/advertiser-links';
import { isSponsoredAdClickable, sponsoredAdOpensInNewTab } from '@/lib/sponsored-ad-link';
import {
  resolveSponsoredContentHref,
  SPONSORED_CTA_LABEL,
} from '@/lib/sponsored-content-href';

export default function SponsoredContent() {
  // Traer contenido activo/aprobado (cualquier placement) para asegurar visibilidad
  const { content, loading } = useRealtimeSponsoredContent(undefined, 6);
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Registrar impresiones cuando el contenido es visible
  useEffect(() => {
    if (content.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const contentId = entry.target.getAttribute('data-content-id');
            if (contentId && !trackedImpressions.current.has(contentId)) {
              trackedImpressions.current.add(contentId);
              // Registrar impresión
              fetch(`/api/public/sponsored-content/${contentId}/impression`, {
                method: 'POST',
              }).catch(console.error);
            }
          }
        });
      },
      { threshold: 0.5 } // 50% visible
    );

    // Observar todos los elementos de contenido
    content.forEach((item) => {
      const element = document.querySelector(`[data-content-id="${item.id}"]`);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [content]);

  // Si está cargando, mostrar skeleton premium
  if (loading) {
    return (
      <section className="py-24 bg-slate-50 relative overflow-hidden">
        {/* Decorative background blurs */}
        <div className="absolute top-0 right-0 -mr-32 -mt-32 w-96 h-96 bg-primary-100 rounded-full blur-[100px] opacity-50"></div>
        <div className="absolute bottom-0 left-0 -ml-32 -mb-32 w-96 h-96 bg-primary-100 rounded-full blur-[100px] opacity-50"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center mb-16 space-y-4">
            <div className="inline-block h-8 w-48 bg-slate-200/60 rounded-full animate-pulse backdrop-blur-sm"></div>
            <div className="h-14 w-80 bg-slate-200/60 rounded-xl animate-pulse mx-auto backdrop-blur-sm"></div>
            <div className="h-6 w-96 bg-slate-200/60 rounded-lg animate-pulse mx-auto backdrop-blur-sm"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white/60 backdrop-blur-xl rounded-3xl p-6 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                <div className="h-56 bg-slate-200/60 rounded-2xl animate-pulse mb-6 overflow-hidden relative">
                  <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_infinite] skew-x-12"></div>
                </div>
                <div className="h-8 bg-slate-200/60 rounded-xl animate-pulse mb-4 w-3/4"></div>
                <div className="space-y-3 mb-8">
                  <div className="h-4 bg-slate-200/60 rounded-lg animate-pulse w-full"></div>
                  <div className="h-4 bg-slate-200/60 rounded-lg animate-pulse w-5/6"></div>
                </div>
                <div className="h-12 bg-slate-200/60 rounded-xl animate-pulse w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si no hay contenido, mostrar mensaje promocional premium
  if (content.length === 0) {
    return (
      <section className="py-24 relative overflow-hidden bg-slate-900">
        {/* Deep premium background with glowing orbs */}
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/30 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/30 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/10">
            <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse"></span>
            <span className="text-white font-semibold text-sm tracking-widest uppercase">ESPACIO DISPONIBLE</span>
          </div>

          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            Haz que miles de compradores <br className="hidden md:block" /> vean tu marca <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">ahora mismo.</span>
          </h2>

          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Destaca tu negocio automotriz en nuestra plataforma líder. Conecta con clientes que buscan activamente comprar o vender vehículos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={getAdvertiserLoginForCreateUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative z-20 inline-flex items-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] hover:-translate-y-1 sm:w-auto w-full justify-center pointer-events-auto"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Crear Anuncio Ahora
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-24 bg-slate-50 relative overflow-hidden">
      {/* Decorative premium accents */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100/50 rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-[pulse_2s_ease-in-out_infinite]"></span>
            <span className="text-primary-600 font-bold text-xs tracking-widest uppercase">RED DE SOCIOS</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
            Ofertas Recomendadas
          </h2>
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            Descubre servicios exclusivos diseñados para compradores y dueños de vehículos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">

          {content.map((item) => (
            <div
              key={item.id}
              data-content-id={item.id}
              className="group bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgb(0,0,0,0.12)] border border-slate-100 hover:border-primary-100 transition-all duration-500 hover:-translate-y-2 flex flex-col overflow-hidden relative"
            >
              {/* Premium Glow effect behind card on hover */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

              {/* Imagen */}
              {item.imageUrl && (
                <div className="relative h-56 overflow-hidden bg-slate-100 z-10">
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent z-10 opacity-70 group-hover:opacity-90 transition-opacity duration-500"></div>
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-contain bg-brand-black-deep transition-transform duration-1000 ease-in-out group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                  <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest shadow-lg uppercase backdrop-saturate-150">
                    PATROCINADO
                  </div>
                </div>
              )}

              {/* Contenido */}
              <div className="p-8 flex flex-col flex-grow relative z-10">
                <h3 className="text-xl font-extrabold text-slate-900 mb-3 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-8 line-clamp-3 leading-relaxed font-medium">{item.description}</p>

                {/* Botones */}
                <div className="mt-auto space-y-3 pt-4 border-t border-slate-100">
                  {isSponsoredAdClickable(item.linkType, item.linkUrl) && (
                    <a
                      href={resolveSponsoredContentHref(item.linkType, item.linkUrl)}
                      target={sponsoredAdOpensInNewTab(item.linkType) ? '_blank' : '_self'}
                      rel={sponsoredAdOpensInNewTab(item.linkType) ? 'noopener noreferrer' : undefined}
                      onClick={() => {
                        fetch(`/api/public/sponsored-content/${item.id}/click`, {
                          method: 'POST',
                        }).catch(console.error);
                      }}
                      className="flex items-center justify-center gap-2 w-full bg-primary-600 text-white py-3.5 rounded-xl hover:bg-primary-700 font-bold tracking-wide transition-all duration-300 shadow-md hover:shadow-xl group/btn"
                    >
                      {SPONSORED_CTA_LABEL}
                      <svg className="w-5 h-5 transform group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </a>
                  )}
                  <a
                    href="/advertise"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full text-center py-2 text-slate-400 hover:text-slate-600 font-medium text-xs transition-colors uppercase tracking-wider"
                  >
                    Promociona tu negocio
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

