'use client';

import Link from 'next/link';

const steps = [
  {
    n: '1',
    title: 'Entrada desde ventas',
    body: 'Los vendedores crean clientes y solicitudes F&I; aparecen aquí en vivo para tu revisión.',
  },
  {
    n: '2',
    title: 'Documentación',
    body: 'Solicita PDF al cliente, adjunta desde Casos de cliente o usa el correo externo del expediente.',
  },
  {
    n: '3',
    title: 'Decisión',
    body: 'Pre-apruebas, pides información o cierras condiciones — el expediente refleja cada paso.',
  },
  {
    n: '4',
    title: 'Cierre operativo',
    body: 'Alineación final con ventas y cliente hasta la firma y entrega, sin duplicar datos.',
  },
];

/**
 * Hero del panel F&I dealer: coordinación con vendedores + cliente en el mismo tenant.
 */
export default function FIHubOverview() {
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-primary-100 bg-gradient-to-br from-slate-50 via-primary-50/50 to-primary-50 shadow-sm">
      <div className="border-b border-primary-100/80 bg-white/70 px-5 py-5 md:px-8 md:py-6 backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Panel gerencia F&amp;I</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Coordina ventas, cliente y cierre en un solo lugar
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 md:text-base">
              Los <strong>vendedores del mismo concesionario</strong> abren solicitudes que ves al instante. Los{' '}
              <strong>casos de cliente</strong> comparten documentación con F&amp;I; el cliente usa enlaces seguros
              para subir archivos mientras defines condiciones y llevas el caso a la firma.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-800 shadow-sm ring-1 ring-primary-100">
                Misma base de datos que ventas
              </li>
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-800 shadow-sm ring-1 ring-primary-100">
                Solicitudes en tiempo real
              </li>
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-primary-800 shadow-sm ring-1 ring-primary-100">
                Documentos centralizados
              </li>
            </ul>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col lg:items-stretch">
            <Link
              href="/customer-files"
              className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-primary-700"
            >
              Casos de cliente
            </Link>
            <Link
              href="/fi/metrics"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              Métricas F&amp;I
            </Link>
            <Link
              href="/fi/workflows"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              Workflows F&amp;I
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 md:px-8 md:py-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
          Tu rol en el proceso completo
        </p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-gray-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
                {s.n}
              </span>
              <h2 className="mt-3 text-sm font-semibold text-gray-900">{s.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-gray-600">{s.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
