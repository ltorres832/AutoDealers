import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { AIClassifier } from '@autodealers/ai';
import { getLeadById, updateLead } from '@autodealers/crm';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { leadId } = body;

    if (!leadId) {
      return NextResponse.json(
        { error: 'leadId es requerido' },
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

    // Obtener lead
    const lead = await getLeadById(auth.tenantId, leadId);
    if (!lead) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 });
    }

    // Clasificar con IA
    const classifier = new AIClassifier(apiKey);
    const classification = await classifier.classifyLead({
      name: lead.contact.name,
      phone: lead.contact.phone,
      source: lead.source,
      messages: lead.interactions
        .filter((i) => i.type === 'message')
        .map((i) => i.content),
      interestedVehicles: lead.interestedVehicles,
    });

    // Actualizar lead con clasificación
    await updateLead(auth.tenantId, leadId, {
      aiClassification: classification,
    });

    return NextResponse.json({
      classification,
      success: true,
    });
  } catch (error: any) {
    console.error('Error classifying lead:', error);
    return NextResponse.json(
      { error: error.message || 'Error al clasificar lead' },
      { status: 500 }
    );
  }
}

