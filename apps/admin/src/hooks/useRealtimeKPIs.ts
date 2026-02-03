'use client';

// Hook para obtener KPIs en tiempo real

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';

interface KPIData {
  totalSales: number;
  verifiedSales: number;
  externalSales: number;
  pendingVerification: number;
  interactionsToSales?: number;
  leadsToSales?: number;
  fraudDetected: number;
  fraudScoreAverage: number;
  highRiskSales: number;
  totalEarnings: number;
  earningsByPartner: Record<string, number>;
  earningsByCategory: Record<string, number>;
  dealersWithFlags: number;
  topDealers: Array<{ dealerId: string; sales: number; name?: string }>;
  salesTrend: Array<{ date: string; verified: number; external: number }>;
}

export function useRealtimeKPIs(timeRange: '7d' | '30d' | '90d' | 'all' = '30d') {
  const [kpiData, setKpiData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calcular fecha de inicio
    const now = new Date();
    let startDate = new Date();
    
    switch (timeRange) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      default:
        startDate = new Date(0);
    }

    const startTimestamp = Timestamp.fromDate(startDate);
    const unsubscribeFunctions: (() => void)[] = [];

    // Obtener todos los tenants
    const tenantsRef = collection(db, 'tenants');
    
    const tenantsUnsubscribe = onSnapshot(
      tenantsRef,
      (tenantsSnapshot) => {
        // Limpiar listeners anteriores
        unsubscribeFunctions.forEach(unsub => unsub());
        unsubscribeFunctions.length = 0;

        let totalSales = 0;
        let verifiedSales = 0;
        let externalSales = 0;
        let pendingVerification = 0;
        let fraudDetected = 0;
        let fraudScoreSum = 0;
        let fraudScoreCount = 0;
        let highRiskSales = 0;
        const earningsByPartner: Record<string, number> = {};
        const earningsByCategory: Record<string, number> = {};
        const dealerSales: Record<string, number> = {};
        const salesByDate: Record<string, { verified: number; external: number }> = {};
        let dealersWithFlags = 0;

        const tenantPromises: Promise<void>[] = [];

        tenantsSnapshot.docs.forEach((tenantDoc) => {
          const tenantId = tenantDoc.id;

          // Listener para ventas
          const salesUnsubscribe = onSnapshot(
            query(
              collection(db, 'tenants', tenantId, 'sales'),
              where('createdAt', '>=', startTimestamp)
            ),
            (salesSnapshot) => {
              salesSnapshot.docs.forEach((doc: any) => {
                const sale = doc.data();
                totalSales++;
                
                if (sale.status === 'verified' || sale.vehicleStatus === 'SOLD_VERIFIED') {
                  verifiedSales++;
                  const date = sale.createdAt?.toDate()?.toISOString().split('T')[0] || '';
                  if (!salesByDate[date]) {
                    salesByDate[date] = { verified: 0, external: 0 };
                  }
                  salesByDate[date].verified++;
                } else if (sale.status === 'external' || sale.vehicleStatus === 'SOLD_EXTERNAL') {
                  externalSales++;
                  const date = sale.createdAt?.toDate()?.toISOString().split('T')[0] || '';
                  if (!salesByDate[date]) {
                    salesByDate[date] = { verified: 0, external: 0 };
                  }
                  salesByDate[date].external++;
                } else {
                  pendingVerification++;
                }

                if (sale.dealerId) {
                  dealerSales[sale.dealerId] = (dealerSales[sale.dealerId] || 0) + 1;
                }
              });

              updateKPIs();
            }
          );
          unsubscribeFunctions.push(salesUnsubscribe);

          // Listener para purchase intents
          const intentsUnsubscribe = onSnapshot(
            query(
              collection(db, 'tenants', tenantId, 'purchase_intents'),
              where('createdAt', '>=', startTimestamp)
            ),
            (intentsSnapshot) => {
              intentsSnapshot.docs.forEach((doc: any) => {
                const intent = doc.data();
                const fraudScore = intent.fraudScore || 0;
                
                fraudScoreSum += fraudScore;
                fraudScoreCount++;
                
                if (fraudScore >= 31) {
                  fraudDetected++;
                }
                
                if (fraudScore >= 61) {
                  highRiskSales++;
                }
              });

              updateKPIs();
            }
          );
          unsubscribeFunctions.push(intentsUnsubscribe);

          // Listener para earnings
          const earningsUnsubscribe = onSnapshot(
            query(
              collection(db, 'tenants', tenantId, 'admin_earnings'),
              where('createdAt', '>=', startTimestamp)
            ),
            (earningsSnapshot) => {
              earningsSnapshot.docs.forEach((doc: any) => {
                const earning = doc.data();
                const amount = earning.amount || 0;
                const partner = earning.partner || 'unknown';
                const category = earning.category || 'other';

                earningsByPartner[partner] = (earningsByPartner[partner] || 0) + amount;
                earningsByCategory[category] = (earningsByCategory[category] || 0) + amount;
              });

              updateKPIs();
            }
          );
          unsubscribeFunctions.push(earningsUnsubscribe);

          // Listener para dealers con flags
          const dealersUnsubscribe = onSnapshot(
            query(
              collection(db, 'tenants', tenantId, 'users'),
              where('role', '==', 'dealer')
            ),
            (dealersSnapshot) => {
              dealersSnapshot.docs.forEach((doc: any) => {
                const dealer = doc.data();
                if (dealer.fraudFlags && dealer.fraudFlags.length > 0) {
                  dealersWithFlags++;
                }
              });

              updateKPIs();
            }
          );
          unsubscribeFunctions.push(dealersUnsubscribe);
        });

        function updateKPIs() {
          const topDealers = Object.entries(dealerSales)
            .map(([dealerId, sales]) => ({ dealerId, sales }))
            .sort((a: any, b: any) => b.sales - a.sales)
            .slice(0, 10);

          const salesTrend = Object.entries(salesByDate)
            .map(([date, data]) => ({ date, ...data }))
            .sort((a: any, b: any) => a.date.localeCompare(b.date));

          setKpiData({
            totalSales,
            verifiedSales,
            externalSales,
            pendingVerification,
            interactionsToSales: 0,
            leadsToSales: 0,
            fraudDetected,
            fraudScoreAverage: fraudScoreCount > 0 ? fraudScoreSum / fraudScoreCount : 0,
            highRiskSales,
            totalEarnings: Object.values(earningsByPartner).reduce((a: number, b: number) => a + b, 0),
            earningsByPartner,
            earningsByCategory,
            dealersWithFlags,
            topDealers,
            salesTrend,
          });

          setLoading(false);
          setError(null);
        }
      },
      (err) => {
        console.error('Error obteniendo tenants:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    unsubscribeFunctions.push(tenantsUnsubscribe);

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [timeRange]);

  return { kpiData, loading, error };
}


