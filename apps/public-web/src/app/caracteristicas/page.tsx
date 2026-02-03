'use client';

import Link from 'next/link';

export default function CaracteristicasPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">AD</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                AutoDealers
              </span>
            </Link>
            <Link
              href="/login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:shadow-lg transition-all"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Características{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Completas
            </span>
          </h1>
          <p className="text-xl text-gray-600">
            Todo lo que necesitas para gestionar tu concesionario de manera profesional
          </p>
        </div>

        {/* Features Grid */}
        <div className="space-y-16">
          {[
            {
              title: '🤖 Inteligencia Artificial Integrada',
              description: 'Automatiza tareas repetitivas y mejora la eficiencia',
              features: [
                'Respuestas automáticas a clientes',
                'Clasificación inteligente de leads',
                'Generación de contenido para redes sociales',
                'Análisis predictivo de ventas',
                'Recomendaciones personalizadas',
              ],
            },
            {
              title: '📱 Gestión de Redes Sociales',
              description: 'Publica y programa contenido automáticamente',
              features: [
                'Publicación en Facebook e Instagram',
                'Programación de posts',
                'Analytics de engagement',
                'Respuestas automáticas a comentarios',
                'Gestión de múltiples cuentas',
              ],
            },
            {
              title: '📊 CRM Completo',
              description: 'Gestiona leads, clientes y ventas en un solo lugar',
              features: [
                'Pipeline de ventas visual',
                'Seguimiento de leads',
                'Historial completo de interacciones',
                'Recordatorios post-venta',
                'Calendario de citas integrado',
              ],
            },
            {
              title: '🚗 Inventario Inteligente',
              description: 'Control total de tu inventario con herramientas avanzadas',
              features: [
                'Galería de fotos y videos',
                'Tours virtuales 360°',
                'Sincronización automática',
                'Alertas de stock bajo',
                'Gestión de características personalizadas',
              ],
            },
            {
              title: '💳 Pagos Integrados',
              description: 'Acepta pagos directamente desde la plataforma',
              features: [
                'Integración con Stripe',
                'Depósitos y pagos completos',
                'Financiamiento integrado',
                'Facturación automática',
                'Reportes de ingresos',
              ],
            },
            {
              title: '📈 Reportes y Analytics',
              description: 'Toma decisiones basadas en datos',
              features: [
                'Dashboard en tiempo real',
                'Reportes personalizables',
                'Exportación a PDF/Excel',
                'Métricas de conversión',
                'Análisis de tendencias',
              ],
            },
            {
              title: '🌐 Sitio Web Personalizado',
              description: 'Tu propio sitio web profesional incluido',
              features: [
                'Subdominio personalizado',
                'Diseño responsive',
                'SEO optimizado',
                'Integración con inventario',
                'Formularios de contacto',
              ],
            },
            {
              title: '📧 Marketing Automatizado',
              description: 'Automatiza tus campañas de marketing',
              features: [
                'Email marketing',
                'SMS marketing',
                'WhatsApp marketing',
                'Campañas segmentadas',
                'A/B testing',
              ],
            },
          ].map((section, i) => (
            <div key={i} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-8 shadow-sm">
              <h2 className="text-3xl font-bold mb-4">{section.title}</h2>
              <p className="text-xl text-gray-600 mb-6">{section.description}</p>
              <ul className="grid md:grid-cols-2 gap-4">
                {section.features.map((feature, j) => (
                  <li key={j} className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">¿Listo para comenzar?</h2>
          <p className="text-xl mb-8 opacity-90">
            Prueba todas estas características gratis durante 14 días
          </p>
          <Link
            href="/registro"
            className="inline-block bg-white text-blue-600 px-8 py-4 rounded-lg hover:shadow-xl transition-all font-semibold text-lg"
          >
            Comenzar Gratis
          </Link>
        </div>
      </div>
    </div>
  );
}


