import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export const dynamic = 'force-dynamic';

// Tipos de políticas disponibles
export type PolicyType = 
  | 'privacy' 
  | 'terms' 
  | 'cookies' 
  | 'returns' 
  | 'warranty';

export interface Policy {
  type: PolicyType;
  title: string;
  content: string;
  enabled: boolean;
  lastUpdated?: Date;
}

export interface PoliciesSettings {
  privacy: Policy;
  terms: Policy;
  cookies: Policy;
  returns: Policy;
  warranty: Policy;
}

// Contenido por defecto para cada política (mismo que dealer)
const DEFAULT_POLICIES: PoliciesSettings = {
  privacy: {
    type: 'privacy',
    title: 'Política de Privacidad',
    content: `# Política de Privacidad\n\n## 1. Información que Recopilamos\n\nRecopilamos información que usted nos proporciona directamente, incluyendo:\n\n- **Información de contacto:** Nombre, dirección de correo electrónico, número de teléfono\n- **Información de vehículos:** Preferencias, historial de búsqueda, vehículos de interés\n- **Información de transacciones:** Detalles de compras, métodos de pago\n- **Información de comunicación:** Mensajes, consultas, comentarios\n\n## 2. Cómo Utilizamos su Información\n\nUtilizamos la información recopilada para:\n\n- Procesar y completar sus transacciones\n- Comunicarnos con usted sobre productos, servicios y ofertas\n- Mejorar nuestros servicios y experiencia del usuario\n- Cumplir con obligaciones legales y regulatorias\n- Prevenir fraudes y proteger la seguridad\n\n**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  terms: {
    type: 'terms',
    title: 'Términos y Condiciones',
    content: `# Términos y Condiciones\n\n## 1. Aceptación de los Términos\n\nAl acceder y utilizar este sitio web y nuestros servicios, usted acepta estar sujeto a estos términos y condiciones.\n\n**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  cookies: {
    type: 'cookies',
    title: 'Política de Cookies',
    content: `# Política de Cookies\n\n## 1. ¿Qué son las Cookies?\n\nLas cookies son pequeños archivos de texto que se almacenan en su dispositivo cuando visita un sitio web.\n\n**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  returns: {
    type: 'returns',
    title: 'Política de Devoluciones y Reembolsos',
    content: `# Política de Devoluciones y Reembolsos\n\n## 1. Política General\n\nEntendemos que a veces puede necesitar devolver un vehículo.\n\n**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
  warranty: {
    type: 'warranty',
    title: 'Política de Garantías',
    content: `# Política de Garantías\n\n## 1. Garantía Básica del Concesionario\n\nTodos los vehículos vendidos incluyen nuestra garantía básica del concesionario.\n\n**Última actualización:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`,
    enabled: true,
    lastUpdated: new Date(),
  },
};

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantDoc = await db.collection('tenants').doc(auth.tenantId).get();
    
    let policiesSettings: PoliciesSettings;
    
    if (!tenantDoc.exists) {
      // Si el tenant no existe, usar políticas por defecto
      console.warn(`Tenant ${auth.tenantId} not found, using default policies`);
      policiesSettings = {
        privacy: { ...DEFAULT_POLICIES.privacy },
        terms: { ...DEFAULT_POLICIES.terms },
        cookies: { ...DEFAULT_POLICIES.cookies },
        returns: { ...DEFAULT_POLICIES.returns },
        warranty: { ...DEFAULT_POLICIES.warranty },
      };
    } else {
      const tenantData = tenantDoc.data();
      const policies = tenantData?.policies || {};

      // Si no hay políticas, usar las por defecto
      policiesSettings = {
        privacy: policies.privacy ? { ...DEFAULT_POLICIES.privacy, ...policies.privacy } : { ...DEFAULT_POLICIES.privacy },
        terms: policies.terms ? { ...DEFAULT_POLICIES.terms, ...policies.terms } : { ...DEFAULT_POLICIES.terms },
        cookies: policies.cookies ? { ...DEFAULT_POLICIES.cookies, ...policies.cookies } : { ...DEFAULT_POLICIES.cookies },
        returns: policies.returns ? { ...DEFAULT_POLICIES.returns, ...policies.returns } : { ...DEFAULT_POLICIES.returns },
        warranty: policies.warranty ? { ...DEFAULT_POLICIES.warranty, ...policies.warranty } : { ...DEFAULT_POLICIES.warranty },
      };
    }

    return NextResponse.json({ policies: policiesSettings });
  } catch (error: any) {
    console.error('Error fetching policies:', error);
    console.error('Error stack:', error.stack);
    // En caso de error, devolver políticas por defecto en lugar de error
    const policiesSettings: PoliciesSettings = {
      privacy: { ...DEFAULT_POLICIES.privacy },
      terms: { ...DEFAULT_POLICIES.terms },
      cookies: { ...DEFAULT_POLICIES.cookies },
      returns: { ...DEFAULT_POLICIES.returns },
      warranty: { ...DEFAULT_POLICIES.warranty },
    };
    return NextResponse.json({ policies: policiesSettings }, { status: 200 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { policies } = body;

    if (!policies) {
      return NextResponse.json({ error: 'Policies data required' }, { status: 400 });
    }

    const validTypes: PolicyType[] = ['privacy', 'terms', 'cookies', 'returns', 'warranty'];
    for (const type of validTypes) {
      if (policies[type]) {
        if (!policies[type].title || !policies[type].content) {
          return NextResponse.json(
            { error: `Policy ${type} must have title and content` },
            { status: 400 }
          );
        }
        policies[type].lastUpdated = new Date();
      }
    }

    await db.collection('tenants').doc(auth.tenantId).update({
      policies: policies,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating policies:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

