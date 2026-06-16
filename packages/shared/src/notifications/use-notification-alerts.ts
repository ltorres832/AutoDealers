'use client';

import { useEffect, useRef } from 'react';
import {
  playNotificationSound,
  showBrowserNotification,
} from './notification-alerts';

export interface AlertableNotification {
  id: string;
  title: string;
  message: string;
  read?: boolean;
  type?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Detecta notificaciones nuevas no leídas y dispara sonido + alerta del navegador.
 */
export function useNotificationAlerts(
  notifications: AlertableNotification[],
  enabled = true
): void {
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || notifications.length === 0) {
      return;
    }

    const unseenNew: AlertableNotification[] = [];

    for (const n of notifications) {
      if (seenIdsRef.current.has(n.id)) continue;
      seenIdsRef.current.add(n.id);
      if (!initializedRef.current) continue;
      if (n.read) continue;
      unseenNew.push(n);
    }

    if (!initializedRef.current) {
      initializedRef.current = true;
      return;
    }

    for (const n of unseenNew) {
      playNotificationSound();
      const route =
        typeof n.metadata?.route === 'string' ? n.metadata.route : undefined;
      showBrowserNotification({
        title: n.title,
        body: n.message,
        tag: n.id,
        route,
      });
    }
  }, [notifications, enabled]);
}
