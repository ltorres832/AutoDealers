'use client';

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

  const formatLimit = (limit: number | null | undefined) => {
    if (limit === null || limit === undefined) return 'Ilimitado';
    return limit.toLocaleString('es-ES');
  };

  const getFeatureList = () => {
    const features: string[] = [];
    const f = membership.features;

    // Límites
    if (f.maxSellers !== null && f.maxSellers !== undefined) {
      features.push(`${formatLimit(f.maxSellers)} vendedores`);
    }
    if (f.maxInventory !== null && f.maxInventory !== undefined) {
      features.push(`${formatLimit(f.maxInventory)} vehículos`);
    }
    if (f.maxLeadsPerMonth !== null && f.maxLeadsPerMonth !== undefined) {
      features.push(`${formatLimit(f.maxLeadsPerMonth)} leads/mes`);
    }
    if (f.maxAppointmentsPerMonth !== null && f.maxAppointmentsPerMonth !== undefined) {
      features.push(`${formatLimit(f.maxAppointmentsPerMonth)} citas/mes`);
    }
    if (f.maxStorageGB !== null && f.maxStorageGB !== undefined) {
      features.push(`${formatLimit(f.maxStorageGB)} GB almacenamiento`);
    }

    // Features booleanas (solo las que están en true)
    if (f.customSubdomain) features.push('Subdominio personalizado');
    if (f.customDomain) features.push('Dominio personalizado');
    if (f.aiEnabled) features.push('IA habilitada');
    if (f.aiContentGeneration) features.push('Generación de contenido con IA');
    if (f.socialMediaEnabled) features.push('Redes sociales integradas');
    if (f.advancedReports) features.push('Reportes avanzados');
    if (f.customReports) features.push('Reportes personalizados');
    if (f.exportData) features.push('Exportar datos');
    if (f.apiAccess) features.push('Acceso API');
    if (f.webhooks) features.push('Webhooks');
    if (f.whiteLabel) features.push('White label');
    if (f.prioritySupport) features.push('Soporte prioritario');
    if (f.dedicatedManager) features.push('Gerente dedicado');
    if (f.mobileApp) features.push('App móvil');
    if (f.liveChat) features.push('Chat en vivo');
    if (f.appointmentScheduling) features.push('Sistema de citas');
    if (f.videoUploads) features.push('Subida de videos');
    if (f.paymentProcessing) features.push('Procesamiento de pagos');

    return features;
  };

  const features = getFeatureList();
  const isPopular = membership.name.toLowerCase().includes('professional') || 
                    membership.name.toLowerCase().includes('pro') ||
                    membership.name.toLowerCase().includes('intermedio');

  const period = membership.billingCycle === 'yearly' ? 'año' : 'mes';

  if (compact) {
    return (
      <div
        className={`bg-white rounded-xl p-6 border-2 transition-all ${
          selected
            ? 'border-blue-600 shadow-lg scale-105'
            : isPopular
            ? 'border-blue-300 shadow-md'
            : 'border-gray-200 hover:border-gray-300'
        } ${onSelect ? 'cursor-pointer' : ''}`}
        onClick={() => onSelect?.(membership.id)}
      >
        {isPopular && (
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-semibold inline-block mb-3">
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
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
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
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
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
          ? 'border-blue-600 shadow-2xl scale-105'
          : isPopular
          ? 'border-blue-300 shadow-xl'
          : 'border-gray-200 shadow-sm hover:shadow-md'
      } ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={() => onSelect?.(membership.id)}
    >
      {isPopular && (
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold inline-block mb-4">
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
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
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
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:shadow-lg'
              : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
          }`}
        >
          Comenzar Ahora
        </a>
      )}
    </div>
  );
}

