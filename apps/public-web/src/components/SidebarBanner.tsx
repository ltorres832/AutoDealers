'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import { useEffect, useRef } from 'react';

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

  // Si está cargando o no hay contenido, mostrar 2 banners promocionales uno debajo del otro
  if (loading || content.length === 0) {
    return (
      <div className="space-y-4">
        {/* Banner superior promocional */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-6 text-center border-2 border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h4 className="font-bold text-white text-lg mb-2">Promociona Tu Negocio</h4>
            <p className="text-sm text-white/90 mb-4">Llega a miles de compradores</p>
            <a
              href="http://localhost:3004"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white text-blue-600 px-4 py-3 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-lg"
            >
              Crear Anuncio
            </a>
          </div>
        </div>
        {/* Banner inferior promocional */}
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-xl shadow-xl p-6 text-center border-2 border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h4 className="font-bold text-white text-lg mb-2">Aumenta Tu Visibilidad</h4>
            <p className="text-sm text-white/90 mb-4">Destaca entre la competencia</p>
            <a
              href="http://localhost:3004"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white text-green-600 px-4 py-3 rounded-lg font-bold hover:bg-green-50 transition-all shadow-lg"
            >
              Crear Anuncio
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Siempre mostrar los primeros 2 banners uno debajo del otro (sin slider)
  const firstBanner = content[0];
  const secondBanner = content[1] || null;

  return (
    <div className="space-y-4">
      {/* Banner superior - siempre el primero */}
      {firstBanner ? (
        <div
          key={firstBanner.id}
          data-content-id={firstBanner.id}
          className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-purple-200 mb-4"
        >
          <a
            href={firstBanner.linkUrl}
            target={firstBanner.linkType === 'external' ? '_blank' : '_self'}
            rel={firstBanner.linkType === 'external' ? 'noopener noreferrer' : undefined}
            onClick={() => {
              fetch(`/api/public/sponsored-content/${firstBanner.id}/click`, {
                method: 'POST',
              }).catch(console.error);
            }}
            className="block group"
          >
            {firstBanner.imageUrl && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={firstBanner.imageUrl}
                  alt={firstBanner.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                    target.onerror = null;
                  }}
                />
                <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                  PATROCINADO
                </div>
              </div>
            )}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{firstBanner.title}</h4>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{firstBanner.description}</p>
              <a
                href="http://localhost:3004"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                📢 Promociona Aquí
              </a>
            </div>
          </a>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl shadow-xl p-6 text-center border-2 border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <h4 className="font-bold text-white text-lg mb-2">Promociona Tu Negocio</h4>
            <p className="text-sm text-white/90 mb-4">Llega a miles de compradores</p>
            <a
              href="http://localhost:3004"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white text-blue-600 px-4 py-3 rounded-lg font-bold hover:bg-blue-50 transition-all shadow-lg"
            >
              Crear Anuncio
            </a>
          </div>
        </div>
      )}

      {/* Banner inferior - siempre el segundo (o promocional si no hay) */}
      {secondBanner ? (
        <div
          key={secondBanner.id}
          data-content-id={secondBanner.id}
          className="bg-white rounded-lg shadow-lg overflow-hidden border-2 border-purple-200"
        >
          <a
            href={secondBanner.linkUrl}
            target={secondBanner.linkType === 'external' ? '_blank' : '_self'}
            rel={secondBanner.linkType === 'external' ? 'noopener noreferrer' : undefined}
            onClick={() => {
              fetch(`/api/public/sponsored-content/${secondBanner.id}/click`, {
                method: 'POST',
              }).catch(console.error);
            }}
            className="block group"
          >
            {secondBanner.imageUrl && (
              <div className="relative h-48 overflow-hidden">
                <img
                  src={secondBanner.imageUrl}
                  alt={secondBanner.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                    target.onerror = null;
                  }}
                />
                <div className="absolute top-2 right-2 bg-purple-600 text-white px-2 py-1 rounded text-xs font-bold">
                  PATROCINADO
                </div>
              </div>
            )}
            <div className="p-4">
              <h4 className="font-semibold text-gray-900 mb-1 line-clamp-2">{secondBanner.title}</h4>
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">{secondBanner.description}</p>
              <a
                href="http://localhost:3004"
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-200 transition-all"
                onClick={(e) => e.stopPropagation()}
              >
                📢 Promociona Aquí
              </a>
            </div>
          </a>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-xl shadow-xl p-6 text-center border-2 border-white/20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
          <div className="relative z-10">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <h4 className="font-bold text-white text-lg mb-2">Aumenta Tu Visibilidad</h4>
            <p className="text-sm text-white/90 mb-4">Destaca entre la competencia</p>
            <a
              href="http://localhost:3004"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white text-green-600 px-4 py-3 rounded-lg font-bold hover:bg-green-50 transition-all shadow-lg"
            >
              Crear Anuncio
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

