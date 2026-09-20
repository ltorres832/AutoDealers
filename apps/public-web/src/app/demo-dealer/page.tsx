import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import { DemoPreviewBadge, DemoPreviewNotice } from '@/components/DemoPreviewNotice';

export const metadata: Metadata = {
  title: 'Demo para Concesionarios',
  description:
    'Descubre cómo funciona tu panel de dealer en AutoDealersOnline: inventario, equipo de vendedores, CRM, F&I, redes, citas y sitio web propio.',
  alternates: {
    canonical: '/demo-dealer',
  },
  openGraph: {
    title: 'Demo para Concesionarios | AutoDealersOnline',
    description:
      'Vista previa del panel dealer: inventario, equipo, leads, F&I, redes sociales y página pública del concesionario.',
    type: 'website',
  },
};

const journey = [
  {
    step: '01',
    title: 'Configura tu concesionario',
    text: 'Marca, subdominio, WhatsApp, horarios y sitio web propio.',
    color: 'from-sky-500 to-cyan-400',
  },
  {
    step: '02',
    title: 'Carga inventario y equipo',
    text: 'Publica vehículos y da acceso a tus vendedores con permisos.',
    color: 'from-primary-600 to-red-500',
  },
  {
    step: '03',
    title: 'Publica en redes desde el panel',
    text: 'Conecta Meta y publica posts sin brincar de app en app.',
    color: 'from-amber-500 to-orange-400',
  },
  {
    step: '04',
    title: 'Cierra con CRM y F&I',
    text: 'Leads, citas, documentos y financiamiento en un solo flujo.',
    color: 'from-emerald-500 to-teal-400',
  },
];

const dealerProfilePhoto =
  'https://images.unsplash.com/photo-1560179707-f14eea528763?auto=format&fit=crop&w=320&q=80';

const previewCards = [
  { label: 'Leads del equipo', value: '42', note: '18 nuevos' },
  { label: 'Unidades en lote', value: '28', note: '6 publicadas hoy' },
  { label: 'Ventas del mes', value: '$186K', note: '11 cerradas' },
  { label: 'Vendedores activos', value: '5', note: '2 en citas' },
];

const included = [
  'Dashboard del concesionario',
  'Inventario y sitio web propio',
  'Cuentas para vendedores',
  'CRM, mensajes y citas',
  'F&I y documentos',
  'Redes y campañas desde el panel',
];

const sidebarItems = [
  { name: 'Dashboard', icon: '📊' },
  { name: 'Inventario', icon: '🚗' },
  { name: 'Vendedores', icon: '👥' },
  { name: 'Leads / CRM', icon: '📞' },
  { name: 'Pipeline Kanban', icon: '📋' },
  { name: 'Mensajes', icon: '💬' },
  { name: 'Citas', icon: '📅' },
  { name: 'Campañas', icon: '📢' },
  { name: 'Publicaciones Sociales', icon: '📱' },
  { name: 'Promociones', icon: '🎁' },
  { name: 'F&I', icon: '💰' },
  { name: 'Deal Desk', icon: '🧾' },
  { name: 'Documentos', icon: '📄' },
  { name: 'Reseñas', icon: '⭐' },
  { name: 'Reportes', icon: '📈' },
  { name: 'Sitio / Branding', icon: '🌐' },
  { name: 'Configuración', icon: '⚙️' },
];

const inventoryRows = [
  {
    car: 'Toyota Camry 2021',
    price: '$22,900',
    status: 'Publicado',
    views: '184 vistas',
    mileage: '38,240 millas',
    condition: 'Usado',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=520&q=80',
  },
  {
    car: 'Honda CR-V 2020',
    price: '$25,500',
    status: 'En revision',
    views: '91 vistas',
    mileage: '44,810 millas',
    condition: 'Usado',
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=520&q=80',
  },
  {
    car: 'Ford F-150 2019',
    price: '$31,900',
    status: 'Publicado',
    views: '276 vistas',
    mileage: '52,300 millas',
    condition: 'Usado',
    image: 'https://images.unsplash.com/photo-1605893477799-b99e3b8b93fe?auto=format&fit=crop&w=520&q=80',
  },
];

const leadColumns = [
  {
    title: 'Nuevo',
    items: ['Maria quiere info del Camry', 'Carlos pidio fotos extra'],
  },
  {
    title: 'Contactado',
    items: ['Luis agenda llamada', 'Ana pregunta financiamiento'],
  },
  {
    title: 'Cita',
    items: ['Test drive sabado 10:30 AM', 'Ver CR-V hoy 5:00 PM'],
  },
];

