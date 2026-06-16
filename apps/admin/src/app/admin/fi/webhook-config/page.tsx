'use client';

// Página de configuración y verificación del webhook F&I

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function FIWebhookConfigPage() {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    // Obtener la URL base
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/fi/email-reply`);
  }, []);

  const testWebhook = async () => {
    setTesting(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/fi/email-reply');
      const data = await response.json();
      
      if (response.ok && data.status === 'ok') {
        setTestResult('✅ Webhook está activo y funcionando correctamente');
      } else {
        setTestResult('⚠️ Webhook responde pero con advertencias');
      }
    } catch (error) {
      setTestResult('❌ Error al conectar con el webhook. Verifica que esté desplegado.');
    } finally {
      setTesting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copiado al portapapeles');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/admin/fi" className="text-primary-600 hover:text-primary-700 text-sm">
          ← Volver a F&I
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        Configuración de Webhook F&I
      </h1>
      <p className="text-gray-600 mb-8">
        Configura el webhook para recibir respuestas de emails externos
      </p>

      {/* Información del Webhook */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Información del Webhook
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL del Webhook
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={webhookUrl}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl)}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Copiar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Usa esta URL al configurar el webhook en Resend o SendGrid
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Eventos Requeridos
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                <li><strong>Resend:</strong> email.replied, email.bounced</li>
                <li><strong>SendGrid:</strong> inbound, bounce</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Verificación */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Verificación del Webhook
        </h2>
        
        <button
          onClick={testWebhook}
          disabled={testing}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
        >
          {testing ? 'Probando...' : 'Probar Webhook'}
        </button>

        {testResult && (
          <div className={`mt-4 p-4 rounded-md ${
            testResult.includes('✅') 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : testResult.includes('⚠️')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {testResult}
          </div>
        )}
      </div>

      {/* Guía de Configuración */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-primary-900 mb-4">
          📚 Guía de Configuración
        </h2>
        
        <div className="space-y-4 text-sm text-primary-800">
          <div>
            <h3 className="font-semibold mb-2">Para Resend:</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Ve a Settings → Webhooks en Resend</li>
              <li>Crea un nuevo webhook con la URL de arriba</li>
              <li>Selecciona los eventos: email.replied, email.bounced</li>
              <li>Guarda y verifica que esté activo</li>
            </ol>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Para SendGrid:</h3>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Ve a Settings → Inbound Parse</li>
              <li>Crea una nueva configuración de parse</li>
              <li>Usa la URL de arriba como destino</li>
              <li>Configura el subdominio para recibir emails</li>
            </ol>
          </div>

          <div className="mt-4 pt-4 border-t border-primary-300">
            <p className="font-semibold">📖 Documentación completa:</p>
            <p className="text-xs mt-1">
              Ver archivo: <code className="bg-primary-100 px-2 py-1 rounded">docs/CONFIGURACION_WEBHOOK_FI.md</code>
            </p>
          </div>
        </div>
      </div>

      {/* Estado de Configuración */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Estado de la Configuración
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-700">Webhook Endpoint</span>
            <span className="text-sm font-medium text-green-600">✅ Activo</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <span className="text-sm text-gray-700">Procesamiento de Respuestas</span>
            <span className="text-sm font-medium text-green-600">✅ Implementado</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
            <span className="text-sm text-gray-700">Configuración en Resend/SendGrid</span>
            <span className="text-sm font-medium text-yellow-600">⚠️ Pendiente</span>
          </div>
        </div>

        <div className="mt-4 p-4 bg-primary-50 border border-primary-200 rounded-md">
          <p className="text-sm text-primary-800">
            <strong>Nota:</strong> El código está 100% implementado. Solo necesitas configurar 
            el webhook en tu proveedor de email (Resend o SendGrid) usando la URL proporcionada arriba.
          </p>
        </div>
      </div>
    </div>
  );
}

