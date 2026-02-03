'use client';

import { useState, useEffect } from 'react';

interface PlanLimitsInfoProps {
  advertiserId: string;
  plan: string;
}

export default function PlanLimitsInfo({ advertiserId, plan }: PlanLimitsInfoProps) {
  const [limits, setLimits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLimits();
  }, [advertiserId]);

  async function fetchLimits() {
    try {
      const response = await fetch(`/api/advertiser/limits`);
      if (response.ok) {
        const data = await response.json();
        setLimits(data);
      }
    } catch (error) {
      console.error('Error fetching limits:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !limits) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Límites de tu Plan ({plan.toUpperCase()})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="text-sm text-gray-600 mb-1">Impresiones del Mes</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div
                className={`h-4 rounded-full ${
                  limits.impressionsUsage.percentage > 90
                    ? 'bg-red-500'
                    : limits.impressionsUsage.percentage > 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(limits.impressionsUsage.percentage, 100)}%` }}
              />
            </div>
            <div className="text-sm font-semibold text-gray-900">
              {limits.impressionsUsage.used.toLocaleString()} / {limits.impressionsUsage.limit === null ? '∞' : limits.impressionsUsage.limit.toLocaleString()}
            </div>
          </div>
          {limits.impressionsUsage.limit !== null && (
            <div className="text-xs text-gray-500 mt-1">
              {limits.impressionsUsage.remaining?.toLocaleString()} restantes este mes
            </div>
          )}
        </div>
        <div>
          <div className="text-sm text-gray-600 mb-1">Banners Activos</div>
          <div className="flex items-center gap-2">
            <div className="text-2xl font-bold text-gray-900">
              {limits.activeBanners} / {limits.maxBanners === 999 ? '∞' : limits.maxBanners}
            </div>
            {limits.activeBanners >= limits.maxBanners && (
              <span className="text-xs text-red-600 font-medium">
                Límite alcanzado
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {limits.allowedPlacements.join(', ')}
          </div>
        </div>
      </div>
    </div>
  );
}

