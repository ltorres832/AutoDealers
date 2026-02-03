'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Announcement {
  id: string;
  title: string;
  message: string;
  content?: string;
  contentType?: 'text' | 'image' | 'video';
  mediaUrl?: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  showDismissButton: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface AnnouncementsBannerProps {
  userId?: string;
  tenantId?: string;
}

export function AnnouncementsBanner({ userId, tenantId }: AnnouncementsBannerProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const router = useRouter();

  useEffect(() => {
    fetchAnnouncements();
    
    // Verificar cada 120 segundos (reducido de 60 segundos)
    const interval = setInterval(fetchAnnouncements, 120000);
    return () => clearInterval(interval);
  }, [userId, tenantId]);

  async function fetchAnnouncements() {
    try {
      // Primero obtener anuncios globales
      const globalParams = new URLSearchParams({ dashboard: 'seller' });
      if (userId) globalParams.append('userId', userId);
      if (tenantId) globalParams.append('tenantId', tenantId);
      
      const globalResponse = await fetch(`/api/announcements/active?${globalParams}`, {
        credentials: 'include',
      });
      
      let allAnnouncements: Announcement[] = [];
      
      if (globalResponse.ok) {
        const globalData = await globalResponse.json();
        allAnnouncements.push(...(globalData.announcements || []));
      }

      // Luego obtener anuncios del tenant
      if (tenantId) {
        const tenantParams = new URLSearchParams();
        if (userId) tenantParams.append('userId', userId);
        
        const tenantResponse = await fetch(`/api/announcements/active?${tenantParams}`, {
          credentials: 'include',
        });
        
        if (tenantResponse.ok) {
          const tenantData = await tenantResponse.json();
          allAnnouncements.push(...(tenantData.announcements || []));
        }
      }

      // Eliminar duplicados por ID
      const uniqueAnnouncements = Array.from(
        new Map(allAnnouncements.map(a => [a.id, a])).values()
      );

      setAnnouncements(uniqueAnnouncements);
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
          <div className="max-w-7xl mx-auto">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-semibold">{announcement.title}</p>
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {announcement.content || announcement.message}
                </p>
                
                {/* Mostrar imagen si existe */}
                {announcement.contentType === 'image' && announcement.mediaUrl && (
                  <div className="mt-3">
                    <img
                      src={announcement.mediaUrl}
                      alt={announcement.title}
                      className="max-w-full h-auto rounded-lg shadow-md max-h-96 object-contain"
                    />
                  </div>
                )}

                {/* Mostrar video si existe */}
                {announcement.contentType === 'video' && announcement.mediaUrl && (
                  <div className="mt-3">
                    <video
                      src={announcement.mediaUrl}
                      controls
                      className="max-w-full h-auto rounded-lg shadow-md max-h-96"
                    >
                      Tu navegador no soporta videos.
                    </video>
                  </div>
                )}

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
        </div>
      ))}
    </div>
  );
}

