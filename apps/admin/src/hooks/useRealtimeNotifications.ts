'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { useAuth } from './useAuth';
import { useNotificationAlerts } from '@autodealers/shared/client';

const PLATFORM_ADMIN_TENANT_ID = '_platform';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: Date | Timestamp | string;
  readAt?: Date | Timestamp | string;
}

export function useRealtimeNotifications(userId?: string) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { auth } = useAuth();
  const effectiveUserId = userId || auth?.userId;
  const tenantId =
    auth?.tenantId || (auth?.role === 'admin' ? PLATFORM_ADMIN_TENANT_ID : undefined);

  useEffect(() => {
    if (!effectiveUserId || !tenantId || !db) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'tenants', tenantId, 'notifications');

    const primaryQuery = query(
      notificationsRef,
      where('userId', '==', effectiveUserId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      primaryQuery,
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
        if (error.code === 'failed-precondition' || error.message?.includes('index')) {
          const fallbackQuery = query(
            notificationsRef,
            where('userId', '==', effectiveUserId),
            limit(50)
          );
          onSnapshot(fallbackQuery, (snapshot) => {
            const notifs: Notification[] = snapshot.docs.map((doc) => {
              const data = doc.data();
              return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
                readAt: data.readAt?.toDate?.() || data.readAt,
              } as Notification;
            });
            notifs.sort((a, b) => {
              const t = (d: Date | Timestamp | string) =>
                d instanceof Date
                  ? d.getTime()
                  : d && typeof d === 'object' && 'toDate' in d
                    ? (d as Timestamp).toDate().getTime()
                    : new Date(d as string).getTime();
              return t(b.createdAt) - t(a.createdAt);
            });
            setNotifications(notifs);
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      }
    );

    return () => unsubscribe();
  }, [effectiveUserId, tenantId]);

  useNotificationAlerts(
    notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      read: n.read,
      type: n.type,
      metadata: n.metadata,
    })),
    Boolean(effectiveUserId && tenantId)
  );

  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
  };
}
