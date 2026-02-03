'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'dealer' | 'seller';
  tenantId: string;
  tenantName: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
}

export default function AssignPromotionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'dealer' | 'seller'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [pricingConfig, setPricingConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    promotionScope: 'vehicle' as 'vehicle' | 'dealer' | 'seller',
    vehicleId: '',
    duration: 7,
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchUsers();
    fetchPricingConfig();
  }, [filterRole]);

  useEffect(() => {
    if (selectedUser) {
      const user = users.find(u => u.id === selectedUser);
      if (user) {
        setSelectedTenantId(user.tenantId);
        if (formData.promotionScope === 'vehicle') {
          fetchVehicles(user.tenantId);
        }
      }
    }
  }, [selectedUser, formData.promotionScope]);

  async function fetchUsers() {
    try {
      const url = filterRole === 'all' 
        ? '/api/admin/users/list'
        : `/api/admin/users/list?role=${filterRole}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function fetchPricingConfig() {
    try {
      const response = await fetch('/api/admin/pricing-config');
      if (response.ok) {
        const data = await response.json();
        setPricingConfig(data.config);
        // Establecer primera duración disponible por defecto
        if (data.config?.promotions?.vehicle?.durations?.length > 0) {
          setFormData(prev => ({
            ...prev,
            duration: data.config.promotions.vehicle.durations[0],
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching pricing config:', error);
    }
  }

  async function fetchVehicles(tenantId: string) {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/vehicles`);
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedUser) {
      alert('Por favor selecciona un usuario');
      return;
    }

    const selectedUserData = users.find(u => u.id === selectedUser);
    if (!selectedUserData) {
      alert('Usuario no válido');
      return;
    }

    if (formData.promotionScope === 'vehicle' && !formData.vehicleId) {
      alert('Por favor selecciona un vehículo');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/admin/promotions/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          assignedToUserId: selectedUser,
          assignedToTenantId: selectedUserData.tenantId,
          assignedToRole: selectedUserData.role,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert('Promoción asignada exitosamente. El usuario recibirá una notificación para realizar el pago.');
        router.push('/admin/all-promotions');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al asignar la promoción'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const getAvailableDurations = () => {
    if (!pricingConfig) return [];
    return pricingConfig.promotions?.[formData.promotionScope]?.durations || [];
  };

  const getPrice = () => {
    if (!pricingConfig) return 0;
    return pricingConfig.promotions?.[formData.promotionScope]?.prices?.[formData.duration] || 0;
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Asignar Promoción Premium</h1>
        <p className="text-gray-600">Crea una promoción premium y asígnala a un dealer o vendedor para que realice el pago</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Selección de Usuario */}
        <div>
          <label className="block text-sm font-medium mb-2">Filtrar por rol</label>
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setFilterRole('all')}
              className={`px-4 py-2 rounded ${filterRole === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('dealer')}
              className={`px-4 py-2 rounded ${filterRole === 'dealer' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              Dealers
            </button>
            <button
              type="button"
              onClick={() => setFilterRole('seller')}
              className={`px-4 py-2 rounded ${filterRole === 'seller' ? 'bg-primary-600 text-white' : 'bg-gray-200'}`}
            >
              Vendedores
            </button>
          </div>
          <label className="block text-sm font-medium mb-2">Usuario a asignar *</label>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Selecciona un usuario</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email}) - {user.role === 'dealer' ? 'Dealer' : 'Vendedor'} - {user.tenantName}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Promoción */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Promoción *</label>
          <select
            value={formData.promotionScope}
            onChange={(e) => {
              const scope = e.target.value as 'vehicle' | 'dealer' | 'seller';
              setFormData({ ...formData, promotionScope: scope, vehicleId: '' });
              if (selectedTenantId && scope === 'vehicle') {
                fetchVehicles(selectedTenantId);
              }
            }}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="vehicle">Promoción de Vehículo</option>
            <option value="dealer">Promoción de Dealer</option>
            <option value="seller">Promoción de Vendedor</option>
          </select>
        </div>

        {/* Selección de Vehículo (solo si es promoción de vehículo) */}
        {formData.promotionScope === 'vehicle' && (
          <div>
            <label className="block text-sm font-medium mb-2">Vehículo *</label>
            {vehicles.length === 0 ? (
              <p className="text-sm text-gray-500">Cargando vehículos...</p>
            ) : (
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              >
                <option value="">Selecciona un vehículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.price}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Nombre y Descripción */}
        <div>
          <label className="block text-sm font-medium mb-2">Nombre de la Promoción</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="Ej: Oferta Especial de Verano"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            placeholder="Descripción de la promoción"
          />
        </div>

        {/* Duración */}
        <div>
          <label className="block text-sm font-medium mb-2">Duración (días) *</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="w-full border rounded px-3 py-2"
            required
          >
            {getAvailableDurations().map((dur: number) => (
              <option key={dur} value={dur}>
                {dur} días - ${pricingConfig?.promotions?.[formData.promotionScope]?.prices?.[dur] || 0}
              </option>
            ))}
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Precio: ${getPrice()}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Asignando...' : 'Asignar Promoción'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}


