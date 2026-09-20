'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function MultiDealerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    companyCity: '',
    companyCountry: '',
    expectedDealers: '',
    numberOfSellers: '',
    message: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.message || formData.message.trim().length < 10) {
      setError('Cuéntanos un poco sobre tu negocio (al menos 10 caracteres).');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/register/multi-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          referralCode: referralCodeFromUrl || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al enviar la solicitud');
      router.push('/register/multi-dealer/success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la solicitud');
      setLoading(false);
    }
  }

  const inputClasses =
    'w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-primary-600/10 focus:border-primary-600 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400';
  const labelClasses =
    'block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-24 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-primary-50/50 to-transparent pointer-events-none"></div>

      <div className="max-w-3xl w-full relative z-10">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-amber-600 font-black text-[10px] uppercase tracking-widest">
              Plan Corporativo · Solo por Solicitud
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none">
            Solicita Información <span className="text-primary-600">Multi Dealer</span>
          </h1>
          <p className="text-lg text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            El plan Multi Dealer es para grupos que gestionan varios concesionarios. Déjanos tus datos
            y nuestro equipo te contactará con precios, condiciones y una demostración personalizada.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-8 py-5 rounded-3xl text-sm font-bold mb-10 text-center">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-12 border border-slate-100 space-y-8"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelClasses}>Nombre Completo *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Correo de Contacto *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Teléfono / WhatsApp *</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Empresa / Grupo *</label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className={inputClasses}
                required
              />
            </div>
            <div>
              <label className={labelClasses}>Ciudad</label>
              <input
                type="text"
                value={formData.companyCity}
                onChange={(e) => setFormData({ ...formData, companyCity: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>País</label>
              <input
                type="text"
                value={formData.companyCountry}
                onChange={(e) => setFormData({ ...formData, companyCountry: e.target.value })}
                className={inputClasses}
              />
            </div>
            <div>
              <label className={labelClasses}>¿Cuántos concesionarios gestionas?</label>
              <input
                type="number"
                min={0}
                value={formData.expectedDealers}
                onChange={(e) => setFormData({ ...formData, expectedDealers: e.target.value })}
                className={inputClasses}
                placeholder="Ej. 3"
              />
            </div>
            <div>
              <label className={labelClasses}>¿Cuántos vendedores tienes en total?</label>
              <input
                type="number"
                min={0}
                value={formData.numberOfSellers}
                onChange={(e) => setFormData({ ...formData, numberOfSellers: e.target.value })}
                className={inputClasses}
                placeholder="Ej. 15"
              />
            </div>
            <div className="md:col-span-2">
              <label className={labelClasses}>Cuéntanos sobre tu negocio *</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className={inputClasses + ' min-h-[140px] py-4'}
                placeholder="¿Qué necesitas? ¿Cuántas ubicaciones/inventario manejas? ¿Cómo planeas escalar?"
                required
              />
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Al enviar aceptas que te contactemos con información comercial. Consulta nuestra{' '}
            <Link href="/privacidad" className="text-primary-600 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
              Política de Privacidad
            </Link>
            .
          </p>

          <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-slate-100">
            <Link
              href="/register?type=dealer"
              className="px-8 h-16 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-center"
            >
              Registro concesionario estándar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-600 text-white h-16 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] shadow-2xl hover:bg-primary-700 transition-all duration-300 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? 'Enviando Solicitud…' : 'Solicitar Información'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MultiDealerRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }
    >
      <MultiDealerContent />
    </Suspense>
  );
}
