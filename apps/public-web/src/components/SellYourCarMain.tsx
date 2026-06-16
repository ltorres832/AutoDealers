'use client';

import Link from 'next/link';

export default function SellYourCarMain() {
    return (
        <section className="py-20 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
                    {/* Background Image Overlay */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560250056-07ba64664864?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-40"></div>

                    <div className="relative z-10 grid md:grid-cols-2 gap-12 p-12 md:p-20 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                                ¿Quieres vender tu auto?
                            </h2>
                            <p className="text-lg text-gray-200 mb-8 max-w-lg">
                                Obtén una oferta instantánea en minutos. Sin regateos, sin estrés. Vendelo directamente a nuestra red certificada o publícalo gratis.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/register?type=seller"
                                    className="px-8 py-4 bg-primary-600 text-white rounded-xl font-bold text-lg hover:bg-primary-700 transition-all shadow-lg hover:shadow-primary-500/50 text-center"
                                >
                                    Obtener Oferta Instantánea
                                </Link>
                                <Link
                                    href="/register?type=seller"
                                    className="px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/30 rounded-xl font-bold text-lg hover:bg-white/20 transition-all text-center"
                                >
                                    Vender por mi Cuenta
                                </Link>
                            </div>
                            <p className="text-sm text-primary-200 mt-4">
                                * Requiere cuenta verificada con membresía activa para publicar.
                            </p>
                        </div>

                        {/* Visual Fake 'Instant Offer' Widget */}
                        <div className="hidden md:block">
                            <div className="bg-white rounded-xl p-6 shadow-xl max-w-sm ml-auto rotate-1 hover:rotate-0 transition-transform duration-500">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-bold text-gray-900 border-b-2 border-yellow-400 pb-1">Oferta Estimada</h3>
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Válido por 7 días</span>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex gap-4 items-center">
                                        <div className="w-12 h-12 bg-gray-200 rounded-md"></div>
                                        <div>
                                            <div className="h-4 w-32 bg-gray-200 rounded mb-2"></div>
                                            <div className="h-3 w-20 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                    <div className="h-px bg-gray-100 my-4"></div>
                                    <div className="text-center">
                                        <div className="text-sm text-gray-500 mb-1">Tu auto podría valer hasta</div>
                                        <div className="text-4xl font-black text-green-600">$24,500</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
