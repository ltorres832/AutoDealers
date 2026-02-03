// Hook para obtener solicitudes F&I usando API route (evita problemas de permisos de Firestore)

import { useState, useEffect, useRef } from 'react';

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  sellerNotes?: string;
  fiManagerNotes?: string;
  submittedAt?: Date | string;
  reviewedAt?: Date | string;
  createdAt?: Date | string;
  createdBy: string;
}

export function useRealtimeFIRequests(tenantId: string, filterStatus?: string) {
  const [requests, setRequests] = useState<FIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    console.log('🔍 useRealtimeFIRequests (Dealer): useEffect ejecutado');
    console.log('  tenantId recibido:', tenantId);
    console.log('  filterStatus recibido:', filterStatus);
    
    if (!tenantId) {
      console.warn('⚠️ useRealtimeFIRequests (Dealer): No tenantId, saliendo');
      setLoading(false);
      return;
    }

    // Función para cargar solicitudes desde la API
    const fetchRequests = async () => {
      try {
        const statusParam = filterStatus && filterStatus !== 'all' ? filterStatus : undefined;
        const url = `/api/fi/requests${statusParam ? `?status=${statusParam}` : ''}`;
        
        console.log('📡 useRealtimeFIRequests (Dealer): Consultando API:', url);
        
        const response = await fetch(url, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const requestsData = data.requests || [];

        console.log(`✅ useRealtimeFIRequests (Dealer): ${requestsData.length} solicitudes cargadas desde API`);
        
        // Convertir fechas si vienen como strings
        const processedRequests = requestsData.map((req: any) => ({
          ...req,
          submittedAt: req.submittedAt ? (typeof req.submittedAt === 'string' ? new Date(req.submittedAt) : req.submittedAt) : undefined,
          reviewedAt: req.reviewedAt ? (typeof req.reviewedAt === 'string' ? new Date(req.reviewedAt) : req.reviewedAt) : undefined,
          createdAt: req.createdAt ? (typeof req.createdAt === 'string' ? new Date(req.createdAt) : req.createdAt) : new Date(),
        }));

        setRequests(processedRequests);
        setLoading(false);
        setError(null);
      } catch (err: any) {
        console.error('❌ useRealtimeFIRequests (Dealer): Error al cargar solicitudes:', err);
        setError(err);
        setLoading(false);
      }
    };

    // Cargar inmediatamente
    fetchRequests();

    // Configurar polling cada 5 segundos para simular tiempo real
    intervalRef.current = setInterval(() => {
      fetchRequests();
    }, 5000);

    // Limpiar intervalo al desmontar
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [tenantId, filterStatus]);

  return { requests, loading, error };
}

