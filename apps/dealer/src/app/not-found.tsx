import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          404 - Página no encontrada
        </h2>
        <p className="text-gray-600 mb-6">
          La página que estás buscando no existe.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition inline-block"
        >
          Volver al Dashboard
        </Link>
      </div>
    </div>
  );
}



