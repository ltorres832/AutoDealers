'use client';

import { useState, useEffect } from 'react';

interface Integration {
  id: string;
  platform: 'facebook' | 'instagram' | 'whatsapp';
  accountName: string;
  status: 'active' | 'inactive' | 'expired';
  connectedAt: string;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const response = await fetch('/api/integrations');
      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function connectPlatform(platform: string) {
    try {
      const response = await fetch('/api/integrations/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform }),
      });

      const data = await response.json();
      
      if (data.authUrl) {
        // Redirigir a OAuth
        window.location.href = data.authUrl;
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al conectar plataforma');
    }
  }

  async function disconnectPlatform(integrationId: string) {
    if (!confirm('¿Estás seguro de desconectar esta plataforma?')) return;

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchIntegrations();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al desconectar');
    }
  }

  const platforms = [
    {
      id: 'facebook',
      name: 'Facebook',
      icon: '📘',
      description: 'Conecta tu página de Facebook para publicar posts y gestionar mensajes',
    },
    {
      id: 'instagram',
      name: 'Instagram',
      icon: '📷',
      description: 'Conecta tu cuenta de Instagram para publicar y responder mensajes',
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp Business',
      icon: '💬',
      description: 'Conecta WhatsApp Business API para enviar y recibir mensajes',
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Integraciones de Redes Sociales</h1>
      <p className="text-gray-600 mb-8">
        Conecta tus redes sociales para gestionar todo desde un solo lugar. Una vez conectadas,
        no necesitarás volver a las plataformas para crear campañas o publicar contenido.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platforms.map((platform) => {
          const integration = integrations.find((i) => i.platform === platform.id);
          const isConnected = integration && integration.status === 'active';

          return (
            <div
              key={platform.id}
              className="bg-white rounded-lg shadow p-6 border-2 border-gray-200"
            >
              <div className="text-4xl mb-4">{platform.icon}</div>
              <h2 className="text-xl font-bold mb-2">{platform.name}</h2>
              <p className="text-gray-600 text-sm mb-4">{platform.description}</p>

              {isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">Conectado</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Cuenta: {integration.accountName}
                  </p>
                  <p className="text-xs text-gray-500">
                    Conectado: {new Date(integration.connectedAt).toLocaleDateString()}
                  </p>
                  <button
                    onClick={() => disconnectPlatform(integration.id)}
                    className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm"
                  >
                    Desconectar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => connectPlatform(platform.id)}
                  className="w-full bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
                >
                  Conectar
                </button>
              )}
            </div>
          );
        })}
      </div>

      {integrations.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Integraciones Activas</h2>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between p-4 border rounded"
              >
                <div>
                  <p className="font-medium capitalize">{integration.platform}</p>
                  <p className="text-sm text-gray-600">{integration.accountName}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      integration.status === 'active'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {integration.status === 'active' ? 'Activa' : 'Inactiva'}
                  </span>
                  <button
                    onClick={() => disconnectPlatform(integration.id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





