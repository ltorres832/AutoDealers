'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface Seller {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: string;
  lastLogin?: string;
}

export default function SellersPage() {
  const { auth } = useAuth();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auth?.role === 'dealer') {
      fetchSellers();
    }
  }, [auth]);

  async function fetchSellers() {
    try {
      const response = await fetch('/api/sellers');
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function suspendSeller(sellerId: string) {
    if (!confirm('¿Estás seguro de suspender a este vendedor?')) return;

    try {
      const response = await fetch(`/api/sellers/${sellerId}/suspend`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('✅ Vendedor suspendido exitosamente');
        fetchSellers();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al suspender vendedor');
    }
  }

  async function reactivateSeller(sellerId: string) {
    try {
      const response = await fetch(`/api/sellers/${sellerId}/reactivate`, {
        method: 'POST',
      });

      if (response.ok) {
        alert('✅ Vendedor reactivado exitosamente');
        fetchSellers();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al reactivar vendedor');
    }
  }

  async function deleteSeller(sellerId: string) {
    if (!confirm('¿Estás seguro de eliminar a este vendedor? Esta acción no se puede deshacer.')) return;

    try {
      const response = await fetch(`/api/sellers/${sellerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        alert('✅ Vendedor eliminado exitosamente');
        fetchSellers();
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al eliminar vendedor');
    }
  }

  if (auth?.role !== 'dealer') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">Acceso Denegado</h2>
          <p className="text-red-700">Solo los dealers pueden gestionar vendedores.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Gestión de Vendedores</h1>
      <p className="text-gray-600 mb-8">
        Gestiona los vendedores a los que has dado acceso a la plataforma.
      </p>

      <div className="bg-white rounded-lg shadow">
        {sellers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No hay vendedores registrados
          </div>
        ) : (
          <div className="divide-y">
            {sellers.map((seller) => (
              <div key={seller.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-600 font-bold text-lg">
                          {seller.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{seller.name}</h3>
                        <p className="text-sm text-gray-600">{seller.email}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium ${
                              seller.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : seller.status === 'suspended'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {seller.status === 'active'
                              ? 'Activo'
                              : seller.status === 'suspended'
                              ? 'Suspendido'
                              : 'Eliminado'}
                          </span>
                          {seller.lastLogin && (
                            <span className="text-xs text-gray-500">
                              Último acceso: {new Date(seller.lastLogin).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {seller.status === 'active' ? (
                      <button
                        onClick={() => suspendSeller(seller.id)}
                        className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                      >
                        Suspender
                      </button>
                    ) : seller.status === 'suspended' ? (
                      <button
                        onClick={() => reactivateSeller(seller.id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Reactivar
                      </button>
                    ) : null}
                    {seller.status !== 'cancelled' && (
                      <button
                        onClick={() => deleteSeller(seller.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


