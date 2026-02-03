'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, collection, query, where, setDoc, updateDoc } from 'firebase/firestore';

interface CollaborationIndicatorProps {
  tenantId?: string;
  leadId?: string;
  resourceType?: 'lead' | 'vehicle' | 'appointment';
  resourceId?: string;
}

export function CollaborationIndicator({ 
  tenantId, 
  leadId, 
  resourceType = 'lead',
  resourceId 
}: CollaborationIndicatorProps) {
  const [viewers, setViewers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !resourceId) return;

    // Obtener userId actual
    const token = localStorage.getItem('authToken');
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.userId) {
            setCurrentUserId(data.userId);
          }
        });
    }

    // Listener para usuarios viendo este recurso
    const viewersRef = doc(db, 'tenants', tenantId, 'activeViews', `${resourceType}_${resourceId}`);
    
    const unsubscribe = onSnapshot(viewersRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        const viewersList = data.viewers || [];
        // Filtrar el usuario actual
        const otherViewers = viewersList.filter((id: string) => id !== currentUserId);
        setViewers(otherViewers);
      }
    });

    // Registrar que este usuario está viendo
    if (currentUserId) {
      const updateViewers = async () => {
        const viewersRef = doc(db, 'tenants', tenantId, 'activeViews', `${resourceType}_${resourceId}`);
        await setDoc(viewersRef, {
          viewers: [...viewers.filter(id => id !== currentUserId), currentUserId],
          lastUpdated: new Date(),
        }, { merge: true });
      };

      updateViewers();
      const interval = setInterval(updateViewers, 10000); // Actualizar cada 10 segundos

      return () => {
        unsubscribe();
        clearInterval(interval);
        // Remover usuario cuando se desmonta
        if (currentUserId) {
          updateDoc(viewersRef, {
            viewers: viewers.filter((id: string) => id !== currentUserId),
          }).catch(() => {});
        }
      };
    }

    return () => unsubscribe();
  }, [tenantId, resourceId, resourceType, currentUserId]);

  if (viewers.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 px-3 py-1 rounded-full">
      <div className="flex -space-x-2">
        {viewers.slice(0, 3).map((userId, idx) => (
          <div
            key={userId}
            className="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold"
            style={{ zIndex: 10 - idx }}
            title={`Usuario ${idx + 1} viendo`}
          >
            {userId.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>
      <span>
        {viewers.length} {viewers.length === 1 ? 'persona viendo' : 'personas viendo'}
      </span>
    </div>
  );
}


