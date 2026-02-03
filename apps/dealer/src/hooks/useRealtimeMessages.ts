// Hook para obtener mensajes en tiempo real (Dealer)

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, where, onSnapshot, orderBy, limit as firestoreLimit, Timestamp } from 'firebase/firestore';

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
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const messagesUnsubscribe = onSnapshot(
        query(
          collection(db, 'tenants', tenantId, 'messages'),
          orderBy('createdAt', 'desc'),
          firestoreLimit(500)
        ),
        (snapshot) => {
          const conversationsMap: Record<string, Conversation> = {};
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            const message: Message = {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as Message;

            if (!message.leadId) return;

            if (!conversationsMap[message.leadId]) {
              conversationsMap[message.leadId] = {
                leadId: message.leadId,
                leadName: 'Lead', // Se obtendrá del lead
                messages: [],
                unread: 0,
              };
            }

            conversationsMap[message.leadId].messages.push(message);
            
            if (message.direction === 'inbound' && !message.isRead) {
              conversationsMap[message.leadId].unread++;
            }

            // Actualizar último mensaje
            const messageTime = message.createdAt instanceof Date 
              ? message.createdAt 
                : (message.createdAt && typeof message.createdAt === 'object' && 'toDate' in message.createdAt)
                  ? (message.createdAt as any).toDate()
                  : typeof message.createdAt === 'string' || typeof message.createdAt === 'number'
                    ? new Date(message.createdAt)
                    : new Date();
            
            if (!conversationsMap[message.leadId].lastMessageTime || 
                messageTime > conversationsMap[message.leadId].lastMessageTime!) {
              conversationsMap[message.leadId].lastMessage = message.content;
              conversationsMap[message.leadId].lastMessageTime = messageTime;
            }
          });

          // Obtener nombres de leads
          const conversationsArray = Object.values(conversationsMap);
          conversationsArray.forEach(async (conv) => {
            try {
              const leadDoc = await import('firebase/firestore').then(m => 
                m.getDoc(m.doc(db, 'tenants', tenantId, 'leads', conv.leadId))
              );
              if (leadDoc.exists()) {
                const leadData = leadDoc.data();
                conv.leadName = leadData.contact?.name || 'Lead';
              }
            } catch (err) {
              console.error('Error obteniendo lead:', err);
            }
          });

          // Ordenar por último mensaje
          conversationsArray.sort((a, b) => {
            const timeA = a.lastMessageTime?.getTime() || 0;
            const timeB = b.lastMessageTime?.getTime() || 0;
            return timeB - timeA;
          });

          setConversations(conversationsArray);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real messages:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => messagesUnsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener messages:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [tenantId]);

  return { conversations, loading, error };
}

export function useRealtimeConversation(tenantId?: string, leadId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId || !leadId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const unsubscribe = onSnapshot(
        query(
          collection(db, 'tenants', tenantId, 'messages'),
          where('leadId', '==', leadId),
          orderBy('createdAt', 'asc')
        ),
        (snapshot) => {
          const messagesData: Message[] = [];
          
          snapshot.forEach((doc) => {
            const data = doc.data();
            messagesData.push({
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as Message);
          });

          setMessages(messagesData);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error('Error en tiempo real conversation:', err);
          setError(err.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error('Error configurando listener conversation:', err);
      setError(err.message);
      setLoading(false);
    }
  }, [tenantId, leadId]);

  return { messages, loading, error };
}


