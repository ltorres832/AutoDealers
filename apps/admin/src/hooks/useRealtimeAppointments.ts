// Hook para obtener citas en tiempo real (Admin)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  assignedTo: string;
  vehicleIds: string[];
  type: string;
  scheduledAt: Date | Timestamp;
  duration: number;
  status: string;
  notes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

interface UseRealtimeAppointmentsOptions {
  tenantId?: string;
  status?: string;
  assignedTo?: string;
  startDate?: Date;
  endDate?: Date;
}

export function useRealtimeAppointments(options: UseRealtimeAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Construir query base
    let baseQuery: any;

    if (options.tenantId) {
      baseQuery = collection(db, 'tenants', options.tenantId, 'appointments');
    } else {
      // Si no hay tenantId, necesitamos obtener de todos los tenants
      // Esto es más complejo, por ahora usamos una colección global si existe
      baseQuery = collection(db, 'appointments');
    }

    // Aplicar filtros
    const constraints: any[] = [];

    if (options.status) {
      constraints.push(where('status', '==', options.status));
    }

    if (options.assignedTo) {
      constraints.push(where('assignedTo', '==', options.assignedTo));
    }

    if (options.startDate) {
      constraints.push(where('scheduledAt', '>=', options.startDate));
    }

    if (options.endDate) {
      constraints.push(where('scheduledAt', '<=', options.endDate));
    }

    // Ordenar por fecha programada
    constraints.push(orderBy('scheduledAt', 'asc'));

    // Construir query final
    const q = constraints.length > 0 ? query(baseQuery, ...constraints) : query(baseQuery, orderBy('scheduledAt', 'asc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot: any) => {
        try {
          const appointmentsData = snapshot.docs.map((doc: any) => {
            const data = doc.data() as any;
            return {
              id: doc.id,
              ...data,
              scheduledAt: data?.scheduledAt?.toDate() || new Date(),
              createdAt: data?.createdAt?.toDate() || new Date(),
              updatedAt: data?.updatedAt?.toDate() || new Date(),
            } as Appointment;
          });

          setAppointments(appointmentsData);
          setLoading(false);
          setError(null);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Error processing appointments');
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to appointments:', err);
        setError(err instanceof Error ? err.message : 'Error listening to appointments');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [options.tenantId, options.status, options.assignedTo, options.startDate, options.endDate]);

  return { appointments, loading, error };
}

