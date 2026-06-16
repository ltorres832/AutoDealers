'use client';

import { buildMembershipDisplayLines } from '@/lib/membership-display';

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: {
    maxSellers?: number | null;
    maxInventory?: number | null;
    maxCampaigns?: number | null;
    maxPromotions?: number | null;
    maxLeadsPerMonth?: number | null;
    maxAppointmentsPerMonth?: number | null;
    maxStorageGB?: number | null;
    maxApiCallsPerMonth?: number | null;
    [key: string]: any;
  };
}

interface MembershipCardProps {
  membership: Membership;
  onSelect?: (membershipId: string) => void;
  selected?: boolean;
  showFeatures?: boolean;
  compact?: boolean;
}

export default function MembershipCard({
  membership,
  onSelect,
  selected = false,
  showFeatures = true,
  compact = false,
}: MembershipCardProps) {
  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const { limits: limitLines, features: featureLines } = buildMembershipDisplayLines(
    membership.features as Record<string, unknown>,
    { planKind: membership.type }
  );
  const features = [...limitLines, ...featureLines];
  const isPopular = membership.name.toLowerCase().includes('professional') || 
                    membership.name.toLowerCase().includes('pro') ||
                    membership.name.toLowerCase().includes('intermedio');

  const period = membership.billingCycle === 'yearly' ? 'año' : 'mes';

  if (compact) {
    return (
      <div
        className={`bg-white rounded-xl p-6 border-2 transition-all ${
          selected
            ? 'border-primary-600 shadow-lg scale-105'
            : isPopular
            ? 'border-primary-300 shadow-md'
            : 'border-gray-200 hover:border-gray-300'
        } ${onSelect ? 'cursor-pointer' : ''}`}
        onClick={() => onSelect?.(membership.id)}
      >
        {isPopular && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block mb-3">
            MÁS POPULAR
          </div>
        )}
        <h3 className="text-xl font-bold mb-2">{membership.name}</h3>
        <div className="mb-4">
          <span className="text-3xl font-bold">{formatPrice(membership.price, membership.currency)}</span>
          <span className="text-gray-600 text-sm">/{period}</span>
        </div>
        {showFeatures && features.length > 0 && (
          <ul className="space-y-2 text-sm mb-6">
            {features.slice(0, 5).map((feature, i) => (
              <li key={i} className="flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{feature}</span>
              </li>
            ))}
            {features.length > 5 && (
              <li className="text-gray-500 text-xs">+{features.length - 5} más</li>
            )}
          </ul>
        )}
        {onSelect ? (
          <button
            className={`w-full py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
              selected || isPopular
                ? 'bg-gradient-to-r from-primary-600 to-primary-600 text-white hover:shadow-lg'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            {selected ? 'Seleccionado' : 'Seleccionar'}
          </button>
        ) : (
          <a
            href="/registro"
            className={`block text-center py-2 px-4 rounded-lg font-semibold transition-all text-sm ${
              isPopular
                ? 'bg-gradient-to-r from-primary-600 to-primary-600 text-white hover:shadow-lg'
                : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
            }`}
          >
            Comenzar
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-2xl p-8 border-2 transition-all ${
        selected
          ? 'border-primary-600 shadow-2xl scale-105'
          : isPopular
          ? 'border-primary-300 shadow-xl'
          : 'border-gray-200 shadow-sm hover:shadow-md'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(membership.id)}
    >
      {isPopular && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-4 py-1 rounded-full text-sm font-semibold inline-block mb-4">
          MÁS POPULAR
        </div>
      )}
      <h3 className="text-2xl font-bold mb-2">{membership.name}</h3>
      <p className="text-gray-600 mb-6 text-sm">
        {membership.type === 'dealer' ? 'Para concesionarios' : 'Para vendedores'}
      </p>
      <div className="mb-6">
        <span className="text-5xl font-bold">{formatPrice(membership.price, membership.currency)}</span>
        <span className="text-gray-600">/{period}</span>
      </div>
      {showFeatures && features.length > 0 && (
        <ul className="space-y-3 mb-8">
          {features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-gray-700">{feature}</span>
            </li>
          ))}
        </ul>
      )}
      {onSelect ? (
        <button
          className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
            selected || isPopular
              ? 'bg-gradient-to-r from-primary-600 to-primary-600 text-white hover:shadow-lg'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          {selected ? 'Seleccionado' : 'Seleccionar Plan'}
        </button>
      ) : (
        <a
          href="/registro"
          className={`block text-center py-3 px-6 rounded-lg font-semibold transition-all ${
            isPopular
              ? 'bg-gradient-to-r from-primary-600 to-primary-600 text-white hover:shadow-lg'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          Comenzar Ahora
        </a>
      )}
    </div>
  );
}

