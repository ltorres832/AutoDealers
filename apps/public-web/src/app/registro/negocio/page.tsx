'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';

type Category = { slug: string; name: string };

export default function RegistroNegocioPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    companyName: '',
    categorySlug: '',
    municipality: '',
    address: '',
    description: '',
    acceptPlatformTerms: false,
  });

  useEffect(() => {
    fetch('/api/public/servicios')
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch(() => undefined);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/public/servicios/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'No se pudo registrar');
      return;
    }
    setDone(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref="/registro" />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-black mb-2">Registra tu negocio automotriz</h1>
        <p className="text-slate-600 mb-8">
          Talleres, gomeras, detailing y más. Este registro es independiente del de concesionarios y vendedores.
        </p>
        {done ? (
          <div className="bg-white rounded-2xl p-6 border">
            <p className="font-medium mb-4">Cuenta creada. Entra al panel para completar y publicar tu ficha.</p>
            <a href="https://business.autodealers-online.com/login" className="text-primary-700 font-bold">
              Ir al panel de negocio
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border p-6 grid gap-4">
            <input required className="rounded-xl border px-4 py-3" placeholder="Tu nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input required className="rounded-xl border px-4 py-3" placeholder="Nombre del negocio" value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} />
            <input required type="email" className="rounded-xl border px-4 py-3" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <input required type="password" minLength={6} className="rounded-xl border px-4 py-3" placeholder="Contraseña" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <input className="rounded-xl border px-4 py-3" placeholder="Teléfono" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <select required className="rounded-xl border px-4 py-3" value={form.categorySlug} onChange={(e) => setForm({ ...form, categorySlug: e.target.value })}>
              <option value="">Categoría</option>
              {categories.map((cat) => (
                <option key={cat.slug} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
            <input className="rounded-xl border px-4 py-3" placeholder="Municipio" value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} />
            <input className="rounded-xl border px-4 py-3" placeholder="Dirección" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            <textarea className="rounded-xl border px-4 py-3" placeholder="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.acceptPlatformTerms} onChange={(e) => setForm({ ...form, acceptPlatformTerms: e.target.checked })} />
              Acepto los términos y condiciones de la plataforma
            </label>
            {error ? <p className="text-red-600">{error}</p> : null}
            <button className="rounded-xl bg-primary-600 text-white font-bold py-3 hover:bg-primary-700">
              Crear cuenta de negocio
            </button>
            <p className="text-sm text-slate-500">
              ¿Buscas vender autos? Usa el{' '}
              <Link href="/registro" className="text-primary-700 font-medium">
                registro de concesionario o vendedor
              </Link>
              .
            </p>
          </form>
        )}
      </main>
      <LandingFooter />
    </div>
  );
}
