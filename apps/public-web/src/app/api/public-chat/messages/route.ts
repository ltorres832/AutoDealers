import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

interface ChatMessage {
  id: string;
  tenantId: string;
  sessionId: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  content: string;
  fromClient: boolean;
  createdAt: admin.firestore.Timestamp;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const tenantId = searchParams.get('tenantId');

    if (!sessionId || !tenantId) {
      return NextResponse.json(
        { error: 'sessionId and tenantId are required' },
        { status: 400 }
      );
    }

    // Intentar obtener con orderBy, si falla obtener sin orderBy
    let messagesSnapshot;
    try {
      messagesSnapshot = await db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .where('sessionId', '==', sessionId)
        .orderBy('createdAt', 'asc')
        .get();
    } catch (orderError: any) {
      // Si falla por falta de índice, obtener sin orderBy y ordenar manualmente
      if (orderError.code === 9 || orderError.message?.includes('index')) {
        // Logging reducido - solo en desarrollo y solo ocasionalmente
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.warn('⚠️ Índice faltante para public_chat_messages, obteniendo sin orderBy...');
        }
        messagesSnapshot = await db
          .collection('tenants')
          .doc(tenantId)
          .collection('public_chat_messages')
          .where('sessionId', '==', sessionId)
          .get();
      } else {
        throw orderError;
      }
    }

    const messages = messagesSnapshot.docs.map((doc: any) => {
      const data = doc.data();
      const createdAt = data.createdAt?.toDate?.() || data.createdAt || new Date();
      return {
        id: doc.id,
        content: data.content,
        fromClient: data.fromClient || false,
        createdAt: createdAt instanceof Date ? createdAt.toISOString() : new Date().toISOString(),
      };
    });

    // Ordenar por fecha si no se usó orderBy
    messages.sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateA - dateB;
    });

    return NextResponse.json({ messages });
  } catch (error: any) {
    console.error('❌ Error fetching public chat messages:', error.message || error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, sessionId, clientName, clientEmail, clientPhone, content } = body;

    if (!tenantId || !sessionId || !clientName || !content) {
      return NextResponse.json(
        { error: 'tenantId, sessionId, clientName, and content are required' },
        { status: 400 }
      );
    }

    // Guardar mensaje del cliente
    const clientMessageRef = db
      .collection('tenants')
      .doc(tenantId)
      .collection('public_chat_messages')
      .doc();

    await clientMessageRef.set({
      tenantId,
      sessionId,
      clientName,
      clientEmail: clientEmail || null,
      clientPhone: clientPhone || null,
      content,
      fromClient: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    } as any);

    // Obtener el tenant para encontrar vendedores activos
    const tenantDoc = await db.collection('tenants').doc(tenantId).get();
    const tenantData = tenantDoc.data();

    // Buscar vendedores activos del tenant
    const sellersSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('sub_users')
      .where('role', '==', 'seller')
      .where('status', '==', 'active')
      .limit(1)
      .get();

    // Si no hay vendedores en sub_users, buscar en users
    let sellerId: string | null = null;
    if (!sellersSnapshot.empty) {
      sellerId = sellersSnapshot.docs[0].id;
    } else {
      const usersSnapshot = await db
        .collection('users')
        .where('tenantId', '==', tenantId)
        .where('role', '==', 'seller')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      
      if (!usersSnapshot.empty) {
        sellerId = usersSnapshot.docs[0].id;
      }
    }

    // Crear notificación para el vendedor si existe
    if (sellerId) {
      try {
        const { createNotification } = await import('@autodealers/core');
        await createNotification({
          tenantId,
          userId: sellerId,
          type: 'message_received',
          title: 'Nuevo mensaje del chat público',
          message: `${clientName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          channels: ['system'],
          metadata: {
            sessionId,
            clientName,
            clientEmail,
            clientPhone,
            messageId: clientMessageRef.id,
          },
        });
      } catch (notifError: any) {
        console.warn('⚠️ Error creando notificación (no crítico):', notifError.message);
      }
    }

    // Crear mensaje automático de respuesta si no hay vendedores
    if (!sellerId) {
      const autoResponseRef = db
        .collection('tenants')
        .doc(tenantId)
        .collection('public_chat_messages')
        .doc();

      await autoResponseRef.set({
        tenantId,
        sessionId,
        content: `Hola ${clientName}, gracias por contactarnos. Un vendedor se pondrá en contacto contigo pronto.`,
        fromClient: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      } as any);
    }

    return NextResponse.json(
      { 
        success: true,
        messageId: clientMessageRef.id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ Error sending public chat message:', error.message || error);
    console.error('❌ Error stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

