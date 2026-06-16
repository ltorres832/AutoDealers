'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client-base';
import { collection, query, onSnapshot } from 'firebase/firestore';

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export interface DealerDashboardStats {
  totalLeads: number;
  activeLeads: number;
  totalVehicles: number;
  availableVehicles: number;
  totalSales: number;
  monthlyRevenue: number;
  appointmentsToday: number;
  unreadMessages: number;
  totalSellers: number;
  sellersSales: number;
}

export interface DealerDashboardData {
  stats: DealerDashboardStats;
  recentLeads: Array<{ id: string; name: string; source: string; status: string; createdAt: string }>;
  recentSales: Array<{
    id: string;
    vehicle: string;
    customerName: string;
    sellerName?: string;
    price: number;
    createdAt: string;
  }>;
  topSellers: Array<{ id: string; name: string; sales: number; revenue: number }>;
}

const emptyStats: DealerDashboardStats = {
  totalLeads: 0,
  activeLeads: 0,
  totalVehicles: 0,
  availableVehicles: 0,
  totalSales: 0,
  monthlyRevenue: 0,
  appointmentsToday: 0,
  unreadMessages: 0,
  totalSellers: 0,
  sellersSales: 0,
};

export function useRealtimeDashboard(tenantId?: string) {
  const [data, setData] = useState<DealerDashboardData>({
    stats: emptyStats,
    recentLeads: [],
    recentSales: [],
    topSellers: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let leads: any[] = [];
    let vehicles: any[] = [];
    let sales: any[] = [];
    let appointments: any[] = [];
    let messages: any[] = [];
    let sellers: Array<{ id: string; name: string }> = [];

    function recompute() {
      const activeLeads = leads.filter((l) => l.status !== 'closed' && l.status !== 'lost');
      const completedSales = sales.filter((s) => s.status === 'completed');
      const monthlySales = completedSales.filter((s) => s.createdAt >= startOfMonth);
      const monthlyRevenue = monthlySales.reduce(
        (sum, s) => sum + (s.salePrice || s.total || s.price || 0),
        0
      );
      const sellersSales = completedSales.filter((s) => s.sellerId).length;

      const salesBySeller: Record<string, { sales: number; revenue: number }> = {};
      monthlySales
        .filter((s) => s.sellerId)
        .forEach((sale) => {
          if (!salesBySeller[sale.sellerId]) {
            salesBySeller[sale.sellerId] = { sales: 0, revenue: 0 };
          }
          salesBySeller[sale.sellerId].sales++;
          salesBySeller[sale.sellerId].revenue += sale.salePrice || sale.total || sale.price || 0;
        });

      const topSellers = sellers
        .map((seller) => ({
          id: seller.id,
          name: seller.name,
          sales: salesBySeller[seller.id]?.sales || 0,
          revenue: salesBySeller[seller.id]?.revenue || 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const recentLeads = [...leads]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((lead) => ({
          id: lead.id,
          name: lead.contact?.name || 'Cliente',
          source: lead.source || '',
          status: lead.status || '',
          createdAt: lead.createdAt.toISOString(),
        }));

      const recentSales = completedSales
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10)
        .map((sale) => {
          const seller = sellers.find((s) => s.id === sale.sellerId);
          return {
            id: sale.id,
            vehicle: sale.vehicleId || 'Vehículo',
            customerName: 'Cliente',
            sellerName: seller?.name,
            price: sale.salePrice || sale.total || sale.price || 0,
            createdAt: sale.createdAt.toISOString(),
          };
        });

      const appointmentsToday = appointments.filter((apt) => {
        const at = apt.scheduledAt;
        const st = apt.status;
        return at >= today && at < tomorrow && (st === 'scheduled' || st === 'confirmed');
      }).length;

      const unreadMessages = messages.filter((m) => m.status !== 'read').length;

      setData({
        stats: {
          totalLeads: leads.length,
          activeLeads: activeLeads.length,
          totalVehicles: vehicles.length,
          availableVehicles: vehicles.filter((v) => v.status === 'available').length,
          totalSales: monthlySales.length,
          monthlyRevenue,
          appointmentsToday,
          unreadMessages,
          totalSellers: sellers.length,
          sellersSales,
        },
        recentLeads,
        recentSales,
        topSellers,
      });
      setLoading(false);
    }

    const unsubLeads = onSnapshot(query(collection(db, 'tenants', tenantId, 'leads')), (snap) => {
      leads = snap.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, ...d, createdAt: toDate(d.createdAt) };
      });
      recompute();
    });

    const unsubVehicles = onSnapshot(query(collection(db, 'tenants', tenantId, 'vehicles')), (snap) => {
      vehicles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      recompute();
    });

    const unsubSales = onSnapshot(query(collection(db, 'tenants', tenantId, 'sales')), (snap) => {
      sales = snap.docs.map((doc) => {
        const d = doc.data();
        return { id: doc.id, ...d, createdAt: toDate(d.createdAt) };
      });
      recompute();
    });

    const unsubMessages = onSnapshot(query(collection(db, 'tenants', tenantId, 'messages')), (snap) => {
      messages = snap.docs.map((doc) => doc.data());
      recompute();
    });

    const unsubAppointments = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'appointments')),
      (snap) => {
        appointments = snap.docs.map((doc) => {
          const d = doc.data();
          return { ...d, scheduledAt: toDate(d.scheduledAt) };
        });
        recompute();
      }
    );

    const unsubSellers = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'sub_users')),
      (snap) => {
        sellers = snap.docs
          .filter((doc) => {
            const d = doc.data();
            return (d.role === 'seller' || !d.role) && d.isActive !== false && d.status !== 'inactive';
          })
          .map((doc) => ({
            id: doc.id,
            name: (doc.data().name as string) || 'Vendedor',
          }));
        recompute();
      }
    );

    return () => {
      unsubLeads();
      unsubVehicles();
      unsubSales();
      unsubMessages();
      unsubAppointments();
      unsubSellers();
    };
  }, [tenantId]);

  return { data, loading };
}
