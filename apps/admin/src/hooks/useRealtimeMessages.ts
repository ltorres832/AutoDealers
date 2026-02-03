'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, Timestamp, doc, getDoc, QuerySnapshot } from 'firebase/firestore';

interface Message {
  id: string;
  tenantId: string;
  leadId?: string;
  channel: string;
  direction: 'inbound' | 'outbound';
  from: string;
  to: string;
  content: string;
  isRead?: boolean;
  createdAt: Date | Timestamp;
}

interface Conversation {
  leadId: string;
  leadName: string;
  messages: Message[];
  unread: number;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export function useRealtimeMessages(tenantId?: string) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Listener para mensajes
      const messagesUnsubscribe = onSnapshot(
        query(
          collection(db, 'tenants', tenantId, 'messages'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(100)
        ),
        async (snapshot: any) => {
          const messages: Message[] = [];
          
          snapshot.forEach((doc: any) => {
            const data = doc.data();
            messages.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
            } as Message);
          });

          // Agrupar por leadId y crear conversaciones
          const conversationsMap = new Map<string, Conversation>();

          // Obtener información de leads para los nombres
          for (const message of messages) {
            if (!message.leadId) continue;

            if (!conversationsMap.has(message.leadId)) {
              // Obtener nombre del lead
              try {
                const leadDoc = await getDoc(doc(db, 'tenants', tenantId, 'leads', message.leadId));
                
                const leadData = leadDoc.data();
                const leadName = leadData?.contact?.name || 'Cliente sin nombre';

                conversationsMap.set(message.leadId, {
                  leadId: message.leadId,
                  leadName,
                  messages: [],
                  unread: 0,
                });
              } catch (err) {
                conversationsMap.set(message.leadId, {
                  leadId: message.leadId,
                  leadName: 'Cliente',
                  messages: [],
                  unread: 0,
                });
              }
            }

            const conv = conversationsMap.get(message.leadId)!;
            conv.messages.push(message);
            
            if (!message.isRead && message.direction === 'inbound') {
              conv.unread++;
            }

            // Actualizar último mensaje
            if (!conv.lastMessageTime || message.createdAt > conv.lastMessageTime) {
              conv.lastMessage = message.content;
              conv.lastMessageTime = message.createdAt instanceof Date 
                ? message.createdAt 
                : (message.createdAt as any)?.toDate?.() 
                  ? (message.createdAt as any).toDate() 
                  : new Date(message.createdAt as unknown as string | number);
            }
          }

          // Ordenar conversaciones por último mensaje
          const conversationsArray = Array.from(conversationsMap.values())
            .map(conv => ({
              ...conv,
              messages: conv.messages.sort((a: any, b: any) => {
                const aTime = a.createdAt instanceof Date 
                  ? a.createdAt.getTime() 
                  : (a.createdAt as any)?.toDate?.() 
                    ? (a.createdAt as any).toDate().getTime()
                    : new Date(a.createdAt as unknown as string | number).getTime();
                const bTime = b.createdAt instanceof Date 
                  ? b.createdAt.getTime() 
                  : (b.createdAt as any)?.toDate?.() 
                    ? (b.createdAt as any).toDate().getTime()
                    : new Date(b.createdAt as unknown as string | number).getTime();
                return aTime - bTime;
              }),
            }))
            .sort((a: any, b: any) => {
              const aTime = a.lastMessageTime?.getTime() || 0;
              const bTime = b.lastMessageTime?.getTime() || 0;
              return bTime - aTime;
            });

          setConversations(conversationsArray);
          setLoading(false);
        },
        (err) => {
          console.error('Error en listener de mensajes:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => messagesUnsubscribe();
    } catch (err: any) {
      console.error('Error setting up messages listener:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [tenantId]);

  return { conversations, loading, error };
}

export function useRealtimeConversation(tenantId?: string, leadId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !leadId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tenants', tenantId, 'messages'),
        where('leadId', '==', leadId),
        orderBy('createdAt', 'asc')
      ),
      (snapshot: any) => {
        const messagesData: Message[] = [];
        
        snapshot.forEach((doc: any) => {
          const data = doc.data();
          messagesData.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
          } as Message);
        });

        setMessages(messagesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error en listener de conversación:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [tenantId, leadId]);

  return { messages, loading };
}


