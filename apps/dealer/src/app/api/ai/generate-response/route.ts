import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { AIAssistant } from '@autodealers/ai';
import { getLeadById } from '@autodealers/crm';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId, message, context } = body;

    if (!leadId || !message) {
      return NextResponse.json(
        { error: 'leadId y message son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que OpenAI API Key esté configurada
    const { getOpenAIApiKey } = await import('@autodealers/core');
    const apiKey = await getOpenAIApiKey();
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API Key no configurada. Por favor configura la API Key desde el panel de administración.' },
        { status: 500 }
      );
    }

    // Obtener información del lead
    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    // Obtener historial de mensajes
    const messagesSnapshot = await db
      .collection('tenants')
      .doc(auth.tenantId)
      .collection('messages')
      .where('leadId', '==', leadId)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    const messageHistory = messagesSnapshot.docs
      .map((doc) => doc.data().content)
      .reverse();

    // Generar contexto
    const leadContext = `Lead: ${lead.contact.name} (${lead.contact.phone})
Estado: ${lead.status}
Fuente: ${lead.source}
Vehículos de interés: ${lead.interestedVehicles?.join(', ') || 'Ninguno'}`;

    // Generar respuesta con IA
    const aiAssistant = new AIAssistant(apiKey);
    const aiResponse = await aiAssistant.generateResponse(
      leadContext,
      message,
      messageHistory
    );

    return NextResponse.json({
      response: aiResponse.content,
      confidence: aiResponse.confidence,
      requiresApproval: aiResponse.requiresApproval,
    });
  } catch (error: any) {
    console.error('Error generating AI response:', error);
    return NextResponse.json(
      { error: error.message || 'Error al generar respuesta' },
      { status: 500 }
    );
  }
}

