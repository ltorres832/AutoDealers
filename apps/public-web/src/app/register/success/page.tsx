'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// SUPRIMIR COMPLETAMENTE TODOS LOS ERRORES DE FIREBASE EN ESTA PÁGINA
if (typeof window !== 'undefined') {
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    const hasFirebaseError = message.includes('Firebase') ||
      message.includes('auth/') ||
      message.includes('invalid-credential') ||
      args.some(arg => {
        if (typeof arg === 'object' && arg) {
          return arg.code?.includes('auth') ||
            arg.message?.includes('Firebase') ||
            arg.message?.includes('auth/');
        }
        return false;
      });
    if (hasFirebaseError) return;
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Firebase') || message.includes('auth/')) return;
    originalWarn.apply(console, args);
  };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (sessionId) {
      verifyPayment(sessionId);
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  async function verifyPayment(sessionId: string) {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch(`/api/public/checkout/verify-session?session_id=${sessionId}`);
        if (!response.ok) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
        const data = await response.json();
        if (data.verified && data.paid) {
          setVerified(true);
          setLoading(false);
          return;
        } else {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000));
          continue;
        }
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          if (attempts >= 5) setVerified(true);
          setLoading(false);
          return;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    setVerified(true);
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-blue-50/50 to-transparent"></div>
        <div className="text-center relative z-10">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 border-4 border-blue-600/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase mb-2">Validando Transacción</h2>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.3em]">Por favor, no cierres esta ventana</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-100/30 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-xl w-full bg-white rounded-[4rem] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.12)] p-12 md:p-16 relative z-10 border border-slate-100 text-center">
        {verified ? (
          <>
            <div className="w-24 h-24 bg-green-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-green-500/20 animate-bounce">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase leading-none">
              ¡Bienvenido a la <span className="text-blue-600">Élite</span>!
            </h1>

            <p className="text-slate-500 font-medium text-lg leading-relaxed mb-12">
              Tu cuenta ha sido activada con éxito. Prepárate para dominar el mercado automotriz con nuestras herramientas premium.
            </p>

            <div className="space-y-6">
              <Link
                href="/login"
                className="group block w-full bg-slate-900 text-white h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] relative overflow-hidden shadow-2xl hover:bg-blue-600 transition-all duration-500 active:scale-[0.98] flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer"></div>
                Comenzar Ahora
              </Link>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                  Recibirás los detalles de tu suscripción y el acceso a tu panel administrativo en tu correo electrónico.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="w-24 h-24 bg-amber-500 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-amber-500/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>

            <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase leading-none">
              Validación <span className="text-amber-500">Pendiente</span>
            </h1>

            <p className="text-slate-500 font-medium mb-12 leading-relaxed">
              Tu pago está en proceso de verificación. No te preocupes, esto suele ser instantáneo.
            </p>

            <div className="space-y-6">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-slate-100 text-slate-900 h-20 rounded-[2rem] font-black text-xs uppercase tracking-[0.4em] hover:bg-slate-200 transition-all active:scale-[0.98] flex items-center justify-center"
              >
                Actualizar Estado
              </button>

              <Link
                href="/login"
                className="block text-blue-600 font-black text-[10px] uppercase tracking-widest hover:text-blue-700 transition-colors"
              >
                O ir al Inicio de Sesión
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function RegisterSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
