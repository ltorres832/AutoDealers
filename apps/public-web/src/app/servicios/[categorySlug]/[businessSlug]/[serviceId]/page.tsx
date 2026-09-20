'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicMarketingNav } from '@/components/PublicMarketingNav';
import LandingFooter from '@/components/LandingFooter';
import { BusinessLogo } from '@/components/BusinessLogo';
import { BusinessServiceCard } from '@/components/BusinessServiceCard';
import type { PublicAutomotiveBusiness, PublicBusinessService } from '@/lib/business-catalog';

export default function ServicioDetailPage() {
  const params = useParams<{ categorySlug: string; businessSlug: string; serviceId: string }>();
  const categorySlug = String(params.categorySlug || '');
  const businessSlug = String(params.businessSlug || '');
  const serviceId = String(params.serviceId || '');
  const [business, setBusiness] = useState<PublicAutomotiveBusiness | null>(null);
  const [service, setService] = useState<PublicBusinessService | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/public/servicios/${encodeURIComponent(categorySlug)}/${encodeURIComponent(businessSlug)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No encontrado');
        setBusiness(data.business);
        const found = (data.services || []).find((item: PublicBusinessService) => item.id === serviceId);
        if (!found) throw new Error('Servicio no encontrado');
        setService(found);
      })
      .catch((err) => setError(err.message));
  }, [categorySlug, businessSlug, serviceId]);

  const backHref = `/servicios/${categorySlug}/${businessSlug}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicMarketingNav showDefaultLinks backHref={backHref} backLabel="← Negocio" />
      <main className="max-w-4xl mx-auto px-4 py-12">
        {error ? <p className="text-red-600">{error}</p> : null}
        {business && service ? (
          <>
            <div className="flex items-center gap-3 mb-6">
              <BusinessLogo name={business.name} logoUrl={business.logoUrl} className="w-14 h-14" />
              <div>
                <Link href={backHref} className="text-sm font-bold text-primary-700 hover:underline">
                  {business.name}
                </Link>
                <p className="text-xs text-slate-500">{business.categoryName}</p>
              </div>
            </div>
            <BusinessServiceCard service={service} variant="detail" />
            <div className="mt-6">
              <Link
                href={backHref}
                className="inline-flex items-center rounded-xl bg-primary-600 text-white font-bold px-5 py-3 hover:bg-primary-700"
              >
                Pedir cita o cotización
              </Link>
            </div>
          </>
        ) : null}
      </main>
      <LandingFooter />
    </div>
  );
}
