'use client';

import Link from 'next/link';

export default function PrivacidadPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <nav className="bg-white/95 backdrop-blur-sm shadow-sm">
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

      <div className="max-w-4xl mx-auto px-4 py-16">
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver al inicio
          </Link>
        </div>

        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Política de Privacidad</h1>
          <p className="text-gray-600">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Información que Recopilamos</h2>
            <p className="mb-4">Recopilamos los siguientes tipos de información:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Información de cuenta:</strong> Nombre, email, teléfono, dirección</li>
              <li><strong>Información del negocio:</strong> Nombre del concesionario, dirección, tipo de negocio</li>
              <li><strong>Datos de uso:</strong> Cómo interactúas con la plataforma, páginas visitadas</li>
              <li><strong>Datos de clientes:</strong> Información de leads y clientes que gestionas en la plataforma</li>
              <li><strong>Datos de pago:</strong> Información de facturación procesada por proveedores seguros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Cómo Usamos tu Información</h2>
            <p className="mb-4">Utilizamos tu información para:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Proporcionar y mejorar nuestros servicios</li>
              <li>Procesar pagos y gestionar suscripciones</li>
              <li>Enviar notificaciones y actualizaciones del servicio</li>
              <li>Proporcionar soporte al cliente</li>
              <li>Analizar el uso de la plataforma para mejoras</li>
              <li>Cumplir con obligaciones legales</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Compartir Información</h2>
            <p className="mb-4">No vendemos tu información personal. Podemos compartir información con:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Proveedores de servicios:</strong> Para procesar pagos, hosting, analytics</li>
              <li><strong>Integraciones:</strong> Cuando conectas servicios de terceros (redes sociales, etc.)</li>
              <li><strong>Requisitos legales:</strong> Cuando sea requerido por ley o para proteger nuestros derechos</li>
              <li><strong>Con tu consentimiento:</strong> En cualquier otra situación con tu autorización explícita</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Seguridad de Datos</h2>
            <p>
              Implementamos medidas de seguridad técnicas y organizativas para proteger tu información, 
              incluyendo encriptación, controles de acceso y monitoreo continuo. Sin embargo, ningún 
              sistema es 100% seguro y no podemos garantizar seguridad absoluta.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Tus Derechos</h2>
            <p className="mb-4">Tienes derecho a:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Acceder a tus datos personales</li>
              <li>Corregir información inexacta</li>
              <li>Solicitar eliminación de tus datos</li>
              <li>Oponerte al procesamiento de tus datos</li>
              <li>Exportar tus datos en formato estándar</li>
              <li>Retirar tu consentimiento en cualquier momento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Cookies y Tecnologías Similares</h2>
            <p>
              Utilizamos cookies y tecnologías similares para mejorar tu experiencia, analizar el uso 
              y personalizar contenido. Puedes gestionar las preferencias de cookies desde la configuración 
              de tu navegador.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Retención de Datos</h2>
            <p>
              Conservamos tu información mientras tu cuenta esté activa o según sea necesario para 
              proporcionar servicios. Después de cancelar tu cuenta, podemos retener cierta información 
              según requerimientos legales o para resolver disputas.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Transferencias Internacionales</h2>
            <p>
              Tus datos pueden ser transferidos y procesados en países fuera de tu jurisdicción. 
              Aseguramos que estas transferencias cumplan con estándares de protección de datos aplicables.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Menores de Edad</h2>
            <p>
              Nuestros servicios están dirigidos a empresas y no están diseñados para menores de 18 años. 
              No recopilamos intencionalmente información de menores.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Cambios a esta Política</h2>
            <p>
              Podemos actualizar esta política ocasionalmente. Te notificaremos de cambios significativos 
              por email o mediante un aviso en la plataforma. Te recomendamos revisar esta política periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">11. Contacto</h2>
            <p>
              Para ejercer tus derechos o hacer preguntas sobre esta política, contáctanos en:{' '}
              <a href="mailto:privacidad@autodealers.com" className="text-blue-600 hover:text-blue-700">
                privacidad@autodealers.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            <strong>Nota importante:</strong> Esta política de privacidad describe cómo manejamos tu información. 
            Al usar AutoDealers, aceptas esta política. Si no estás de acuerdo, no uses nuestros servicios.
          </p>
        </div>
      </div>
    </div>
  );
}


