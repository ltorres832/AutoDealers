import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getLeads } from '@autodealers/crm';
import { getSalesBySeller } from '@autodealers/crm';
import { getAppointmentsBySeller } from '@autodealers/crm';
import { getMessagesByChannel } from '@autodealers/crm';
import { getVehicles } from '@autodealers/inventory';
import { getFirestore } from '@autodealers/core';

// Lazy initialization para evitar dependencias circulares
function getDb() {
  return getFirestore();
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      console.error('Dashboard API: No auth found');
      return NextResponse.json({ error: 'Unauthorized - No authentication found' }, { status: 401 });
    }
    
    if (!auth.tenantId) {
      console.error('Dashboard API: No tenantId found for user:', auth.userId);
      return NextResponse.json({ error: 'Unauthorized - No tenantId found' }, { status: 401 });
    }

    if (auth.role !== 'seller') {
      console.error('Dashboard API: Invalid role:', auth.role, 'for user:', auth.userId);
      return NextResponse.json({ error: 'Forbidden - Invalid role' }, { status: 403 });
    }

    // Calcular fechas una sola vez
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const db = getDb();
    
    // Obtener datos en paralelo con límites optimizados
    const [leads, sales, messages, vehicles, appointmentsToday, promotionsSnapshot] = await Promise.all([
      getLeads(auth.tenantId, { assignedTo: auth.userId, limit: 50 }).catch(err => {
        console.error('Error fetching leads:', err);
        return [];
      }),
      getSalesBySeller(auth.tenantId, auth.userId).catch(err => {
        console.error('Error fetching sales:', err);
        return [];
      }),
      getMessagesByChannel(auth.tenantId, 'whatsapp', 50).catch(err => {
        console.error('Error fetching messages:', err);
        return [];
      }),
      getVehicles(auth.tenantId).catch(err => {
        console.error('Error fetching vehicles:', err);
        return [];
      }),
      // Optimizado: obtener citas de hoy directamente
      getAppointmentsBySeller(auth.tenantId, auth.userId, today, tomorrow).catch(err => {
        console.error('Error fetching appointments:', err);
        return [];
      }),
      // Obtener promociones del tenant
      db.collection('tenants').doc(auth.tenantId).collection('promotions').get().catch(err => {
        console.error('Error fetching promotions:', err);
        return { docs: [] };
      }),
    ]);

    // Calcular estadísticas (las fechas ya están calculadas arriba)

    const completedSales = sales.filter((sale) => sale.status === 'completed');
    const monthlySales = completedSales.filter(
      (sale) => sale.createdAt >= startOfMonth
    );
    const weeklySales = completedSales.filter(
      (sale) => sale.createdAt >= startOfWeek
    );
    const dailySales = completedSales.filter(
      (sale) => sale.createdAt >= startOfDay
    );

    const myRevenue = monthlySales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);
    const weeklyRevenue = weeklySales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);
    const dailyRevenue = dailySales.reduce((sum, sale) => sum + (sale.salePrice || sale.total || 0), 0);

    // Calcular comisiones totales
    const totalCommissions = completedSales.reduce((sum, sale) => {
      return sum + (sale.totalCommission || 0);
    }, 0);
    const monthlyCommissions = monthlySales.reduce((sum, sale) => {
      return sum + (sale.totalCommission || 0);
    }, 0);

    // Citas de hoy (ya obtenidas en el Promise.all)

    // Mensajes no leídos (los mensajes del CRM usan status, no read)
    const unreadMessages = messages.filter((msg) => msg.status !== 'read').length;

    // Tasa de conversión
    const myLeads = leads.length;
    const mySales = sales.filter((s) => s.status === 'completed').length;
    const conversionRate = myLeads > 0 ? (mySales / myLeads) * 100 : 0;

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

    // Ventas recientes - optimizado: solo mostrar datos básicos sin consultas adicionales pesadas
    const recentSales = sales
      .filter((sale) => sale.status === 'completed')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10)
      .map((sale) => {
        return {
          id: sale.id,
          vehicle: sale.vehicleId || 'Vehículo',
          customerName: 'Cliente',
          price: sale.salePrice || sale.total || 0,
          createdAt: sale.createdAt.toISOString(),
        };
      });

    // Citas próximas - reutilizar las citas de hoy y agregar las de la próxima semana
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);
    const allUpcomingAppointments = await getAppointmentsBySeller(
      auth.tenantId,
      auth.userId,
      now,
      nextWeek
    ).catch(() => []);

    // Citas próximas - optimizado: evitar consultas adicionales pesadas
    const upcomingAppointmentsData = allUpcomingAppointments
      .slice(0, 5)
      .map((apt) => {
        return {
          id: apt.id,
          leadName: 'Lead',
          scheduledAt: apt.scheduledAt.toISOString(),
          type: apt.type,
          status: apt.status,
        };
      });

    // Vehículos en inventario
    const myVehicles = vehicles.filter((v) => v.status === 'available');
    const totalVehicles = vehicles.length;
    const availableVehicles = myVehicles.length;

    // Calcular estadísticas de promociones
    const promotions = promotionsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    const activePromotions = promotions.filter((p: any) => p.status === 'active');
    const totalPromotionViews = promotions.reduce((sum: number, p: any) => {
      const views = p.views || 0;
      // También incluir vistas de redes sociales si existen
      const socialViews = (p.socialMetrics?.facebook?.views || 0) + (p.socialMetrics?.instagram?.views || 0);
      return sum + views + socialViews;
    }, 0);
    const totalPromotionClicks = promotions.reduce((sum: number, p: any) => {
      const clicks = p.clicks || 0;
      // También incluir clics de redes sociales si existen
      const socialClicks = (p.socialMetrics?.facebook?.clicks || 0) + (p.socialMetrics?.instagram?.clicks || 0);
      return sum + clicks + socialClicks;
    }, 0);
    
    // Promociones recientes con estadísticas (todas, no solo activas)
    const recentPromotions = promotions
      .sort((a: any, b: any) => {
        const dateA = a.createdAt || new Date(0);
        const dateB = b.createdAt || new Date(0);
        const timeA = dateA instanceof Date ? dateA.getTime() : new Date(dateA).getTime();
        const timeB = dateB instanceof Date ? dateB.getTime() : new Date(dateB).getTime();
        return timeB - timeA;
      })
      .slice(0, 5)
      .map((promo: any) => {
        const views = promo.views || 0;
        const clicks = promo.clicks || 0;
        const socialViews = (promo.socialMetrics?.facebook?.views || 0) + (promo.socialMetrics?.instagram?.views || 0);
        const socialClicks = (promo.socialMetrics?.facebook?.clicks || 0) + (promo.socialMetrics?.instagram?.clicks || 0);
        
        return {
          id: promo.id,
          name: promo.name || 'Sin nombre',
          views: views + socialViews,
          clicks: clicks + socialClicks,
          status: promo.status || 'unknown',
          createdAt: promo.createdAt instanceof Date ? promo.createdAt.toISOString() : promo.createdAt,
        };
      });

    const stats = {
      myLeads,
      activeLeads: leads.filter(
        (l) => l.status !== 'closed' && l.status !== 'lost'
      ).length,
      mySales,
      myRevenue,
      weeklyRevenue,
      dailyRevenue,
      monthlyCommissions,
      totalCommissions,
      appointmentsToday: appointmentsToday.length,
      unreadMessages,
      conversionRate,
      totalVehicles,
      availableVehicles,
      dailySales: dailySales.length,
      weeklySales: weeklySales.length,
      monthlySales: monthlySales.length,
      // Estadísticas de promociones
      totalPromotions: promotions.length,
      activePromotions: activePromotions.length,
      totalPromotionViews,
      totalPromotionClicks,
    };

    return NextResponse.json({
      stats,
      recentLeads,
      recentSales,
      upcomingAppointments: upcomingAppointmentsData,
      recentPromotions,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // En lugar de retornar error, retornar datos vacíos para evitar pantalla en blanco
    return NextResponse.json({
      stats: {
        myLeads: 0,
        activeLeads: 0,
        mySales: 0,
        myRevenue: 0,
        weeklyRevenue: 0,
        dailyRevenue: 0,
        monthlyCommissions: 0,
        totalCommissions: 0,
        appointmentsToday: 0,
        unreadMessages: 0,
        conversionRate: 0,
        totalVehicles: 0,
        availableVehicles: 0,
        dailySales: 0,
        weeklySales: 0,
        monthlySales: 0,
        totalPromotions: 0,
        activePromotions: 0,
        totalPromotionViews: 0,
        totalPromotionClicks: 0,
      },
      recentLeads: [],
      recentSales: [],
      upcomingAppointments: [],
      recentPromotions: [],
    });
  }
}



