'use client';

import { useRealtimeSponsoredContent } from '../hooks/useRealtimeSponsoredContent';
import { useState, useEffect, useRef } from 'react';

export default function HeroBanner() {
  const { content, loading } = useRealtimeSponsoredContent('hero', 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [rotationTime, setRotationTime] = useState(5000); // Valor por defecto: 5 segundos (5000ms)
  const trackedImpressions = useRef<Set<string>>(new Set());

  // Obtener tiempo de rotación configurado
  useEffect(() => {
    async function fetchRotationTime() {
      try {
        const response = await fetch('/api/public/landing-config');
        if (response.ok) {
          const data = await response.json();
          const heroTime = data.banners?.rotationTimes?.hero;
          if (heroTime && heroTime >= 3 && heroTime <= 30) {
            setRotationTime(heroTime * 1000); // Convertir a milisegundos
          }
        }
      } catch (error) {
        console.error('Error fetching rotation time:', error);
      }
    }
    fetchRotationTime();
  }, []);

  // Rotación automática según tiempo configurado (solo si no está pausado)
  useEffect(() => {
    if (content.length <= 1 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % content.length);
    }, rotationTime);

    return () => clearInterval(interval);
  }, [content.length, isPaused, rotationTime]);

  // Registrar impresiones
  useEffect(() => {
    if (content.length === 0) return;

    const currentContent = content[currentIndex];
    if (currentContent && !trackedImpressions.current.has(currentContent.id)) {
      trackedImpressions.current.add(currentContent.id);
      fetch(`/api/public/sponsored-content/${currentContent.id}/impression`, {
        method: 'POST',
      }).catch(console.error);
    }
  }, [currentIndex, content]);

  // Si está cargando o no hay contenido, mostrar banner promocional atractivo
  if (loading || content.length === 0) {
    return (
      <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden mb-8 shadow-2xl border-2 border-blue-500/30 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent flex items-center">
          <div className="px-6 md:px-12 text-white max-w-4xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2 rounded-full text-xs font-bold mb-4 border border-white/30">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
              <span>OPORTUNIDAD DE PUBLICIDAD</span>
            </div>
            <h3 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight drop-shadow-2xl">
              Destaca Tu Negocio
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text text-transparent">
                Llega a Miles de Clientes
              </span>
            </h3>
            <p className="text-xl md:text-2xl text-white/95 mb-6 font-semibold drop-shadow-lg max-w-2xl">
              Publica tu anuncio en la posición más visible de nuestra plataforma y aumenta tu visibilidad exponencialmente
            </p>
            <a
              href="http://localhost:3004"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-gradient-to-r from-white to-blue-50 text-blue-700 px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-50 hover:to-white transition-all shadow-2xl hover:shadow-white/50 hover:scale-105 transform"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>Crear Anuncio Ahora</span>
            </a>
          </div>
        </div>
        {/* Elementos decorativos */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-2xl"></div>
      </div>
    );
  }

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    // Reanudar después de 10 segundos
    setTimeout(() => setIsPaused(false), 10000);
  };

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % content.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + content.length) % content.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  };

  return (
    <div 
      className="relative w-full h-64 md:h-80 lg:h-96 rounded-xl overflow-hidden mb-8 shadow-2xl border-2 border-white/20"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Slider de banners */}
      <div className="relative w-full h-full">
        {content.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
              index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <a
              href={banner.linkUrl}
              target={banner.linkType === 'external' ? '_blank' : '_self'}
              rel={banner.linkType === 'external' ? 'noopener noreferrer' : undefined}
              onClick={() => {
                fetch(`/api/public/sponsored-content/${banner.id}/click`, {
                  method: 'POST',
                }).catch(console.error);
              }}
              className="block w-full h-full relative group cursor-pointer"
            >
              {banner.imageUrl ? (
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%23ddd" width="800" height="400"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E📢%3C/text%3E%3C/svg%3E';
                    target.onerror = null;
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
                  <div className="text-white text-center">
                    <div className="text-6xl mb-4">📢</div>
                    <h3 className="text-3xl font-bold">{banner.title}</h3>
                  </div>
                </div>
              )}
              
              {/* Overlay con información mejorado */}
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent flex items-center">
                <div className="px-6 md:px-12 text-white max-w-3xl">
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2 rounded-full text-xs font-bold mb-4 shadow-xl">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span>ANUNCIO PATROCINADO</span>
                  </div>
                  <h3 className="text-4xl md:text-5xl lg:text-6xl font-black mb-4 leading-tight drop-shadow-2xl">
                    {banner.title}
                  </h3>
                  <p className="text-xl md:text-2xl text-white/95 line-clamp-2 mb-6 font-semibold drop-shadow-lg">
                    {banner.description}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-white to-blue-50 text-blue-700 px-8 py-4 rounded-xl font-bold text-base hover:from-blue-50 hover:to-white transition-all shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform">
                      <span>Descubrir Más</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Badge "Promociona Tu Negocio" en la esquina superior derecha */}
              <div className="absolute top-4 right-4 z-30">
                <a
                  href="http://localhost:3004"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-full font-bold text-sm shadow-2xl hover:from-green-600 hover:to-emerald-700 transition-all hover:scale-110 transform backdrop-blur-sm border-2 border-white/30"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                  <span>Promociona Tu Negocio Aquí</span>
                </a>
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
            onClick={prevSlide}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Banner anterior"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Botón siguiente */}
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/90 hover:bg-white text-gray-900 p-3 rounded-full shadow-lg transition-all hover:scale-110"
            aria-label="Banner siguiente"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {/* Indicadores de rotación mejorados */}
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-20 flex gap-2 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full">
            {content.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === currentIndex 
                    ? 'w-8 bg-white shadow-lg' 
                    : 'w-2 bg-white/60 hover:bg-white/80'
                }`}
                aria-label={`Ir al banner ${index + 1}`}
              />
            ))}
          </div>

          {/* Contador de banners */}
          <div className="absolute top-4 right-4 z-20 bg-black/50 backdrop-blur-sm text-white px-3 py-1.5 rounded-full text-xs font-semibold">
            {currentIndex + 1} / {content.length}
          </div>
        </>
      )}
    </div>
  );
}

