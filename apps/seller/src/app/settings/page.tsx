'use client';

import Link from 'next/link';

export default function SettingsPage() {
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

