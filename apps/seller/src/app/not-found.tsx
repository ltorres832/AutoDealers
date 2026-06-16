import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Página no encontrada</h1>
      <p className="mt-2 text-gray-600">La ruta que buscas no existe en el panel de vendedor.</p>
      <Link
        href="/dashboard"
        className="mt-6 rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-primary-700"
      >
        Ir al dashboard
      </Link>
    </div>
  );
}
