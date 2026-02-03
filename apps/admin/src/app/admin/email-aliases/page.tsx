'use client';

// Panel Admin: Ver todos los Aliases

import { useState, useEffect } from 'react';

interface EmailAlias {
  id: string;
  alias: string;
  fullEmail: string;
  dealerId: string;
  assignedTo: string;
  active: boolean;
  status: 'active' | 'suspended' | 'deleted';
  createdAt: Date;
}

interface Dealer {
  dealerId: string;
  name: string;
}

export default function EmailAliasesPage() {
  const [aliases, setAliases] = useState<EmailAlias[]>([]);
  const [dealers, setDealers] = useState<Record<string, Dealer>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'suspended'>('all');

  useEffect(() => {
    fetchAliases();
    fetchDealers();
  }, [filter]);

  async function fetchAliases() {
    try {
      setLoading(true);
      const response = await fetch('/api/email-aliases');
      const data = await response.json();

      if (response.ok) {
        let filteredAliases = data.aliases || [];
        if (filter === 'active') {
          filteredAliases = filteredAliases.filter((a: EmailAlias) => a.active && a.status === 'active');
        } else if (filter === 'suspended') {
          filteredAliases = filteredAliases.filter((a: EmailAlias) => a.status === 'suspended');
        }
        setAliases(filteredAliases);
      } else {
        console.error('Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching aliases:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDealers() {
    try {
      const response = await fetch('/api/dealers');
      const data = await response.json();

      if (response.ok) {
        const dealersMap: Record<string, Dealer> = {};
        (data.dealers || []).forEach((dealer: Dealer) => {
          dealersMap[dealer.dealerId] = dealer;
        });
        setDealers(dealersMap);
      }
    } catch (error) {
      console.error('Error fetching dealers:', error);
    }
  }

  async function handleAction(aliasId: string, action: 'suspend' | 'activate' | 'delete') {
    if (!confirm(`¿Estás seguro de ${action === 'suspend' ? 'suspender' : action === 'activate' ? 'activar' : 'eliminar'} este alias?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/email-aliases/${aliasId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Alias ${action === 'suspend' ? 'suspendido' : action === 'activate' ? 'activado' : 'eliminado'} exitosamente`);
        fetchAliases();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error(`Error ${action} alias:`, error);
      alert(`Error al ${action} alias`);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Gestión de Aliases</h1>
        <p className="text-gray-600">Visualiza y gestiona todos los aliases de email corporativos</p>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Todos
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'active' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Activos
        </button>
        <button
          onClick={() => setFilter('suspended')}
          className={`px-4 py-2 rounded-lg ${
            filter === 'suspended' ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          Suspendidos
        </button>
      </div>

      {/* Lista de Aliases */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando aliases...</p>
        </div>
      ) : aliases.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No hay aliases con este filtro</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Alias
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email Completo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dealer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {aliases.map((alias) => (
                <tr key={alias.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{alias.alias}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{alias.fullEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {dealers[alias.dealerId]?.name || alias.dealerId}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        alias.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : alias.status === 'suspended'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {alias.status === 'active' ? 'Activo' : alias.status === 'suspended' ? 'Suspendido' : 'Eliminado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      {alias.status === 'active' ? (
                        <button
                          onClick={() => handleAction(alias.id, 'suspend')}
                          className="text-yellow-600 hover:text-yellow-900"
                        >
                          Suspender
                        </button>
                      ) : alias.status === 'suspended' ? (
                        <button
                          onClick={() => handleAction(alias.id, 'activate')}
                          className="text-green-600 hover:text-green-900"
                        >
                          Activar
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleAction(alias.id, 'delete')}
                        className="text-red-600 hover:text-red-900"
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}



