'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface CommunicationLog {
  id: string;
  templateId: string;
  templateName: string;
  event: string;
  type: 'email' | 'sms' | 'whatsapp';
  recipientId: string;
  recipientEmail: string;
  recipientName: string;
  tenantId: string;
  tenantName: string;
  status: 'success' | 'failed';
  messageId?: string;
  error?: string;
  sentAt: string;
  metadata?: Record<string, any>;
}

interface Stats {
  total: number;
  success: number;
  failed: number;
  byType: Record<string, number>;
  byEvent: Record<string, number>;
}

export default function CommunicationLogsPage() {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    type: 'all',
    status: 'all',
    event: 'all',
  });

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filter]);

  async function fetchLogs() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.type !== 'all') params.append('type', filter.type);
      if (filter.status !== 'all') params.append('status', filter.status);
      if (filter.event !== 'all') params.append('event', filter.event);

      const response = await fetch(`/api/admin/communication-logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/admin/communication-logs/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  function getTypeIcon(type: string) {
    const icons: Record<string, string> = {
      email: '📧',
      sms: '💬',
      whatsapp: '💚',
    };
    return icons[type] || '📄';
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading && !stats) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Logs de Comunicaciones
        </h1>
        <p className="text-gray-600">
          Historial de todos los templates enviados automáticamente
        </p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Total Enviados</p>
            <p className="text-3xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Exitosos</p>
            <p className="text-3xl font-bold text-green-600">{stats.success}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Fallidos</p>
            <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600 mb-2">Tasa de Éxito</p>
            <p className="text-3xl font-bold">
              {stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div>
            <label className="block text-sm font-medium mb-1">Tipo</label>
            <select
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="email">📧 Email</option>
              <option value="sms">💬 SMS</option>
              <option value="whatsapp">💚 WhatsApp</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Estado</label>
            <select
              value={filter.status}
              onChange={(e) => setFilter({ ...filter, status: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="success">✅ Exitoso</option>
              <option value="failed">❌ Fallido</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Evento</label>
            <select
              value={filter.event}
              onChange={(e) => setFilter({ ...filter, event: e.target.value })}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todos</option>
              <option value="payment_success">Pago Exitoso</option>
              <option value="payment_failed">Pago Fallido</option>
              <option value="subscription_created">Suscripción Creada</option>
              <option value="account_suspended">Cuenta Suspendida</option>
              <option value="account_reactivated">Cuenta Reactivada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de logs */}
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No hay logs para mostrar
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destinatario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(log.sentAt)}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{log.templateName}</div>
                    <div className="text-gray-500 text-xs">{log.event}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getTypeIcon(log.type)} {log.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="font-medium text-gray-900">{log.recipientName}</div>
                    <div className="text-gray-500 text-xs">{log.recipientEmail}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.tenantName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {log.status === 'success' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✅ Exitoso
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        ❌ Fallido
                      </span>
                    )}
                    {log.error && (
                      <div className="text-xs text-red-600 mt-1">{log.error}</div>
                    )}
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


