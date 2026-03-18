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
              href="/advertise"
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
    <div className="relative w-full h-[500px] md:h-[600px] rounded-3xl overflow-hidden shadow-[0_30px_100px_-15px_rgba(0,0,0,0.5)] border border-white/5 bg-slate-900 group/hero">
      {/* Premium Content Slider */}
      <div className="relative w-full h-full">
        {content.map((banner, index) => (
          <div
            key={banner.id}
            className={`absolute inset-0 transition-all duration-1000 ease-in-out ${index === currentIndex ? 'opacity-100 scale-100 z-10' : 'opacity-0 scale-105 z-0'
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
              className="block w-full h-full relative group cursor-pointer overflow-hidden"
            >
              {banner.imageUrl ? (
                <>
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-[10000ms] ease-linear group-hover:scale-125"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="800" height="400"%3E%3Crect fill="%231e293b" width="800" height="400"/%3E%3Ctext fill="%23475569" font-family="sans-serif" font-size="24" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E🚗 Imagen no disponible%3C/text%3E%3C/svg%3E';
                      target.onerror = null;
                    }}
                  />
                  {/* Advanced Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/60 to-transparent"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 flex items-center justify-center">
                  <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
                  <div className="text-center z-10">
                    <div className="text-7xl mb-6 animate-pulse">✨</div>
                  </div>
                </div>
              )}

              {/* Premium Floating Label */}
              <div className="absolute top-8 left-8 z-30 flex items-center gap-3">
                <span className="bg-blue-600/90 text-white px-4 py-1.5 rounded-full text-[10px] font-black tracking-[0.2em] shadow-lg backdrop-blur-md uppercase border border-blue-400/30">
                  Exclusivo
                </span>
                <span className="bg-white/10 text-white/80 px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest backdrop-blur-md border border-white/10 uppercase">
                  Oportunidad Premium
                </span>
              </div>

              {/* Main Information - Ultra Responsive and Elegant */}
              <div className="absolute inset-0 flex items-center">
                <div className="px-8 md:px-16 lg:px-24 text-white max-w-4xl">
                  <h3 className="text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-[1.1] tracking-tight drop-shadow-2xl">
                    {banner.title.split(' ').map((word, i) => (
                      <span key={i} className={i % 2 === 1 ? "text-blue-400" : ""}> {word}</span>
                    ))}
                  </h3>
                  <p className="text-xl md:text-2xl text-slate-200/90 line-clamp-2 mb-10 font-medium max-w-2xl leading-relaxed">
                    {banner.description}
                  </p>

                  <div className="flex flex-col sm:flex-row gap-5 items-start">
                    <div className="group/btn relative inline-flex items-center justify-center gap-3 bg-white text-slate-950 px-10 py-5 rounded-2xl font-black text-lg transition-all shadow-[0_20px_50px_rgba(255,255,255,0.2)] hover:shadow-[0_20px_50px_rgba(255,255,255,0.4)] hover:scale-105 transform active:scale-95">
                      <span>Ver Detalles</span>
                      <svg className="w-6 h-6 group-hover/btn:translate-x-1.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Info */}
              <div className="absolute bottom-10 right-10 z-30 hidden md:flex items-center gap-6 text-white/50 text-xs font-bold tracking-widest uppercase">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping"></div>
                  <span>Verificado</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div>Garantía Oficial</div>
              </div>
            </a>
          </div>
        ))}
      </div>

      {/* Navigation Controls - Ultra Minimalist */}
      {content.length > 1 && (
        <>
          {/* Progress indicators */}
          <div className="absolute bottom-10 left-10 md:left-24 z-40 flex items-center gap-4">
            <div className="flex gap-2">
              {content.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className="group relative h-10 w-2 flex items-center overflow-hidden"
                  aria-label={`Slide ${index + 1}`}
                >
                  <div className={`h-full w-full rounded-full transition-all duration-500 ${index === currentIndex ? 'bg-blue-500' : 'bg-white/20 group-hover:bg-white/40'
                    }`} />
                </button>
              ))}
            </div>
            <div className="text-white/40 text-sm font-black tracking-widest">
              <span className="text-white">0{currentIndex + 1}</span> / 0{content.length}
            </div>
          </div>

          <div className="absolute bottom-10 right-10 md:right-24 z-40 flex gap-4">
            <button
              onClick={prevSlide}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-xl flex items-center justify-center transition-all border border-white/10 group overflow-hidden"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={nextSlide}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white rounded-xl flex items-center justify-center transition-all border border-white/10 group overflow-hidden"
            >
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

