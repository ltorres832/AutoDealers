import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createSubUser, getSubUsers, canPerformAction } from '@autodealers/core';
import { getTenantSales } from '@autodealers/crm';
import { validateMembershipFeature } from '@/lib/membership-middleware';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId || auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener vendedores del tenant (sub-users)
    // Intentar primero sin createdBy para obtener todos los vendedores del tenant
    let sellers: any[] = [];
    try {
      // Primero intentar sin createdBy para obtener todos
      sellers = await getSubUsers(auth.tenantId);
      
      // Si no hay resultados y hay userId, intentar con createdBy
      if (sellers.length === 0 && auth.userId) {
        sellers = await getSubUsers(auth.tenantId, auth.userId);
      }
    } catch (error: any) {
      // Intentar con createdBy si falla sin él
      if (auth.userId) {
        try {
          sellers = await getSubUsers(auth.tenantId, auth.userId);
        } catch (fallbackError: any) {
          sellers = [];
        }
      } else {
        sellers = [];
      }
    }
    
    // También obtener vendedores con tenant propio asociados a este dealer
    const { getFirestore } = await import('@autodealers/core');
    const db = getFirestore();
    const subUsersWithTenantSnapshot = await db
      .collection('sub_users')
      .where('dealerTenantId', '==', auth.tenantId)
      .get();
    
    const subUsersWithTenant = subUsersWithTenantSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      };
    });
    
    // También buscar vendedores directamente en la colección users con dealerId
    const usersSnapshot = await db
      .collection('users')
      .where('dealerId', '==', auth.tenantId)
      .where('role', '==', 'seller')
      .get();
    
    const usersAsSellers = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        status: data.status || 'active', // Asegurar que siempre tenga status
        isActive: data.status !== 'suspended' && data.status !== 'cancelled', // Para compatibilidad
        tenantId: data.tenantId,
        dealerId: data.dealerId,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
      };
    });
    
    // Combinar todos los vendedores (eliminar duplicados por ID o email)
    const allSellersMap = new Map();
    const allSellersByEmail = new Map();
    
    [...sellers, ...subUsersWithTenant, ...usersAsSellers].forEach((seller) => {
      // Usar ID como clave principal
      if (seller.id && !allSellersMap.has(seller.id)) {
        allSellersMap.set(seller.id, seller);
        // También indexar por email para detectar duplicados
        if (seller.email) {
          allSellersByEmail.set(seller.email.toLowerCase(), seller.id);
        }
      } else if (seller.email && !allSellersByEmail.has(seller.email.toLowerCase())) {
        // Si no tiene ID pero tiene email, crear uno temporal o usar email como ID
        const tempId = seller.id || `email_${seller.email.toLowerCase()}`;
        if (!allSellersMap.has(tempId)) {
          allSellersMap.set(tempId, { ...seller, id: tempId });
          allSellersByEmail.set(seller.email.toLowerCase(), tempId);
        }
      }
    });
    
    const allSellers = Array.from(allSellersMap.values());

    // Agregar estadísticas de ventas
    const sales = await getTenantSales(auth.tenantId);
    const salesBySeller: Record<string, { count: number; revenue: number }> = {};

    sales
      .filter((sale) => sale.status === 'completed' && sale.sellerId)
      .forEach((sale) => {
        if (!salesBySeller[sale.sellerId]) {
          salesBySeller[sale.sellerId] = { count: 0, revenue: 0 };
        }
        salesBySeller[sale.sellerId].count++;
        salesBySeller[sale.sellerId].revenue += sale.salePrice || sale.total || 0;
      });

    const sellersWithStats = allSellers.map((seller) => {
      // Asegurar que siempre tenga status e isActive
      const status = seller.status || (seller.isActive !== false ? 'active' : 'inactive');
      const isActive = seller.isActive !== undefined ? seller.isActive : (status === 'active');
      
      return {
        ...seller,
        status: status,
        isActive: isActive,
        salesCount: salesBySeller[seller.id]?.count || 0,
        revenue: salesBySeller[seller.id]?.revenue || 0,
        createdAt: seller.createdAt instanceof Date 
          ? seller.createdAt.toISOString() 
          : (seller.createdAt?.toISOString?.() || new Date().toISOString()),
      };
    });


    return NextResponse.json({ 
      sellers: sellersWithStats,
      debug: {
        fromSubUsers: sellers.length,
        fromSubUsersWithTenant: subUsersWithTenant.length,
        fromUsersCollection: usersAsSellers.length,
        total: allSellers.length,
      },
    });
  } catch (error) {
    console.error('Error fetching sellers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized: No authentication' }, { status: 401 });
    }
    
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized: No tenantId' }, { status: 401 });
    }
    
    if (auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Unauthorized: Only dealers can create sellers' }, { status: 403 });
    }

    const body = await request.json();

    // Validar límite de vendedores si no crea tenant propio
    if (!body.createOwnTenant) {
      const validation = await canPerformAction(auth.tenantId, 'createSeller');
      if (!validation.allowed) {
        return NextResponse.json(
          { error: validation.reason },
          { status: 403 }
        );
      }
    }

    // Validar subdominio si se crea tenant propio
    if (body.createOwnTenant && body.subdomain) {
      const { getTenantBySubdomain, tenantHasFeature } = await import('@autodealers/core');
      
      // Validar que la membresía permita subdominios
      const canUseSubdomain = await tenantHasFeature(auth.tenantId, 'customSubdomain');
      if (!canUseSubdomain) {
        return NextResponse.json(
          { error: 'Su membresía no permite crear subdominios para vendedores' },
          { status: 403 }
        );
      }

      // Validar que el subdominio no esté en uso
      const existing = await getTenantBySubdomain(body.subdomain);
      if (existing) {
        return NextResponse.json(
          { error: 'El subdominio ya está en uso' },
          { status: 400 }
        );
      }

      // Validar formato del subdominio
      if (!/^[a-z0-9-]+$/.test(body.subdomain)) {
        return NextResponse.json(
          { error: 'El subdominio solo puede contener letras minúsculas, números y guiones' },
          { status: 400 }
        );
      }

      // Validar longitud mínima y máxima
      if (body.subdomain.length < 3) {
        return NextResponse.json(
          { error: 'El subdominio debe tener al menos 3 caracteres' },
          { status: 400 }
        );
      }

      if (body.subdomain.length > 63) {
        return NextResponse.json(
          { error: 'El subdominio no puede tener más de 63 caracteres' },
          { status: 400 }
        );
      }

      // Validar que no empiece ni termine con guión
      if (body.subdomain.startsWith('-') || body.subdomain.endsWith('-')) {
        return NextResponse.json(
          { error: 'El subdominio no puede empezar ni terminar con guión' },
          { status: 400 }
        );
      }
    }

    try {
      const seller = await createSubUser(auth.tenantId, auth.userId, {
        email: body.email,
        password: body.password,
        name: body.name,
        phone: body.phone || undefined,
        role: body.role || 'assistant',
        permissions: {}, // Se asignan automáticamente según el rol
        createOwnTenant: body.createOwnTenant || false,
        subdomain: body.subdomain,
      });

      return NextResponse.json({ seller }, { status: 201 });
    } catch (createError) {
      console.error('Error in createSubUser:', createError);
      throw createError;
    }
  } catch (error) {
    console.error('Error creating seller:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error details:', {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    });
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

