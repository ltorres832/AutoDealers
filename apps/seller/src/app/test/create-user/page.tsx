'use client';

import { useState, useEffect } from 'react';

export default function CreateTestUserPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'seller' as 'dealer' | 'seller',
    tenantId: '',
    dealerId: '',
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/test/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          name: formData.name,
          role: formData.role,
          tenantId: formData.tenantId || undefined,
          dealerId: formData.dealerId || undefined,
        }),
      });

      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Respuesta no es JSON. Status:', response.status);
        console.error('Content-Type:', contentType);
        console.error('Primeros 200 caracteres:', text.substring(0, 200));
        
        setResult({
          success: false,
          message: `Error del servidor: La respuesta no es JSON (Status: ${response.status}). Esto puede indicar que la ruta de la API no existe o hay un error en el servidor.`,
        });
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: data.message || 'Usuario creado exitosamente',
          user: data.user,
        });
        // Limpiar formulario
        setFormData({
          email: '',
          password: '',
          name: '',
          role: 'seller',
          tenantId: '',
          dealerId: '',
        });
      } else {
        // Mostrar detalles del error si están disponibles
        const errorMessage = data.error || data.message || 'Error al crear usuario';
        const errorDetails = data.details ? `: ${data.details}` : '';
        const fullMessage = `${errorMessage}${errorDetails}`;
        
        setResult({
          success: false,
          message: fullMessage,
        });
      }
    } catch (error: any) {
      console.error('Error completo:', error);
      let errorMessage = 'Error al crear usuario';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error instanceof TypeError && error.message.includes('JSON')) {
        errorMessage = 'Error: El servidor devolvió una respuesta inválida. Verifica que la API esté funcionando correctamente.';
      }
      
      setResult({
        success: false,
        message: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  }

  const [isDevelopment, setIsDevelopment] = useState(true);

  useEffect(() => {
    // Verificar si estamos en desarrollo
    setIsDevelopment(
      typeof window !== 'undefined' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    );
  }, []);

  // Solo mostrar en desarrollo
  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Acceso Denegado</h2>
          <p className="text-gray-600">
            Esta funcionalidad solo está disponible en modo desarrollo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Crear Usuario de Prueba
          </h1>
          <p className="text-gray-600 text-sm">
            Crea un usuario de prueba para desarrollo. Solo disponible en modo desarrollo.
          </p>
        </div>

        {result && (
          <div
            className={`mb-4 p-4 rounded ${
              result.success
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            <p className="font-semibold">{result.success ? '✅' : '❌'} {result.message}</p>
            {result.user && (
              <div className="mt-2 text-sm">
                <p><strong>ID:</strong> {result.user.id}</p>
                <p><strong>Email:</strong> {result.user.email}</p>
                <p><strong>Rol:</strong> {result.user.role}</p>
                <p><strong>Tenant ID:</strong> {result.user.tenantId}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
              placeholder="Nombre completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rol <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'dealer' | 'seller' })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="seller">Vendedor (Seller)</option>
              <option value="dealer">Dealer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tenant ID (Opcional)
            </label>
            <input
              type="text"
              value={formData.tenantId}
              onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Dejar vacío para crear uno nuevo"
            />
            <p className="text-xs text-gray-500 mt-1">
              Si no proporcionas un Tenant ID, se creará uno nuevo automáticamente
            </p>
          </div>

          {formData.role === 'seller' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dealer ID (Opcional para Sellers)
              </label>
              <input
                type="text"
                value={formData.dealerId}
                onChange={(e) => setFormData({ ...formData, dealerId: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="ID del dealer asociado (opcional)"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si proporcionas un Dealer ID, el seller podrá ver el inventario de ese dealer
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando usuario...' : 'Crear Usuario'}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            ⚠️ Esta página solo está disponible en modo desarrollo.
            <br />
            Después de crear el usuario, puedes iniciar sesión en{' '}
            <a href="/login" className="text-primary-600 hover:text-primary-700 underline">
              /login
            </a>
            <br />
            <br />
            <strong>Alternativa:</strong> También puedes usar el script de terminal:
            <br />
            <code className="bg-gray-100 px-2 py-1 rounded text-xs block mt-2">
              node scripts/create-test-user.js email@test.com password123 "Nombre" seller
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}

