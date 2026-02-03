'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function GrantRewardsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [months, setMonths] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setMessageType('');

    try {
      const token = typeof window !== 'undefined' 
        ? localStorage.getItem('authToken') || 
          document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
        : null;

      const response = await fetch(`/api/admin/users/${userId}/grant-free-month`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ months }),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message);
        setMessageType('success');
        setUserId('');
        setMonths(1);
        setTimeout(() => {
          setMessage('');
          setMessageType('');
        }, 3000);
      } else {
        const errorData = await response.json();
        setMessage(errorData.error || 'Error al otorgar mes gratis');
        setMessageType('error');
      }
    } catch (err: any) {
      setMessage(err.message || 'Error al otorgar mes gratis');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Otorgar Recompensas</h1>
        <button
          onClick={() => router.push('/admin/users')}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          ← Volver a Usuarios
        </button>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          messageType === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Otorgar Mes Gratis</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID del Usuario (Dealer o Seller)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="Pega aquí el ID del usuario"
            />
            <p className="text-xs text-gray-500 mt-1">
              Puedes encontrar el ID del usuario en la página de usuarios o en la URL del detalle del tenant
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de Meses Gratis
            </label>
            <input
              type="number"
              min="1"
              max="12"
              value={months}
              onChange={(e) => setMonths(parseInt(e.target.value) || 1)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Los meses gratis se aplicarán automáticamente en el próximo ciclo de facturación
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">ℹ️ Información:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Los meses gratis se acumulan con los meses existentes del usuario</li>
              <li>Se aplicarán automáticamente en el próximo ciclo de facturación</li>
              <li>Solo funciona para usuarios con rol "dealer" o "seller"</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={() => router.push('/admin/users')}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !userId}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? 'Otorgando...' : `Otorgar ${months} Mes${months > 1 ? 'es' : ''} Gratis`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

