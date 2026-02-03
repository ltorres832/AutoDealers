export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@autodealers/crm';
import { getVehicles } from '@autodealers/inventory';
import { getTenantSales } from '@autodealers/crm';
import { getAppointmentsBySeller } from '@autodealers/crm';
import { getMessagesByChannel } from '@autodealers/crm';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth || !auth.tenantId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener datos en paralelo
    const [leads, vehicles, sales, messages] = await Promise.all([
      getLeads(auth.tenantId),
      getVehicles(auth.tenantId),
      getTenantSales(auth.tenantId),
      getMessagesByChannel(auth.tenantId, 'whatsapp', 100),
    ]);

    // Calcular estadísticas
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthlySales = sales.filter(
      (sale) => sale.createdAt >= startOfMonth && sale.status === 'completed'
    );
    const monthlyRevenue = monthlySales.reduce((sum, sale) => sum + (sale as any).price, 0);

    // Citas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let appointmentsToday = 0;
    if (auth.userId) {
      const appointments = await getAppointmentsBySeller(
        auth.tenantId,
        auth.userId,
        today,
        tomorrow
      );
      appointmentsToday = appointments.length;
    }

    // Mensajes no leídos
    const unreadMessages = messages.filter((msg: any) => !msg.isRead && !msg.read).length;

    // Leads recientes (últimos 5)
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

    // Ventas recientes (últimas 5)
    const recentSales = sales
      .filter((sale) => sale.status === 'completed')
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5)
      .map((sale: any) => ({
        id: sale.id,
        vehicle: sale.vehicleId || 'N/A',
        price: (sale as any).price,
        createdAt: sale.createdAt.toISOString(),
      }));

    const stats = {
      totalLeads: leads.length,
      activeLeads: leads.filter((l) => l.status !== 'closed' && l.status !== 'lost').length,
      totalVehicles: vehicles.length,
      availableVehicles: vehicles.filter((v) => v.status === 'available').length,
      totalSales: sales.filter((s) => s.status === 'completed').length,
      monthlyRevenue,
      appointmentsToday,
      unreadMessages,
    };

    return NextResponse.json({
      stats,
      recentLeads,
      recentSales,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

