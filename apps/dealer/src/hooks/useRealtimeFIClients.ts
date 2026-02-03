// Hook para obtener clientes F&I usando API route (evita problemas de permisos de Firestore)

import { useState, useEffect, useRef } from 'react';

interface FIClient {
  id: string;
  name: string;
  phone: string;
  email?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehiclePrice?: number;
  downPayment?: number;
}

export function useRealtimeFIClients(tenantId: string) {
  const [clients, setClients] = useState<FIClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    // Función para cargar clientes desde la API
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/fi/clients', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const clientsData = data.clients || [];

        setClients(clientsData);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('Error al cargar clientes F&I:', err);
        setError(err);
        setLoading(false);
      }
    };

    // Cargar inmediatamente
    fetchClients();

    // Configurar polling cada 5 segundos para simular tiempo real
    intervalRef.current = setInterval(() => {
      fetchClients();
    }, 5000);

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tenantId]);

  return { clients, loading, error };
}

