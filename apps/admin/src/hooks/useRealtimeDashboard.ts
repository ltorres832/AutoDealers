'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, Timestamp, QuerySnapshot } from 'firebase/firestore';

interface DashboardStats {
  totalLeads: number;
  activeLeads: number;
  totalVehicles: number;
  availableVehicles: number;
  totalSales: number;
  monthlyRevenue: number;
  appointmentsToday: number;
  unreadMessages: number;
}

export function useRealtimeDashboard(tenantId?: string) {
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    activeLeads: 0,
    totalVehicles: 0,
    availableVehicles: 0,
    totalSales: 0,
    monthlyRevenue: 0,
    appointmentsToday: 0,
    unreadMessages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Listener para leads
    const leadsUnsubscribe = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'leads')),
      (snapshot: any) => {
        const leads = snapshot.docs.map((doc: any) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });

        const activeLeads = leads.filter((l: any) =>
          l.status !== 'closed' && l.status !== 'lost'
        );

        const recent = leads
          .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((lead: any) => ({
            id: lead.id,
            name: lead.contact?.name || 'Sin nombre',
            source: lead.source,
            status: lead.status,
            createdAt: lead.createdAt.toISOString(),
          }));

        setRecentLeads(recent);
        setStats(prev => ({
          ...prev,
          totalLeads: leads.length,
          activeLeads: activeLeads.length,
        }));
      }
    );

    // Listener para vehículos
    const vehiclesUnsubscribe = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'vehicles')),
      (snapshot: any) => {
        const vehicles = snapshot.docs.map((doc: any) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
          };
        });

        const available = vehicles.filter((v: any) => v.status === 'available');

        setStats(prev => ({
          ...prev,
          totalVehicles: vehicles.length,
          availableVehicles: available.length,
        }));
      }
    );

    // Listener para ventas
    const salesUnsubscribe = onSnapshot(
      query(collection(db, 'tenants', tenantId, 'sales')),
      (snapshot: any) => {
        const sales = snapshot.docs.map((doc: any) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          };
        });

        const completed = sales.filter((s: any) => s.status === 'completed');
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlySales = completed.filter((s: any) => s.createdAt >= startOfMonth);
        const monthlyRevenue = monthlySales.reduce((sum: number, sale: any) => sum + (sale.price || 0), 0);

        const recent = completed
          .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
          .slice(0, 5)
          .map((sale: any) => ({
            id: sale.id,
            vehicle: sale.vehicleId || 'N/A',
            price: sale.price,
            createdAt: sale.createdAt.toISOString(),
          }));

        setRecentSales(recent);
        setStats(prev => ({
          ...prev,
          totalSales: completed.length,
          monthlyRevenue,
        }));
      }
    );

    // Listener para mensajes
    const messagesUnsubscribe = onSnapshot(
      query(
        collection(db, 'tenants', tenantId, 'messages'),
        where('isRead', '==', false)
      ),
      (snapshot: any) => {
        setStats(prev => ({
          ...prev,
          unreadMessages: snapshot.size,
        }));
      }
    );

    // Listener para citas de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const appointmentsUnsubscribe = onSnapshot(
      query(
        collection(db, 'tenants', tenantId, 'appointments'),
        where('scheduledAt', '>=', Timestamp.fromDate(today)),
        where('scheduledAt', '<', Timestamp.fromDate(tomorrow))
      ),
      (snapshot: any) => {
        setStats(prev => ({
          ...prev,
          appointmentsToday: snapshot.size,
        }));
        setLoading(false);
      }
    );

    return () => {
      leadsUnsubscribe();
      vehiclesUnsubscribe();
      salesUnsubscribe();
      messagesUnsubscribe();
      appointmentsUnsubscribe();
    };
  }, [tenantId]);

  return { stats, recentLeads, recentSales, loading };
}


