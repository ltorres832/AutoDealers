'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import Link from 'next/link';
import { useEffect, useRef } from 'react';

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

  // Si está cargando, mostrar skeleton
  if (loading) {
    return (
      <section className="py-16 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-block h-8 w-48 bg-slate-200 rounded-full animate-pulse mb-4"></div>
            <div className="inline-block h-12 w-64 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
            <div className="inline-block h-6 w-96 bg-slate-200 rounded-lg animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-slate-200">
                <div className="h-48 bg-slate-200 rounded-lg animate-pulse mb-4"></div>
                <div className="h-6 bg-slate-200 rounded-lg animate-pulse mb-2"></div>
                <div className="h-4 bg-slate-200 rounded-lg animate-pulse w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Si no hay contenido, mostrar mensaje promocional
  if (content.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-pink-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 border-2 border-dashed border-purple-300 rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Promociona Tu Negocio Aquí</h3>
              <p className="text-slate-600 mb-4">Destaca tu negocio en esta sección visible. Crea tu anuncio y llega a más clientes.</p>
              <a
                href="http://localhost:3004"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-bold hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Anuncio Ahora
              </a>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 rounded-full mb-4">
            <span className="text-purple-600 font-semibold text-sm">⭐ PATROCINADORES</span>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Ofertas de Nuestros Socios
          </h2>
          <p className="text-xl text-gray-600">
            Servicios especiales para compradores de vehículos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {content.map((item) => (
            <div
              key={item.id}
              data-content-id={item.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all p-6 border-2 border-purple-200 relative"
            >
              {/* Badge Patrocinado */}
              <div className="absolute top-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                PATROCINADO
              </div>

              {/* Imagen */}
              {item.imageUrl && (
                <div className="mb-4 rounded-lg overflow-hidden">
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-48 object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                </div>
              )}

              {/* Contenido */}
              <h3 className="text-xl font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 mb-4 line-clamp-3">{item.description}</p>

              {/* Botones */}
              <div className="space-y-2">
                <a
                  href={item.linkUrl}
                  target={item.linkType === 'external' ? '_blank' : '_self'}
                  rel={item.linkType === 'external' ? 'noopener noreferrer' : undefined}
                  onClick={() => {
                    // Registrar click
                    fetch(`/api/public/sponsored-content/${item.id}/click`, {
                      method: 'POST',
                    }).catch(console.error);
                  }}
                  className="block w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 font-semibold transition-all"
                >
                  Ver Oferta →
                </a>
                <a
                  href="http://localhost:3004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-gray-100 text-gray-700 text-center py-2 rounded-lg hover:bg-gray-200 font-semibold text-xs transition-all"
                >
                  📢 Promociona Aquí
                </a>
              </div>
            </div>
          ))}
        </div>
        
      </div>
    </section>
  );
}

