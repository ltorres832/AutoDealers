'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRealtimeAdvertisers } from '@/hooks/useRealtimeAdvertisers';

interface Advertiser {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone?: string;
  website?: string;
  industry: string;
  status: string;
  plan: string;
  createdAt: string;
}

export default function AdminAdvertisersPage() {
  const { advertisers, loading } = useRealtimeAdvertisers();

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      suspended: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800',
    };
    const labels = {
      pending: 'Pendiente',
      active: 'Activo',
      suspended: 'Suspendido',
      cancelled: 'Cancelado',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  function getPlanBadge(plan: string) {
    const styles = {
      starter: 'bg-blue-100 text-blue-800',
      professional: 'bg-purple-100 text-purple-800',
      premium: 'bg-yellow-100 text-yellow-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[plan as keyof typeof styles]}`}>
        {plan.toUpperCase()}
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Anunciantes</h1>
          <p className="text-gray-600">Gestiona las empresas externas que anuncian en la plataforma</p>
        </div>
        <Link
          href="/admin/advertisers/create"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
        >
          + Crear anunciante
        </Link>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold text-gray-900">{advertisers.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Activos</div>
          <div className="text-2xl font-bold text-green-600">
            {advertisers.filter((a) => a.status === 'active').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600">
            {advertisers.filter((a) => a.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Suspendidos</div>
          <div className="text-2xl font-bold text-red-600">
            {advertisers.filter((a) => a.status === 'suspended').length}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando anunciantes...</p>
        </div>
      ) : advertisers.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">💼</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay anunciantes</h3>
          <p className="text-gray-600">Aún no se han registrado empresas externas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Industria</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {advertisers.map((advertiser) => (
                <tr key={advertiser.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{advertiser.companyName}</div>
                    <div className="text-xs text-gray-500">ID: {advertiser.id}</div>
                    {advertiser.website && (
                      <a
                        href={advertiser.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {advertiser.website}
                      </a>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{advertiser.contactName}</div>
                    <div className="text-sm text-gray-500">{advertiser.email}</div>
                    {advertiser.phone && (
                      <div className="text-sm text-gray-500">{advertiser.phone}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {advertiser.industry}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPlanBadge(advertiser.plan)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(advertiser.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/admin/advertisers/${advertiser.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Ver
                    </Link>
                    {advertiser.status === 'pending' && (
                      <button
                        onClick={async () => {
                          const response = await fetch(`/api/admin/advertisers/${advertiser.id}/approve`, {
                            method: 'POST',
                          });
                          if (response.ok) {
                            alert('Anunciante aprobado');
                          }
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        Aprobar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

