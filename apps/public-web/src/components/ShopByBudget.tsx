'use client';

import Link from 'next/link';

const BUDGET_RANGES = [
    { label: 'Menos de $10k', max: 10000 },
    { label: '$10k - $20k', min: 10000, max: 20000 },
    { label: '$20k - $30k', min: 20000, max: 30000 },
    { label: '$30k - $50k', min: 30000, max: 50000 },
    { label: '$50k - $75k', min: 50000, max: 75000 },
    { label: 'Más de $75k', min: 75000 },
];

export default function ShopByBudget() {
    return (
        <section className="py-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">Busca por Presupuesto</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {BUDGET_RANGES.map((range, idx) => (
                        <Link
                            key={idx}
                            href={`/search?priceMin=${range.min || 0}&priceMax=${range.max || ''}`}
                            className="flex items-center justify-center px-4 py-3 border-2 border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:border-primary-600 hover:text-primary-600 hover:bg-primary-50 transition-all duration-200"
                        >
                            {range.label}
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
