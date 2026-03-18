'use client';

import Link from 'next/link';

const PROMO_CARDS = [
    {
        id: 1,
        title: 'Financiamiento al 0%',
        description: 'Aprovecha nuestras tasas exclusivas para modelos 2024 seleccionados. ¡Solo por tiempo limitado!',
        icon: '💰',
        color: 'bg-green-50 text-green-700 border-green-200',
        link: '/finance',
        cta: 'Ver Opciones'
    },
    {
        id: 2,
        title: 'Seguro de Auto Incluido',
        description: 'Compra tu auto certificado y recibe 3 meses de seguro gratuito con nuestros partners.',
        icon: '🛡️',
        color: 'bg-blue-50 text-blue-700 border-blue-200',
        link: '/insurance',
        cta: 'Más Detalles'
    },
    {
        id: 3,
        title: 'Bono de Trade-In',
        description: 'Te damos $500 extra sobre el valor de mercado al cambiar tu auto usado con nosotros.',
        icon: '🚗',
        color: 'bg-purple-50 text-purple-700 border-purple-200',
        link: '/sell',
        cta: 'Valorar mi Auto'
    }
];

export default function PromotionsCarousel() {
    return (
        <section className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-900">Promociones Especiales</h2>
                        <p className="text-gray-600 mt-2">Ahorra más con nuestras ofertas exclusivas</p>
                    </div>
                    <Link href="/promotions" className="hidden md:inline-flex text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                        Ver todas las ofertas →
                    </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PROMO_CARDS.map((promo) => (
                        <div key={promo.id} className={`rounded-2xl p-6 border-2 ${promo.color} hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1`}>
                            <div className="text-4xl mb-4">{promo.icon}</div>
                            <h3 className="text-xl font-bold mb-3">{promo.title}</h3>
                            <p className="text-sm opacity-90 mb-6 leading-relaxed">
                                {promo.description}
                            </p>
                            <Link
                                href={promo.link}
                                className="inline-block w-full py-3 bg-white/50 hover:bg-white text-center rounded-xl font-bold backdrop-blur-sm transition-colors border border-current"
                            >
                                {promo.cta}
                            </Link>
                        </div>
                    ))}
                </div>

                <div className="mt-8 text-center md:hidden">
                    <Link href="/promotions" className="text-blue-600 font-semibold text-lg">
                        Ver todas las ofertas →
                    </Link>
                </div>
            </div>
        </section>
    );
}
