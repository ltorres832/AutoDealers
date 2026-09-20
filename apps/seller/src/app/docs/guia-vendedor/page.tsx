'use client';

import Link from 'next/link';

const sellerJourney = [
  {
    step: '01',
    title: 'Prepara tu presencia',
    text: 'Perfil, WhatsApp, horario, fotos y pagina publica listos para recibir clientes.',
    href: '/settings/profile',
    cta: 'Completar perfil',
    accent: 'from-sky-500 to-cyan-400',
  },
  {
    step: '02',
    title: 'Publica vehiculos',
    text: 'Sube fotos completas, precio, millaje y descripcion clara para cada unidad.',
    href: '/inventory',
    cta: 'Ir a inventario',
    accent: 'from-primary-600 to-red-500',
  },
  {
    step: '03',
    title: 'Comparte y promociona',
    text: 'Envia anuncios por WhatsApp, redes y promociones para generar trafico.',
    href: '/promotions',
    cta: 'Ver promociones',
    accent: 'from-amber-500 to-orange-400',
  },
  {
    step: '04',
    title: 'Cierra oportunidades',
    text: 'Responde leads, chats y citas rapido para convertir interesados en clientes.',
    href: '/leads',
    cta: 'Atender leads',
    accent: 'from-emerald-500 to-teal-400',
  },
];

const animatedStats = [
  { value: '1', label: 'panel para trabajar' },
  { value: '4', label: 'pasos principales' },
  { value: '24/7', label: 'inventario online' },
];

const videoMoments = [
  'Dashboard',
  'Inventario',
  'Pagina publica',
  'Leads y citas',
  'Promocion',
];

const launchChecklist = [
  'Perfil y WhatsApp correctos',
  'Pagina publica revisada',
  'Fotos completas por vehiculo',
  'Leads y citas revisados a diario',
];

export default function GuiaVendedorPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-8 overflow-hidden p-4 sm:p-6 lg:p-8">
      <style>{`
        @keyframes guide-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes guide-pulse {
          0%, 100% { opacity: .38; transform: scale(1); }
          50% { opacity: .8; transform: scale(1.06); }
        }
        @keyframes guide-slide-up {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes guide-scan {
          0% { transform: translateY(-20%); opacity: 0; }
          25%, 75% { opacity: .75; }
          100% { transform: translateY(360%); opacity: 0; }
        }
        .guide-float { animation: guide-float 4s ease-in-out infinite; }
        .guide-pulse { animation: guide-pulse 3.5s ease-in-out infinite; }
        .guide-slide { animation: guide-slide-up .65s ease-out both; }
        .guide-scan { animation: guide-scan 3.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .guide-float, .guide-pulse, .guide-slide, .guide-scan { animation: none; }
        }
      `}</style>

      <section className="relative grid gap-8 rounded-[2rem] bg-slate-950 p-5 text-white shadow-2xl sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:p-10">
        <div className="guide-pulse absolute -left-24 top-12 h-56 w-56 rounded-full bg-primary-500 blur-3xl" />
        <div className="guide-pulse absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-red-500 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-200">
            Guia animada
          </p>
          <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
            Aprende el flujo completo sin leer una pagina eterna.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Todo se resume en una ruta simple: prepara tu cuenta, publica autos,
            comparte anuncios y atiende clientes rapido.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {animatedStats.map((stat, index) => (
              <div
                key={stat.label}
                className="guide-slide rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/inventory"
              className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-primary-700 shadow hover:bg-primary-50"
            >
              Publicar vehiculo
            </Link>
            <Link
              href="/settings/website"
              className="rounded-xl border border-white/30 px-5 py-3 text-center text-sm font-black text-white hover:bg-white/10"
            >
              Ver pagina publica
            </Link>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-center">
          <div className="guide-float relative w-full max-w-sm rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-[1.5rem] bg-white p-4 text-slate-900">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-primary-600">
                    Dashboard
                  </p>
                  <p className="text-lg font-black">Hoy puedes vender</p>
                </div>
                <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                  Activo
                </span>
              </div>
              <div className="relative overflow-hidden rounded-2xl bg-slate-100 p-4">
                <div className="guide-scan absolute left-0 top-0 h-10 w-full bg-gradient-to-b from-primary-400/0 via-primary-400/30 to-primary-400/0" />
                {sellerJourney.map((item) => (
                  <div key={item.step} className="mb-3 flex items-center gap-3 last:mb-0">
                    <span className={`h-10 w-10 rounded-xl bg-gradient-to-br ${item.accent}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black">{item.title}</p>
                      <div className="mt-1 h-2 rounded-full bg-slate-200">
                        <div className="h-2 w-2/3 rounded-full bg-primary-500" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sellerJourney.map((item, index) => (
          <Link
            key={item.step}
            href={item.href}
            className="guide-slide group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-primary-200 hover:shadow-xl"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.accent} text-lg font-black text-white shadow-lg shadow-slate-200`}>
              {item.step}
            </div>
            <h2 className="text-lg font-black text-slate-950">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
            <span className="mt-5 inline-flex text-sm font-black text-primary-600 group-hover:translate-x-1 transition">
              {item.cta} →
            </span>
          </Link>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-primary-100 bg-primary-50 p-6">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-primary-700">
            Video promocional
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Guion corto para redes
          </h2>
          <p className="mt-4 rounded-2xl bg-white p-4 text-sm font-semibold leading-relaxed text-slate-700 shadow-sm">
            Publica tus autos, recibe leads y maneja chats, citas y promociones
            desde tu cuenta de vendedor. Tu inventario online, profesional y listo
            para vender con AutoDealersOnline.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-500">
                Tutorial animado
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">
                Escenas recomendadas
              </h2>
            </div>
            <span className="rounded-full bg-slate-100 px-4 py-2 text-xs font-black uppercase tracking-wide text-slate-600">
              2 a 4 minutos
            </span>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-5">
            {videoMoments.map((moment, index) => (
              <div key={moment} className="relative rounded-2xl bg-slate-50 p-4 text-center">
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-black text-white">
                  {index + 1}
                </span>
                <p className="mt-3 text-xs font-black uppercase tracking-wide text-slate-700">
                  {moment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-black text-amber-950">Checklist rapido</h2>
          <p className="text-sm font-semibold text-amber-800">Antes de empezar a promocionar</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          {launchChecklist.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-2xl bg-white p-4 text-sm font-black text-amber-950 shadow-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
                ✓
              </span>
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
