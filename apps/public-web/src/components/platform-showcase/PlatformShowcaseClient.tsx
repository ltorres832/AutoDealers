'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import {
  type AudienceType,
  PLATFORM_SHOWCASE,
  parseAudienceParam,
} from '@/lib/platform-showcase-content';

function registerHref(type: 'dealer' | 'seller') {
  return `/registro?type=${type}`;
}

export function PlatformShowcaseClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [audience, setAudience] = useState<AudienceType>(() =>
    parseAudienceParam(searchParams.get('tipo'))
  );

  useEffect(() => {
    setAudience(parseAudienceParam(searchParams.get('tipo')));
  }, [searchParams]);

  const content = PLATFORM_SHOWCASE[audience];

  const toc = useMemo(
    () =>
      content.modules.map((m) => ({
        id: m.id,
        title: m.title,
        star: m.star,
      })),
    [content.modules]
  );

  const selectAudience = (next: AudienceType) => {
    setAudience(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tipo', next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#fff5f5_0%,_#ffffff_45%,_#f4f4f5_100%)] text-brand-black">
      <PublicMarketingNav showDefaultLinks />

      {/* Hero */}
      <header className="relative overflow-hidden border-b border-red-100/80">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(120deg, transparent 40%, rgba(225,6,0,0.35) 100%), url(https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1800&q=80)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-14 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-700">
            AutoDealersOnline
          </p>
          <div className="mt-5 inline-flex items-center gap-3 rounded-full border border-gray-200 bg-white/90 p-1.5 shadow-sm">
            <span className={`px-2 text-sm font-semibold ${audience === 'seller' ? 'text-gray-900' : 'text-gray-400'}`}>
              Vendedor
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={audience === 'dealer'}
              aria-label={
                audience === 'seller'
                  ? 'Cambiar a visión de concesionario'
                  : 'Cambiar a visión de vendedor'
              }
              onClick={() => selectAudience(audience === 'seller' ? 'dealer' : 'seller')}
              className={`relative h-8 w-14 shrink-0 rounded-full transition ${
                audience === 'dealer' ? 'bg-primary-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition ${
                  audience === 'dealer' ? 'left-7' : 'left-1'
                }`}
              />
            </button>
            <span className={`px-2 text-sm font-semibold ${audience === 'dealer' ? 'text-gray-900' : 'text-gray-400'}`}>
              Concesionario
            </span>
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.25rem]">
            {content.heroTitle}
          </h1>
          <p className="mt-5 max-w-2xl text-lg text-gray-700 sm:text-xl">{content.heroSubtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={registerHref(content.registerType)}
              className="inline-flex items-center justify-center rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
            >
              {content.registerLabel}
            </Link>
            {content.secondaryHref ? (
              <Link
                href={content.secondaryHref}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white/90 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:border-primary-400 hover:text-primary-700"
              >
                {content.secondaryLabel}
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white/90 px-6 py-3 text-sm font-semibold text-gray-800 transition hover:border-primary-400 hover:text-primary-700"
              >
                Ya tengo cuenta
              </Link>
            )}
          </div>
          {content.secondaryHref ? (
            <p className="mt-3 text-sm text-gray-500">
              El preview es una muestra visual. La versión completa está disponible al registrarte.
            </p>
          ) : null}
        </div>
      </header>

      {/* Audience switch (sticky) */}
      <div className="sticky top-16 z-40 border-b border-gray-200 bg-white/95 backdrop-blur-md sm:top-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <p className="text-sm text-gray-600">Vendedor o concesionario</p>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1">
            {([
              ['seller', 'Vendedor'],
              ['dealer', 'Concesionario'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => selectAudience(id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  audience === id
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-700 hover:text-primary-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:px-8 lg:py-16">
        {/* TOC */}
        <aside className="hidden lg:block">
          <nav className="sticky top-40 max-h-[calc(100vh-11rem)] overflow-y-auto pr-2 text-sm">
            <p className="mb-3 font-semibold text-gray-900">En esta página</p>
            <ul className="space-y-2 border-l border-gray-200">
              <li>
                <a href="#vision" className="block border-l-2 border-transparent pl-3 text-gray-600 hover:border-primary-500 hover:text-primary-700">
                  Visión
                </a>
              </li>
              {toc.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    className="block border-l-2 border-transparent pl-3 text-gray-600 hover:border-primary-500 hover:text-primary-700"
                  >
                    {item.star ? `${item.title}` : item.title}
                  </a>
                </li>
              ))}
              <li>
                <a href="#checklist" className="block border-l-2 border-transparent pl-3 text-gray-600 hover:border-primary-500 hover:text-primary-700">
                  Todo lo incluido
                </a>
              </li>
              <li>
                <a href="#faq" className="block border-l-2 border-transparent pl-3 text-gray-600 hover:border-primary-500 hover:text-primary-700">
                  Preguntas
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="min-w-0 space-y-16">
          <section id="vision" className="scroll-mt-36">
            <h2 className="text-3xl font-bold tracking-tight">{content.visionTitle}</h2>
            <div className="mt-4 space-y-4 text-lg leading-relaxed text-gray-700">
              {content.visionBody.map((p) => (
                <p key={p.slice(0, 40)}>{p}</p>
              ))}
            </div>
          </section>

          {/* Mobile TOC */}
          <details className="rounded-lg border border-gray-200 bg-white p-4 lg:hidden">
            <summary className="cursor-pointer font-semibold text-gray-900">Índice de secciones</summary>
            <ul className="mt-3 space-y-2 text-sm text-primary-700">
              {toc.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`}>{item.title}</a>
                </li>
              ))}
            </ul>
          </details>

          {content.modules.map((mod, index) => (
            <section key={mod.id} id={mod.id} className="scroll-mt-36">
              {mod.star ? (
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary-700">
                  Destacado
                </p>
              ) : null}
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{mod.title}</h2>
              <div className="mt-4 space-y-3 text-base leading-relaxed text-gray-700 sm:text-lg">
                {mod.intro.map((p) => (
                  <p key={p.slice(0, 48)}>{p}</p>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Herramientas
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {mod.tools.map((tool) => (
                    <li
                      key={tool}
                      className="flex gap-2 text-sm text-gray-800 sm:text-base"
                    >
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
                      <span>{tool}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {mod.steps?.length ? (
                <div className="mt-8">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Cómo funciona
                  </h3>
                  <ol className="mt-4 space-y-4">
                    {mod.steps.map((step, i) => (
                      <li key={step.title} className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-black text-sm font-bold text-white">
                          {i + 1}
                        </span>
                        <div>
                          <p className="font-semibold text-gray-900">{step.title}</p>
                          <p className="text-gray-600">{step.text}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              <p className="mt-6 border-l-4 border-primary-600 pl-4 text-base font-medium text-gray-900">
                {mod.outcome}
              </p>

              {(index + 1) % 3 === 0 ? (
                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-brand-black px-5 py-5 text-white">
                  <p className="text-sm sm:text-base">
                    ¿Listo para usar esto en tu {audience === 'dealer' ? 'concesionario' : 'negocio'}?
                  </p>
                  <Link
                    href={registerHref(content.registerType)}
                    className="inline-flex rounded-md bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
                  >
                    {content.registerLabel}
                  </Link>
                </div>
              ) : null}
            </section>
          ))}

          <section id="checklist" className="scroll-mt-36">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{content.checklistTitle}</h2>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {content.checklist.map((item) => (
                <li key={item} className="flex gap-2 text-gray-800">
                  <span className="text-primary-600" aria-hidden>
                    ✓
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section id="dia" className="scroll-mt-36">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{content.dayTitle}</h2>
            <ol className="mt-6 space-y-3">
              {content.dayBody.map((line, i) => (
                <li key={line.slice(0, 32)} className="flex gap-3 text-gray-700">
                  <span className="font-semibold text-primary-700">{i + 1}.</span>
                  <span>{line}</span>
                </li>
              ))}
            </ol>
          </section>

          <section id="faq" className="scroll-mt-36">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Preguntas frecuentes</h2>
            <div className="mt-6 space-y-4">
              {content.faq.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-lg border border-gray-200 bg-white px-4 py-3 open:shadow-sm"
                >
                  <summary className="cursor-pointer list-none font-semibold text-gray-900 marker:content-none">
                    {item.q}
                  </summary>
                  <p className="mt-2 text-gray-600">{item.a}</p>
                </details>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-gradient-to-br from-brand-black to-zinc-800 px-6 py-12 text-center text-white sm:px-10">
            <h2 className="text-2xl font-bold sm:text-3xl">{content.ctaTitle}</h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-zinc-200 sm:text-lg">{content.ctaBody}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href={registerHref(content.registerType)}
                className="inline-flex rounded-md bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700"
              >
                {content.registerLabel}
              </Link>
              {content.secondaryHref ? (
                <Link
                  href={content.secondaryHref}
                  className="inline-flex rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  {content.secondaryLabel}
                </Link>
              ) : null}
              {audience === 'dealer' ? (
                <button
                  type="button"
                  onClick={() => selectAudience('seller')}
                  className="inline-flex rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver visión para vendedores
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => selectAudience('dealer')}
                  className="inline-flex rounded-md border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Ver visión para concesionarios
                </button>
              )}
            </div>
          </section>
        </main>
      </div>

      <footer className="border-t border-gray-200 bg-white py-8 text-center text-sm text-gray-500">
        <Link href="/" className="font-medium text-primary-700 hover:underline">
          AutoDealersOnline
        </Link>
        {' · '}
        <Link href="/registro" className="hover:text-primary-700">
          Registro
        </Link>
        {' · '}
        <Link href="/login" className="hover:text-primary-700">
          Iniciar sesión
        </Link>
      </footer>
    </div>
  );
}
