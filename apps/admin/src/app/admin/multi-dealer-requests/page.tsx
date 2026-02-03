'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface MultiDealerRequest {
  userId: string;
  email: string;
  name: string;
  phone: string;
  membershipId: string;
  membershipName?: string;
  // Información de la empresa
  companyName: string;
  companyAddress: string;
  companyCity: string;
  companyState?: string;
  companyZip?: string;
  companyCountry: string;
  taxId?: string;
  // Información del negocio
  businessType?: string;
  numberOfLocations?: number;
  yearsInBusiness?: number;
  currentInventory?: number;
  expectedDealers: number;
  // Información adicional
  reasonForMultiDealer: string;
  additionalInfo?: string;
  // Estado
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  reviewNotes?: string;
  approvedUntil?: Date; // Fecha de expiración (48 horas después de aprobación)
}

export default function MultiDealerRequestsPage() {
  const router = useRouter();
  const [requests, setRequests] = useState<MultiDealerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'expired'>('all');
  const [selectedRequest, setSelectedRequest] = useState<MultiDealerRequest | null>(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  async function fetchRequests() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const token = localStorage.getItem('authToken') || 
                    document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];

      const response = await fetch(`/api/admin/multi-dealer-requests?${params.toString()}`, {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });

      const data = await response.json();

      if (response.ok) {
        setRequests(data.requests || []);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(request: MultiDealerRequest) {
    setSelectedRequest(request);
    setReviewNotes('');
    setShowApproveModal(true);
  }

  async function confirmApprove() {
    if (!selectedRequest) return;

    try {
      const token = localStorage.getItem('authToken') || 
                    document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];

      const response = await fetch(`/api/admin/multi-dealer-requests/${selectedRequest.userId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          reviewNotes,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Solicitud aprobada exitosamente. El usuario tendrá acceso por 48 horas.');
        setShowApproveModal(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error al aprobar solicitud');
    }
  }

  async function handleReject(request: MultiDealerRequest) {
    const reason = prompt('Razón del rechazo:');
    if (!reason) return;

    try {
      const token = localStorage.getItem('authToken') || 
                    document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1];

      const response = await fetch(`/api/admin/multi-dealer-requests/${request.userId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          reason,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Solicitud rechazada');
        fetchRequests();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error al rechazar solicitud');
    }
  }

  function getStatusBadge(status: string) {
    const badges = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-100 text-gray-800';
  }

  function formatDate(date: Date | string | undefined) {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleString('es-ES');
  }

  function getTimeRemaining(approvedUntil: Date | string | undefined) {
    if (!approvedUntil) return '-';
    const until = typeof approvedUntil === 'string' ? new Date(approvedUntil) : approvedUntil;
    const now = new Date();
    const diff = until.getTime() - now.getTime();
    
    if (diff <= 0) return 'Expirado';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Solicitudes Multi Dealer</h1>
        <p className="text-gray-600">Aprueba o rechaza solicitudes de acceso Multi Dealer (válido por 48 horas)</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'pending' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Pendientes ({requests.filter((r) => r.status === 'pending').length})
        </button>
        <button
          onClick={() => setFilter('approved')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'approved' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Aprobadas
        </button>
        <button
          onClick={() => setFilter('rejected')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'rejected' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Rechazadas
        </button>
        <button
          onClick={() => setFilter('expired')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'expired' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Expiradas
        </button>
      </div>

      {/* Lista de Solicitudes */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando solicitudes...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No hay solicitudes con este filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Solicitante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empresa
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Membresía
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealers Esperados
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiempo Restante
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.map((request) => (
                <tr key={request.userId}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{request.name}</div>
                    <div className="text-sm text-gray-500">{request.email}</div>
                    <div className="text-xs text-gray-400">{request.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{request.companyName}</div>
                    <div className="text-xs text-gray-500">
                      {request.companyCity}, {request.companyCountry}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.membershipName || request.membershipId}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{request.expectedDealers}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadge(request.status)}`}
                    >
                      {request.status === 'pending' ? 'Pendiente' : 
                       request.status === 'approved' ? 'Aprobada' :
                       request.status === 'rejected' ? 'Rechazada' : 'Expirada'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {request.status === 'approved' && request.approvedUntil
                        ? getTimeRemaining(request.approvedUntil)
                        : '-'}
                    </div>
                    {request.approvedUntil && (
                      <div className="text-xs text-gray-500">
                        Hasta: {formatDate(request.approvedUntil)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {request.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(request)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Rechazar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            // Mostrar detalles en modal
                            alert(`Detalles:\n\nRazón: ${request.reasonForMultiDealer}\n\nInformación adicional: ${request.additionalInfo || 'N/A'}`);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Ver
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
      {showApproveModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Aprobar Solicitud Multi Dealer</h2>
            
            <div className="mb-4 space-y-2">
              <p><strong>Solicitante:</strong> {selectedRequest.name} ({selectedRequest.email})</p>
              <p><strong>Empresa:</strong> {selectedRequest.companyName}</p>
              <p><strong>Membresía:</strong> {selectedRequest.membershipName || selectedRequest.membershipId}</p>
              <p><strong>Dealers esperados:</strong> {selectedRequest.expectedDealers}</p>
              <div className="mt-4">
                <p><strong>Razón:</strong></p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.reasonForMultiDealer}</p>
              </div>
              {selectedRequest.additionalInfo && (
                <div className="mt-2">
                  <p><strong>Información adicional:</strong></p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">{selectedRequest.additionalInfo}</p>
                </div>
              )}
            </div>

            <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ <strong>Importante:</strong> Al aprobar esta solicitud, el usuario tendrá acceso a las membresías Multi Dealer por <strong>48 horas</strong>. 
                Después de ese tiempo, deberá solicitar acceso nuevamente.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas de Revisión (opcional)
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600"
                rows={3}
                placeholder="Notas internas sobre esta aprobación..."
              />
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
                Aprobar (48 horas de acceso)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



