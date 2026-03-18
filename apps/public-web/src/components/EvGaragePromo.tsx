'use client';

import Link from 'next/link';
import Image from 'next/image';

interface CardConfig {
    enabled?: boolean;
    badge?: string;
    title?: string;
    description?: string;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    socialProof?: string;
    image?: string;
}

interface EvGaragePromoProps {
    config?: {
        enabled?: boolean;
        evCard?: CardConfig;
        dealerCard?: CardConfig;
    };
}

export default function EvGaragePromo({ config }: EvGaragePromoProps) {
    if (config?.enabled === false) return null;

    const ev = config?.evCard || {};
    const dealer = config?.dealerCard || {};

    const showEv = ev.enabled !== false;
    const showDealer = dealer.enabled !== false;

    if (!showEv && !showDealer) return null;
    return (
        <section className="py-16 bg-slate-50 border-y border-slate-200 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">

                    {/* Opciones de Vehículos Eléctricos */}
                    <div className="relative rounded-[3rem] overflow-hidden bg-slate-900 group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.4)] min-h-[500px] lg:col-span-2">
                        {/* Background Texture/Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/40 via-teal-900/60 to-slate-900 z-10 transition-opacity duration-500 group-hover:opacity-90"></div>

                        {/* Opcional: SVG Pattern */}
                        <div className="absolute inset-0 opacity-10 z-0 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }}></div>

                        {/* Vehiculo Electrico Placeholder Image */}
                        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 to-transparent z-10"></div>

                        <div className="relative z-20 h-full p-12 md:p-20 flex flex-col justify-between items-center text-center">
                            <div className="max-w-3xl">
                                <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md border border-emerald-400/30 px-6 py-2.5 rounded-full text-emerald-300 text-sm font-bold mb-10 tracking-widest uppercase shadow-xl">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    {ev.badge || 'El Futuro es Hoy'}
                                </div>
                                <h3 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight leading-[0.9]"
                                    dangerouslySetInnerHTML={{ __html: ev.title || 'Descubre Nuestro <br /> <span className="text-emerald-400">Inventario Eléctrico</span>' }}>
                                </h3>
                                <p className="text-xl md:text-2xl text-slate-300 mb-12 font-medium leading-relaxed mx-auto max-w-2xl">
                                    {ev.description || 'Autonomía excepcional, tecnología punta y cero emisiones. Da el paso hacia la movilidad sustentable.'}
                                </p>
                            </div>

                            <Link
                                href={ev.ctaLink || '/search?bodyType=electric'}
                                className="group relative inline-flex items-center justify-center gap-4 bg-emerald-500 hover:bg-emerald-400 text-white px-12 py-6 rounded-2xl font-black text-xl transition-all duration-500 shadow-[0_20px_40px_-10px_rgba(16,185,129,0.5)] hover:shadow-[0_25px_50px_-10px_rgba(16,185,129,0.6)] hover:-translate-y-2 active:scale-95"
                            >
                                <span>{ev.ctaText || 'Ver Modelos EV'}</span>
                                <svg className="w-6 h-6 transition-transform group-hover:translate-x-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                </svg>
                            </Link>
                        </div>

                        {/* Decoración 3D */}
                        <div className="absolute -bottom-20 -right-20 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] z-0 pointer-events-none"></div>
                        <div className="absolute -top-20 -left-20 w-[400px] h-[400px] bg-teal-500/10 rounded-full blur-[100px] z-0 pointer-events-none"></div>
                    </div>


                </div>
            </div>
        </section>
    );
}
