'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Dealer {
  id: string;
  name: string;
  email?: string;
  status: string;
  subdomain?: string;
  createdAt: string;
}

export default function DealersManagementPage() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [membershipInfo, setMembershipInfo] = useState<any>(null);

  useEffect(() => {
    fetchMembershipInfo();
    fetchDealers();
  }, []);

  async function fetchMembershipInfo() {
    try {
      const response = await fetch('/api/settings/membership');
      if (response.ok) {
        const data = await response.json();
        setMembershipInfo(data.membership);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchDealers() {
    setLoading(true);
    try {
      const response = await fetch('/api/dealers');
      if (response.ok) {
        const data = await response.json();
        setDealers(data.dealers || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  const canAddDealers = membershipInfo?.features?.multipleDealers || false;
  const maxDealers = membershipInfo?.features?.maxDealers || 1;

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Dealers</h1>
          <p className="text-gray-600 mt-2">
            {canAddDealers 
              ? `Gestiona múltiples dealers desde una sola cuenta (${dealers.length}/${maxDealers === -1 ? '∞' : maxDealers})`
              : 'Tu membresía actual no permite gestionar múltiples dealers'
            }
          </p>
        </div>
        {canAddDealers && (maxDealers === -1 || dealers.length < maxDealers) && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Agregar Dealer
          </button>
        )}
      </div>

      {!canAddDealers && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-yellow-800">
            ⚠️ Tu membresía actual no permite gestionar múltiples dealers. 
            <Link href="/settings/membership" className="underline ml-1">
              Actualiza tu membresía
            </Link> para acceder a esta funcionalidad.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dealers.map((dealer) => (
          <div key={dealer.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold">{dealer.name}</h3>
                {dealer.subdomain && (
                  <p className="text-sm text-gray-600">{dealer.subdomain}.autodealers.com</p>
                )}
              </div>
              <span
                className={`px-3 py-1 rounded text-xs ${
                  dealer.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {dealer.status === 'active' ? 'Activo' : 'Inactivo'}
              </span>
            </div>

            <div className="flex gap-2">
              <Link
                href={`/dealers/${dealer.id}/dashboard`}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-center text-sm"
              >
                Ver Dashboard
              </Link>
              <button
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm"
              >
                Configurar
              </button>
            </div>
          </div>
        ))}

        {dealers.length === 0 && (
          <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4">No hay dealers adicionales asociados</p>
            {canAddDealers && (
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
              >
                Agregar primer dealer
              </button>
            )}
          </div>
        )}
      </div>

      {showAddModal && (
        <AddDealerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchDealers();
          }}
          currentCount={dealers.length}
          maxDealers={maxDealers}
        />
      )}
    </div>
  );
}

function AddDealerModal({
  onClose,
  onSuccess,
  currentCount,
  maxDealers,
}: {
  onClose: () => void;
  onSuccess: () => void;
  currentCount: number;
  maxDealers: number;
}) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subdomain: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/dealers/associate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        alert('Dealer asociado exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al asociar dealer');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al asociar dealer');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Agregar Dealer</h2>
          <p className="text-sm text-gray-600 mt-1">
            Asocia un dealer existente a tu cuenta
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre del Dealer *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Email del Dealer *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="email@dealer.com"
            />
            <p className="text-xs text-gray-500 mt-1">
              El dealer debe existir en el sistema con este email
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Asociando...' : 'Asociar Dealer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



