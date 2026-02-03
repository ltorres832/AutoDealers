export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getMembershipById, updateMembership } from '@autodealers/billing';
import { syncMembershipFeaturesToTenants } from '@autodealers/core';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: membershipId } = await params;
    
    console.log('🔍 GET /api/admin/memberships/[id] - membershipId:', membershipId);
    
    if (!membershipId) {
      console.error('❌ No membership ID provided');
      return NextResponse.json({ error: 'Membership ID is required' }, { status: 400 });
    }

    const membership = await getMembershipById(membershipId);
    
    console.log('📦 Membership fetched:', membership ? `${membership.id} - ${membership.name}` : 'null');
    
    if (!membership) {
      console.warn('⚠️ Membership not found:', membershipId);
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    return NextResponse.json({ membership });
  } catch (error: any) {
    console.error('❌ Error fetching membership:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('🔍 PUT /api/admin/memberships/[id] - Verifying auth...');
    const auth = await verifyAuth(request);
    
    console.log('🔍 PUT /api/admin/memberships/[id] - Auth result:', {
      hasAuth: !!auth,
      role: auth?.role,
      userId: auth?.userId,
    });
    
    if (!auth) {
      console.error('❌ PUT /api/admin/memberships/[id] - No auth');
      return NextResponse.json({ error: 'Unauthorized - No authentication found' }, { status: 401 });
    }
    
    if (auth.role !== 'admin') {
      console.error('❌ PUT /api/admin/memberships/[id] - Not admin:', auth.role);
      return NextResponse.json({ error: 'Unauthorized - Admin role required' }, { status: 403 });
    }

    const { id: membershipId } = await params;

    const body = await request.json();
    const { features, ...otherUpdates } = body;

    // Validar y normalizar features - LIMPIAR undefined
    const validatedFeatures: any = {};
    if (features) {
      // Límites numéricos - convertir strings vacíos a null (Firestore acepta null, no undefined)
      const numericFields = [
        'maxSellers', 'maxInventory', 'maxCampaigns', 'maxPromotions',
        'maxAppointmentsPerMonth', 'maxStorageGB', 'maxApiCallsPerMonth'
      ];
      numericFields.forEach(field => {
        if (features[field] === '' || features[field] === null || features[field] === undefined) {
          // No agregar el campo si es undefined/null/empty (Firestore no acepta undefined)
          // Si queremos "ilimitado", usamos null explícitamente
          validatedFeatures[field] = null;
        } else {
          const parsed = parseInt(features[field]);
          if (!isNaN(parsed)) {
            validatedFeatures[field] = parsed;
          }
          // Si no se puede parsear, no agregar el campo
        }
      });

      // Features booleanas - siempre deben tener un valor booleano
      const booleanFields = [
        'customSubdomain', 'customDomain', 'aiEnabled', 'aiAutoResponses',
        'aiContentGeneration', 'aiLeadClassification', 'socialMediaEnabled',
        'socialMediaScheduling', 'socialMediaAnalytics', 'marketplaceEnabled',
        'marketplaceFeatured', 'advancedReports', 'customReports', 'exportData',
        'whiteLabel', 'apiAccess', 'webhooks', 'ssoEnabled', 'multiLanguage',
        'customTemplates', 'emailMarketing', 'smsMarketing', 'whatsappMarketing',
        'videoUploads', 'virtualTours', 'liveChat', 'appointmentScheduling',
        'paymentProcessing', 'inventorySync', 'crmAdvanced', 'leadScoring',
        'automationWorkflows', 'integrationsUnlimited', 'prioritySupport',
        'dedicatedManager', 'trainingSessions', 'customBranding', 'mobileApp',
        'offlineMode', 'dataBackup', 'complianceTools', 'analyticsAdvanced',
        'aBTesting', 'seoTools', 'customIntegrations', 'freePromotionsOnLanding'
      ];
      booleanFields.forEach(field => {
        // Solo agregar si está definido y es booleano
        if (features[field] !== undefined) {
          validatedFeatures[field] = Boolean(features[field]);
        }
      });
    }

    // Limpiar otros campos de undefined
    const cleanedUpdates: any = {};
    Object.keys(otherUpdates).forEach(key => {
      if (otherUpdates[key] !== undefined) {
        cleanedUpdates[key] = otherUpdates[key];
      }
    });

    // Actualizar membresía - asegurar que no hay undefined
    const updateData: any = {
      ...cleanedUpdates,
      features: validatedFeatures,
      updatedAt: new Date(),
    };

    // Limpiar cualquier undefined que pueda quedar
    const finalUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (typeof updateData[key] === 'object' && updateData[key] !== null) {
          // Limpiar objetos anidados
          const cleaned: any = {};
          Object.keys(updateData[key]).forEach(subKey => {
            if (updateData[key][subKey] !== undefined) {
              cleaned[subKey] = updateData[key][subKey];
            }
          });
          finalUpdateData[key] = cleaned;
        } else {
          finalUpdateData[key] = updateData[key];
        }
      }
    });

    console.log('💾 Updating membership with cleaned data:', JSON.stringify(finalUpdateData, null, 2));
    
    await updateMembership(membershipId, finalUpdateData);

    // Sincronizar features con todos los tenants que usan esta membresía
    await syncMembershipFeaturesToTenants(membershipId);

    const updated = await getMembershipById(membershipId);
    return NextResponse.json({ 
      membership: updated,
      message: 'Membresía actualizada y features sincronizadas exitosamente'
    });
  } catch (error) {
    console.error('Error updating membership:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: membershipId } = await params;

    // Marcar como inactiva en lugar de eliminar
    await updateMembership(membershipId, { isActive: false });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting membership:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
