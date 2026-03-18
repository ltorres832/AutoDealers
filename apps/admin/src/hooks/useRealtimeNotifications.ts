'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { useAuth } from './useAuth';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date | Timestamp | string;
  readAt?: Date | Timestamp | string;
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { auth } = useAuth();
  const effectiveUserId = userId || auth?.userId;

  useEffect(() => {
    if (!effectiveUserId) {
      setLoading(false);
      return;
    }

    try {
      // Query para notificaciones del usuario
      const notificationsQuery = query(
        collection(db, 'notifications'),
        where('userId', '==', effectiveUserId),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubscribe = onSnapshot(
        notificationsQuery,
        (snapshot) => {
          const notifs: Notification[] = snapshot.docs.map((doc) => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
              readAt: data.readAt?.toDate?.() || data.readAt,
            } as Notification;
          });

          setNotifications(notifs);
          setLoading(false);
        },
        (error) => {
          console.error('Error en listener de notificaciones:', error);
          // Fallback: intentar sin orderBy si falla por índice
          if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            collection(db, 'notifications'),
            where('userId', '==', effectiveUserId),
            limit(50)
          );

            const fallbackUnsubscribe = onSnapshot(
              fallbackQuery,
              (snapshot) => {
                const notifs: Notification[] = snapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
                    readAt: data.readAt?.toDate?.() || data.readAt,
                  } as Notification;
                });

                // Ordenar manualmente
                notifs.sort((a, b) => {
                  const getTime = (date: Date | Timestamp | string): number => {
                    if (date instanceof Date) {
                      return date.getTime();
                    } else if (date && typeof date === 'object' && 'toDate' in date) {
                      return (date as Timestamp).toDate().getTime();
                    } else {
                      return new Date(date as string).getTime();
                    }
                  };
                  return getTime(b.createdAt) - getTime(a.createdAt);
                });

                setNotifications(notifs);
                setLoading(false);
              },
              (fallbackError) => {
                console.error('Error en fallback de notificaciones:', fallbackError);
                setLoading(false);
              }
            );

            return () => fallbackUnsubscribe();
          } else {
            setLoading(false);
          }
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error configurando listener de notificaciones:', error);
      setLoading(false);
    }
  }, [effectiveUserId, auth?.tenantId]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
  };
}
