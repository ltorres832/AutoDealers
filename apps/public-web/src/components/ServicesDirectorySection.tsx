'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BusinessLogo } from '@/components/BusinessLogo';

type Category = { slug: string; name: string; description?: string; icon?: string };
type Business = {
  slug: string;
  name: string;
  categorySlug: string;
  categoryName?: string;
  municipality?: string;
  city?: string;
  mobileService?: boolean;
  verified?: boolean;
  description?: string;
  logoUrl?: string;
};

export default function ServicesDirectorySection() {
  const [enabled, setEnabled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);

  useEffect(() => {
    fetch('/api/public/servicios')
      .then((res) => res.json())
      .then((data) => {
        setEnabled(data.enabled === true);
        setCategories(Array.isArray(data.categories) ? data.categories.slice(0, 8) : []);
        setBusinesses(Array.isArray(data.businesses) ? data.businesses.slice(0, 8) : []);
      })
      .catch(() => {
        setEnabled(false);
      });
  }, []);

  if (!enabled) return null;

  return (
    <section id="servicios" className="py-20 bg-slate-50 border-t border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 border border-primary-100 rounded-full mb-6">
            <span className="text-primary-700 font-bold text-[10px] uppercase tracking-[0.2em]">
              Servicios
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
            Servicios para tu vehículo
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto font-medium">
            Talleres, gomeras, detailing y más. Solo negocios realmente registrados en AutoDealers.
          </p>
        </div>

        {categories.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/servicios/${cat.slug}`}
                className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-primary-400 hover:shadow-lg transition-all"
              >
                <div className="text-2xl mb-2">{cat.icon || '🚗'}</div>
                <div className="font-bold text-slate-900">{cat.name}</div>
              </Link>
            ))}
          </div>
        ) : null}

        {businesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {businesses.map((biz) => (
              <Link
                key={`${biz.categorySlug}-${biz.slug}`}
                href={`/servicios/${biz.categorySlug}/${biz.slug}`}
                className="bg-white rounded-2xl border border-slate-100 p-6 hover:border-primary-400 hover:shadow-xl transition-all"
              >
                <BusinessLogo name={biz.name} logoUrl={biz.logoUrl} className="w-full h-28 mb-4" />
                <h3 className="text-lg font-black text-slate-900 mb-1">{biz.name}</h3>
                <p className="text-sm text-slate-500 mb-3">
                  {biz.categoryName || biz.categorySlug}
                  {biz.municipality || biz.city ? ` · ${biz.municipality || biz.city}` : ''}
                </p>
                {biz.verified ? (
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary-700">
                    Verificado
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500">
            Aún no hay negocios publicados en esta categoría.
          </p>
        )}

        <div className="text-center mt-12">
          <Link
            href="/servicios"
            className="inline-flex items-center gap-2 text-primary-600 font-extrabold text-sm uppercase tracking-widest px-8 py-4 bg-white border-2 border-primary-100 rounded-2xl hover:border-primary-600"
          >
            Ver todos los servicios
          </Link>
        </div>
      </div>
    </section>
  );
}
