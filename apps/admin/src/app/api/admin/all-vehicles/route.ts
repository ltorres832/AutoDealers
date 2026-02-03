export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getFirestore } from '@autodealers/core';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    console.log('🚗 GET /api/admin/all-vehicles - Iniciando...');
    console.log('🔍 Cookies recibidas:', request.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })));
    console.log('🔍 Authorization header:', request.headers.get('authorization') ? 'Presente' : 'Ausente');
    
    const auth = await verifyAuth(request);
    console.log('🔍 Auth result:', auth ? { userId: auth.userId, role: auth.role } : 'null');
    
    if (!auth) {
      console.error('❌ Unauthorized - No auth object');
      return NextResponse.json({ 
        error: 'Unauthorized',
        details: 'No se pudo verificar la autenticación. Por favor, cierra sesión y vuelve a iniciar sesión.',
        cookiesReceived: request.cookies.getAll().map(c => c.name)
      }, { status: 401 });
    }
    
    if (auth.role !== 'admin') {
      console.error('❌ Forbidden - Role:', auth.role, 'User:', auth.userId, 'Email:', auth.email);
      return NextResponse.json({ 
        error: 'Forbidden',
        details: `Rol requerido: admin, rol actual: ${auth.role}`,
        userRole: auth.role,
        userId: auth.userId,
        email: auth.email
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    console.log('🔍 Filtros:', { tenantId, status, search });

    let vehicles: any[] = [];

    // Obtener todos los vehículos de todos los tenants
    console.log('📊 Obteniendo tenants...');
    const tenantsSnapshot = await db.collection('tenants').get();
    console.log(`✅ Encontrados ${tenantsSnapshot.size} tenants`);
    
    for (const tenantDoc of tenantsSnapshot.docs) {
      const tenantId_ = tenantDoc.id;
      const tenantData = tenantDoc.data();
      
      // Si hay filtro de tenant, solo buscar en ese tenant
      if (tenantId && tenantId_ !== tenantId) continue;

      let vehiclesQuery: any = db
        .collection('tenants')
        .doc(tenantId_)
        .collection('vehicles');

      if (status) {
        vehiclesQuery = vehiclesQuery.where('status', '==', status);
      }

      try {
        const vehiclesSnapshot = await vehiclesQuery.get();
        console.log(`📦 Tenant ${tenantId_} (${tenantData.name}): ${vehiclesSnapshot.size} vehículos`);
        
        vehiclesSnapshot.docs.forEach((doc: any) => {
          const data = doc.data();
          vehicles.push({
            id: doc.id,
            tenantId: tenantId_,
            tenantName: tenantData.name,
            ...data,
            createdAt: data?.createdAt?.toDate()?.toISOString() || new Date().toISOString(),
          });
        });
      } catch (queryError: any) {
        console.error(`❌ Error obteniendo vehículos del tenant ${tenantId_}:`, queryError.message);
        // Continuar con el siguiente tenant
      }
    }

    console.log(`✅ Total de vehículos antes de filtro de búsqueda: ${vehicles.length}`);

    // Filtrar por búsqueda si existe
    if (search) {
      const searchLower = search.toLowerCase();
      vehicles = vehicles.filter(
        (vehicle) =>
          vehicle.make?.toLowerCase().includes(searchLower) ||
          vehicle.model?.toLowerCase().includes(searchLower) ||
          vehicle.year?.toString().includes(search)
      );
      console.log(`✅ Total de vehículos después de filtro de búsqueda: ${vehicles.length}`);
    }

    console.log(`✅ Retornando ${vehicles.length} vehículos`);
    return NextResponse.json({ vehicles });
  } catch (error: any) {
    console.error('❌ Error fetching all vehicles:', error);
    console.error('Error stack:', error.stack);
    return NextResponse.json({ 
      vehicles: [],
      error: error.message,
      details: error.stack 
    }, { status: 500 });
  }
}
