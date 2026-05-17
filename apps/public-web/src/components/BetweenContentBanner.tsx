'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import { useState, useEffect, useRef } from 'react';
import { getAdvertiserLoginForCreateUrl } from '@/config/advertiser-links';

export default function BetweenContentBanner() {
  const { content, loading } = useRealtimeSponsoredContent('between_content', 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [rotationTime, setRotationTime] = useState(7);
  const trackedImpressions = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function fetchRotationTime() {
      try {
        const response = await fetch('/api/public/landing-config');
        if (response.ok) {
          const data = await response.json();
          const betweenTime = data.banners?.rotationTimes?.betweenContent;
          if (betweenTime && betweenTime >= 3 && betweenTime <= 30) {
            setRotationTime(betweenTime);
          }
        }
      } catch (error) {
        console.error('Error fetching rotation time:', error);
      }
    }
    fetchRotationTime();
  }, []);

  useEffect(() => {
    if (content.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
    }, rotationTime * 1000);
    return () => clearInterval(interval);
  }, [content.length, isPaused, rotationTime]);

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
    const currentContent = content[currentIndex];
    if (currentContent) {
      const element = document.querySelector(`[data-content-id="${currentContent.id}"]`);
      if (element) {
        observer.observe(element);
      }
    }
    return () => observer.disconnect();
  }, [currentIndex, content]);

  if (loading || content.length === 0) {
    return (
      <div className="my-12 w-full relative rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 via-indigo-900/80 to-purple-900/80 z-0 pointer-events-none"></div>
        <div
          className="absolute inset-0 opacity-20 z-0 pointer-events-none"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}
        ></div>

        <div className="relative z-10 px-8 py-16 text-center max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-left max-w-2xl">
            <h3 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
              Anuncia tu Negocio Aquí
            </h3>
            <p className="text-lg text-white/80 leading-relaxed font-medium">
              Destaca entre el contenido principal y llega directamente a miles de compradores potenciales.
              Posiciona tu marca donde todos la ven.
            </p>
          </div>

          <div className="flex-shrink-0">
            <a
              href={getAdvertiserLoginForCreateUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative z-20 inline-flex items-center gap-3 bg-white text-indigo-900 px-8 py-4 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-xl hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:-translate-y-1 text-lg whitespace-nowrap pointer-events-auto"
            >
              <svg className="w-6 h-6 text-indigo-600 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
              Crear Anuncio
            </a>
          </div>
        </div>
      </div>
    );
  }

  const currentBanner = content[currentIndex];

  return (
    <div
      className="my-12 relative rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.15)] group h-80 md:h-96"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {content.map((item, index) => (
        <div
          key={item.id}
          data-content-id={item.id}
          className={`absolute inset-0 transition-all duration-1000 ease-[cubic-bezier(0.25,1,0.5,1)] ${index === currentIndex ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-8 scale-105 pointer-events-none'
            }`}
        >
          <a
            href={item.linkUrl}
            target={item.linkType === 'external' ? '_blank' : '_self'}
            rel={item.linkType === 'external' ? 'noopener noreferrer' : undefined}
            onClick={() => {
              fetch(`/api/public/sponsored-content/${item.id}/click`, { method: 'POST' }).catch(console.error);
            }}
            className="block w-full h-full relative"
          >
            {item.imageUrl ? (
              <>
                <div className="absolute inset-0 bg-slate-900">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover opacity-80"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%231e293b" width="800" height="400"/%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                </div>
                {/* Immersive gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-transparent"></div>
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900"></div>
            )}

            {/* Content Layer */}
            <div className="absolute inset-0 flex items-center p-8 md:p-16">
              <div className="max-w-2xl transform transition-transform duration-700 translate-y-0 group-hover:-translate-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/20 backdrop-blur-md border border-indigo-400/30 rounded-full mb-6">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span className="text-indigo-100 font-bold text-[10px] uppercase tracking-widest">Patrocinado</span>
                </div>

                <h3 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight tracking-tight drop-shadow-lg">
                  {item.title}
                </h3>

                <p className="text-lg md:text-xl text-slate-200 mb-8 max-w-xl font-medium drop-shadow leading-relaxed">
                  {item.description}
                </p>

                <div className="inline-flex items-center gap-2 bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:bg-slate-50 transition-all">
                  Ver más
                  <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            </div>
          </a>
        </div>
      ))}

      {/* Navigation Controls */}
      {content.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 8000);
            }}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Banner anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>

          <button
            onClick={(e) => {
              e.preventDefault();
              setCurrentIndex((prev) => (prev + 1) % content.length);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 8000);
            }}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 w-12 h-12 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full border border-white/20 transition-all opacity-0 group-hover:opacity-100 hover:scale-110"
            aria-label="Banner siguiente"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </button>

          {/* Dots */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
            {content.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.preventDefault();
                  setCurrentIndex(index);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 8000);
                }}
                className={`h-2 rounded-full transition-all duration-500 ${index === currentIndex ? 'w-8 bg-indigo-400' : 'w-2 bg-white/40 hover:bg-white/70'
                  }`}
                aria-label={`Ir a banner ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
