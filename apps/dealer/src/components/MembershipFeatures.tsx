'use client';

import { useState, useEffect } from 'react';
import { MembershipBenefitsDisplay } from '@autodealers/billing/client';
import type { DynamicFeatureCatalogEntry } from '@autodealers/billing/membership-display';
import UpgradeModal from './UpgradeModal';

interface FeatureLimit {
  name: string;
  current: number;
  limit: number | null;
  icon: string;
}

interface MembershipFeaturesData {
  membershipName: string;
  membershipType: string;
  features: Record<string, unknown>;
  dynamicFeatureCatalog?: DynamicFeatureCatalogEntry[];
  limits: FeatureLimit[];
}

export default function MembershipFeatures() {
  const [data, setData] = useState<MembershipFeaturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    void fetchFeatures();
  }, []);

  async function fetchFeatures() {
    try {
      const response = await fetch('/api/membership/features', { cache: 'no-store' });
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Error fetching membership features:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getPercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0;
    return (current / limit) * 100;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const planKind = data.membershipType === 'seller' ? 'seller' : 'dealer';

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{data.membershipName}</h2>
          <p className="text-sm opacity-90 mt-1">
            {data.membershipType === 'dealer' ? 'Plan de concesionario' : 'Plan de vendedor'}
          </p>
        </div>
        <button
          onClick={() => setShowUpgrade(true)}
          className="px-4 py-2 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Mejorar plan
        </button>
      </div>

      {data.limits.length > 0 && (
        <div className="space-y-4 mb-6">
          <h3 className="text-lg font-semibold">Uso del plan</h3>
          {data.limits.map((limit) => (
            <div key={limit.name} className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{limit.icon}</span>
                  <span className="font-medium">{limit.name}</span>
                </div>
                <span className="font-bold">
                  {limit.current} / {limit.limit === null ? '∞' : limit.limit}
                </span>
              </div>
              {limit.limit !== null && (
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div
                    className={`${getStatusColor(getPercentage(limit.current, limit.limit))} h-2 rounded-full transition-all`}
                    style={{ width: `${Math.min(getPercentage(limit.current, limit.limit), 100)}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white/10 rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-3">Tu plan incluye</h3>
        <div className="text-gray-900 bg-white rounded-lg p-4">
          <MembershipBenefitsDisplay
            features={data.features}
            planKind={planKind}
            dynamicCatalog={data.dynamicFeatureCatalog}
            maxFeatureHeight="400px"
          />
        </div>
      </div>

      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        reason="Elige un plan superior para ampliar límites y desbloquear más funciones."
      />
    </div>
  );
}
