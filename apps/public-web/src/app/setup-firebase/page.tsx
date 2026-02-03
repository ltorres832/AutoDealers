'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SetupFirebasePage() {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold mb-6 text-gray-900">
            🔐 Configurar Credenciales de Firebase
          </h1>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                1
              </div>
              <h2 className="text-xl font-semibold">Abrir Firebase Console</h2>
            </div>
            <div className="ml-10 mb-4">
              <p className="text-gray-700 mb-2">
                1. Ve a: <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">https://console.firebase.google.com</a>
              </p>
              <p className="text-gray-700">
                2. Inicia sesión con tu cuenta de Google
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="ml-10 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Siguiente
            </button>
          </div>

          {step >= 2 && (
            <div className="mb-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <h2 className="text-xl font-semibold">Seleccionar Proyecto</h2>
              </div>
              <div className="ml-10 mb-4">
                <p className="text-gray-700 mb-2">
                  Busca y selecciona el proyecto: <strong>autodealers-7f62e</strong>
                </p>
                <p className="text-gray-600 text-sm">
                  Si no lo ves, créalo primero desde Firebase Console
                </p>
              </div>
              <button
                onClick={() => setStep(3)}
                className="ml-10 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Siguiente
              </button>
            </div>
          )}

          {step >= 3 && (
            <div className="mb-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <h2 className="text-xl font-semibold">Ir a Cuentas de Servicio</h2>
              </div>
              <div className="ml-10 mb-4">
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Haz clic en el ícono de ⚙️ (Configuración) en la parte superior</li>
                  <li>Selecciona "Configuración del proyecto"</li>
                  <li>Ve a la pestaña "Cuentas de servicio"</li>
                </ol>
              </div>
              <button
                onClick={() => setStep(4)}
                className="ml-10 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Siguiente
              </button>
            </div>
          )}

          {step >= 4 && (
            <div className="mb-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= 4 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  4
                </div>
                <h2 className="text-xl font-semibold">Generar Nueva Clave Privada</h2>
              </div>
              <div className="ml-10 mb-4">
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Haz clic en "Generar nueva clave privada"</li>
                  <li>Confirma la acción en el diálogo</li>
                  <li>Se descargará un archivo JSON automáticamente</li>
                </ol>
                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ El archivo JSON contiene credenciales sensibles. Guárdalo de forma segura.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setStep(5)}
                className="ml-10 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Siguiente
              </button>
            </div>
          )}

          {step >= 5 && (
            <div className="mb-6 border-t pt-6">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                  step >= 5 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  5
                </div>
                <h2 className="text-xl font-semibold">Crear Archivo .env.local</h2>
              </div>
              <div className="ml-10 mb-4">
                <p className="text-gray-700 mb-4">
                  Abre el archivo JSON descargado y copia los siguientes valores:
                </p>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FIREBASE_PROJECT_ID
                    </label>
                    <code className="text-sm bg-white p-2 rounded border block">
                      {`project_id`} del JSON
                    </code>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FIREBASE_CLIENT_EMAIL
                    </label>
                    <code className="text-sm bg-white p-2 rounded border block">
                      {`client_email`} del JSON
                    </code>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      FIREBASE_PRIVATE_KEY
                    </label>
                    <code className="text-sm bg-white p-2 rounded border block">
                      {`private_key`} del JSON (completo, con saltos de línea)
                    </code>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    📝 Crea un archivo llamado <code className="bg-white px-2 py-1 rounded">.env.local</code> en:
                  </p>
                  <code className="text-sm bg-white p-2 rounded border block">
                    apps/public-web/.env.local
                  </code>
                </div>

                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto">
                  <div className="mb-2">FIREBASE_PROJECT_ID=autodealers-7f62e</div>
                  <div className="mb-2">FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@autodealers-7f62e.iam.gserviceaccount.com</div>
                  <div>FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----{'\n'}...{'\n'}-----END PRIVATE KEY-----{'\n'}"</div>
                </div>

                <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 font-medium mb-2">
                    ⚠️ IMPORTANTE:
                  </p>
                  <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
                    <li>El FIREBASE_PRIVATE_KEY debe estar entre comillas dobles</li>
                    <li>Los saltos de línea deben ser <code>\n</code> (no saltos de línea reales)</li>
                    <li>El archivo debe estar en: <code>apps/public-web/.env.local</code></li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-6 mt-6">
            <h3 className="text-lg font-semibold mb-4">✅ Después de crear .env.local:</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li>Reinicia el servidor Next.js</li>
              <li>Accede a: <Link href="/demo" className="text-blue-600 hover:underline">http://localhost:3000/demo</Link></li>
              <li>El tenant demo se creará automáticamente</li>
            </ol>
          </div>

          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> También puedes usar el script interactivo ejecutando:
            </p>
            <code className="block mt-2 bg-gray-100 p-3 rounded text-sm">
              cd apps/public-web && node get-firebase-credentials.js
            </code>
          </div>
        </div>
      </div>
    </div>
  );
}


