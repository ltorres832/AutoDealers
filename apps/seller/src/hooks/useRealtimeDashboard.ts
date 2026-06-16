'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { filterVehiclesOwnedBySeller } from '@/lib/seller-vehicles-utils';

function toDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && 'toDate' in v && typeof (v as { toDate: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

export interface SellerDashboardStats {
  myLeads: number;
  activeLeads: number;
  mySales: number;
  myRevenue: number;
  weeklyRevenue: number;
  dailyRevenue: number;
  monthlyCommissions: number;
  totalCommissions: number;
  appointmentsToday: number;
  unreadMessages: number;
  conversionRate: number;
  totalVehicles: number;
  availableVehicles: number;
  dailySales: number;
  weeklySales: number;
  monthlySales: number;
  totalPromotions: number;
  activePromotions: number;
  totalPromotionViews: number;
  totalPromotionClicks: number;
}

export interface SellerDashboardData {
  stats: SellerDashboardStats;
  recentLeads: Array<{ id: string; name: string; source: string; status: string; createdAt: string }>;
  recentSales: Array<{ id: string; vehicle: string; customerName: string; price: number; createdAt: string }>;
  upcomingAppointments: Array<{ id: string; leadName: string; scheduledAt: string; type: string; status: string }>;
  recentPromotions: Array<{ id: string; name: string; views: number; clicks: number; status: string; createdAt?: string }>;
}

const emptyStats: SellerDashboardStats = {
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
};

export function useRealtimeDashboard(tenantId?: string, sellerId?: string) {
  const [data, setData] = useState<SellerDashboardData>({
    stats: emptyStats,
    recentLeads: [],
    recentSales: [],
    upcomingAppointments: [],
    recentPromotions: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId || !sellerId || !db) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const today = new Date(startOfDay);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(now);
    nextWeek.setDate(nextWeek.getDate() + 7);

    let leads: any[] = [];
    let sales: any[] = [];
    let messages: any[] = [];
    let vehicles: any[] = [];
    let appointments: any[] = [];
    let promotions: any[] = [];

    function recompute() {
      const myLeadsList = leads.filter((l) => l.assignedTo === sellerId);
      const mySalesList = sales.filter((s) => s.sellerId === sellerId);
      const completedSales = mySalesList.filter((s) => s.status === 'completed');
      const monthlySales = completedSales.filter((s) => s.createdAt >= startOfMonth);
      const weeklySales = completedSales.filter((s) => s.createdAt >= startOfWeek);
      const dailySales = completedSales.filter((s) => s.createdAt >= startOfDay);

      const myRevenue = monthlySales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0);
      const weeklyRevenue = weeklySales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0);
      const dailyRevenue = dailySales.reduce((sum, s) => sum + (s.salePrice || s.total || 0), 0);
      const totalCommissions = completedSales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);
      const monthlyCommissions = monthlySales.reduce((sum, s) => sum + (s.totalCommission || 0), 0);

      const myVehicles = filterVehiclesOwnedBySeller(vehicles, sellerId);
      const conversionRate =
        myLeadsList.length > 0 ? (completedSales.length / myLeadsList.length) * 100 : 0;

      const appointmentsToday = appointments.filter((apt) => {
        const at = apt.scheduledAt;
        return (
          apt.sellerId === sellerId &&
          at >= today &&
          at < tomorrow
        );
      }).length;

      const upcomingAppointments = appointments
        .filter((apt) => apt.sellerId === sellerId && apt.scheduledAt >= now && apt.scheduledAt <= nextWeek)
        .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
        .slice(0, 5)
        .map((apt) => ({
          id: apt.id,
          leadName: 'Lead',
          scheduledAt: apt.scheduledAt.toISOString(),
          type: apt.type || '',
          status: apt.status || '',
        }));

      const recentLeads = myLeadsList
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
        .map((sale) => ({
          id: sale.id,
          vehicle: sale.vehicleId || 'Vehículo',
          customerName: 'Cliente',
          price: sale.salePrice || sale.total || 0,
          createdAt: sale.createdAt.toISOString(),
        }));

      const activePromotions = promotions.filter((p) => p.status === 'active');
      const totalPromotionViews = promotions.reduce((sum, p) => {
        const views = p.views || 0;
        const socialViews =
          (p.socialMetrics?.facebook?.views || 0) + (p.socialMetrics?.instagram?.views || 0);
        return sum + views + socialViews;
      }, 0);
      const totalPromotionClicks = promotions.reduce((sum, p) => {
        const clicks = p.clicks || 0;
        const socialClicks =
          (p.socialMetrics?.facebook?.clicks || 0) + (p.socialMetrics?.instagram?.clicks || 0);
        return sum + clicks + socialClicks;
      }, 0);

      const recentPromotions = [...promotions]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5)
        .map((promo) => {
          const views = promo.views || 0;
          const clicks = promo.clicks || 0;
          const socialViews =
            (promo.socialMetrics?.facebook?.views || 0) + (promo.socialMetrics?.instagram?.views || 0);
          const socialClicks =
            (promo.socialMetrics?.facebook?.clicks || 0) + (promo.socialMetrics?.instagram?.clicks || 0);
          return {
            id: promo.id,
            name: promo.name || 'Sin nombre',
            views: views + socialViews,
            clicks: clicks + socialClicks,
            status: promo.status || 'unknown',
            createdAt: promo.createdAt.toISOString(),
          };
        });

      setData({
        stats: {
          myLeads: myLeadsList.length,
          activeLeads: myLeadsList.filter((l) => l.status !== 'closed' && l.status !== 'lost').length,
          mySales: completedSales.length,
          myRevenue,
          weeklyRevenue,
          dailyRevenue,
          monthlyCommissions,
          totalCommissions,
          appointmentsToday,
          unreadMessages: messages.filter((m) => m.status !== 'read').length,
          conversionRate,
          totalVehicles: myVehicles.length,
          availableVehicles: myVehicles.filter((v) => v.status === 'available').length,
          dailySales: dailySales.length,
          weeklySales: weeklySales.length,
          monthlySales: monthlySales.length,
          totalPromotions: promotions.length,
          activePromotions: activePromotions.length,
          totalPromotionViews,
          totalPromotionClicks,
        },
        recentLeads,
        recentSales,
        upcomingAppointments,
        recentPromotions,
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

    const unsubVehicles = onSnapshot(query(collection(db, 'tenants', tenantId, 'vehicles')), (snap) => {
      vehicles = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      recompute();
    });

    const unsubAppointments = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'appointments')),
      (snap) => {
        appointments = snap.docs.map((doc) => {
          const d = doc.data();
          return { id: doc.id, ...d, scheduledAt: toDate(d.scheduledAt) };
        });
        recompute();
      }
    );

    const unsubPromotions = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'promotions')),
      (snap) => {
        promotions = snap.docs.map((doc) => {
          const d = doc.data();
          return { id: doc.id, ...d, createdAt: toDate(d.createdAt) };
        });
        recompute();
      }
    );

    return () => {
      unsubLeads();
      unsubSales();
      unsubMessages();
      unsubVehicles();
      unsubAppointments();
      unsubPromotions();
    };
  }, [tenantId, sellerId]);

  return { data, loading };
}
