'use client';

import { useState } from 'react';

export default function MultiIdentityUserPage() {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    passwordSeller: '',
    passwordAdmin: '',
    sellerTenantId: '',
    adminTenantIds: [] as string[],
    permissions: {
      canManageInventory: true,
      canManageLeads: true,
      canManageSellers: false,
      canManageCampaigns: true,
      canManagePromotions: true,
      canManageSettings: true,
      canManageIntegrations: true,
      canViewReports: true,
      canManageUsers: false,
    },
  });

  async function createMultiIdentityUser() {
    if (!formData.email || !formData.name || !formData.passwordSeller || !formData.passwordAdmin) {
      alert('Todos los campos son requeridos');
      return;
    }

    if (formData.adminTenantIds.length === 0) {
      alert('Debes seleccionar al menos un dealer para la identidad de admin');
      return;
    }

    try {
      const response = await fetch('/api/users/multi-identity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          passwordSeller: formData.passwordSeller,
          passwordAdmin: formData.passwordAdmin,
          sellerData: {
            tenantId: formData.sellerTenantId,
          },
          adminData: {
            tenantIds: formData.adminTenantIds,
            permissions: formData.permissions,
          },
        }),
      });

      if (response.ok) {
        alert('Usuario con identidades múltiples creado exitosamente. El usuario tendrá dos credenciales: una para vendedor y otra para administrador.');
        // Reset form
        setFormData({
          email: '',
          name: '',
          passwordSeller: '',
          passwordAdmin: '',
          sellerTenantId: '',
          adminTenantIds: [],
          permissions: {
            canManageInventory: true,
            canManageLeads: true,
            canManageSellers: false,
            canManageCampaigns: true,
            canManagePromotions: true,
            canManageSettings: true,
            canManageIntegrations: true,
            canViewReports: true,
            canManageUsers: false,
          },
        });
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Error al crear usuario'));
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear usuario');
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Usuario Multi-Identidad</h1>
        <p className="text-gray-600">
          Crea un usuario que tenga credenciales separadas como vendedor y como administrador del dealer
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Información General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Juan Pérez"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Email Base</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="usuario@ejemplo.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Se crearán dos credenciales: {formData.email || 'email'}+seller y {formData.email || 'email'}+admin
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Credenciales de Vendedor</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Contraseña para Vendedor</label>
              <input
                type="password"
                value={formData.passwordSeller}
                onChange={(e) => setFormData({ ...formData, passwordSeller: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tenant de Vendedor</label>
              <input
                type="text"
                value={formData.sellerTenantId}
                onChange={(e) => setFormData({ ...formData, sellerTenantId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="ID del tenant del vendedor"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h2 className="text-xl font-semibold mb-4">Credenciales de Administrador</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Contraseña para Administrador</label>
              <input
                type="password"
                value={formData.passwordAdmin}
                onChange={(e) => setFormData({ ...formData, passwordAdmin: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Mínimo 6 caracteres (puede ser diferente a la de vendedor)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Permisos de Administrador</label>
              <div className="space-y-2 border rounded p-3">
                {Object.entries(formData.permissions).map(([key, value]) => (
                  <label key={key} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          permissions: {
                            ...formData.permissions,
                            [key]: e.target.checked,
                          },
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm">
                      {key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim()}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <button
            onClick={createMultiIdentityUser}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            Crear Usuario Multi-Identidad
          </button>
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">Nota importante:</h3>
        <p className="text-sm text-blue-800">
          Este usuario tendrá dos identidades completamente separadas:
        </p>
        <ul className="text-sm text-blue-800 mt-2 list-disc list-inside space-y-1">
          <li><strong>Identidad de Vendedor:</strong> {formData.email || 'email'}+seller - Acceso al dashboard de vendedor</li>
          <li><strong>Identidad de Admin:</strong> {formData.email || 'email'}+admin - Acceso al dashboard de administrador</li>
        </ul>
        <p className="text-sm text-blue-800 mt-2">
          Cada identidad tiene su propia contraseña y credenciales independientes.
        </p>
      </div>
    </div>
  );
}





