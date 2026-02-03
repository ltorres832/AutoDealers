'use client';

import { useState, useEffect } from 'react';

interface Seller {
  id: string;
  name: string;
  email: string;
}

interface LeadAssignmentModalProps {
  leadId: string;
  leadName: string;
  currentSeller?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadAssignmentModal({
  leadId,
  leadName,
  currentSeller,
  onClose,
  onSuccess,
}: LeadAssignmentModalProps) {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  async function fetchSellers() {
    try {
      const response = await fetch('/api/sellers');
      const data = await response.json();
      setSellers(data.sellers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleAssign() {
    if (!selectedSeller) {
      alert('Debes seleccionar un vendedor');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/leads/${leadId}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerId: selectedSeller }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al asignar lead');
      }

      alert(data.message || 'Lead asignado exitosamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al asignar lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-4">Asignar Lead</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            <strong>Lead:</strong> {leadName}
          </p>
          {currentSeller && (
            <p className="text-sm text-gray-600">
              <strong>Asignado actualmente a:</strong> {currentSeller}
            </p>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleccionar Vendedor *
          </label>
          <select
            value={selectedSeller}
            onChange={(e) => setSelectedSeller(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Selecciona un vendedor --</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.name} ({seller.email})
              </option>
            ))}
          </select>
          {sellers.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No tienes vendedores. Crea uno primero.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedSeller}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Asignando...' : 'Asignar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default LeadAssignmentModal;


