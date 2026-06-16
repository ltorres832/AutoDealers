/** Sonido corto en base64 (mismo tono usado en chat interno). */
export const NOTIFICATION_SOUND_DATA_URI =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBzGFzvLZkDkIHmS58OSbUQ4PVKzn77FdGAg=';

let audioInstance: HTMLAudioElement | null = null;

/**
 * Reproduce sonido de notificación (respeta preferencia en localStorage).
 */
export function playNotificationSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const disabled = localStorage.getItem('notifications:sound') === 'off';
    if (disabled) return;
    if (!audioInstance) {
      audioInstance = new Audio(NOTIFICATION_SOUND_DATA_URI);
      audioInstance.volume = 0.6;
    }
    audioInstance.currentTime = 0;
    void audioInstance.play().catch(() => {
      /* autoplay bloqueado hasta interacción del usuario */
    });
  } catch {
    /* ignore */
  }
}

export interface BrowserNotificationPayload {
  title: string;
  body: string;
  tag?: string;
  route?: string;
}

/**
 * Muestra notificación nativa del navegador si hay permiso.
 */
export function showBrowserNotification(payload: BrowserNotificationPayload): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    const n = new Notification(payload.title, {
      body: payload.body,
      tag: payload.tag || 'autodealers-alert',
      icon: '/favicon.ico',
    });
    n.onclick = () => {
      window.focus();
      if (payload.route) {
        window.location.href = payload.route;
      }
      n.close();
    };
  } catch {
    /* ignore */
  }
}

/**
 * Solicita permiso para notificaciones del navegador.
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}
