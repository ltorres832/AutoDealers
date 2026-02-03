'use client';

import { useState } from 'react';

export default function DebugPage() {
  const [debug, setDebug] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function checkAuth() {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/debug');
      const data = await response.json();
      setDebug(data);
    } catch (error: any) {
      setDebug({ error: error.message });
    } finally {
      setLoading(false);
    }
  }

  const localToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  const cookieToken = typeof document !== 'undefined' 
    ? document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1]
    : null;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">🔍 Debug de Autenticación</h1>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="font-bold mb-2">📦 Tokens en Cliente:</h2>
          <p className="text-sm">
            <strong>localStorage:</strong> {localToken ? `${localToken.substring(0, 30)}...` : '❌ NO ENCONTRADO'}
          </p>
          <p className="text-sm">
            <strong>cookie:</strong> {cookieToken ? `${cookieToken.substring(0, 30)}...` : '❌ NO ENCONTRADO'}
          </p>
        </div>

        <button
          onClick={checkAuth}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {loading ? 'Verificando...' : '🔍 Verificar Autenticación'}
        </button>

        {debug && (
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <pre>{JSON.stringify(debug, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}


