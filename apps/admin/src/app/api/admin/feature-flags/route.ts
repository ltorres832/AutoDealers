import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import {
  getAllDashboardFeatures,
  getDashboardFeatures,
  updateFeatureFlag,
  initializeDefaultFeatures,
  DashboardType,
} from '@autodealers/core';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dashboard = searchParams.get('dashboard') as DashboardType | null;

    if (dashboard) {
      const features = await getDashboardFeatures(dashboard);
      return NextResponse.json({ features });
    } else {
      const allFeatures = await getAllDashboardFeatures();
      return NextResponse.json({ dashboards: allFeatures });
    }
  } catch (error: any) {
    console.error('Error fetching feature flags:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener feature flags' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, dashboard, featureKey, enabled, featureName, description, category } = body;

    if (action === 'initialize') {
      try {
        console.log('🚀 Iniciando inicialización de features...');
        await initializeDefaultFeatures();
        
        // Esperar un momento para asegurar que se guardaron
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar que se crearon correctamente
        console.log('🔍 Verificando features guardadas...');
        const allFeatures = await getAllDashboardFeatures();
        const totalFeatures = allFeatures.reduce((sum, d) => sum + d.features.length, 0);
        
        console.log(`✅ Features inicializadas: ${totalFeatures} features encontradas`);
        console.log(`   Admin: ${allFeatures.find(d => d.dashboard === 'admin')?.features.length || 0}`);
        console.log(`   Dealer: ${allFeatures.find(d => d.dashboard === 'dealer')?.features.length || 0}`);
        console.log(`   Seller: ${allFeatures.find(d => d.dashboard === 'seller')?.features.length || 0}`);
        console.log(`   Public: ${allFeatures.find(d => d.dashboard === 'public')?.features.length || 0}`);
        
        return NextResponse.json({ 
          success: true, 
          message: `Features inicializadas: ${totalFeatures} features creadas`,
          dashboards: allFeatures,
          totalFeatures,
        });
      } catch (error: any) {
        console.error('❌ Error inicializando features:', error);
        console.error('   Stack:', error.stack);
        return NextResponse.json(
          { error: error.message || 'Error al inicializar features' },
          { status: 500 }
        );
      }
    }

    if (!dashboard || !featureKey || enabled === undefined) {
      return NextResponse.json(
        { error: 'dashboard, featureKey y enabled son requeridos' },
        { status: 400 }
      );
    }

    const config = await updateFeatureFlag(
      dashboard as DashboardType,
      featureKey,
      enabled,
      featureName,
      description,
      category
    );

    return NextResponse.json({ config });
  } catch (error: any) {
    console.error('Error updating feature flag:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar feature flag' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || auth.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { updates } = body; // Array de { dashboard, featureKey, enabled }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'updates debe ser un array no vacío' },
        { status: 400 }
      );
    }

    const results = [];
    for (const update of updates) {
      const { dashboard, featureKey, enabled } = update;
      if (!dashboard || !featureKey || enabled === undefined) {
        continue;
      }

      const config = await updateFeatureFlag(
        dashboard as DashboardType,
        featureKey,
        enabled
      );
      results.push(config);
    }

    return NextResponse.json({ updated: results.length, configs: results });
  } catch (error: any) {
    console.error('Error bulk updating feature flags:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar feature flags' },
      { status: 500 }
    );
  }
}

