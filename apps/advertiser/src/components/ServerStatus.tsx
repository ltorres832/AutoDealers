'use client';

import { useState, useEffect } from 'react';

export default function ServerStatus() {
  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  useEffect(() => {
    checkServer();
    const interval = setInterval(checkServer, 5000); // Verificar cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  async function checkServer() {
    try {
      const response = await fetch('/api/public/advertiser-pricing', {
        method: 'HEAD', // Solo verificar si responde, sin descargar contenido
      });
      setServerOnline(response.ok || response.status < 500);
    } catch {
      setServerOnline(false);
    }
  }

  if (serverOnline === null) {
    return null; // No mostrar nada mientras verifica
  }

  if (!serverOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 bg-red-600 text-white px-4 py-2 text-center z-50">
        <p className="font-semibold">
          ⚠️ El servidor no está disponible. Por favor ejecuta: <code className="bg-red-700 px-2 py-1 rounded">npm run dev</code>
        </p>
      </div>
    );
  }

  return null;
}

