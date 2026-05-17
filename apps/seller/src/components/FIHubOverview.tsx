'use client';

import Link from 'next/link';

const steps = [
  {
    n: '1',
    title: 'Cliente F&I',
    body: 'Registro rápido o avanzado con trade-in completo; mismo expediente para todo el equipo.',
  },
  {
    n: '2',
    title: 'Solicitud',
    body: 'Envías la solicitud al panel F&I; tu gerente la ve al instante en el mismo concesionario.',
  },
  {
    n: '3',
    title: 'Documentos',
    body: 'Cliente sube por enlace seguro; tú y gerencia adjuntan desde Casos de cliente o solicitudes F&I.',
  },
  {
    n: '4',
    title: 'Cierre',
    body: 'Aprobación, condiciones y seguimiento hasta entregar — sin perder el hilo entre roles.',
  },
];

/**
 * Hero del módulo F&I vendedor: explica sincronización con dealer/cliente y enlaces clave.
 */
export default function FIHubOverview() {
  return (
    <section className="mb-10 overflow-hidden rounded-2xl border border-indigo-100 bg-gradient-to-br from-slate-50 via-blue-50/60 to-indigo-50 shadow-sm">
      <div className="border-b border-indigo-100/80 bg-white/70 px-5 py-5 md:px-8 md:py-6 backdrop-blur-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Centro F&amp;I</p>
            <h1 className="mt-1 text-2xl font-bold text-gray-900 md:text-3xl">
              Un solo flujo para financiamiento, seguro y cierre
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-gray-700 md:text-base">
              Todo ocurre en tu <strong>mismo concesionario</strong>: las solicitudes y clientes F&amp;I se sincronizan
              en tiempo real con gerencia. El cliente puede enviar documentos por enlaces seguros mientras tú y el
              dealer avanzan el caso hasta la firma.
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-800 shadow-sm ring-1 ring-indigo-100">
                Tiempo real
              </li>
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-800 shadow-sm ring-1 ring-indigo-100">
                Mismo expediente vendedor + gerencia
              </li>
              <li className="rounded-full bg-white px-3 py-1 text-xs font-medium text-indigo-800 shadow-sm ring-1 ring-indigo-100">
                Cliente participa con enlaces
              </li>
            </ul>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto lg:flex-col lg:items-stretch">
            <Link
              href="/fi/clients/new"
              className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-blue-700"
            >
              + Cliente (rápido)
            </Link>
            <Link
              href="/fi/clients/advanced"
              className="inline-flex items-center justify-center rounded-xl border border-indigo-600 bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              + Cliente avanzado
            </Link>
            <Link
              href="/customer-files"
              className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 shadow-sm hover:bg-gray-50"
            >
              Casos de cliente (documentos)
            </Link>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 md:px-8 md:py-8">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">Cómo fluye el caso</p>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <li
              key={s.n}
              className="relative rounded-xl border border-white/80 bg-white/90 p-4 shadow-sm ring-1 ring-gray-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
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
