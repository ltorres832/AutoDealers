'use client';

import Link from 'next/link';

export default function TerminosPage() {
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
          <h1 className="text-4xl font-bold mb-4">Términos y Condiciones</h1>
          <p className="text-gray-600">Última actualización: {new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="prose prose-lg max-w-none space-y-8 text-gray-700">
          <section>
            <h2 className="text-2xl font-bold mb-4">1. Aceptación de los Términos</h2>
            <p>
              Al acceder y utilizar AutoDealers, aceptas estar sujeto a estos Términos y Condiciones 
              y a todas las leyes y regulaciones aplicables. Si no estás de acuerdo con alguno de estos 
              términos, no debes usar nuestros servicios.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">2. Uso del Servicio</h2>
            <p className="mb-4">Eres responsable de:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Mantener la confidencialidad de tu cuenta y contraseña</li>
              <li>Todas las actividades que ocurran bajo tu cuenta</li>
              <li>Proporcionar información precisa y actualizada</li>
              <li>Usar el servicio de manera legal y ética</li>
              <li>No compartir tu cuenta con terceros</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">3. Suscripciones y Pagos</h2>
            <p className="mb-4">
              Los servicios de AutoDealers se proporcionan mediante suscripción. Al suscribirte:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Autorizas el cobro automático según tu plan seleccionado</li>
              <li>Los pagos se procesan mensual o anualmente según tu elección</li>
              <li>Puedes cancelar tu suscripción en cualquier momento</li>
              <li>No se realizan reembolsos por períodos ya pagados</li>
              <li>Los precios pueden cambiar con previo aviso de 30 días</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">4. Contenido y Datos</h2>
            <p className="mb-4">
              Retienes todos los derechos sobre tus datos y contenido. Al usar AutoDealers:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Nos otorgas licencia para almacenar y procesar tus datos para proporcionar el servicio</li>
              <li>Eres responsable del contenido que subas a la plataforma</li>
              <li>No debes subir contenido ilegal, ofensivo o que viole derechos de terceros</li>
              <li>Nos reservamos el derecho de eliminar contenido que viole estos términos</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">5. Propiedad Intelectual</h2>
            <p>
              AutoDealers y todo su contenido, incluyendo pero no limitado a software, diseño, 
              logos y marcas, son propiedad de AutoDealers y están protegidos por leyes de 
              propiedad intelectual. No puedes copiar, modificar o distribuir nuestro contenido 
              sin autorización escrita.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">6. Limitación de Responsabilidad</h2>
            <p>
              AutoDealers se proporciona "tal cual" sin garantías de ningún tipo. No garantizamos 
              que el servicio esté libre de errores o interrupciones. En ningún caso seremos 
              responsables por daños indirectos, incidentales o consecuentes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">7. Modificaciones</h2>
            <p>
              Nos reservamos el derecho de modificar estos términos en cualquier momento. 
              Te notificaremos de cambios significativos por email o mediante un aviso en 
              la plataforma. El uso continuado del servicio después de los cambios constituye 
              aceptación de los nuevos términos.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">8. Terminación</h2>
            <p>
              Puedes cancelar tu cuenta en cualquier momento. Nos reservamos el derecho de 
              suspender o terminar cuentas que violen estos términos. Al terminar, perderás 
              acceso a tus datos después del período de gracia especificado en tu plan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">9. Ley Aplicable</h2>
            <p>
              Estos términos se rigen por las leyes del estado donde opera AutoDealers. 
              Cualquier disputa será resuelta en los tribunales competentes de esa jurisdicción.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-4">10. Contacto</h2>
            <p>
              Si tienes preguntas sobre estos términos, puedes contactarnos en:{' '}
              <a href="mailto:legal@autodealers.com" className="text-blue-600 hover:text-blue-700">
                legal@autodealers.com
              </a>
            </p>
          </section>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            Al usar AutoDealers, confirmas que has leído, entendido y aceptas estos Términos y Condiciones.
          </p>
        </div>
      </div>
    </div>
  );
}


