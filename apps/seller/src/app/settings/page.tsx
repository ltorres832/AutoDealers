'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { loadCurrentSellerUser } from '@/lib/current-seller-user';

export default function SettingsPage() {
  const [dealerManaged, setDealerManaged] = useState(false);

  useEffect(() => {
    void loadCurrentSellerUser().then((user) => {
      setDealerManaged(Boolean(user?.dealerId));
    });
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Gestiona la configuración de tu cuenta y preferencias
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/settings/notifications"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">🔔</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notificaciones</h3>
              <p className="text-sm text-gray-600">Push, email, SMS, WhatsApp y sonido</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/document-branding"
          className="bg-white rounded-xl shadow-sm border-2 border-primary-200 p-6 hover:shadow-md transition-shadow md:col-span-2"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">PDF F&I — Logo y marca en documentos</h3>
              <p className="text-sm text-gray-600">
                Qué logo y nombre salen en solicitudes de crédito, paquetes para banco y contratos PDF
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/profile"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">👤</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Perfil</h3>
              <p className="text-sm text-gray-600">Información personal y contacto</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/seller-public-page"
          className="bg-white rounded-xl shadow-sm border-2 border-primary-200 p-6 hover:shadow-md transition-shadow md:col-span-2"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Fotos y videos — página pública</h3>
              <p className="text-sm text-gray-600">
                Sube fotos de entregas, clientes y eventos, más videos promocionales para tu catálogo web
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/ai"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Configuración de IA</h3>
              <p className="text-sm text-gray-600">Decide qué quiere que la IA haga por ti</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/integrations"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🔗</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Integraciones</h3>
              <p className="text-sm text-gray-600">Conecta tus redes sociales</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/dealer-link"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🏢</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Concesionario</h3>
              <p className="text-sm text-gray-600">
                {dealerManaged ? 'Plan heredado del dealer' : 'Invitaciones y vínculo'}
              </p>
            </div>
          </div>
        </Link>

        {!dealerManaged && (
        <Link
          href="/settings/membership"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">💎</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Membresía</h3>
              <p className="text-sm text-gray-600">Plan y características</p>
            </div>
          </div>
        </Link>
        )}

        <Link
          href="/settings/corporate-email"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📬</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Email Corporativo</h3>
              <p className="text-sm text-gray-600">Gestiona tu email profesional</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
