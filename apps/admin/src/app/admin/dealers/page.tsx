'use client';

// Panel Admin: Gestión de Dealers (Aprobación y Control)

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Dealer {
  dealerId: string;
  ownerUid: string;
  name: string;
  membresia: string;
  aliasesUsed: number;
  aliasesLimit: number | null;
  approvedByAdmin: boolean;
  status: 'active' | 'suspended' | 'cancelled' | 'pending';
  subdomain?: string;
  createdAt: Date;
  approvedAt?: Date;
}

export default function DealersManagementPage() {
  const router = useRouter();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [aliasesLimit, setAliasesLimit] = useState<number | null>(null);

  useEffect(() => {
    fetchDealers();
  }, [filter]);

  async function fetchDealers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter === 'pending') {
        params.append('status', 'pending');
        params.append('approvedByAdmin', 'false');
      } else if (filter === 'approved') {
        params.append('approvedByAdmin', 'true');
      } else if (filter === 'rejected') {
        params.append('status', 'suspended');
        params.append('approvedByAdmin', 'false');
      }

      const response = await fetch(`/api/dealers?${params.toString()}`);
      const data = await response.json();

      if (response.ok) {
        setDealers(data.dealers || []);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(dealer: Dealer) {
    setSelectedDealer(dealer);
    setAliasesLimit(dealer.aliasesLimit ?? null);
    setShowApproveModal(true);
  }

  async function confirmApprove() {
    if (!selectedDealer) return;

    try {
      const response = await fetch(`/api/dealers/${selectedDealer.dealerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          aliasesLimit: aliasesLimit,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Dealer aprobado exitosamente');
        setShowApproveModal(false);
        setSelectedDealer(null);
        fetchDealers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving dealer:', error);
      alert('Error al aprobar dealer');
    }
  }

  async function handleReject(dealer: Dealer) {
    const reason = prompt('Razón del rechazo:');
    if (!reason) return;

    try {
      const response = await fetch(`/api/dealers/${dealer.dealerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Dealer rechazado');
        fetchDealers();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting dealer:', error);
      alert('Error al rechazar dealer');
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Dealers</h1>
        <p className="text-gray-600">Aprueba o rechaza dealers y gestiona sus membresías</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pendientes ({dealers.filter((d) => d.status === 'pending' && !d.approvedByAdmin).length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'approved' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Aprobados
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'rejected' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Rechazados
        </button>
      </div>

      {/* Lista de Dealers */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dealers...</p>
        </div>
      ) : dealers.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No hay dealers con este filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membresía
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aliases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dealers.map((dealer) => (
                <tr key={dealer.dealerId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{dealer.name}</div>
                    <div className="text-sm text-gray-500">{dealer.subdomain || dealer.dealerId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{dealer.membresia}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dealer.aliasesUsed} / {dealer.aliasesLimit ?? '∞'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        dealer.approvedByAdmin
                          ? 'bg-green-100 text-green-800'
                          : dealer.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {dealer.approvedByAdmin ? 'Aprobado' : dealer.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {!dealer.approvedByAdmin && dealer.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(dealer)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(dealer)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Aprobación */}
      {showApproveModal && selectedDealer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Aprobar Dealer</h2>
            <p className="text-gray-600 mb-4">
              ¿Estás seguro de aprobar a <strong>{selectedDealer.name}</strong>?
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Límite de Aliases
              </label>
              <input
                type="number"
                value={aliasesLimit ?? ''}
                onChange={(e) =>
                  setAliasesLimit(e.target.value === '' ? null : parseInt(e.target.value))
                }
                placeholder="Ilimitado (dejar vacío)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              <p className="text-xs text-gray-500 mt-1">
                Dejar vacío para ilimitado (solo Pro/Multi Dealer 3)
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={confirmApprove}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Aprobar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



