'use client';

import { useState, useEffect } from 'react';

interface Promotion {
    id: string;
    title: string;
    description: string;
    imageUrl?: string;
    discountValue?: string;
    endDate?: string;
}

export default function PremiumPromotions() {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchPromotions() {
            try {
                const response = await fetch('/api/public/promotions?limit=4');
                if (response.ok) {
                    const data = await response.json();
                    setPromotions(data.promotions || []);
                }
            } catch (error) {
                console.error('Error fetching promotions:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchPromotions();
    }, []);

    if (loading && promotions.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-[400px] rounded-3xl bg-slate-100 animate-pulse"></div>
                ))}
            </div>
        );
    }

    // Fallback if no promotions
    if (promotions.length === 0) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <PromotionCard
                    title="Financiamiento 0%"
                    description="Aprovecha tasa preferencial del 0% en modelos seleccionados."
                    badge="Limitado"
                    icon="🏦"
                    color="from-blue-600 to-indigo-700"
                />
                <PromotionCard
                    title="Bono de $2,000"
                    description="Recibe un bono directo en tu primer pago al entregar tu auto usado."
                    badge="Especial"
                    icon="💰"
                    color="from-emerald-500 to-teal-700"
                />
                <PromotionCard
                    title="Mantenimiento Gratis"
                    description="2 años de servicios de mantenimiento preventivo incluidos."
                    badge="Premium"
                    icon="🛠️"
                    color="from-amber-500 to-orange-600"
                />
                <PromotionCard
                    title="Seguro Incluido"
                    description="Tu primer año de seguro de cobertura total va por nuestra cuenta."
                    badge="VIP"
                    icon="🛡️"
                    color="from-slate-700 to-slate-900"
                />
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {promotions.map((promo) => (
                <div key={promo.id} className="group relative h-[400px] rounded-[2.5rem] overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-slate-200">
                    {promo.imageUrl ? (
                        <img src={promo.imageUrl} alt={promo.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-950"></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>

                    <div className="absolute top-6 left-6">
                        <span className="px-4 py-1.5 bg-white/90 backdrop-blur-md rounded-full text-slate-900 text-[10px] font-black tracking-widest uppercase shadow-lg">
                            Oferta Activa
                        </span>
                    </div>

                    <div className="absolute bottom-8 left-8 right-8 text-white">
                        <h4 className="text-2xl font-black mb-3 leading-tight group-hover:text-blue-400 transition-colors">
                            {promo.title}
                        </h4>
                        <p className="text-slate-300 text-sm line-clamp-2 mb-6 font-medium">
                            {promo.description}
                        </p>
                        <button className="w-full py-4 bg-white/10 hover:bg-white backdrop-blur-md text-white hover:text-slate-950 rounded-2xl font-bold text-sm transition-all border border-white/20 hover:border-white">
                            Saber Más
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}

function PromotionCard({ title, description, badge, icon, color }: any) {
    return (
        <div className="group relative h-[450px] rounded-[3rem] overflow-hidden shadow-2xl hover:shadow-blue-500/20 transition-all duration-700 hover:-translate-y-4">
            <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-90 group-hover:opacity-100 transition-opacity`}></div>
            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center text-white z-10">
                <div className="text-7xl mb-8 transform group-hover:scale-110 transition-transform duration-500">{icon}</div>
                <span className="px-4 py-1 bg-black/20 rounded-full text-[10px] font-black tracking-[0.2em] uppercase mb-6 border border-white/10">
                    {badge}
                </span>
                <h4 className="text-3xl font-black mb-4 leading-tight">
                    {title}
                </h4>
                <p className="text-white/80 text-base font-medium leading-relaxed mb-8">
                    {description}
                </p>
                <div className="mt-auto px-8 py-4 bg-white text-slate-900 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95 shadow-xl">
                    Ver Detalles
                </div>
            </div>
            {/* Animated decor */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
            <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-black/10 rounded-full blur-3xl transition-all duration-700"></div>
        </div>
    );
}
