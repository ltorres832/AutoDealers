'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import PublicBackButton from '@/components/PublicBackButton';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import {
  getAdvertiserCreateAdUrl,
  getAdvertiserLoginForCreateUrl,
  getAdvertiserLoginUrl,
  getAdvertiserRegisterUrl,
} from '@/config/advertiser-links';

interface PlacementPrice {
  id: string;
  label: string;
  prices: Record<string, number>;
  fromPrice: number | null;
}

export default function AdvertisePage() {
  const [placements, setPlacements] = useState<PlacementPrice[]>([]);
  const [loadingPrices, setLoadingPrices] = useState(true);

  useEffect(() => {
    fetch('/api/public/ad-pricing-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.placements) setPlacements(data.placements);
      })
      .catch(() => {})
      .finally(() => setLoadingPrices(false));
  }, []);

  const registerUrl = getAdvertiserRegisterUrl();
  const loginUrl = getAdvertiserLoginUrl();
  const createAdUrl = getAdvertiserCreateAdUrl();
  const loginForCreateUrl = getAdvertiserLoginForCreateUrl();

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicMarketingNav backHref="/" backLabel="← Inicio" showDefaultLinks />

      <section className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Anuncia en AutoDealers
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
            Llega a miles de compradores de vehículos cada mes.{' '}
            <strong className="font-semibold text-gray-800">Sin suscripción mensual</strong> — pagas
            solo por cada anuncio que publiques.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={registerUrl}
              className="inline-block bg-gradient-to-r from-primary-600 to-brand-black-deep600 text-white px-8 py-3 rounded-lg hover:from-primary-700 hover:to-brand-black-deep-deep700 font-semibold transition-all"
            >
              Crear cuenta gratis
            </a>
            <a
              href={loginForCreateUrl}
              className="inline-block border-2 border-primary-600 text-primary-600 px-8 py-3 rounded-lg hover:bg-primary-50 font-semibold transition-all"
            >
              Ya tengo cuenta — crear anuncio
            </a>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            ¿Ya estás registrado?{' '}
            <a href={loginUrl} className="text-primary-600 hover:underline font-medium">
              Inicia sesión
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            {
              step: '1',
              title: 'Regístrate gratis',
              text: 'Crea tu cuenta de anunciante en minutos. No necesitas elegir un plan mensual.',
            },
            {
              step: '2',
              title: 'Configura tu anuncio',
              text: 'Elige ubicación, duración, imagen o video, y segmentación por audiencia.',
            },
            {
              step: '3',
              title: 'Paga y publica',
              text: 'Pagas una sola vez con tarjeta. Tu anuncio se activa al confirmar el pago.',
            },
          ].map((item) => (
            <div key={item.step} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center mb-4">
                {item.step}
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Precios por anuncio
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Tarifas según ubicación y duración (7, 15 o 30 días). Impuestos aplicables al pagar.
          </p>

          {loadingPrices ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" />
            </div>
          ) : placements.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {placements.map((placement) => (
                <div
                  key={placement.id}
                  className="bg-white rounded-xl shadow p-6 border border-gray-100 text-center"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{placement.label}</h3>
                  {placement.fromPrice != null && (
                    <p className="text-2xl font-bold text-primary-600 mb-3">
                      desde ${placement.fromPrice.toFixed(0)}
                    </p>
                  )}
                  <ul className="text-sm text-gray-600 space-y-1">
                    {Object.entries(placement.prices).map(([days, price]) => (
                      <li key={days}>
                        {days} días — ${Number(price).toFixed(2)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">
              Consulta precios al crear tu anuncio en el panel de anunciante.
            </p>
          )}

          <div className="text-center mt-8">
            <a
              href={createAdUrl}
              className="text-primary-600 hover:text-primary-800 font-semibold hover:underline"
            >
              Ir al panel para crear anuncio →
            </a>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            ¿Por qué anunciar en AutoDealers?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="font-semibold text-gray-900 mb-2">Audiencia Calificada</h3>
              <p className="text-gray-600">
                Miles de compradores activos buscando vehículos cada mes
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="font-semibold text-gray-900 mb-2">Métricas en Tiempo Real</h3>
              <p className="text-gray-600">
                Dashboard completo con impresiones, clics y conversiones
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h3 className="font-semibold text-gray-900 mb-2">Targeting Avanzado</h3>
              <p className="text-gray-600">
                Segmenta por ubicación, tipo de vehículo y más
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
