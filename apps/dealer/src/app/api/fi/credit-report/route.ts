export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { requireTenantFeature } from '@/lib/membership-middleware';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

// Implementación directa para evitar problemas de webpack
async function getFIClientByIdDirect(tenantId: string, clientId: string) {
  const clientDoc = await db
    .collection('tenants')
    .doc(tenantId)
    .collection('fi_clients')
    .doc(clientId)
    .get();

  if (!clientDoc.exists) {
    return null;
  }

  const data = clientDoc.data();
  return {
    id: clientDoc.id,
    ...data,
    createdAt: data?.createdAt?.toDate() || new Date(),
    updatedAt: data?.updatedAt?.toDate() || new Date(),
  };
}

// Obtener credenciales de proveedores de crédito desde Firestore
async function getCreditProviderCredentials(provider: string) {
  const credentialsDoc = await db.collection('system').doc('credit_providers').get();
  
  if (!credentialsDoc.exists) {
    return null;
  }

  const data = credentialsDoc.data();
  const providerKey = provider.toLowerCase();
  
  if (providerKey === 'experian' && data?.experian?.enabled && data.experian.apiKey) {
    return {
      apiKey: data.experian.apiKey,
      apiSecret: data.experian.apiSecret,
    };
  }
  
  if (providerKey === 'equifax' && data?.equifax?.enabled && data.equifax.apiKey) {
    return {
      apiKey: data.equifax.apiKey,
      apiSecret: data.equifax.apiSecret,
    };
  }
  
  if (providerKey === 'transunion' && data?.transunion?.enabled && data.transunion.apiKey) {
    return {
      apiKey: data.transunion.apiKey,
      apiSecret: data.transunion.apiSecret,
    };
  }

  return null;
}

// Implementación de pullCreditReport que usa credenciales reales si están configuradas
async function pullCreditReportDirect(
  tenantId: string,
  clientId: string,
  clientData: any,
  provider?: string
) {
  const providerName = provider || 'mock';
  
  // Si el proveedor no es mock, intentar obtener credenciales
  if (providerName !== 'mock') {
    const credentials = await getCreditProviderCredentials(providerName);
    
    if (credentials && credentials.apiKey) {
      // Aquí se integraría con la API real del proveedor
      // Por ahora, retornamos datos mock pero con el provider correcto
      console.log(`🔍 Obteniendo reporte de crédito de ${providerName} con credenciales configuradas`);
      
      // TODO: Integrar con APIs reales:
      // - Experian: https://developer.experian.com/
      // - Equifax: https://developer.equifax.com/
      // - TransUnion: https://developer.transunion.com/
      
      // Por ahora retornamos datos mock pero indicando que las credenciales están configuradas
      return {
        creditScore: 700,
        creditRange: 'good' as const,
        paymentHistory: {
          onTime: 24,
          late: 2,
          missed: 0,
          totalAccounts: 5,
        },
        currentDebts: 15000,
        openCreditLines: 3,
        inquiries: 2,
        verified: true,
        reportDate: new Date(),
        provider: providerName,
        note: 'Credenciales configuradas - Integración con API real pendiente',
      };
    } else {
      console.warn(`⚠️ Proveedor ${providerName} no configurado o deshabilitado, usando datos mock`);
    }
  }

  // Retornar datos mock si no hay credenciales o si es mock
  return {
    creditScore: 700,
    creditRange: 'good' as const,
    paymentHistory: {
      onTime: 24,
      late: 2,
      missed: 0,
      totalAccounts: 5,
    },
    currentDebts: 15000,
    openCreditLines: 3,
    inquiries: 2,
    verified: true,
    reportDate: new Date(),
    provider: providerName === 'mock' ? 'mock' : `${providerName} (mock - sin credenciales)`,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const fiGate = await requireTenantFeature(auth.tenantId, 'useFIModule');
    if (fiGate) return fiGate;

    const body = await request.json();
    const { clientId, provider } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 });
    }

    // Obtener datos del cliente
    const client = await getFIClientByIdDirect(auth.tenantId!, clientId);
    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    // Preparar datos para el reporte de crédito
    const clientAny = client as any;
    const clientData = {
      firstName: clientAny.personalInfo?.firstName || (clientAny.name?.split(' ')[0] || ''),
      lastName: clientAny.personalInfo?.lastName || (clientAny.name?.split(' ').slice(1).join(' ') || ''),
      dateOfBirth: clientAny.personalInfo?.dateOfBirth || '',
      ssn: clientAny.personalInfo?.ssn,
      address: clientAny.personalInfo?.address || clientAny.address,
      city: clientAny.personalInfo?.city,
      state: clientAny.personalInfo?.state,
      zipCode: clientAny.personalInfo?.zipCode,
    };

    // Obtener reporte de crédito
    const creditReport = await pullCreditReportDirect(
      auth.tenantId!,
      clientId,
      clientData,
      provider
    );

    if (!creditReport) {
      return NextResponse.json(
        { error: 'Failed to retrieve credit report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      creditReport: {
        ...creditReport,
        reportDate: creditReport.reportDate.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('Error fetching credit report:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

