'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  showDismissButton: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface AnnouncementsBannerProps {
  dashboard: 'admin' | 'dealer' | 'seller' | 'public';
  userId?: string;
  tenantId?: string;
}

export function AnnouncementsBanner({ dashboard, userId, tenantId }: AnnouncementsBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchAnnouncements();
    
    // Verificar cada 60 segundos
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, [dashboard, userId, tenantId]);

  async function fetchAnnouncements() {
    try {
      const params = new URLSearchParams({ dashboard });
      if (userId) params.append('userId', userId);
      if (tenantId) params.append('tenantId', tenantId);
      
      const response = await fetch(`/api/announcements/active?${params}`, {
        credentials: 'include',
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(data.announcements || []);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
    }
  }

  async function handleDismiss(id: string) {
    try {
      const response = await fetch(`/api/announcements/${id}/dismiss`, {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        setDismissed(prev => new Set([...prev, id]));
      }
    } catch (error) {
      console.error('Error dismissing announcement:', error);
    }
  }

  const visibleAnnouncements = announcements.filter(a => !dismissed.has(a.id));

  if (visibleAnnouncements.length === 0) {
    return null;
  }

  const getTypeStyles = (type: string, priority: string) => {
    const baseStyles = 'px-4 py-3 shadow-lg z-50';
    
    if (priority === 'urgent') {
      return `${baseStyles} bg-red-600 text-white animate-pulse`;
    }
    
    switch (type) {
      case 'error':
        return `${baseStyles} bg-red-500 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-white`;
      case 'success':
        return `${baseStyles} bg-green-500 text-white`;
      case 'announcement':
        return `${baseStyles} bg-blue-600 text-white`;
      default:
        return `${baseStyles} bg-blue-500 text-white`;
    }
  };

  return (
    <div className="space-y-2">
      {visibleAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={getTypeStyles(announcement.type, announcement.priority)}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex-1">
              <p className="font-semibold">{announcement.title}</p>
              <p className="text-sm mt-1">{announcement.message}</p>
              {announcement.actionUrl && announcement.actionText && (
                <button
                  onClick={() => router.push(announcement.actionUrl!)}
                  className="mt-2 px-4 py-1 bg-white bg-opacity-20 rounded hover:bg-opacity-30 transition-colors text-sm font-medium"
                >
                  {announcement.actionText}
                </button>
              )}
            </div>
            {announcement.showDismissButton && (
              <button
                onClick={() => handleDismiss(announcement.id)}
                className="ml-4 text-white hover:text-gray-200 transition-colors"
                aria-label="Descartar anuncio"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


