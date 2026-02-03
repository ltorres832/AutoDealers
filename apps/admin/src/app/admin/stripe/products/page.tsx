'use client';

import { useState, useEffect } from 'react';
import BackButton from '@/components/BackButton';

interface Product {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  prices: {
    id: string;
    amount: number;
    currency: string;
    interval: string | null;
    intervalCount: number | null;
  }[];
}

export default function StripeProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    price: '',
    currency: 'usd',
    interval: 'month',
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/stripe/products');
      const data = await response.json();
      setProducts(data.products || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    
    if (!newProduct.name || !newProduct.price) {
      alert('Nombre y precio son requeridos');
      return;
    }

    setCreating(true);
    try {
      const response = await fetch('/api/admin/stripe/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct),
      });

      const data = await response.json();
      alert(data.message);
      setNewProduct({ name: '', description: '', price: '', currency: 'usd', interval: 'month' });
      fetchProducts();
    } catch (error) {
      alert('Error al crear producto');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <BackButton href="/admin/stripe" label="Volver al Dashboard Stripe" />
      </div>
      <h1 className="text-3xl font-bold mb-6">Productos y Planes de Stripe</h1>

      {/* Formulario Crear Producto */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Crear Nuevo Producto/Plan</h2>
        <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nombre del Producto *</label>
            <input
              type="text"
              value={newProduct.name}
              onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Ej: Plan Premium"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Precio *</label>
            <input
              type="number"
              step="0.01"
              value={newProduct.price}
              onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="29.99"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Moneda</label>
            <select
              value={newProduct.currency}
              onChange={(e) => setNewProduct({ ...newProduct, currency: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="usd">USD</option>
              <option value="eur">EUR</option>
              <option value="gbp">GBP</option>
              <option value="cad">CAD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Intervalo de Cobro</label>
            <select
              value={newProduct.interval}
              onChange={(e) => setNewProduct({ ...newProduct, interval: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="month">Mensual</option>
              <option value="year">Anual</option>
              <option value="">Una vez (sin recurrencia)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={newProduct.description}
              onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
              rows={3}
              placeholder="Descripción del producto..."
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={creating}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creando...' : '✓ Crear Producto'}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Productos */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Productos Existentes ({products.length})</h2>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">Cargando...</div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No hay productos creados</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {products.map((product) => (
              <div key={product.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-semibold">{product.name}</h3>
                    {product.description && (
                      <p className="text-sm text-gray-600 mt-1">{product.description}</p>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      product.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {product.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Precios */}
                <div className="mt-3 space-y-2">
                  <div className="text-sm font-medium text-gray-700">Precios:</div>
                  {product.prices.map((price) => (
                    <div
                      key={price.id}
                      className="flex items-center gap-2 text-sm bg-gray-50 px-3 py-2 rounded"
                    >
                      <span className="font-semibold text-blue-600">
                        ${price.amount.toFixed(2)} {price.currency.toUpperCase()}
                      </span>
                      {price.interval && (
                        <span className="text-gray-600">
                          / {price.intervalCount && price.intervalCount > 1 ? `${price.intervalCount} ` : ''}
                          {price.interval === 'month' ? 'mes' : price.interval === 'year' ? 'año' : price.interval}
                          {price.intervalCount && price.intervalCount > 1 ? 'es' : ''}
                        </span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">{price.id}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-gray-400">ID: {product.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

