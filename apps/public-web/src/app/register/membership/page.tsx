'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Membership {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    customSubdomain: boolean;
    aiEnabled: boolean;
    socialMediaEnabled: boolean;
    marketplaceEnabled: boolean;
    advancedReports: boolean;
    maxInventory?: number;
    multiDealerEnabled?: boolean;
    maxDealers?: number | null;
    requiresAdminApproval?: boolean;
    corporateEmailEnabled?: boolean;
    maxCorporateEmails?: number | null;
  };
}

function MembershipSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountType = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId') || '';
  const registered = searchParams.get('registered') === 'true';

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [selectedMembership, setSelectedMembership] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (accountType) {
      fetchMemberships(accountType);
    }
  }, [accountType]);

  async function fetchMemberships(type: 'dealer' | 'seller') {
    try {
      const response = await fetch(`/api/public/memberships?type=${type}&userId=${userId}`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setError('Error al cargar las membresías.');
      setMemberships([]);
    }
  }

  async function handleSelectMembership() {
    if (!selectedMembership) {
      setError('Debes seleccionar una membresía');
      return;
    }

    setLoading(true);
    setError('');

    try {
      let userEmail = '';
      let userName = '';

      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem('registration_user');
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            userEmail = parsed.email || '';
            userName = parsed.name || '';
          } catch (e) { console.warn(e); }
        }
      }

      const response = await fetch('/api/public/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          membershipId: selectedMembership,
          accountType,
          userEmail,
          userName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al crear sesión de pago');
      }

      const data = await response.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al procesar el pago');
      setLoading(false);
    }
  }

  if (!accountType) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 text-center border border-slate-100">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">⚠️</div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight uppercase">Acceso No Autorizado</h2>
          <p className="text-slate-500 font-medium mb-8">El tipo de cuenta es requerido para continuar.</p>
          <Link href="/register" className="inline-flex items-center gap-2 text-blue-600 font-black text-xs uppercase tracking-widest hover:underline">
            Volver al Inicio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-24 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-blue-50/50 to-transparent pointer-events-none"></div>

      <div className="max-w-6xl w-full relative z-10">
        <div className="text-center mb-16 px-4">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-green-50 border border-green-100 rounded-full mb-8 animate-bounce">
            <span className="flex h-2 w-2 rounded-full bg-green-500"></span>
            <span className="text-green-600 font-black text-[10px] uppercase tracking-[0.2em]">Cuenta Creada • Paso Final</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black text-slate-900 mb-6 tracking-tighter uppercase leading-none">
            Elige Tu <span className="text-blue-600">Plan Maestro</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
            Potencia tu presencia digital con el plan que mejor se adapte a tu escala de negocio.
          </p>
        </div>

        {error && (
          <div className="max-w-md mx-auto bg-red-50 border border-red-100 text-red-600 px-8 py-5 rounded-3xl text-sm font-bold mb-10 text-center animate-shake">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {memberships.map((membership) => (
            <div
              key={membership.id}
              onClick={() => setSelectedMembership(membership.id)}
              className={`group relative bg-white rounded-[3rem] p-10 cursor-pointer transition-all duration-500 border-4 flex flex-col ${selectedMembership === membership.id
                ? 'border-blue-600 shadow-[0_40px_80px_-20px_rgba(37,99,235,0.2)] -translate-y-4'
                : 'border-slate-100 shadow-xl hover:border-blue-100 hover:shadow-blue-600/5 hover:-translate-y-2'
                }`}
            >
              <div className="mb-10">
                <div className="flex justify-between items-start mb-6">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none group-hover:text-blue-600 transition-colors">
                    {membership.name}
                  </h3>
                  {selectedMembership === membership.id && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    </div>
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900">${membership.price}</span>
                  <span className="text-slate-400 font-black text-xs uppercase tracking-widest">
                    /{membership.billingCycle === 'monthly' ? 'Mes' : 'Año'}
                  </span>
                </div>
              </div>

              <div className="space-y-4 mb-10 flex-grow">
                {membership.features.customSubdomain && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">✓</div>
                    Subdominio Propio
                  </div>
                )}
                {membership.features.maxInventory !== undefined && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">📦</div>
                    <span>Hasta <span className="text-blue-600 underline underline-offset-2 decoration-2">{membership.features.maxInventory === 0 ? 'ILIMITADOS' : membership.features.maxInventory}</span> vehículos</span>
                  </div>
                )}
                {membership.features.aiEnabled && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">✨</div>
                    Inteligencia Artificial
                  </div>
                )}
                {membership.features.advancedReports && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">📈</div>
                    Reportes en Tiempo Real
                  </div>
                )}
                {membership.features.corporateEmailEnabled && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <div className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">📧</div>
                    Emails Corporativos
                  </div>
                )}
              </div>

              <div className={`mt-auto h-16 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-[0.3em] transition-all ${selectedMembership === membership.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                }`}>
                {selectedMembership === membership.id ? 'Seleccionado' : 'Elegir Plan'}
              </div>
            </div>
          ))}
        </div>

        {memberships.length === 0 && !loading && (
          <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold uppercase tracking-widest">Sincronizando Planes...</p>
          </div>
        )}

        <div className="flex flex-col items-center gap-10">
          <button
            onClick={handleSelectMembership}
            disabled={!selectedMembership || loading}
            className="w-full max-w-sm group bg-slate-900 text-white h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] relative overflow-hidden shadow-2xl hover:bg-blue-600 transition-all duration-500 disabled:opacity-50 active:scale-[0.98]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
            {loading ? 'Preparando Checkout...' : 'Confirmar y Pagar'}
          </button>

          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
            ¿Tienes dudas? <Link href="/soporte" className="text-blue-600 hover:text-blue-700">Habla con un asesor</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function MembershipSelectionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <MembershipSelectionContent />
    </Suspense>
  );
}
