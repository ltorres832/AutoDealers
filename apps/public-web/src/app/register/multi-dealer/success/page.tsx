'use client';

import Link from 'next/link';

export default function MultiDealerSuccessPage() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Solicitud Enviada
          </h1>
          <p className="text-gray-600 mb-4">
            Tu solicitud de registro Multi Dealer ha sido enviada exitosamente
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 text-sm">
            ⚠️ <strong>Requerimiento de Aprobación:</strong> Tu solicitud está pendiente de
            revisión por parte de nuestro equipo administrativo. Te notificaremos por email
            una vez que tu solicitud sea aprobada o rechazada.
          </p>
        </div>

        <div className="space-y-4">
          <div className="text-left bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">Próximos Pasos:</h3>
            <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
              <li>Revisaremos tu solicitud en un plazo de 24-48 horas</li>
              <li>Recibirás un email de confirmación con los detalles</li>
              <li>Si es aprobada, podrás iniciar sesión y comenzar a gestionar tus dealers</li>
              <li>Si necesitas más información, nos pondremos en contacto contigo</li>
            </ul>
          </div>

          <div className="flex gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Volver al Inicio
            </Link>
            <Link
              href="/login"
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Ir a Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}



