'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buildMembershipDisplayLines } from '@/lib/membership-display';
import { isMultiDealerPlan } from '@/lib/membership-flags';

interface MultiDealerMembership {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: Record<string, unknown>;
}

function MultiDealerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  const [memberships, setMemberships] = useState<MultiDealerMembership[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    companyCity: '',
    companyState: '',
    companyZip: '',
    companyCountry: '',
    taxId: '',
    businessType: '',
    numberOfLocations: '',
    yearsInBusiness: '',
    currentInventory: '',
    expectedDealers: '',
    reasonForMultiDealer: '',
    additionalInfo: '',
  });

  const [step, setStep] = useState(1);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  useEffect(() => {
    fetchMultiDealerMemberships();
  }, []);

  async function fetchMultiDealerMemberships() {
    setLoadingPlans(true);
    try {
      const response = await fetch('/api/public/memberships?type=dealer&showMultiDealer=true');
      const data = await response.json();
      const filtered = (data.memberships || []).filter((m: MultiDealerMembership) =>
        isMultiDealerPlan(m.features)
      );
      setMemberships(filtered);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setMemberships([]);
    } finally {
      setLoadingPlans(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (!selectedMembership) {
      setError('Debes seleccionar una membresía Multi Dealer');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/public/register/multi-dealer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          membershipId: selectedMembership,
          referralCode: referralCodeFromUrl || undefined,
          acceptPlatformTerms: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al registrar');
      router.push('/register/multi-dealer/success');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al registrar');
      setLoading(false);
    }
  }

  const inputClasses = "w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 outline-none transition-all font-medium text-slate-900 placeholder:text-slate-400";
  const labelClasses = "block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 ml-1";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-24 px-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>

      <div className="max-w-5xl w-full relative z-10 transition-all duration-700">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-100 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-amber-600 font-black text-[10px] uppercase tracking-widest">Requiere Aprobación Elite</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none">
            Registro <span className="text-blue-600">Multi Dealer</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Gestiona flotas y múltiples concesionarios desde una infraestructura centralizada y potente.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-8 py-5 rounded-3xl text-sm font-bold mb-10 text-center animate-shake">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-12">
          {/* Step 1: Plan Selection */}
          <div className={`transition-all duration-500 ${step === 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {loadingPlans ? (
                <div className="lg:col-span-3 flex justify-center py-16">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {memberships.map((membership) => {
                    const { limits, features } = buildMembershipDisplayLines(membership.features, {
                      planKind: 'dealer',
                    });

                    return (
                      <div
                        key={membership.id}
                        onClick={() => setSelectedMembership(membership.id)}
                        className={`group relative bg-white rounded-[2.5rem] p-8 cursor-pointer transition-all duration-500 border-4 ${
                          selectedMembership === membership.id
                            ? 'border-amber-500 shadow-2xl shadow-amber-500/10 -translate-y-2'
                            : 'border-white shadow-xl hover:border-amber-100 hover:-translate-y-1'
                        }`}
                      >
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                          {membership.name}
                        </h3>
                        <div className="flex items-baseline gap-1 mb-6">
                          <span className="text-4xl font-black text-slate-900">${membership.price}</span>
                          <span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            /{membership.billingCycle === 'monthly' ? 'Mes' : 'Año'}
                          </span>
                        </div>
                        {limits.length > 0 && (
                          <ul className="space-y-1.5 mb-3 text-xs text-slate-600">
                            {limits.slice(0, 6).map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                            {limits.length > 6 && (
                              <li className="text-slate-400">+{limits.length - 6} límites más</li>
                            )}
                          </ul>
                        )}
                        {features.length > 0 && (
                          <ul className="space-y-1.5 mb-6 text-xs text-slate-600 max-h-32 overflow-y-auto">
                            {features.slice(0, 5).map((line, i) => (
                              <li key={i}>{line}</li>
                            ))}
                            {features.length > 5 && (
                              <li className="text-slate-400">+{features.length - 5} funciones…</li>
                            )}
                          </ul>
                        )}
                        <div
                          className={`h-12 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-[0.2em] transition-all ${
                            selectedMembership === membership.id ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-400'
                          }`}
                        >
                          {selectedMembership === membership.id ? 'Seleccionado' : 'Elegir'}
                        </div>
                      </div>
                    );
                  })}
                  {memberships.length === 0 && (
                    <div className="lg:col-span-3 text-center py-12 px-6 bg-white rounded-[2.5rem] border-2 border-dashed border-amber-200">
                      <p className="text-slate-700 font-bold mb-2">No hay planes Multi Dealer configurados</p>
                      <p className="text-sm text-slate-500 mb-4">
                        En Firestore deben existir membresías con <code className="bg-slate-100 px-1 rounded">features.multiDealerEnabled: true</code>.
                        Ejecuta el script <code className="bg-slate-100 px-1 rounded">create-default-memberships</code> o créalos desde el admin.
                      </p>
                      <Link href="/register?type=dealer" className="text-blue-600 font-semibold hover:underline">
                        Registro concesionario estándar
                      </Link>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!selectedMembership}
                className="group bg-slate-900 text-white h-20 px-12 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] transition-all hover:bg-blue-600 disabled:opacity-50"
              >
                Continuar al Formulario
              </button>
            </div>
          </div>

          {/* Step 2: Information Form */}
          <div className={`transition-all duration-500 ${step === 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none absolute'}`}>
            <div className="bg-white rounded-[3rem] shadow-2xl p-10 md:p-16 border border-slate-100 space-y-12">
              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">01</div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Identidad y Seguridad</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Nombre Completo</label>
                    <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className={inputClasses} required />
                  </div>
                  <div>
                    <label className={labelClasses}>Correo Corporativo</label>
                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className={inputClasses} required />
                  </div>
                  <div>
                    <label className={labelClasses}>Teléfono de Contacto</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className={inputClasses} required />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClasses}>Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formData.password}
                          onChange={e => setFormData({ ...formData, password: e.target.value })}
                          className={inputClasses}
                          required
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
                    <div>
                      <label className={labelClasses}>Confirmar Contraseña</label>
                      <input
                        type={showPassword ? "text" : "password"}
                        value={formData.confirmPassword}
                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={inputClasses}
                        required
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">02</div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Detalles de la Corporación</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClasses}>Razón Social / Nombre Comercial</label>
                    <input type="text" value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} className={inputClasses} required />
                  </div>
                  <div>
                    <label className={labelClasses}>RNC / Tax ID</label>
                    <input type="text" value={formData.taxId} onChange={e => setFormData({ ...formData, taxId: e.target.value })} className={inputClasses} required />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClasses}>Dirección Principal</label>
                    <input type="text" value={formData.companyAddress} onChange={e => setFormData({ ...formData, companyAddress: e.target.value })} className={inputClasses} required />
                  </div>
                  <div>
                    <label className={labelClasses}>Ciudad</label>
                    <input type="text" value={formData.companyCity} onChange={e => setFormData({ ...formData, companyCity: e.target.value })} className={inputClasses} required />
                  </div>
                  <div>
                    <label className={labelClasses}>País</label>
                    <input type="text" value={formData.companyCountry} onChange={e => setFormData({ ...formData, companyCountry: e.target.value })} className={inputClasses} required />
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-xl">03</div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Visión del Negocio</h3>
                </div>
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className={labelClasses}>¿Por qué necesitas Multi Dealer? (Mínimo 50 caracteres)</label>
                    <textarea
                      value={formData.reasonForMultiDealer}
                      onChange={e => setFormData({ ...formData, reasonForMultiDealer: e.target.value })}
                      className={inputClasses + " min-h-[150px] py-4"}
                      placeholder="Cuéntanos sobre tu modelo de negocio y cómo planeas escalar..."
                      required
                    />
                  </div>
                </div>
              </section>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-6">
                <input
                  id="multi-dealer-terms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-slate-300 text-blue-600"
                />
                <label htmlFor="multi-dealer-terms" className="text-sm font-medium text-slate-600 leading-relaxed cursor-pointer">
                  Acepto los{' '}
                  <Link href="/terminos" className="text-blue-600 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Términos y Condiciones
                  </Link>{' '}
                  y la{' '}
                  <Link href="/privacidad" className="text-blue-600 underline underline-offset-2" target="_blank" rel="noopener noreferrer">
                    Política de Privacidad
                  </Link>{' '}
                  de la plataforma AutoDealers.
                </label>
              </div>

              <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-100">
                <button type="button" onClick={() => setStep(1)} className="px-10 h-20 rounded-[2rem] font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all">
                  Volver a Planes
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 group bg-slate-900 text-white h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] relative overflow-hidden shadow-2xl hover:bg-blue-600 transition-all duration-500 active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
                  {loading ? 'Procesando Solicitud...' : 'Enviar para Aprobación'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MultiDealerRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <MultiDealerContent />
    </Suspense>
  );
}
