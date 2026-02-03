import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { vehicle, customerProfile, objective } = body;

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle data is required' }, { status: 400 });
    }

    // Construir prompt para IA
    const vehicleInfo = `
Vehículo:
- Marca: ${vehicle.make}
- Modelo: ${vehicle.model}
- Año: ${vehicle.year}
- Precio: $${vehicle.price?.toLocaleString() || 'N/A'}
- Condición: ${vehicle.condition === 'new' ? 'Nuevo' : vehicle.condition === 'certified' ? 'Certificado' : 'Usado'}
${vehicle.mileage ? `- Kilometraje: ${vehicle.mileage.toLocaleString()} km` : ''}
${vehicle.location ? `- Ubicación: ${vehicle.location}` : ''}
${vehicle.features && vehicle.features.length > 0 ? `- Características: ${vehicle.features.join(', ')}` : ''}
`;

    const customerInfo = customerProfile
      ? `
Perfil de Cliente:
- Tipo: ${customerProfile.type || 'General'}
${customerProfile.preferences ? `- Preferencias: ${customerProfile.preferences.join(', ')}` : ''}
`
      : '';

    const objectiveInfo = objective === 'more_messages'
      ? 'Objetivo: Generar más mensajes de clientes interesados'
      : 'Objetivo: Generar más visitas al inventario';

    const prompt = `Eres un experto en marketing de automóviles. Genera contenido para redes sociales (Facebook e Instagram) que sea atractivo y efectivo.

${vehicleInfo}
${customerInfo}
${objectiveInfo}

Genera:
1. Un texto principal atractivo y profesional (máximo 200 palabras)
2. 5-10 hashtags relevantes (sin el símbolo #)
3. Un CTA (Call to Action) claro y directo
4. Sugerencias de formato optimizado para Facebook e Instagram

Responde en formato JSON:
{
  "text": "texto principal",
  "hashtags": ["hashtag1", "hashtag2", ...],
  "cta": "texto del CTA",
  "optimizedFor": {
    "facebook": {
      "text": "texto optimizado para Facebook",
      "hashtags": ["hashtag1", "hashtag2", ...]
    },
    "instagram": {
      "text": "texto optimizado para Instagram",
      "hashtags": ["hashtag1", "hashtag2", ...],
      "caption": "caption completo con hashtags"
    }
  }
}`;

    // Llamar a OpenAI o el servicio de IA configurado
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en marketing de automóviles y redes sociales. Genera contenido efectivo y profesional.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      // Fallback si OpenAI falla
      throw new Error('Error al generar contenido con IA');
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No se recibió contenido de la IA');
    }

    // Parsear JSON de la respuesta
    let post;
    try {
      post = JSON.parse(content);
    } catch {
      // Si no es JSON válido, crear estructura básica
      post = {
        text: content.split('\n\n')[0] || '🚗 Vehículo disponible',
        hashtags: ['autos', 'vehiculos', vehicle.make?.toLowerCase(), vehicle.model?.toLowerCase()],
        cta: objective === 'more_messages' ? '💬 Envíame un mensaje para más información' : '👀 Visita nuestro inventario',
        optimizedFor: {
          facebook: {
            text: content.split('\n\n')[0] || '🚗 Vehículo disponible',
            hashtags: ['autos', 'vehiculos'],
          },
          instagram: {
            text: content.split('\n\n')[0] || '🚗 Vehículo disponible',
            hashtags: ['autos', 'vehiculos', vehicle.make?.toLowerCase(), vehicle.model?.toLowerCase()],
            caption: content,
          },
        },
      };
    }

    return NextResponse.json({ post });
  } catch (error: any) {
    console.error('Error generating social post:', error);
    
    // Fallback básico
    const { vehicle, objective } = await request.json().catch(() => ({}));
    if (vehicle) {
      const priceFormatted = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
      }).format(vehicle.price || 0);

      const baseText = `🚗 ${vehicle.year || ''} ${vehicle.make || ''} ${vehicle.model || ''}\n\n💰 Precio: ${priceFormatted}`;
      const cta = objective === 'more_messages' 
        ? '💬 Envíame un mensaje para más información'
        : '👀 Visita nuestro inventario para ver más opciones';

      return NextResponse.json({
        post: {
          text: `${baseText}\n\n${cta}`,
          hashtags: ['autos', 'vehiculos', vehicle.make?.toLowerCase(), vehicle.model?.toLowerCase()],
          cta,
          optimizedFor: {
            facebook: {
              text: `${baseText}\n\n${cta}`,
              hashtags: ['autos', 'vehiculos'],
            },
            instagram: {
              text: baseText,
              hashtags: ['autos', 'vehiculos', vehicle.make?.toLowerCase(), vehicle.model?.toLowerCase()],
              caption: `${baseText}\n\n${cta}`,
            },
          },
        },
      });
    }

    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

