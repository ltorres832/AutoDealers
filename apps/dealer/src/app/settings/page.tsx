'use client';

import Link from 'next/link';

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Gestiona tu concesionario, marca e integraciones desde un solo lugar
        </p>
      </div>

      <Link
        href="/settings/membership"
        className="mb-8 flex flex-col gap-3 rounded-2xl border-2 border-primary-300 bg-gradient-to-br from-primary-50 via-white to-amber-50 p-6 shadow-sm transition hover:border-primary-500 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-100 text-3xl">
            💎
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Membresía y planes</h2>
            <p className="mt-1 text-sm text-gray-600">
              Activa o mejora tu plan para desbloquear Kanban, F&amp;I, campañas, citas, reportes y más
              herramientas del panel.
            </p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white">
          Ver planes
        </span>
      </Link>

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
          href="/settings/security"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-slate-100 flex items-center justify-center">
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Seguridad</h3>
              <p className="text-sm text-gray-600">Cambiar contraseña de acceso</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/support"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">🛟</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Soporte</h3>
              <p className="text-sm text-gray-600">Email, WhatsApp y mensajes al equipo</p>
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
              <p className="text-sm text-gray-600">Decide qué quieres que la IA haga por ti</p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/voice-agent"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-violet-100 flex items-center justify-center">
              <span className="text-2xl">🎙️</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Agente de Voz IA</h3>
              <p className="text-sm text-gray-600">Llamadas y seguimiento con voz (según tu plan)</p>
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
          href="/settings/payments"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl">💳</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Historial de pagos</h3>
              <p className="text-sm text-gray-600">Membresía, promociones, banners y destacados</p>
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
          href="/settings/trust-gallery"
          className="bg-white rounded-xl shadow-sm border-2 border-primary-200 p-6 hover:shadow-md transition-shadow md:col-span-2"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📸</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Fotos de tu página pública</h3>
              <p className="text-sm text-gray-600">
                Galería de confianza: entregas, clientes satisfechos y eventos en tu catálogo web
              </p>
            </div>
          </div>
        </Link>

        <Link
          href="/settings/featured"
          className="bg-white rounded-xl shadow-sm border-2 border-amber-200 p-6 hover:shadow-md transition-shadow md:col-span-2"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
              <span className="text-2xl">⭐</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Destacar mi dealer</h3>
              <p className="text-sm text-gray-600">
                Compra destacado o boost 24h para aparecer con prioridad en la web pública
              </p>
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
          href="/settings/migration"
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center space-x-4">
            <div className="h-12 w-12 rounded-lg bg-primary-100 flex items-center justify-center">
              <span className="text-2xl">📥</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Migración CSV</h3>
              <p className="text-sm text-gray-600">Importa inventario desde otra plataforma</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
