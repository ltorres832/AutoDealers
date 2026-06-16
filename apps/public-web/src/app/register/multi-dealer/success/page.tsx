'use client';

import Link from 'next/link';

export default function MultiDealerSuccessPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 px-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-100/30 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-2xl w-full bg-white rounded-[4rem] shadow-[0_50px_100px_-30px_rgba(0,0,0,0.12)] p-12 md:p-16 relative z-10 border border-slate-100 text-center">
        <div className="w-24 h-24 bg-primary-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-primary-600/20 animate-pulse">
          <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
        </div>

        <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tighter uppercase leading-none">
          Solicitud <span className="text-primary-600">Enviada</span>
        </h1>

        <p className="text-slate-500 font-medium text-lg mb-10 leading-relaxed">
          Tu registro de nivel corporativo está en fase de validación. Estamos revisando tu estructura de negocio.
        </p>

        <div className="bg-amber-50 border border-amber-100/50 rounded-3xl p-8 mb-12 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
          <p className="text-amber-800 font-bold text-sm leading-relaxed uppercase tracking-tight">
            <span className="text-xl mr-2">⏳</span>
            Requerimiento de Aprobación
          </p>
          <p className="text-amber-700/80 text-xs font-semibold mt-2 tracking-wide">
            Nuestro equipo analizará tu solicitud en un plazo de 24-48 horas hábiles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/"
            className="h-20 bg-slate-50 text-slate-400 rounded-[2rem] flex items-center justify-center font-black text-[10px] uppercase tracking-[0.3em] hover:bg-slate-100 hover:text-slate-900 transition-all border border-slate-100"
          >
            Volver al Inicio
          </Link>
          <Link
            href="/login"
            className="h-20 bg-primary-600 text-white rounded-[2rem] flex items-center justify-center font-black text-[10px] uppercase tracking-[0.3em] hover:bg-primary-700 transition-all shadow-xl shadow-slate-900/10"
          >
            Ir a Login
          </Link>
        </div>

        <div className="mt-12 pt-10 border-t border-slate-50">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
            Explora mientras tanto nuestro <Link href="/blog" className="text-primary-600/50 hover:text-primary-600">blog de estrategias automotrices</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
