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

export default function AssignBannerPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [filterRole, setFilterRole] = useState<'all' | 'dealer' | 'seller'>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ctaText: 'Ver más',
    linkType: 'filter' as 'vehicle' | 'dealer' | 'seller' | 'filter',
    linkValue: '',
    imageUrl: '',
    duration: 7,
  });

  useEffect(() => {
    fetchUsers();
  }, [filterRole]);

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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);

      const response = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, imageUrl: data.url }));
      } else {
        alert('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir la imagen');
    } finally {
      setUploading(false);
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

    setLoading(true);
    try {
      const response = await fetch('/api/admin/banners/assign', {
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
        alert('Banner asignado exitosamente. El usuario recibirá una notificación para realizar el pago.');
        router.push('/admin/banners');
      } else {
        const error = await response.json();
        alert(`Error: ${error.error || 'Error al asignar el banner'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  const prices: Record<number, number> = {
    7: 99,
    15: 149,
    30: 299,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Asignar Banner Premium</h1>
        <p className="text-gray-600">Crea un banner premium y asígnalo a un dealer o vendedor para que realice el pago</p>
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

        {/* Información del Banner */}
        <div>
          <label className="block text-sm font-medium mb-2">Título *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            placeholder="Ej: Oferta Especial de Verano"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Descripción *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={3}
            required
            placeholder="Descripción del banner"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Texto del CTA</label>
          <input
            type="text"
            value={formData.ctaText}
            onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
            className="w-full border rounded px-3 py-2"
            placeholder="Ej: Ver más"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Enlace</label>
            <select
              value={formData.linkType}
              onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="filter">Filtro</option>
              <option value="vehicle">Vehículo</option>
              <option value="dealer">Dealer</option>
              <option value="seller">Vendedor</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Valor del Enlace</label>
            <input
              type="text"
              value={formData.linkValue}
              onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="ID o valor del enlace"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Imagen *</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full border rounded px-3 py-2"
            required
          />
          {uploading && <p className="text-sm text-gray-500 mt-2">Subiendo imagen...</p>}
          {formData.imageUrl && (
            <div className="mt-4">
              <img src={formData.imageUrl} alt="Preview" className="max-w-md rounded" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Duración (días) *</label>
          <select
            value={formData.duration}
            onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="7">7 días - ${prices[7]}</option>
            <option value="15">15 días - ${prices[15]}</option>
            <option value="30">30 días - ${prices[30]}</option>
          </select>
          <p className="text-sm text-gray-500 mt-1">
            Precio: ${prices[formData.duration]}
          </p>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? 'Asignando...' : 'Asignar Banner'}
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


