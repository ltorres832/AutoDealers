'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface StripeStats {
  balance: {
    available: { amount: number; currency: string }[];
    pending: { amount: number; currency: string }[];
  };
  subscriptions: {
    active: number;
    totalMRR: number;
  };
  revenue: {
    lastMonth: number;
    transactionsCount: number;
  };
  customers: {
    total: number;
  };
  products: {
    total: number;
  };
}

export default function StripeManagementPage() {
  const [stats, setStats] = useState<StripeStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/stripe/dashboard');
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number, currency: string = 'USD') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  }

  if (loading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Stripe</h1>
        <p className="text-gray-600">
          Panel completo para administrar suscripciones, pagos, productos y más
        </p>
      </div>

      {/* Estadísticas Principales */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* MRR */}
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">MRR Mensual</h3>
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.subscriptions.totalMRR)}
            </div>
            <p className="text-xs opacity-75 mt-1">
              {stats.subscriptions.active} suscripciones activas
            </p>
          </div>

          {/* Ingresos Último Mes */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Ingresos (30 días)</h3>
              <span className="text-2xl">📈</span>
            </div>
            <div className="text-3xl font-bold">
              {formatCurrency(stats.revenue.lastMonth)}
            </div>
            <p className="text-xs opacity-75 mt-1">
              {stats.revenue.transactionsCount} transacciones
            </p>
          </div>

          {/* Balance Disponible */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Balance Disponible</h3>
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-3xl font-bold">
              {stats.balance.available[0]
                ? formatCurrency(stats.balance.available[0].amount, stats.balance.available[0].currency)
                : '$0'}
            </div>
            <p className="text-xs opacity-75 mt-1">
              Pendiente: {stats.balance.pending[0]
                ? formatCurrency(stats.balance.pending[0].amount, stats.balance.pending[0].currency)
                : '$0'}
            </p>
          </div>

          {/* Clientes */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium opacity-90">Clientes</h3>
              <span className="text-2xl">👥</span>
            </div>
            <div className="text-3xl font-bold">{stats.customers.total}+</div>
            <p className="text-xs opacity-75 mt-1">
              {stats.products.total} productos activos
            </p>
          </div>
        </div>
      )}

      {/* Accesos Rápidos */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Gestión Rápida</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/stripe/subscriptions"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <span className="text-3xl">📋</span>
            <div>
              <div className="font-semibold">Suscripciones</div>
              <div className="text-sm text-gray-500">Ver y gestionar</div>
            </div>
          </Link>

          <Link
            href="/admin/stripe/payments"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <span className="text-3xl">💳</span>
            <div>
              <div className="font-semibold">Pagos</div>
              <div className="text-sm text-gray-500">Transacciones</div>
            </div>
          </Link>

          <Link
            href="/admin/stripe/products"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <span className="text-3xl">📦</span>
            <div>
              <div className="font-semibold">Productos</div>
              <div className="text-sm text-gray-500">Planes y precios</div>
            </div>
          </Link>

          <Link
            href="/admin/stripe/customers"
            className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <span className="text-3xl">👤</span>
            <div>
              <div className="font-semibold">Clientes</div>
              <div className="text-sm text-gray-500">Base de clientes</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Acciones Administrativas */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Acciones Administrativas</h2>
        <div className="space-y-3">
          <Link
            href="/admin/stripe/products"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">➕</span>
              <div>
                <div className="font-medium">Crear Nuevo Producto/Plan</div>
                <div className="text-sm text-gray-500">Agregar membresía o producto</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <Link
            href="/admin/memberships"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎁</span>
              <div>
                <div className="font-medium">Gestionar Membresías</div>
                <div className="text-sm text-gray-500">Configurar planes y características</div>
              </div>
            </div>
            <span className="text-gray-400">→</span>
          </Link>

          <a
            href="https://dashboard.stripe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔗</span>
              <div>
                <div className="font-medium">Abrir Dashboard de Stripe</div>
                <div className="text-sm text-gray-500">Panel completo de Stripe</div>
              </div>
            </div>
            <span className="text-gray-400">↗</span>
          </a>
        </div>
      </div>
    </div>
  );
}

