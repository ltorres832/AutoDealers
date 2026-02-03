'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import { useState, useEffect, useRef } from 'react';

export default function BetweenContentBanner() {
  const { content, loading } = useRealtimeSponsoredContent('between_content', 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [rotationTime, setRotationTime] = useState(7); // Valor por defecto en segundos
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Obtener tiempo de rotación configurado
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

  // Rotación automática según tiempo configurado (solo si hay más de 1 y no está pausado)
  useEffect(() => {
    if (content.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
    }, rotationTime * 1000); // Convertir a milisegundos

    return () => clearInterval(interval);
  }, [content.length, isPaused, rotationTime]);

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
      <div className="my-8 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-dashed border-blue-300 rounded-xl p-8 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Promociona Tu Negocio Aquí</h3>
          <p className="text-slate-600 mb-4 text-sm">Este espacio está disponible para tu anuncio. Destaca entre el contenido.</p>
          <a
            href="http://localhost:3004"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2.5 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Anuncio
          </a>
        </div>
      </div>
    );
  }

  const currentBanner = content[currentIndex];

  return (
    <div 
      className="my-8 bg-white rounded-lg shadow-lg overflow-hidden border-2 border-purple-200 relative"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slider de banners */}
      <div className="relative">
        {content.map((item, index) => (
          <div
            key={item.id}
            data-content-id={item.id}
            className={`transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100' : 'opacity-0 absolute inset-0'
            }`}
          >
            <a
              href={item.linkUrl}
              target={item.linkType === 'external' ? '_blank' : '_self'}
              rel={item.linkType === 'external' ? 'noopener noreferrer' : undefined}
              onClick={() => {
                fetch(`/api/public/sponsored-content/${item.id}/click`, {
                  method: 'POST',
                }).catch(console.error);
              }}
              className="block group"
            >
              {item.imageUrl && (
                <div className="relative h-48 md:h-64 overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                  <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                    PATROCINADO
                  </div>
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-600 mb-4">{item.description}</p>
                <div className="text-sm text-purple-600 font-semibold">
                  Ver más →
                </div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Controles de navegación */}
      {content.length > 1 && (
        <>
          {/* Botón anterior */}
          <button
            onClick={() => {
              setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 8000);
            }}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Banner anterior"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Botón siguiente */}
          <button
            onClick={() => {
              setCurrentIndex((prev) => (prev + 1) % content.length);
              setIsPaused(true);
              setTimeout(() => setIsPaused(false), 8000);
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-900 p-2 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Banner siguiente"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicadores de rotación */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-20 flex gap-1.5 bg-black/30 backdrop-blur-sm px-3 py-1.5 rounded-full">
            {content.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setCurrentIndex(index);
                  setIsPaused(true);
                  setTimeout(() => setIsPaused(false), 8000);
                }}
                className={`h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-6 bg-white' 
                    : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Ir al banner ${index + 1}`}
              />
            ))}
          </div>

          {/* Contador */}
          <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-semibold">
            {currentIndex + 1} / {content.length}
          </div>
        </>
      )}
    </div>
  );
}
