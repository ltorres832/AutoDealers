// Hook para obtener notificaciones en tiempo real (Seller)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  channels: string[];
  metadata?: Record<string, any>;
  read: boolean;
  readAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
}

interface UseRealtimeNotificationsOptions {
  tenantId?: string;
  userId?: string;
  unreadOnly?: boolean;
  limit?: number;
}

export function useRealtimeNotifications(options: UseRealtimeNotificationsOptions = {}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!options.tenantId || !options.userId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let q: any = query(
        collection(db, 'tenants', options.tenantId, 'notifications'),
        where('userId', '==', options.userId),
        orderBy('createdAt', 'desc')
      );

      if (options.unreadOnly) {
        q = query(
          collection(db, 'tenants', options.tenantId, 'notifications'),
          where('userId', '==', options.userId),
          where('read', '==', false),
          orderBy('createdAt', 'desc')
        );
      }

      if (options.limit) {
        q = query(q, firestoreLimit(options.limit));
      }

      const unsubscribe = onSnapshot(
        q,
        (snapshot: any) => {
          const notificationsData: Notification[] = [];
          let unread = 0;
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            const notification: Notification = {
              id: doc.id,
              ...data,
              read: data.read || false,
              readAt: data.readAt?.toDate() || undefined,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as Notification;

            notificationsData.push(notification);
            if (!notification.read) {
              unread++;
            }
          });

          setNotifications(notificationsData);
          setUnreadCount(unread);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real notifications:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener notifications:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [options.tenantId, options.userId, options.unreadOnly, options.limit]);

  return { notifications, unreadCount, loading, error };
}