const publicVehicles = [
  {
    name: 'Camry 2021',
    price: '$22,900',
    image: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&w=520&q=80',
  },
  {
    name: 'CR-V 2020',
    price: '$25,500',
    image: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?auto=format&fit=crop&w=520&q=80',
  },
];

export default function DemoDealerPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950">
      <style>{`
        @keyframes demo-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-16px); }
        }
        @keyframes demo-pulse {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .85; transform: scale(1.08); }
        }
        @keyframes demo-slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes demo-scan {
          0% { transform: translateY(-40%); opacity: 0; }
          25%, 75% { opacity: .75; }
          100% { transform: translateY(440%); opacity: 0; }
        }
        .demo-float { animation: demo-float 4.5s ease-in-out infinite; }
        .demo-pulse { animation: demo-pulse 4s ease-in-out infinite; }
        .demo-slide { animation: demo-slide-up .7s ease-out both; }
        .demo-scan { animation: demo-scan 3.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .demo-float, .demo-pulse, .demo-slide, .demo-scan { animation: none; }
        }
      `}</style>

      <PublicMarketingNav backHref="/" backLabel="← Inicio" showDefaultLinks />
      <DemoPreviewNotice
        registerHref="/registro?type=dealer"
        registerLabel="Registrarme para la versión completa"
      />

      <main>
        <section className="relative bg-slate-950 px-4 py-12 text-white sm:py-16 lg:py-20">
          <div className="demo-pulse absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-600 blur-3xl" />
          <div className="demo-pulse absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-red-600 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.35em] text-primary-200">
                Preview del panel de concesionario
              </p>
              <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Así se ve el panel — esto es solo un preview.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Vista previa del panel dealer: inventario, equipo de vendedores, CRM, F&I,
                redes desde la plataforma y sitio web propio.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/registro?type=dealer"
                  className="rounded-xl bg-white px-6 py-3 text-center text-sm font-black text-primary-700 shadow-lg transition hover:bg-primary-50"
                >
                  Crear cuenta de concesionario
                </Link>
                <Link
                  href="/contacto?type=dealer"
                  className="rounded-xl border border-white/30 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-white/10"
                >
                  Solicitar orientación
                </Link>
              </div>

              <p className="mt-4 text-sm font-medium text-amber-200">
                No es tu cuenta ni el panel completo. La versión completa se activa al registrarte.
              </p>
            </div>

            <div className="demo-float relative mx-auto w-full max-w-md">
              <div className="rounded-[2rem] border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur">
                <div className="rounded-[1.5rem] bg-white p-4 text-slate-950">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img
                        src={dealerProfilePhoto}
                        alt="Concesionario demo"
                        className="h-12 w-12 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-primary-600">
                          Tu dashboard
                        </p>
                        <h2 className="text-xl font-black">Tu negocio hoy</h2>
                      </div>
                    </div>
                    <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                      Online
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {previewCards.map((card, index) => (
                      <div
                        key={card.label}
                        className="demo-slide rounded-2xl border border-slate-100 bg-slate-50 p-4"
                        style={{ animationDelay: `${index * 120}ms` }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              {card.label}
                            </p>
                            <p className="text-3xl font-black">{card.value}</p>
                          </div>
                          <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-black text-primary-700">
                            {card.note}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="relative mt-4 overflow-hidden rounded-2xl bg-slate-950 p-4 text-white">
                    <div className="demo-scan absolute left-0 top-0 h-10 w-full bg-gradient-to-b from-primary-400/0 via-primary-400/35 to-primary-400/0" />
                    <p className="text-xs font-black uppercase tracking-widest text-primary-200">
                      Publicación rápida
                    </p>
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={inventoryRows[0].image}
                        alt={inventoryRows[0].car}
                        className="h-16 w-20 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-black">Toyota Camry 2021</p>
                        <p className="text-sm text-slate-300">Publicado en tu página pública</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-600">
              Así se ve por dentro
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Pantallas reales que usarás en tu día a día
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-slate-600">
              Preview visual con datos de ejemplo. No es el panel completo: esa versión se abre
              cuando te registras y activas tu membresía de concesionario.
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-5 py-3">
              <span className="h-3 w-3 rounded-full bg-red-400" />
              <span className="h-3 w-3 rounded-full bg-amber-400" />
              <span className="h-3 w-3 rounded-full bg-green-400" />
              <span className="ml-3 rounded-full bg-white px-4 py-1 text-xs font-bold text-slate-500">
                dealers.autodealers-online.com/dashboard
              </span>
              <DemoPreviewBadge className="ml-auto hidden sm:inline-flex" />
            </div>

            <div className="grid lg:grid-cols-[15rem_1fr]">
              <aside className="bg-slate-950 p-4 text-white sm:p-5">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-600 font-black">
                    AD
                  </div>
                  <div>
                    <p className="font-black">Portal Dealer</p>
                    <p className="text-xs text-slate-400">Preview · no es tu cuenta</p>
                  </div>
                </div>
                <div className="mb-4 rounded-2xl border border-primary-500/30 bg-primary-500/10 p-3">
                  <p className="text-xs font-black uppercase tracking-widest text-primary-200">
                    Preview limitado
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-300">
                    Esta pantalla es solo una muestra. La versión completa está disponible
                    cuando te registras.
                  </p>
                </div>
                <div className="max-h-[42rem] space-y-1.5 overflow-hidden">
                  {sidebarItems.map((item, index) => (
                    <div
                      key={item.name}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold ${
                        index === 0 ? 'bg-primary-600 text-white shadow-lg shadow-primary-950/30' : 'text-slate-300'
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span className="truncate">{item.name}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-white/5 p-3">
                  <p className="text-xs font-bold text-slate-300">También incluye</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {['Banners', 'Referidos', 'Usuarios', 'Políticas'].map((item) => (
                      <span key={item} className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-slate-300">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </aside>

              <div className="bg-slate-50 p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-primary-600">Dashboard</p>
                    <h3 className="text-2xl font-black">Resumen de ventas y actividad</h3>
                  </div>
                  <button className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-black text-white">
                    + Publicar vehiculo
                  </button>
                </div>

                <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-black text-amber-950">
                        Esta es una vista previa de tu panel.
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        Para usar todas las pantallas, guardar tus datos y publicar tu inventario real,
                        activa tu membresía de concesionario.
                      </p>
                    </div>
                    <Link
                      href="/registro?type=dealer"
                      className="shrink-0 rounded-xl bg-amber-600 px-4 py-2.5 text-center text-sm font-black text-white transition hover:bg-amber-700"
                    >
                      Activar membresía
                    </Link>
                  </div>
                </div>

                <div className="mb-5 rounded-lg border-l-4 border-primary-500 bg-gradient-to-r from-primary-50 to-primary-50 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <img
                      src={dealerProfilePhoto}
                      alt="Perfil del concesionario"
                      className="h-16 w-16 rounded-full object-cover ring-4 ring-white"
                    />
                    <div className="flex-1">
                      <h4 className="font-black text-slate-900">
                        Completa la marca de tu concesionario
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Logo, sitio web y datos de contacto generan confianza con tus clientes.
                      </p>
                    </div>
                    <span className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-black text-white">
                      Completar Perfil
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {previewCards.map((card) => (
                    <div key={card.label} className="rounded-2xl bg-white p-5 shadow-sm">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-4xl font-black">{card.value}</p>
                      <p className="mt-1 text-sm font-bold text-green-600">{card.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="font-black">Inventario publicado</h4>
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                        Online 24/7
                      </span>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {inventoryRows.map((row) => (
                        <div key={row.car} className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
                          <img
                            src={row.image}
                            alt={row.car}
                            className="h-36 w-full object-cover"
                          />
                          <div className="p-4">
                            <div className="mb-2 flex items-start justify-between gap-3">
                              <div>
                                <p className="font-black">{row.car}</p>
                                <p className="text-xs text-slate-500">{row.views}</p>
                              </div>
                              <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-black text-green-700">
                                {row.status}
                              </span>
                            </div>
                            <p className="text-xl font-black text-primary-600">{row.price}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Millaje: {row.mileage} · {row.condition}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h4 className="font-black">Formulario de vehiculo</h4>
                    <div className="mt-4 space-y-3">
                      {['Marca y modelo', 'Precio', 'Millaje', 'Descripcion'].map((field) => (
                        <div key={field}>
                          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                            {field}
                          </p>
                          <div className="h-11 rounded-xl border border-slate-200 bg-slate-50" />
                        </div>
                      ))}
                      <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                          Fotos
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                          {inventoryRows.map((row) => (
                            <img
                              key={row.car}
                              src={row.image}
                              alt={row.car}
                              className="h-16 rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      </div>
                      <div className="rounded-xl bg-primary-600 py-3 text-center text-sm font-black text-white">
                        Publicar en mi página
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-600">
                Leads, chat y citas
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Así recibes leads, chats y citas de tus clientes
              </h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {leadColumns.map((column) => (
                  <div key={column.title} className="rounded-3xl bg-slate-100 p-4">
                    <h3 className="mb-4 font-black">{column.title}</h3>
                    <div className="space-y-3">
                      {column.items.map((item) => (
                        <div key={item} className="rounded-2xl bg-white p-4 shadow-sm">
                          <p className="font-bold text-slate-800">{item}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-500">Cliente interesado</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-slate-200 bg-slate-950 p-3 shadow-2xl">
              <div className="rounded-[1.5rem] bg-white p-4">
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                      Vista Previa de tu Página Web
                    </p>
                    <p className="font-black text-slate-900">Así lo verán tus clientes</p>
                  </div>
                </div>
                <div className="mb-4 rounded-2xl bg-gradient-to-br from-primary-600 to-red-600 p-5 text-white">
                  <div className="flex items-center gap-3">
                    <img
                      src={dealerProfilePhoto}
                      alt="Caribe Motors"
                      className="h-14 w-14 rounded-full object-cover ring-4 ring-white/30"
                    />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-white/70">
                        Sitio del concesionario
                      </p>
                      <h3 className="mt-1 text-xl font-black">Caribe Motors PR</h3>
                      <p className="text-sm text-white/85">Concesionario verificado</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <span className="rounded-xl bg-green-500 px-3 py-2 text-center text-xs font-black text-white">
                      WhatsApp
                    </span>
                    <span className="rounded-xl bg-white px-3 py-2 text-center text-xs font-black text-primary-700">
                      Contactar
                    </span>
                  </div>
                </div>
                <div className="mb-3 rounded-2xl bg-slate-50 p-4 text-center">
                  <h4 className="font-black">Mi Inventario</h4>
                  <p className="text-xs text-slate-500">Vehiculos disponibles 24/7</p>
                </div>
                <div className="space-y-3">
                  {publicVehicles.map((vehicle) => (
                    <div key={vehicle.name} className="rounded-2xl border border-slate-100 p-3">
                      <img
                        src={vehicle.image}
                        alt={vehicle.name}
                        className="h-32 w-full rounded-xl object-cover"
                      />
                      <div className="mt-3 flex items-center justify-between">
                        <div>
                          <p className="font-black">{vehicle.name}</p>
                          <p className="text-sm font-bold text-primary-600">{vehicle.price}</p>
                        </div>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-black text-green-700">
                          WhatsApp
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:py-16">
          <div className="mb-8 text-center">
            <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-600">
              Cómo funciona
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Tu flujo para vender más organizado
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {journey.map((item, index) => (
              <div
                key={item.step}
                className="demo-slide rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                style={{ animationDelay: `${index * 120}ms` }}
              >
                <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${item.color} text-lg font-black text-white shadow-lg`}>
                  {item.step}
                </div>
                <h3 className="text-lg font-black">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white px-4 py-14 sm:py-16">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.3em] text-primary-600">
                Qué incluye
              </p>
              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                Todo lo que necesitas para operar tu concesionario
              </h2>
              <p className="mt-4 text-slate-600">
                Conoce el panel antes de elegir membresía: inventario, equipo, CRM, F&I,
                redes y sitio web propio.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/registro?type=dealer"
                  className="rounded-xl bg-primary-600 px-6 py-3 text-center text-sm font-black text-white transition hover:bg-primary-700"
                >
                  Registrarme como concesionario
                </Link>
                <Link
                  href="/contacto"
                  className="rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-black text-slate-700 transition hover:border-primary-300 hover:text-primary-700"
                >
                  Hablar con soporte
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {included.map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 font-black text-green-700">
                      ✓
                    </span>
                    <span className="font-bold text-slate-800">{item}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-4 py-14 sm:py-16">
          <div className="mx-auto max-w-5xl rounded-[2rem] bg-gradient-to-br from-primary-700 to-red-600 p-7 text-center text-white shadow-2xl sm:p-10">
            <p className="text-sm font-black uppercase tracking-[0.3em] text-white/75">
              ¿Listo para empezar?
            </p>
            <h2 className="mt-3 text-3xl font-black sm:text-4xl">
              Opera tu concesionario en un solo panel.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-relaxed text-white/90 sm:text-base">
              Inventario, equipo de vendedores, CRM, F&I, redes y sitio web propio —
              sin brincar de plataforma en plataforma.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/registro?type=dealer"
                className="rounded-xl bg-white px-6 py-3 text-sm font-black text-primary-700 transition hover:bg-primary-50"
              >
                Activar cuenta
              </Link>
              <Link
                href="/plataforma?tipo=dealer"
                className="rounded-xl border border-white/40 px-6 py-3 text-sm font-black text-white transition hover:bg-white/10"
              >
                Ver toda la plataforma
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
