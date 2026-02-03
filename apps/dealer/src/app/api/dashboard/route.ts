import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads } from '@autodealers/crm';
import { getVehicles } from '@autodealers/inventory';
import { getTenantSales } from '@autodealers/crm';
import { getAppointmentsBySeller } from '@autodealers/crm';
import { getMessagesByChannel } from '@autodealers/crm';
import { getUsersByTenant, getFirestore, getSubUsers } from '@autodealers/core';
import * as admin from 'firebase-admin';

const db = getFirestore();

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verificar que sea dealer
    if (auth.role !== 'dealer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calcular fechas una sola vez
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Obtener vendedores usando la misma lógica que la API de sellers
    let sellersFromSubUsers: any[] = [];
    let sellersFromSubUsersWithTenant: any[] = [];
    let sellersFromUsersCollection: any[] = [];
    
    try {
      // Intentar obtener vendedores sin createdBy primero
      sellersFromSubUsers = await getSubUsers(auth.tenantId);
      
      // Si no hay resultados y hay userId, intentar con createdBy
      if (sellersFromSubUsers.length === 0 && auth.userId) {
        sellersFromSubUsers = await getSubUsers(auth.tenantId, auth.userId);
      }
    } catch (error: any) {
      // Silenciar errores comunes
      sellersFromSubUsers = [];
    }
    
    // También obtener vendedores con tenant propio asociados a este dealer
    try {
      const subUsersWithTenantSnapshot = await db
        .collection('sub_users')
        .where('dealerTenantId', '==', auth.tenantId)
        .get();
      
      sellersFromSubUsersWithTenant = subUsersWithTenantSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          role: 'seller',
          status: data.isActive !== false ? 'active' : 'inactive',
          tenantId: data.sellerTenantId || data.tenantId,
          dealerId: auth.tenantId,
        };
      });
    } catch (error: any) {
      // Silenciar errores comunes
    }
    
    // También buscar vendedores directamente en la colección users con dealerId
    try {
      const usersSnapshot = await db
        .collection('users')
        .where('dealerId', '==', auth.tenantId)
        .where('role', '==', 'seller')
        .get();
      
      sellersFromUsersCollection = usersSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          email: data.email,
          role: 'seller',
          status: data.status || 'active',
          tenantId: data.tenantId,
          dealerId: data.dealerId,
        };
      });
    } catch (error: any) {
      // Silenciar errores comunes
    }
    
    // Combinar todos los vendedores (eliminar duplicados por ID)
    const allSellersMap = new Map();
    [...sellersFromSubUsers, ...sellersFromSubUsersWithTenant, ...sellersFromUsersCollection].forEach((seller) => {
      if (seller.id && !allSellersMap.has(seller.id)) {
        allSellersMap.set(seller.id, seller);
      }
    });
    const allSellers = Array.from(allSellersMap.values());
    
    // Obtener datos en paralelo con límites optimizados
    const [leads, vehiclesSnapshot, sales, messages, appointmentsSnapshot] = await Promise.all([
      getLeads(auth.tenantId, { limit: 50 }).catch(err => {
        console.error('❌ [DEALER API] Error obteniendo leads:', err);
        return [];
      }),
      db.collection('tenants')
        .doc(auth.tenantId)
        .collection('vehicles')
        .orderBy('createdAt', 'desc')
        .limit(100)
        .get()
        .then(snapshot => {
          return snapshot.docs.map(doc => {
            const data = doc.data();
            return { 
              id: doc.id, 
              ...data,
              status: data.status || 'available',
            };
          });
        })
        .catch(err => {
          console.error('❌ [DEALER API] Error obteniendo vehículos:', err);
          return [];
        }),
      getTenantSales(auth.tenantId, { 
        startDate: startOfMonth,
        status: 'completed' 
      }).catch(err => {
        console.error('❌ [DEALER API] Error obteniendo ventas:', err);
        return [];
      }),
      getMessagesByChannel(auth.tenantId, 'whatsapp', 50).catch(err => {
        console.error('❌ [DEALER API] Error obteniendo mensajes:', err);
        return [];
      }),
      // Optimizado: obtener todas las citas de hoy en una sola query
      db.collection('tenants')
        .doc(auth.tenantId)
        .collection('appointments')
        .where('scheduledAt', '>=', today)
        .where('scheduledAt', '<', tomorrow)
        .where('status', 'in', ['scheduled', 'confirmed'])
        .limit(100)
        .get()
        .catch(err => {
          console.error('❌ [DEALER API] Error obteniendo citas:', err);
          return { size: 0, docs: [] } as any;
        }),
    ]);
    

    // Usar todos los vendedores obtenidos (ser más permisivo con el filtrado)
    const sellersList = allSellers.filter((s) => {
      // Verificar que sea seller
      if (s.role !== 'seller') {
        return false;
      }
      // Si no tiene status o isActive, asumir que está activo
      if (s.status === undefined && s.isActive === undefined) {
        return true;
      }
      // Si tiene status, verificar que sea 'active'
      if (s.status !== undefined) {
        return s.status === 'active';
      }
      // Si tiene isActive, verificar que sea true
      if (s.isActive !== undefined) {
        return s.isActive !== false;
      }
      return true;
    });
    
    const appointmentsToday = appointmentsSnapshot.size;
    
    // vehiclesSnapshot ya es un array mapeado
    const vehicles = vehiclesSnapshot;

    // Mensajes no leídos (los mensajes del CRM usan status, no read)
    const unreadMessages = messages.filter((msg) => msg.status !== 'read').length;

    // Calcular revenue mensual (las ventas ya están filtradas por mes y status)
    const monthlyRevenue = sales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);

    // Ventas por vendedores (ya están filtradas por status completed y fecha)
    const sellersSales = sales.filter((sale) => sale.sellerId).length;

    // Top vendedores (las ventas ya están filtradas por status completed)
    const salesBySeller: Record<string, { sales: number; revenue: number }> = {};
    sales
      .filter((sale) => sale.sellerId)
      .forEach((sale) => {
        if (!salesBySeller[sale.sellerId]) {
          salesBySeller[sale.sellerId] = { sales: 0, revenue: 0 };
        }
        salesBySeller[sale.sellerId].sales++;
        salesBySeller[sale.sellerId].revenue += (sale.salePrice || sale.total || 0);
      });

    const topSellers = sellersList
      .map((seller) => ({
        id: seller.id,
        name: seller.name,
        sales: salesBySeller[seller.id]?.sales || 0,
        revenue: salesBySeller[seller.id]?.revenue || 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Leads recientes
    const recentLeads = leads
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((lead) => ({
        id: lead.id,
        name: lead.contact.name,
        source: lead.source,
        status: lead.status,
        createdAt: lead.createdAt.toISOString(),
      }));

    // Obtener información de vehículos y leads para las ventas recientes
    const tenantId = auth.tenantId!; // Ya verificado arriba
    const vehicleIds = [...new Set(sales.slice(0, 10).map(s => s.vehicleId))];
    const leadIds = [...new Set(sales.slice(0, 10).filter(s => s.leadId).map(s => s.leadId!))];
    
    const [vehiclesData, leadsData] = await Promise.all([
      Promise.all(vehicleIds.map(async (vehicleId) => {
        try {
          const vehicleDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('vehicles')
            .doc(vehicleId)
            .get();
          if (vehicleDoc.exists) {
            const data = vehicleDoc.data();
            return { id: vehicleId, ...data };
          }
          return null;
        } catch {
          return null;
        }
      })),
      Promise.all(leadIds.map(async (leadId) => {
        try {
          const leadDoc = await db
            .collection('tenants')
            .doc(tenantId)
            .collection('leads')
            .doc(leadId)
            .get();
          if (leadDoc.exists) {
            const data = leadDoc.data();
            return { id: leadId, ...data };
          }
          return null;
        } catch {
          return null;
        }
      })),
    ]);

    // Ventas recientes (ya están ordenadas y filtradas)
    const recentSales = sales
      .slice(0, 10) // Solo las 10 más recientes
      .map((sale) => {
        const seller = sellersList.find((s) => s.id === sale.sellerId);
        const vehicle = vehiclesData.find((v) => v && v.id === sale.vehicleId);
        const lead = leadsData.find((l) => l && l.id === sale.leadId);
        
        const vehicleInfo = vehicle && 'year' in vehicle
          ? `${(vehicle as any).year || ''} ${(vehicle as any).make || ''} ${(vehicle as any).model || ''}`.trim() || 'Vehículo'
          : 'Vehículo';
        const customerName = lead && 'contact' in lead
          ? (lead as any).contact?.name || 'Cliente'
          : 'Cliente';

        return {
          id: sale.id,
          vehicle: vehicleInfo,
          customerName,
          sellerName: seller?.name,
          price: sale.salePrice || sale.total || 0,
          createdAt: sale.createdAt.toISOString(),
        };
      });

    const stats = {
      totalLeads: leads.length,
      activeLeads: leads.filter(
        (l) => l.status !== 'closed' && l.status !== 'lost'
      ).length,
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter((v) => v.status === 'available').length,
      totalSales: sales.length, // Ya están filtradas por status
      monthlyRevenue,
      appointmentsToday,
      unreadMessages,
      totalSellers: sellersList.length,
      sellersSales,
    };

    const responseData = {
      stats,
      recentLeads,
      recentSales,
      topSellers,
    };
    
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



