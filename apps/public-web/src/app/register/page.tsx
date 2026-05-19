'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  REGISTER_DEALER_FEATURES,
  REGISTER_SELLER_FEATURES,
} from '@/lib/register-profile-features';

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type');
  const referralCodeFromUrl = searchParams.get('ref');
  const [step, setStep] = useState<1 | 2>(urlType ? 2 : 1);
  const [accountType, setAccountType] = useState<'dealer' | 'seller' | null>(
    urlType === 'dealer' || urlType === 'seller' ? urlType : null
  );
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    subdomain: '',
    phone: '',
    companyName: '',
    taxId: '',
    address: '',
    city: '',
    country: 'Puerto Rico',
    website: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones de uso');
      return;
    }

    if (!formData.name) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!formData.email) {
      setError('El correo electrónico es obligatorio');
      return;
    }

    if (!formData.phone) {
      setError('El teléfono es obligatorio');
      return;
    }

    if (!formData.subdomain) {
      setError('El subdominio es obligatorio para tu página web');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (accountType === 'dealer') {
      if (!formData.companyName) {
        setError('Debes ingresar el nombre de la compañía');
        return;
      }
      if (!formData.taxId) {
        setError('El RNC/Tax ID es obligatorio para concesionarios');
        return;
      }
      if (!formData.address) {
        setError('La dirección fiscal es obligatoria');
        return;
      }
      if (!formData.city) {
        setError('La ciudad es obligatoria');
        return;
      }
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          accountType: accountType,
          referralCode: referralCodeFromUrl || undefined,
          acceptPlatformTerms: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al registrar');
      }

      const data = await response.json();

      if (typeof window !== 'undefined' && data.userId) {
        localStorage.setItem('registration_user', JSON.stringify({
          id: data.userId,
          email: data.userEmail || formData.email,
          name: data.userName || formData.name,
          accountType,
        }));
        try {
          localStorage.setItem('registration_account_type', accountType);
        } catch {
          /* ignore */
        }
      }

      router.push(`/register/membership?type=${accountType}&userId=${data.userId || ''}&registered=true`);
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al registrar');
    } finally {
      setLoading(false);
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 relative overflow-hidden">
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 -mr-40 -mt-40 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -ml-40 -mb-40 w-[500px] h-[500px] bg-indigo-100/40 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="max-w-6xl w-full relative z-10">
          <div className="text-center mb-16 px-4">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-6">
              <span className="text-blue-600 font-extrabold text-[10px] uppercase tracking-[0.3em]">Comienza tu Legado</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight">
              Únete a la Red <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Premium</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
              Transforma tu negocio automotriz con tecnología de vanguardia y una red de ventas global.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Dealer Option Card */}
            <div
              onClick={() => {
                setAccountType('dealer');
                setStep(2);
              }}
              className="group relative bg-white rounded-[3.5rem] p-10 md:p-14 cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_50px_100px_-20px_rgba(37,99,235,0.15)] transition-all duration-700 border border-slate-100 hover:border-blue-200 hover:-translate-y-4 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-blue-50 rounded-bl-full -z-0 group-hover:scale-150 transition-transform duration-1000 opacity-50"></div>

              <div className="relative z-10 w-28 h-28 bg-gradient-to-br from-blue-600 to-blue-700 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 shadow-2xl shadow-blue-500/30 group-hover:rotate-6 transition-transform duration-500">
                🏢
              </div>

              <h3 className="relative z-10 text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-blue-600 transition-colors">Concesionario</h3>
              <p className="relative z-10 text-slate-500 text-sm mb-6 px-2 leading-snug">Inventario, equipo de ventas y sitio con subdominio propio.</p>

              <div className="relative z-10 w-full bg-slate-50 rounded-3xl p-8 mb-10 border border-slate-100">
                <ul className="text-left space-y-4">
                  {REGISTER_DEALER_FEATURES.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 text-[10px]">
                        ✓
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto w-full flex flex-col items-center gap-6">
                <div className="w-full h-16 relative flex items-center justify-center group/btn overflow-hidden rounded-2xl bg-blue-600 shadow-xl shadow-blue-600/20 active:scale-95 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-blue-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                  <span className="relative z-10 text-white font-black text-xs uppercase tracking-[0.3em]">Seleccionar Perfil Dealer</span>
                </div>

                <Link
                  href="/register/multi-dealer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-slate-400 hover:text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] pt-6 border-t border-slate-100 w-full group/multi"
                >
                  ¿Gestionas varios dealers? <span className="text-blue-600 group-hover/multi:underline underline-offset-4 decoration-2">Multi Dealer</span>
                </Link>
              </div>
            </div>

            {/* Seller Option Card */}
            <div
              onClick={() => {
                setAccountType('seller');
                setStep(2);
              }}
              className="group relative bg-white rounded-[3.5rem] p-10 md:p-14 cursor-pointer shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_50px_100px_-20px_rgba(99,102,241,0.15)] transition-all duration-700 border border-slate-100 hover:border-indigo-200 hover:-translate-y-4 flex flex-col items-center text-center overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-40 h-40 bg-indigo-50 rounded-br-full -z-0 group-hover:scale-150 transition-transform duration-1000 opacity-50"></div>

              <div className="relative z-10 w-28 h-28 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-[2.5rem] flex items-center justify-center text-5xl mb-10 shadow-2xl shadow-indigo-500/30 group-hover:-rotate-6 transition-transform duration-500">
                👤
              </div>

              <h3 className="relative z-10 text-3xl font-black text-slate-900 mb-4 tracking-tight group-hover:text-indigo-600 transition-colors">Vendedor</h3>
              <p className="relative z-10 text-slate-500 text-sm mb-6 px-2 leading-snug">Leads, catálogo público y página propia en AutoDealers.</p>

              <div className="relative z-10 w-full bg-slate-50 rounded-3xl p-8 mb-10 border border-slate-100">
                <ul className="text-left space-y-4">
                  {REGISTER_SELLER_FEATURES.map((feat) => (
                    <li key={feat} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <span className="w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-[10px]">
                        ✓
                      </span>
                      {feat}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-auto w-full">
                <div className="w-full h-16 relative flex items-center justify-center group/btn overflow-hidden rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-600/20 active:scale-95 transition-transform">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-indigo-600 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                  <span className="relative z-10 text-white font-black text-xs uppercase tracking-[0.3em]">Seleccionar Perfil Vendedor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.05),transparent_50%)]"></div>

      <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-[0_40px_100px_-25px_rgba(0,0,0,0.12)] p-12 md:p-16 relative z-10 border border-slate-100">
        <div className="mb-12">
          <button onClick={() => setStep(1)} className="group flex items-center gap-3 text-slate-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-10 transition-colors">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 group-hover:-translate-x-1 transition-all">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </div>
            Volver a Selección
          </button>

          <h2 className="text-4xl font-black text-slate-900 mb-3 tracking-tighter uppercase leading-none">
            Tu Cuenta <span className="text-blue-600">Profesional</span>
          </h2>
          <p className="text-slate-500 font-medium">Configura tu espacio de trabajo premium en segundos.</p>

          <div className="flex gap-2 mt-10">
            <div className="h-1.5 flex-[2] bg-blue-600 rounded-full shadow-lg shadow-blue-600/20"></div>
            <div className="h-1.5 flex-[1] bg-slate-100 rounded-full"></div>
            <div className="h-1.5 flex-[1] bg-slate-100 rounded-full"></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-3xl text-sm font-bold flex items-center gap-4 animate-shake">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">!</div>
              {error}
            </div>
          )}

          <div className="space-y-6">
            {accountType === 'dealer' && (
              <>
                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Nombre de la Compañía</label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 outline-none"
                    placeholder="Ej: Grupo Automotriz Federal"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">RNC / Tax ID</label>
                    <input
                      type="text"
                      value={formData.taxId}
                      onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                      className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 outline-none"
                      placeholder="Ej: EIN 12-3456789"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Dirección Fiscal</label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 outline-none"
                      placeholder="Calle y Número"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Ciudad</label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                      placeholder="Ej: San Juan"
                      required
                    />
                  </div>
                  <div className="group">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">País</label>
                    <input
                      type="text"
                      value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Sitio Web (Opcional)</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                    placeholder="https://www.tu-concesionario.com"
                  />
                </div>
              </>
            )}

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">
                {accountType === 'dealer' ? 'Nombre del Dealer' : 'Nombre Completo'}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all placeholder:text-slate-300 outline-none"
                placeholder={accountType === 'dealer' ? 'Ej: Sede Central San Juan' : 'Ej: Juan Pérez'}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Email Corporativo</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                  required
                />
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Teléfono</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                  required
                />
              </div>
            </div>

            <div className="group">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Subdominio Exclusivo</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 pr-40 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                  placeholder="tu-marca"
                  pattern="[a-z0-9-]+"
                  required
                />
                <span className="absolute right-8 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">.autodealers.com</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Contraseña</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="group">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 px-1 group-focus-within:text-blue-600 transition-colors">Confirmar</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full bg-slate-50/50 border-2 border-transparent focus:border-blue-600/20 rounded-[1.5rem] px-8 py-5 focus:ring-4 focus:ring-blue-600/5 focus:bg-white text-slate-900 font-bold transition-all outline-none"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="flex items-start gap-4 px-2">
              <div className="pt-1">
                <input
                  id="terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-600 focus:ring-blue-600/20 transition-all cursor-pointer"
                  required
                />
              </div>
              <label htmlFor="terms" className="text-[11px] font-bold text-slate-500 leading-relaxed cursor-pointer select-none">
                Al crear una cuenta, declaro haber leído y acepto los{' '}
                <Link href="/terminos" className="text-blue-600 hover:text-blue-700 underline underline-offset-4">
                  Términos y Condiciones
                </Link>{' '}
                y la{' '}
                <Link href="/privacidad" className="text-blue-600 hover:text-blue-700 underline underline-offset-4">
                  Política de Privacidad
                </Link>{' '}
                de la plataforma AutoDealers.
              </label>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full group bg-slate-900 text-white h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] relative overflow-hidden shadow-2xl hover:bg-blue-600 transition-all duration-500 disabled:opacity-50 active:scale-[0.98]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
              {loading ? 'Inicializando Sistema...' : 'Crear Perfil Profesional'}
            </button>
          </div>

          <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            ¿Ya tienes acceso? <Link href="/login" className="text-blue-600 hover:text-blue-700 transition-colors underline underline-offset-4">Inicia Sesión</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterPageContent />
    </Suspense>
  );
}
