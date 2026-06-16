'use client';

export default function TrustPillars() {
    const pillars = [
        {
            icon: (
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Inventario Verificado',
            description: 'Cada vehículo es inspeccionado y verificado para garantizar tu seguridad y satisfacción.',
        },
        {
            icon: (
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
            title: 'Precios Transparentes',
            description: 'Sin tarifas ocultas. El precio que ves es el precio que pagas. Negociación justa asegurada.',
        },
        {
            icon: (
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            ),
            title: 'Compra Rápida y Fácil',
            description: 'Herramientas digitales para financiar, asegurar y comprar tu auto desde casa.',
        },
    ];

    return (
        <section className="py-16 bg-primary-50 border-t border-primary-100">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold text-gray-900">¿Por qué usar AutoDealers?</h2>
                    <p className="text-gray-600 mt-2">La forma más segura y moderna de comprar tu próximo auto.</p>
                </div>
                <div className="grid md:grid-cols-3 gap-8">
                    {pillars.map((pillar, idx) => (
                        <div key={idx} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 text-center hover:shadow-md transition-shadow">
                            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                {pillar.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">{pillar.title}</h3>
                            <p className="text-gray-600 leading-relaxed">{pillar.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
