// Hook para obtener solicitudes F&I en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

interface FIRequest {
  id: string;
  clientId: string;
  status: string;
  employment: any;
  creditInfo: any;
  personalInfo: any;
  sellerNotes?: string;
  submittedAt?: Date;
  createdAt?: Date | string;
  createdBy: string;
}

export function useRealtimeFIRequests(tenantId: string, createdBy?: string) {
  const [requests, setRequests] = useState<FIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log('🔍 useRealtimeFIRequests: useEffect ejecutado');
    console.log('  tenantId recibido:', tenantId);
    console.log('  createdBy recibido:', createdBy);
    console.log('  db disponible:', !!db);
    
    if (!tenantId) {
      console.warn('⚠️ useRealtimeFIRequests: No tenantId, saliendo');
      console.warn('  tenantId es:', tenantId);
      setLoading(false);
      return;
    }

    if (!db) {
      console.error('❌ useRealtimeFIRequests: db no disponible');
      console.error('  db es:', db);
      setLoading(false);
      return;
    }

    console.log(`🔍 useRealtimeFIRequests: Iniciando con tenantId=${tenantId}, createdBy=${createdBy || 'NINGUNO (mostrar todas)'}`);

    try {

      // PRIMERO: Intentar obtener TODAS las solicitudes sin filtro para debuggear
      // Luego filtrar por createdBy en memoria si es necesario
      let q = query(
        collection(db, 'tenants', tenantId, 'fi_requests'),
        orderBy('createdAt', 'desc')
      );

      console.log('🔍 useRealtimeFIRequests: Configurando listener para TODAS las solicitudes...');

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          console.log(`📊 useRealtimeFIRequests: Snapshot recibido, ${snapshot.size} documentos`);
          
          const requestsData: FIRequest[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const requestData = {
              id: doc.id,
              ...data,
              submittedAt: data.submittedAt?.toDate() || undefined,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as FIRequest;

            // Log cada solicitud para debugging
            console.log(`  📄 Solicitud ${doc.id}:`, {
              id: doc.id,
              createdBy: data.createdBy,
              status: data.status,
              clientId: data.clientId,
              createdAt: requestData.createdAt,
            });

            requestsData.push(requestData);
          });

          // Filtrar por createdBy en memoria si se especificó
          let filteredRequests = requestsData;
          if (createdBy) {
            filteredRequests = requestsData.filter(r => r.createdBy === createdBy);
            console.log(`🔍 useRealtimeFIRequests: Filtrando por createdBy=${createdBy}`);
            console.log(`  📊 Total solicitudes: ${requestsData.length}`);
            console.log(`  📊 Solicitudes filtradas: ${filteredRequests.length}`);
            console.log(`  📊 createdBy values encontrados:`, [...new Set(requestsData.map(r => r.createdBy))]);
          }

          // Ordenar por fecha (más reciente primero)
          filteredRequests.sort((a, b) => {
            const aDate = a.createdAt instanceof Date ? a.createdAt : (a.createdAt ? new Date(a.createdAt) : new Date());
            const bDate = b.createdAt instanceof Date ? b.createdAt : (b.createdAt ? new Date(b.createdAt) : new Date());
            return bDate.getTime() - aDate.getTime();
          });

          console.log(`✅ useRealtimeFIRequests: ${filteredRequests.length} solicitudes F&I cargadas${createdBy ? ` (filtradas por createdBy=${createdBy})` : ' (todas)'}`);
          setRequests(filteredRequests);
          setLoading(false);
          setError(null);
        },
        (err: any) => {
          console.error('❌ useRealtimeFIRequests: Error en listener:', err);
          console.error('  Código:', err.code);
          console.error('  Mensaje:', err.message);
          
          // Si es error de índice, intentar sin orderBy
          if (err.code === 'failed-precondition') {
            console.log('🔄 useRealtimeFIRequests: Reintentando sin orderBy debido a índice faltante...');
            try {
              const fallbackQ = query(
                collection(db, 'tenants', tenantId, 'fi_requests')
              );
              
              const fallbackUnsubscribe = onSnapshot(
                fallbackQ,
                (snapshot: any) => {
                  console.log(`📊 useRealtimeFIRequests (fallback): ${snapshot.size} documentos`);
                  
                  const requestsData: FIRequest[] = [];
                  
                  snapshot.forEach((doc: any) => {
                    const data = doc.data();
                    requestsData.push({
                      id: doc.id,
                      ...data,
                      submittedAt: data.submittedAt?.toDate() || undefined,
                      createdAt: data.createdAt?.toDate() || new Date(),
                    } as FIRequest);
                  });

                  // Filtrar por createdBy en memoria si se especificó
                  let filteredRequests = requestsData;
                  if (createdBy) {
                    filteredRequests = requestsData.filter(r => r.createdBy === createdBy);
                    console.log(`  📊 Total: ${requestsData.length}, Filtradas: ${filteredRequests.length}`);
                  }

                  // Ordenar en memoria
                  filteredRequests.sort((a, b) => {
                    const aDate = a.createdAt instanceof Date ? a.createdAt : (a.createdAt ? new Date(a.createdAt) : new Date());
                    const bDate = b.createdAt instanceof Date ? b.createdAt : (b.createdAt ? new Date(b.createdAt) : new Date());
                    return bDate.getTime() - aDate.getTime();
                  });

                  console.log(`✅ useRealtimeFIRequests (fallback): ${filteredRequests.length} solicitudes cargadas`);
                  setRequests(filteredRequests);
                  setLoading(false);
                  setError(null);
                },
                (fallbackErr) => {
                  console.error('❌ useRealtimeFIRequests: Error en fallback:', fallbackErr);
                  setError(fallbackErr);
                  setLoading(false);
                }
              );
              
              return () => fallbackUnsubscribe();
            } catch (fallbackError) {
              console.error('❌ useRealtimeFIRequests: Error en catch del fallback:', fallbackError);
              setError(err);
              setLoading(false);
            }
          } else {
            setError(err);
            setLoading(false);
          }
        }
      );

      return () => {
        console.log('🧹 useRealtimeFIRequests: Limpiando listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ useRealtimeFIRequests: Error configurando listener:', err);
      setError(err as Error);
      setLoading(false);
    }
  }, [tenantId, createdBy]);

  return { requests, loading, error };
}

