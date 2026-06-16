'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import { useEffect, useRef } from 'react';
import { getAdvertiserLoginForCreateUrl } from '@/config/advertiser-links';
import { SponsoredAdShell } from '@/components/SponsoredAdShell';
import { SPONSORED_CTA_LABEL } from '@/lib/sponsored-content-href';

const PremiumPlaceholder = ({ variant }: { variant: 'blue' | 'green' }) => {
  const isBlue = variant === 'blue';
  return (
    <div className={`group relative overflow-hidden rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] transition-all duration-500 border border-white/40 hover:-translate-y-1.5 ${isBlue ? 'bg-gradient-to-br from-primary-600 via-primary-700 to-brand-black-deep800' : 'bg-gradient-to-br from-emerald-500 via-teal-600 to-primary-700'
      }`}>
      {/* Immersive background elements */}
      <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700 ease-in-out pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 -ml-12 -mb-12 w-48 h-48 bg-black/10 rounded-full blur-3xl group-hover:bg-black/20 transition-all duration-700 ease-in-out pointer-events-none"></div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:animate-[shimmer_2s_infinite] skew-x-12 pointer-events-none"></div>

      <div className="relative z-10 p-7 flex flex-col h-full text-center items-center">
        <div className="w-16 h-16 bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 flex items-center justify-center mb-5 shadow-2xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
          {isBlue ? (
            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          )}
        </div>

        <h4 className="font-extrabold text-white text-2xl mb-2 tracking-tight drop-shadow-sm leading-tight">
          {isBlue ? 'Promociona Tu Negocio' : 'Aumenta Tu Visibilidad'}
        </h4>
        <p className="text-sm text-white/80 mb-8 font-medium max-w-[200px] leading-relaxed">
          {isBlue ? 'Llega a miles de compradores activos hoy' : 'Destaca fácilmente entre la competencia local'}
        </p>

        <a
          href={getAdvertiserLoginForCreateUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-20 mt-auto block w-full bg-white/95 text-slate-900 px-5 py-3.5 rounded-xl font-bold tracking-wide hover:bg-white transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] backdrop-blur-sm pointer-events-auto"
        >
          Crear Anuncio Ahora
        </a>
      </div>
    </div>
  );
};

export default function SidebarBanner() {
  const { content, loading } = useRealtimeSponsoredContent('sidebar', 10);
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Registrar impresiones cuando es visible
  useEffect(() => {
    if (content.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const contentId = entry.target.getAttribute('data-content-id');
            if (contentId && !trackedImpressions.current.has(contentId)) {
              trackedImpressions.current.add(contentId);
              fetch(`/api/public/sponsored-content/${contentId}/impression`, {
                method: 'POST',
              }).catch(console.error);
            }
          }
        });
      },
      { threshold: 0.5 }
    );

    // Observar los primeros 2 banners
    [content[0], content[1]].forEach((item) => {
      if (item) {
        const element = document.querySelector(`[data-content-id="${item.id}"]`);
        if (element) {
          observer.observe(element);
        }
      }
    });

    return () => observer.disconnect();
  }, [content]);

  // Si está cargando o no hay contenido, mostrar 2 banners promocionales
  if (loading || content.length === 0) {
    return (
      <div className="space-y-6">
        <PremiumPlaceholder variant="blue" />
        <PremiumPlaceholder variant="green" />
      </div>
    );
  }

  // Banners Reales
  const renderRealBanner = (banner: any) => {
    return (
      <div
        key={banner.id}
        data-content-id={banner.id}
        className="group bg-white rounded-3xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden border border-slate-200 mb-6 transition-all duration-500 hover:-translate-y-1.5 flex flex-col"
      >
        <SponsoredAdShell
          contentId={banner.id}
          linkType={banner.linkType}
          linkUrl={banner.linkUrl}
          className="block h-full flex flex-col relative"
        >
          {banner.imageUrl ? (
            <div className="relative h-60 overflow-hidden bg-brand-black-deep">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent z-10 transition-opacity duration-500 group-hover:opacity-80"></div>
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-contain bg-brand-black-deep transition-transform duration-1000 ease-out group-hover:scale-105"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23f1f5f9" width="400" height="300"/%3E%3Ctext fill="%2394a3b8" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                  target.onerror = null;
                }}
              />
              <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest shadow-[0_4px_12px_rgba(0,0,0,0.2)] uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
                PATROCINADO
              </div>
            </div>
          ) : (
            <div className="relative h-48 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border-b border-slate-200 overflow-hidden">
              {/* Decorative elements for missing image */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl opacity-50 -ml-16 -mb-16"></div>

              <div className="text-slate-300 relative z-10 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-16 h-16 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" /></svg>
              </div>
              <div className="absolute top-4 right-4 z-20 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 text-white px-3 py-1.5 rounded-full text-[10px] font-bold tracking-widest shadow-md uppercase">
                PATROCINADO
              </div>
            </div>
          )}

          <div className="p-6 flex flex-col flex-grow bg-white relative">
            <h4 className="font-extrabold text-slate-900 text-xl mb-3 line-clamp-2 leading-tight group-hover:text-primary-600 transition-colors">{banner.title}</h4>
            <p className="text-sm text-slate-600 line-clamp-3 mb-6 leading-relaxed font-medium">{banner.description}</p>
            <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-primary-600 font-bold text-sm tracking-wide">
                {SPONSORED_CTA_LABEL}
              </span>
              <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-300">
                <svg className="w-4 h-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
              </div>
            </div>
          </div>
        </SponsoredAdShell>
      </div>
    );
  };

  const firstBanner = content[0];
  const secondBanner = content[1] || null;

  return (
    <div className="space-y-6">
      {firstBanner ? renderRealBanner(firstBanner) : <PremiumPlaceholder variant="blue" />}
      {secondBanner ? renderRealBanner(secondBanner) : <PremiumPlaceholder variant="green" />}
    </div>
  );
}

