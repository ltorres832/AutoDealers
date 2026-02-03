// Hook para obtener citas en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';

interface Appointment {
  id: string;
  tenantId: string;
  leadId: string;
  scheduledAt: Date | Timestamp;
  duration: number;
  type: string;
  status: string;
  notes?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

interface UseRealtimeAppointmentsOptions {
  tenantId?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  leadId?: string;
}

export function useRealtimeAppointments(options: UseRealtimeAppointmentsOptions = {}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!options.tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q: any = query(
        collection(db, 'tenants', options.tenantId, 'appointments'),
        orderBy('scheduledAt', 'asc')
      );

      if (options.status) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'appointments'),
          where('status', '==', options.status),
          orderBy('scheduledAt', 'asc')
        );
      }

      if (options.leadId) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'appointments'),
          where('leadId', '==', options.leadId),
          orderBy('scheduledAt', 'asc')
        );
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const appointmentsData: Appointment[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const appointment: Appointment = {
              id: doc.id,
              ...data,
              scheduledAt: data.scheduledAt?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              updatedAt: data.updatedAt?.toDate() || new Date(),
            } as Appointment;

            // Filtrar por rango de fechas si se proporciona
            if (options.startDate || options.endDate) {
              const scheduledDate = appointment.scheduledAt instanceof Date
                ? appointment.scheduledAt
                : (appointment.scheduledAt && typeof appointment.scheduledAt === 'object' && 'toDate' in appointment.scheduledAt)
                  ? (appointment.scheduledAt as any).toDate()
                  : typeof appointment.scheduledAt === 'string' || typeof appointment.scheduledAt === 'number'
                    ? new Date(appointment.scheduledAt)
                    : new Date();
              
              if (options.startDate && scheduledDate < options.startDate) {
                return;
              }
              if (options.endDate && scheduledDate > options.endDate) {
                return;
              }
            }

            appointmentsData.push(appointment);
          });

          setAppointments(appointmentsData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real appointments:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener appointments:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.status, options.startDate, options.endDate, options.leadId]);

  return { appointments, loading, error };
}


