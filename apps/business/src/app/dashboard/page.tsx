'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { RequestSalesOrientation } from '@/components/RequestSalesOrientation';

const LINKS = [
  { href: '/dashboard/leads', label: 'CRM / Leads', key: 'leads' },
  { href: '/dashboard/appointments', label: 'Citas', key: 'appointments' },
  { href: '/dashboard/services', label: 'Servicios', key: 'services' },
  { href: '/dashboard/estimates', label: 'Estimados', key: 'estimates' },
  { href: '/dashboard/invoices', label: 'Facturas', key: 'invoices' },
];

export default function BusinessDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState({ leads: 0, appointments: 0, services: 0, estimates: 0, invoices: 0 });

  useEffect(() => {
    fetch('/api/business/me').then((r) => r.json()).then(setData).catch(() => undefined);
    Promise.all([
      fetch('/api/business/leads').then((r) => r.json()),
      fetch('/api/business/appointments').then((r) => r.json()),
      fetch('/api/business/services').then((r) => r.json()),
      fetch('/api/business/estimates').then((r) => r.json()),
      fetch('/api/business/invoices').then((r) => r.json()),
    ]).then(([leads, appointments, services, estimates, invoices]) => {
      setCounts({
        leads: (leads.leads || []).length,
        appointments: (appointments.appointments || []).length,
        services: (services.services || []).length,
        estimates: (estimates.estimates || []).length,
        invoices: (invoices.invoices || []).length,
      });
    }).catch(() => undefined);
  }, []);

  const published = data?.business?.published === true;

  return (
    <DashboardLayout>
      <div className="flex items-center gap-4 mb-2">
        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border flex items-center justify-center">
          {data?.business?.logoUrl ? (
            <img src={data.business.logoUrl} alt={data.business.name || 'Perfil'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-2xl text-slate-400">{String(data?.business?.name || 'N').charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="text-3xl font-black">{data?.business?.name || 'Inicio'}</h1>
          <p className="text-slate-600">{data?.business?.categoryName || 'Negocio automotriz'}</p>
        </div>
      </div>
      <p className="text-slate-600 mb-8">
        {published
          ? 'Tu ficha está publicada. Usa el menú para citas, servicios, estimados, facturas y CRM.'
          : 'Completa el perfil (con foto visible) y publícalo. Admin también puede publicarlo.'}
      </p>
      <RequestSalesOrientation />
      {!data?.business?.logoUrl ? (
        <Link href="/dashboard/profile" className="block mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 font-semibold">
          Falta la foto del negocio. Súbela en Perfil público para que los clientes te reconozcan.
        </Link>
      ) : null}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {LINKS.map((item) => (
          <Link key={item.key} href={item.href} className="bg-white rounded-2xl border p-5 hover:border-primary-300">
            <div className="text-sm text-slate-500">{item.label}</div>
            <div className="text-3xl font-black">{counts[item.key as keyof typeof counts]}</div>
          </Link>
        ))}
        <div className="bg-white rounded-2xl border p-5">
          <div className="text-sm text-slate-500">Estado</div>
          <div className="text-xl font-bold">{published ? 'Publicado' : 'Borrador'}</div>
        </div>
        <Link href="/dashboard/payments" className="bg-white rounded-2xl border p-5 hover:border-primary-300 md:col-span-3">
          <div className="text-sm text-slate-500">Cobros AutoDealers</div>
          <div className="text-xl font-bold">Solicitar o ver tarifas</div>
          <p className="text-sm text-slate-600 mt-1">
            Opcional. Acuerdo, tarifas de tarjeta 3.5%, Klarna 10% y Affirm 10%, y el estado de tu solicitud.
          </p>
        </Link>
      </div>
    </DashboardLayout>
  );
}
