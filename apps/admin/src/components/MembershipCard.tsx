'use client';

import { useEffect } from 'react';
import { MembershipBenefitsDisplay } from '@autodealers/billing/client';
import { coerceMembershipNumber } from '@/lib/membership-number-utils';
import { resolveMembershipPricing } from '@autodealers/billing/membership-promo-pricing';

function formatMembershipPrice(price: unknown): string {
  const n = coerceMembershipNumber(price);
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

interface Membership {
  id: string;
  name: string;
  type: 'dealer' | 'seller' | 'business';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: Record<string, unknown>;
  isActive: boolean;
  launchPrice?: number;
  launchEndsAt?: string | Date;
  launchStripePriceId?: string;
  introPrice?: number;
  introMonths?: number;
  introStripePriceId?: string;
  stripePriceId?: string;
}

interface MembershipCardProps {
  membership: Membership;
  isPopular?: boolean;
}

export default function MembershipCard({ membership, isPopular = false }: MembershipCardProps) {
  useEffect(() => {
    if (!membership?.features) {
      console.error('❌ MembershipCard: membership o features no definidos', membership);
    }
  }, [membership]);

  if (!membership?.features) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">Error: Datos de membresía incompletos</p>
      </div>
    );
  }

  const pricing = resolveMembershipPricing(membership);

  return (
    <div
      className={`bg-white rounded-lg shadow-lg p-6 border-2 transition-all hover:shadow-xl ${
        isPopular
          ? 'border-primary-600 scale-105 bg-gradient-to-br from-primary-50 to-white'
          : membership.isActive === false
            ? 'border-red-300 opacity-75'
            : 'border-gray-200'
      }`}
    >
      {isPopular && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-600 text-white px-4 py-1 rounded-full text-xs font-semibold inline-block mb-4">
          ⭐ MÁS POPULAR
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-2xl font-bold text-gray-900">{membership.name}</h3>
        <p className="text-sm text-gray-600 capitalize mt-1">
          {membership.type === 'dealer'
            ? 'Para Concesionarios'
            : membership.type === 'business'
              ? 'Para talleres, gomeras y servicios automotrices'
              : 'Para Vendedores'}
        </p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline flex-wrap gap-2">
          <span className="text-4xl font-bold text-gray-900">
            ${formatMembershipPrice(pricing.displayPrice)}
          </span>
          <span className="text-lg text-gray-600">
            /{membership.billingCycle === 'monthly' ? 'mes' : 'año'}
          </span>
          {(pricing.launchActive || pricing.introConfigured) &&
          pricing.regularPrice > pricing.displayPrice ? (
            <span className="text-base text-gray-400 line-through">
              ${formatMembershipPrice(pricing.regularPrice)}
            </span>
          ) : null}
        </div>
        {pricing.badge ? (
          <p className="text-xs font-semibold text-amber-700 mt-2">{pricing.badge}</p>
        ) : null}
        {membership.billingCycle === 'yearly' && (
          <p className="text-xs text-green-600 mt-1">💰 Ahorra 2 meses al pagar anualmente</p>
        )}
      </div>

      <MembershipBenefitsDisplay
        features={membership.features}
        planKind={membership.type}
        catalogUrl="/api/membership/dynamic-feature-catalog"
        className="border-t border-gray-200 pt-4"
        maxFeatureHeight="320px"
      />
    </div>
  );
}
