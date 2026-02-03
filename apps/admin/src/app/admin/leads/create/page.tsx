'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BackButton from '@/components/BackButton';

interface Dealer {
  id: string;
  name: string;
  email: string;
  companyName: string;
  subdomain: string;
}

interface Seller {
  id: string;
  name: string;
  email: string;
  tenantId: string;
  dealerId: string | null;
  status: string;
}

export default function CreateLeadPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [filteredSellers, setFilteredSellers] = useState<Seller[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    source: 'admin_manual',
    notes: '',
    vehicleInterest: '',
    budget: '',
    assignmentType: '' as 'dealer' | 'seller' | '',
    dealerId: '',
    sellerId: '',
  });

  // Cargar dealers al montar
  useEffect(() => {
    fetchDealers();
    fetchSellers();
  }, []);

  // Cuando cambia el dealer seleccionado, filtrar vendedores
  useEffect(() => {
    if (formData.assignmentType === 'seller' && formData.dealerId) {
      const filtered = sellers.filter((s) => s.tenantId === formData.dealerId);
      setFilteredSellers(filtered);
    } else {
      setFilteredSellers(sellers);
    }
  }, [formData.dealerId, formData.assignmentType, sellers]);

  async function fetchDealers() {
    try {
      const response = await fetch('/api/admin/dealers/list');
      const data = await response.json();
      setDealers(data.dealers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function fetchSellers() {
    try {
      const response = await fetch('/api/admin/sellers/list');
      const data = await response.json();
      setSellers(data.sellers || []);
      setFilteredSellers(data.sellers || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/admin/leads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear lead');
      }

      alert(data.message || 'Lead creado exitosamente');
      router.push('/admin/all-leads');
    } catch (error: any) {
      console.error('Error:', error);
      alert(error.message || 'Error al crear lead');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton href="/admin/all-leads" label="Volver a Leads" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Lead Manualmente</h1>
        <p className="text-gray-600">
          Crea un lead y asígnalo directamente a un dealer o vendedor
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Información del Lead */}
          <div className="border-b pb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              📋 Información del Lead
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono *
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehículo de Interés
                </label>
                <input
                  type="text"
                  value={formData.vehicleInterest}
                  onChange={(e) => setFormData({ ...formData, vehicleInterest: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: Toyota Camry 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Presupuesto
                </label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej: $25,000 - $30,000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Información adicional..."
                />
              </div>
            </div>
          </div>

          {/* Asignación */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              🎯 Asignación
            </h2>

            <div className="space-y-4">
              {/* Tipo de Asignación */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Asignar a: *
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        assignmentType: 'dealer',
                        sellerId: '',
                      })
                    }
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignmentType === 'dealer'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🏢</div>
                    <div className="font-semibold">Dealer</div>
                    <div className="text-xs text-gray-500">
                      El dealer lo asignará después
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        assignmentType: 'seller',
                      })
                    }
                    className={`p-4 border-2 rounded-lg transition-all ${
                      formData.assignmentType === 'seller'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">👤</div>
                    <div className="font-semibold">Vendedor</div>
                    <div className="text-xs text-gray-500">
                      Asignar directamente
                    </div>
                  </button>
                </div>
              </div>

              {/* Selector de Dealer (siempre visible si se seleccionó dealer o seller) */}
              {formData.assignmentType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {formData.assignmentType === 'dealer'
                      ? 'Seleccionar Dealer *'
                      : 'Seleccionar Dealer (para filtrar vendedores)'}
                  </label>
                  <select
                    value={formData.dealerId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dealerId: e.target.value,
                        sellerId: '', // Reset seller cuando cambia dealer
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required={formData.assignmentType === 'dealer'}
                  >
                    <option value="">-- Selecciona un dealer --</option>
                    {dealers.map((dealer) => (
                      <option key={dealer.id} value={dealer.id}>
                        {dealer.name}
                        {dealer.companyName && ` (${dealer.companyName})`}
                      </option>
                    ))}
                  </select>
                  {formData.assignmentType === 'seller' && !formData.dealerId && (
                    <p className="text-xs text-gray-500 mt-1">
                      Opcional: filtra vendedores por dealer
                    </p>
                  )}
                </div>
              )}

              {/* Selector de Vendedor (solo si assignmentType es 'seller') */}
              {formData.assignmentType === 'seller' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seleccionar Vendedor *
                  </label>
                  <select
                    value={formData.sellerId}
                    onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">-- Selecciona un vendedor --</option>
                    {filteredSellers.map((seller) => (
                      <option key={seller.id} value={seller.id}>
                        {seller.name} ({seller.email})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.dealerId
                      ? `Mostrando ${filteredSellers.length} vendedores del dealer seleccionado`
                      : `Mostrando todos los vendedores (${filteredSellers.length})`}
                  </p>
                </div>
              )}

              {/* Información de asignación */}
              {formData.assignmentType && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    {formData.assignmentType === 'dealer' ? (
                      <>
                        <strong>💡 Asignación a Dealer:</strong> El lead se asignará al dealer
                        seleccionado. El dealer podrá verlo en su dashboard y reasignarlo a uno
                        de sus vendedores.
                      </>
                    ) : (
                      <>
                        <strong>💡 Asignación Directa:</strong> El lead se asignará directamente
                        al vendedor seleccionado y aparecerá en su dashboard.
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.assignmentType}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

