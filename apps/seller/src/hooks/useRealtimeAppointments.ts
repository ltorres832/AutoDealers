// Hook para obtener citas en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
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
  leadId?: string;
  assignedTo?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
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

      if (options.assignedTo) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'appointments'),
          where('assignedTo', '==', options.assignedTo),
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

      if (options.status) {
        const baseQuery = options.assignedTo 
          ? query(
              collection(db, 'tenants', options.tenantId, 'appointments'),
              where('assignedTo', '==', options.assignedTo)
            )
          : query(collection(db, 'tenants', options.tenantId, 'appointments'));
        
        q = query(
          baseQuery,
          where('status', '==', options.status),
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

            if (options.startDate || options.endDate) {
              const scheduledDate = (() => {
                const scheduledAt = appointment.scheduledAt;
                if (scheduledAt instanceof Date) {
                  return scheduledAt;
                } else if (scheduledAt && typeof scheduledAt === 'object' && 'toDate' in scheduledAt) {
                  return (scheduledAt as any).toDate();
                } else {
                  return new Date(scheduledAt as string | number);
                }
              })();
              
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
  }, [options.tenantId, options.leadId, options.assignedTo, options.status, options.startDate, options.endDate]);

  return { appointments, loading, error };
}


