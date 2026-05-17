'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { buildMembershipDisplayLines } from '@/lib/membership-display';
import { isMultiDealerPlan } from '@/lib/membership-flags';

interface Membership {
  id: string;
  name: string;
  type?: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: Record<string, unknown>;
}

function readStoredAccountType(): 'dealer' | 'seller' | null {
  if (typeof window === 'undefined') return null;
  try {
    const direct = localStorage.getItem('registration_account_type');
    if (direct === 'dealer' || direct === 'seller') return direct;
    const raw = localStorage.getItem('registration_user');
    if (raw) {
      const u = JSON.parse(raw) as { accountType?: string };
      if (u.accountType === 'dealer' || u.accountType === 'seller') return u.accountType;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function MembershipSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlType = searchParams.get('type') as 'dealer' | 'seller' | null;
  const userId = searchParams.get('userId') || '';
  const registered = searchParams.get('registered') === 'true';

  const [accountType, setAccountType] = useState<'dealer' | 'seller' | null>(() =>
    urlType === 'dealer' || urlType === 'seller' ? urlType : null
  );
  const [typeReady, setTypeReady] = useState(
    () => urlType === 'dealer' || urlType === 'seller'
  );

  useEffect(() => {
    if (urlType === 'dealer' || urlType === 'seller') {
      setAccountType(urlType);
      setTypeReady(true);
      return;
    }
    const stored = readStoredAccountType();
    if (stored) setAccountType(stored);
    setTypeReady(true);
  }, [urlType]);

  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedMembership, setSelectedMembership] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (accountType) {
      fetchMemberships(accountType);
    }
  }, [accountType]);

  async function fetchMemberships(type: 'dealer' | 'seller') {
    setLoadingList(true);
    try {
      const showMulti = type === 'dealer' ? '&showMultiDealer=true' : '';
      const response = await fetch(
        `/api/public/memberships?type=${type}&userId=${encodeURIComponent(userId)}${showMulti}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setMemberships(data.memberships || []);
    } catch (error) {
      console.error('Error fetching memberships:', error);
      setError('Error al cargar las membresías.');
      setMemberships([]);
    } finally {
      setLoadingList(false);
    }
  }

  async function handleSelectMembership() {
    if (!accountType) {
      setError('Tipo de cuenta no disponible. Vuelve a registrarte o abre el enlace con ?type=dealer o ?type=seller.');
      return;
    }
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

  if (!typeReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
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

        {loadingList ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {accountType === 'dealer' && (
              <p className="text-center text-sm text-slate-500 mb-8 max-w-2xl mx-auto">
                Los planes <strong>Multi concesionario</strong> gestionan varios dealers bajo una cuenta; el alta puede requerir{' '}
                <Link href="/register/multi-dealer" className="text-blue-600 font-semibold hover:underline">
                  solicitud dedicada
                </Link>
                .
              </p>
            )}

            {(() => {
              const standardMemberships =
                accountType === 'dealer'
                  ? memberships.filter((m) => !isMultiDealerPlan(m.features))
                  : memberships;
              const multiMemberships =
                accountType === 'dealer'
                  ? memberships.filter((m) => isMultiDealerPlan(m.features))
                  : [];

              const PlanCard = ({
                membership,
                multi,
              }: {
                membership: Membership;
                multi?: boolean;
              }) => (
                <div
                  onClick={() => setSelectedMembership(membership.id)}
                  className={`group relative bg-white rounded-[3rem] p-10 cursor-pointer transition-all duration-500 border-4 flex flex-col ${
                    selectedMembership === membership.id
                      ? multi
                        ? 'border-amber-500 shadow-[0_40px_80px_-20px_rgba(245,158,11,0.25)] -translate-y-4'
                        : 'border-blue-600 shadow-[0_40px_80px_-20px_rgba(37,99,235,0.2)] -translate-y-4'
                      : multi
                        ? 'border-amber-100 shadow-xl hover:border-amber-200 hover:-translate-y-2'
                        : 'border-slate-100 shadow-xl hover:border-blue-100 hover:shadow-blue-600/5 hover:-translate-y-2'
                  }`}
                >
                  <div className="mb-10">
                    <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none group-hover:text-blue-600 transition-colors">
                        {membership.name}
                      </h3>
                      {multi && (
                        <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
                          Multi dealer
                        </span>
                      )}
                      {selectedMembership === membership.id && (
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40 ml-auto">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
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

                  <div className="mb-10 flex-grow space-y-6 text-left">
                    {(() => {
                      const { limits, features } = buildMembershipDisplayLines(membership.features, {
                        planKind: membership.type ?? accountType ?? 'dealer',
                      });
                      return (
                        <>
                          {limits.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Límites</p>
                              <ul className="space-y-2">
                                {limits.map((line, i) => (
                                  <li key={`l-${i}`} className="flex items-start gap-2 text-xs font-semibold text-slate-600">
                                    <span className="text-slate-400 shrink-0">•</span>
                                    <span>{line}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {features.length > 0 && (
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Incluye</p>
                              <ul className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {features.map((line, i) => (
                                  <li key={`f-${i}`} className="text-xs font-semibold text-slate-600 leading-snug">
                                    {line}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div
                    className={`mt-auto h-16 rounded-2xl flex items-center justify-center font-black text-[10px] uppercase tracking-[0.3em] transition-all ${
                      selectedMembership === membership.id
                        ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/30'
                        : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'
                    }`}
                  >
                    {selectedMembership === membership.id ? 'Seleccionado' : 'Elegir Plan'}
                  </div>
                </div>
              );

              return (
                <>
                  <div className="mb-6">
                    <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight text-center">
                      {accountType === 'dealer' ? 'Planes concesionario estándar' : 'Planes vendedor'}
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
                    {standardMemberships.map((m) => (
                      <PlanCard key={`std-${m.id}`} membership={m} />
                    ))}
                  </div>

                  {accountType === 'dealer' && multiMemberships.length > 0 && (
                    <>
                      <h2 className="text-lg font-black text-amber-900 uppercase tracking-tight text-center mb-6">
                        Planes multi concesionario
                      </h2>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
                        {multiMemberships.map((m) => (
                          <PlanCard key={`md-${m.id}`} membership={m} multi />
                        ))}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {memberships.length === 0 && (
              <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-600 font-bold mb-2">No hay planes disponibles.</p>
                <p className="text-sm text-slate-400">
                  Ejecuta en el proyecto el script de membresías o crea planes en el panel admin.
                </p>
              </div>
            )}
          </>
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
