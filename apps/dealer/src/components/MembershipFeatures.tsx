'use client';

import { useState, useEffect } from 'react';

interface FeatureLimit {
  name: string;
  current: number;
  limit: number | null; // null = ilimitado
  icon: string;
}

interface MembershipFeaturesData {
  membershipName: string;
  membershipType: string;
  features: {
    customSubdomain: boolean;
    aiEnabled: boolean;
    socialMediaEnabled: boolean;
    marketplaceEnabled: boolean;
    advancedReports: boolean;
  };
  limits: FeatureLimit[];
}

export default function MembershipFeatures() {
  const [data, setData] = useState<MembershipFeaturesData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeatures();
  }, []);

  async function fetchFeatures() {
    try {
      const response = await fetch('/api/membership/features');
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
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const getPercentage = (current: number, limit: number | null) => {
    if (limit === null) return 0; // Ilimitado
    return (current / limit) * 100;
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-gradient-to-r from-primary-600 to-primary-800 text-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">{data.membershipName}</h2>
          <p className="text-sm opacity-90 mt-1">
            {data.membershipType === 'dealer' ? 'Plan de Dealer' : 'Plan de Vendedor'}
          </p>
        </div>
        <button
          onClick={() => {/* TODO: Abrir modal de upgrade */}}
          className="px-4 py-2 bg-white text-primary-600 rounded-lg font-semibold hover:bg-gray-100 transition"
        >
          Mejorar Plan
        </button>
      </div>

      {/* Features Booleanas */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <FeatureItem
          icon="🌐"
          label="Subdominio Personalizado"
          available={data.features.customSubdomain}
        />
        <FeatureItem
          icon="🤖"
          label="IA Habilitada"
          available={data.features.aiEnabled}
        />
        <FeatureItem
          icon="📱"
          label="Redes Sociales"
          available={data.features.socialMediaEnabled}
        />
        <FeatureItem
          icon="🛒"
          label="Marketplace"
          available={data.features.marketplaceEnabled}
        />
        <FeatureItem
          icon="📊"
          label="Reportes Avanzados"
          available={data.features.advancedReports}
        />
      </div>

      {/* Límites Numéricos */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-3">Límites de Uso</h3>
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
                ></div>
              </div>
            )}
            {limit.limit !== null && getPercentage(limit.current, limit.limit) >= 90 && (
              <p className="text-yellow-200 text-sm mt-2">
                ⚠️ Cerca del límite. Considera mejorar tu plan.
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  label,
  available,
}: {
  icon: string;
  label: string;
  available: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg ${
        available ? 'bg-white/20' : 'bg-white/5 opacity-50'
      }`}
    >
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs opacity-75">
          {available ? 'Disponible' : 'No disponible'}
        </p>
      </div>
      {available ? (
        <svg className="w-5 h-5 text-green-300" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-red-300" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )}
    </div>
  );
}


