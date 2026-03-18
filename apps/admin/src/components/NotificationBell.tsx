'use client';

import { useState, useEffect } from 'react';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: Date | Timestamp | string;
}

export function NotificationBell() {
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const { notifications, unreadCount, loading } = useRealtimeNotifications();

  async function markAsRead(notificationId: string, notification?: Notification) {
    try {
      await fetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'POST',
      });
      
      // Navegar si la notificación tiene metadata con ruta
      if (notification?.data?.route) {
        router.push(notification.data.route);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }

  async function markAllAsRead() {
    try {
      await fetch('/api/admin/notifications/mark-all-read', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }

  function handleNotificationClick(notification: Notification) {
    markAsRead(notification.id, notification);
  }

  function formatDate(date: Date) {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  }

  function getNotificationIcon(type: string) {
    switch (type) {
      case 'communication_sent':
        return '📨';
      case 'template_created':
        return '📧';
      default:
        return '🔔';
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="font-semibold text-lg">Notificaciones</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-primary-600 hover:underline"
                >
                  Marcar todas como leídas
                </button>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No hay notificaciones
              </div>
            ) : (
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {notifications.slice(0, 20).map((notif) => (
                  <div
                    key={notif.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notif.read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleNotificationClick(notif)}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notif.type)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900">
                          {notif.title}
                        </p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notif.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          {(() => {
                            let date: Date;
                            if (notif.createdAt instanceof Date) {
                              date = notif.createdAt;
                            } else if (notif.createdAt && typeof notif.createdAt === 'object' && 'toDate' in notif.createdAt) {
                              date = (notif.createdAt as Timestamp).toDate();
                            } else {
                              date = new Date(notif.createdAt as string);
                            }
                            return formatDate(date);
                          })()}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0 mt-1 animate-pulse"></div>
                      )}
                    </div>
                  </div>
                ))}
                {notifications.length > 20 && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    Mostrando las 20 más recientes
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

