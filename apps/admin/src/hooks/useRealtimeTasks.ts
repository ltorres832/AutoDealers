// Hook para obtener tareas en tiempo real (Admin) - puede ver todos los tenants

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, collectionGroup } from 'firebase/firestore';
import { Task } from '@autodealers/crm';

interface UseRealtimeTasksOptions {
  tenantId?: string; // Opcional para admin
  status?: string;
  assignedTo?: string;
  leadId?: string;
  type?: string;
  priority?: string;
  limit?: number;
}

export function useRealtimeTasks(options: UseRealtimeTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (options.tenantId) {
        // Si hay tenantId, obtener tareas de ese tenant específico
        let q: any = query(
          collection(db, 'tenants', options.tenantId, 'tasks'),
          orderBy('dueDate', 'asc')
        );

        if (options.status) {
          q = query(
            collection(db, 'tenants', options.tenantId, 'tasks'),
            where('status', '==', options.status),
            orderBy('dueDate', 'asc')
          );
        }

        if (options.assignedTo) {
          q = query(
            collection(db, 'tenants', options.tenantId, 'tasks'),
            where('assignedTo', '==', options.assignedTo),
            orderBy('dueDate', 'asc')
          );
        }

        if (options.leadId) {
          q = query(
            collection(db, 'tenants', options.tenantId, 'tasks'),
            where('leadId', '==', options.leadId),
            orderBy('dueDate', 'asc')
          );
        }

        if (options.limit) {
          q = query(q, firestoreLimit(options.limit));
        }

        const unsubscribe = onSnapshot(
          q,
          (snapshot: any) => {
            const tasksData: Task[] = [];
            
            snapshot.forEach((doc: any) => {
              const data = doc.data();
              const task: Task = {
                id: doc.id,
                ...data,
                dueDate: data.dueDate?.toDate() || new Date(),
                completedAt: data.completedAt?.toDate(),
                reminderDate: data.reminderDate?.toDate(),
                recurrenceEndDate: data.recurrenceEndDate?.toDate(),
                createdAt: data.createdAt?.toDate() || new Date(),
                updatedAt: data.updatedAt?.toDate() || new Date(),
              } as Task;

              tasksData.push(task);
            });

            setTasks(tasksData);
            setLoading(false);
            setError(null);
          },
          (err) => {
            console.error('Error en tiempo real tasks:', err);
            setError(err.message);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      }

      const q = query(collectionGroup(db, 'tasks'), orderBy('dueDate', 'asc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const tasksData: Task[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const task: Task = {
              id: docSnap.id,
              ...data,
              dueDate: data.dueDate?.toDate?.() || new Date(),
              completedAt: data.completedAt?.toDate?.(),
              reminderDate: data.reminderDate?.toDate?.(),
              recurrenceEndDate: data.recurrenceEndDate?.toDate?.(),
              createdAt: data.createdAt?.toDate?.() || new Date(),
              updatedAt: data.updatedAt?.toDate?.() || new Date(),
            } as Task;
            if (options.status && task.status !== options.status) return;
            if (options.assignedTo && task.assignedTo !== options.assignedTo) return;
            if (options.leadId && task.leadId !== options.leadId) return;
            if (options.type && task.type !== options.type) return;
            if (options.priority && task.priority !== options.priority) return;
            tasksData.push(task);
          });
          const capped = options.limit ? tasksData.slice(0, options.limit) : tasksData;
          setTasks(capped);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real tasks (collectionGroup):', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener tasks:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.status, options.assignedTo, options.leadId, options.type, options.priority, options.limit]);

  return { tasks, loading, error };
}

