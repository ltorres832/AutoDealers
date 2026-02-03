'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface Customer {
  id: string;
  email: string | null;
  name: string | null;
  description: string | null;
  created: Date;
  balance: number;
  currency: string | null;
  tenantInfo: {
    id: string;
    name: string;
    type: string;
    status: string;
  } | null;
}

export default function StripeCustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    setLoading(true);
    try {
      const url = searchEmail
        ? `/api/admin/stripe/customers?email=${encodeURIComponent(searchEmail)}`
        : '/api/admin/stripe/customers';
      const response = await fetch(url);
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchCustomers();
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton href="/admin/stripe" label="Volver al Dashboard Stripe" />
      </div>
      <h1 className="text-3xl font-bold mb-6">Clientes de Stripe</h1>

      {/* Búsqueda */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            placeholder="Buscar por email..."
            className="flex-1 px-4 py-2 border rounded-lg"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            🔍 Buscar
          </button>
          {searchEmail && (
            <button
              type="button"
              onClick={() => {
                setSearchEmail('');
                setTimeout(fetchCustomers, 100);
              }}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300"
            >
              ✗ Limpiar
            </button>
          )}
        </form>
      </div>

      {/* Lista de Clientes */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">
            Clientes ({customers.length})
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : customers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {searchEmail ? 'No se encontraron clientes con ese email' : 'No hay clientes'}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {customers.map((customer) => (
              <div key={customer.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {customer.name
                          ? customer.name.charAt(0).toUpperCase()
                          : customer.email
                          ? customer.email.charAt(0).toUpperCase()
                          : '?'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          {customer.name || 'Sin nombre'}
                        </h3>
                        <p className="text-sm text-gray-600">{customer.email}</p>
                      </div>
                    </div>

                    {customer.description && (
                      <p className="text-sm text-gray-600 mb-2">{customer.description}</p>
                    )}

                    {/* Información del Tenant */}
                    {customer.tenantInfo && (
                      <div className="mt-3 inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full text-sm">
                        <span className="font-medium">🏢 {customer.tenantInfo.name}</span>
                        <span className="text-gray-600">
                          ({customer.tenantInfo.type})
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            customer.tenantInfo.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {customer.tenantInfo.status}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Balance y Fecha */}
                  <div className="text-right">
                    {customer.balance !== 0 && (
                      <div
                        className={`text-lg font-bold mb-1 ${
                          customer.balance > 0 ? 'text-red-600' : 'text-green-600'
                        }`}
                      >
                        {customer.balance > 0 ? '+' : ''}$
                        {Math.abs(customer.balance).toFixed(2)}{' '}
                        {customer.currency?.toUpperCase() || 'USD'}
                      </div>
                    )}
                    <div className="text-sm text-gray-500">
                      Creado: {new Date(customer.created).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-4 flex gap-2">
                  <a
                    href={`https://dashboard.stripe.com/customers/${customer.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Ver en Stripe ↗
                  </a>
                  {customer.tenantInfo && (
                    <Link
                      href={`/admin/tenants/${customer.tenantInfo.id}`}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Ver Tenant →
                    </Link>
                  )}
                </div>

                <div className="mt-2 text-xs text-gray-400">ID: {customer.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

