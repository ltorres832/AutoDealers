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
          href="/settings/crm-lead-routing"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🎯</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CRM — Asignación de leads</h3>
              <p className="text-sm text-gray-600">Round-robin y pool de vendedores (tipo CRM concesionario)</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/crm-sla"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">⏱️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">CRM — SLA de seguimiento</h3>
              <p className="text-sm text-gray-600">Alertas por tiempo sin contacto y umbrales por etapa</p>
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
          href="/settings/fi-manager"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">💰</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Gerente F&I</h3>
              <p className="text-sm text-gray-600">Designa quién revisa solicitudes F&I</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/corporate-emails"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📬</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Emails corporativos</h3>
              <p className="text-sm text-gray-600">Correos del equipo</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/website"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🌐</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sitio web del dealer</h3>
              <p className="text-sm text-gray-600">Subdominio y presencia pública</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/branding"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">🖼️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Marca e imagen</h3>
              <p className="text-sm text-gray-600">Logos y colores del concesionario</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/templates"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📄</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Plantillas</h3>
              <p className="text-sm text-gray-600">Mensajes y comunicación</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/policies"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📜</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Políticas</h3>
              <p className="text-sm text-gray-600">Términos y cumplimiento</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/document-branding"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">✒️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Marca en documentos PDF</h3>
              <p className="text-sm text-gray-600">Contratos y PDFs</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

