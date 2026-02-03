'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimePromotions } from '@/hooks/useRealtimePromotions';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';
import StarRating from '@/components/StarRating';
import {
  discountOptions,
  discountPlaceholders,
  discountRequiresValue,
  PromotionDiscountType,
} from '@autodealers/shared/discounts';
import { StripePaymentForm } from '@autodealers/shared';

interface Promotion {
  id: string;
  name: string;
  description: string;
  type: string;
  discount?: {
    type: PromotionDiscountType;
    value: number;
  };
  startDate: string;
  endDate?: string;
  status: string;
  autoSendToLeads: boolean;
  autoSendToCustomers: boolean;
  isPaid?: boolean;
  promotionScope?: 'vehicle' | 'dealer' | 'seller';
  vehicleId?: string;
  price?: number;
  duration?: number;
  views?: number;
  clicks?: number;
  paidAt?: string;
  // Métricas de redes sociales
  socialMetrics?: {
    facebook?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
    instagram?: {
      views?: number;
      clicks?: number;
      likes?: number;
      shares?: number;
      comments?: number;
      engagement?: number;
    };
  };
  // IDs de posts en redes sociales
  socialPostIds?: {
    facebook?: string;
    instagram?: string;
  };
}

interface PaidPromotion {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  promotionScope: 'vehicle' | 'seller';
}

interface AssignedPromotion {
  id: string;
  name: string;
  description: string;
  promotionScope: 'vehicle' | 'seller';
  vehicleId?: string;
  duration: number;
  price: number;
  status: string;
  paymentStatus: string;
}

export default function PromotionsPage() {
  const { user, loading: authLoading } = useAuth();
  const { promotions: realtimePromotions, stats: realtimeStats, loading: promotionsLoading } = useRealtimePromotions(user?.tenantId || '');
  
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [paidPromotions, setPaidPromotions] = useState<PaidPromotion[]>([]);
  const [assignedPromotions, setAssignedPromotions] = useState<AssignedPromotion[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [sellerRating, setSellerRating] = useState<number>(0);
  const [sellerRatingCount, setSellerRatingCount] = useState<number>(0);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'promotion' | 'assigned_promotion' | null>(null);
  
  const loading = authLoading || promotionsLoading;
  const stats = realtimeStats;

  // Sincronizar promociones en tiempo real
  useEffect(() => {
    if (realtimePromotions) {
      // Filtrar solo promociones del seller (seller scope, vehicle scope, o promociones regulares sin scope)
      const sellerPromotions = realtimePromotions.filter(p => 
        !p.promotionScope || 
        p.promotionScope === 'seller' || 
        p.promotionScope === 'vehicle'
      );
      
      setPromotions(sellerPromotions.map(p => ({
        ...p,
        startDate: p.startDate instanceof Date ? p.startDate.toISOString() : (p.startDate as any)?.toDate?.()?.toISOString() || p.startDate,
        endDate: p.endDate instanceof Date ? p.endDate.toISOString() : (p.endDate as any)?.toDate?.()?.toISOString() || p.endDate,
        autoSendToLeads: (p as any).autoSendToLeads ?? false,
        autoSendToCustomers: (p as any).autoSendToCustomers ?? false,
      } as Promotion)));
    }
  }, [realtimePromotions]);

  // Obtener calificaciones del seller
  useEffect(() => {
    async function fetchSellerRating() {
      if (!user?.userId) return;
      
      try {
        const response = await fetch('/api/settings/profile');
        if (response.ok) {
          const data = await response.json();
          setSellerRating(data.profile?.sellerRating || 0);
          setSellerRatingCount(data.profile?.sellerRatingCount || 0);
        }
      } catch (error) {
        console.error('Error fetching seller rating:', error);
      }
    }
    
    if (user?.userId) {
      fetchSellerRating();
    }
  }, [user?.userId]);

  useEffect(() => {
    if (user?.tenantId) {
      fetchPaidPromotions();
      fetchAssignedPromotions();
    }
  }, [user?.tenantId]);

  async function fetchAssignedPromotions() {
    try {
      const response = await fetch('/api/promotions/assigned');
      if (response.ok) {
        const data = await response.json();
        setAssignedPromotions(data.promotions || []);
      }
    } catch (error) {
      console.error('Error fetching assigned promotions:', error);
    }
  }

  async function payAssignedPromotion(promotionId: string) {
    try {
      const response = await fetch('/api/promotions/assigned/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        const promotion = assignedPromotions.find(p => p.id === promotionId);
        setPaymentData({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          promotionId: promotionId,
          amount: promotion?.price || 0,
          description: `Promoción asignada: ${promotion?.name || 'Promoción premium'}`,
        });
        setPaymentType('assigned_promotion');
        setShowPayment(true);
      } else {
        alert(`Error: ${data.error || 'Error al pagar la promoción'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function requestNotification(type: 'banner' | 'promotion') {
    try {
      const response = await fetch('/api/promotions/request-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('✅ Solicitud de notificación creada. Te notificaremos cuando haya espacios disponibles.');
      } else {
        alert(`Error: ${data.error || 'Error al solicitar notificación'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function fetchPaidPromotions() {
    try {
      const response = await fetch('/api/promotions/paid/options');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo opciones para vendedor (vehicle y seller)
        const sellerOptions = data.options?.filter((opt: any) => 
          opt.promotionScope === 'vehicle' || opt.promotionScope === 'seller'
        ) || [];
        setPaidPromotions(sellerOptions);
      }
    } catch (error) {
      console.error('Error fetching paid promotions:', error);
    }
  }

  async function buyPromotion(promotionScope: 'vehicle' | 'seller', vehicleId?: string, duration: number = 7, paymentMethodId?: string | null) {
    try {
      const response = await fetch('/api/promotions/paid/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          promotionScope,
          vehicleId,
          duration,
          paymentMethodId: paymentMethodId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Si se usó un método guardado y el pago se completó automáticamente
        if (paymentMethodId && data.success && data.paymentCompleted) {
          alert('¡Pago completado exitosamente! Tu promoción está pendiente de aprobación.');
          window.location.reload();
          return;
        }

        // Si requiere autenticación adicional o es una nueva tarjeta
        if (data.clientSecret) {
          // El precio viene del backend en la respuesta o lo obtenemos de la configuración por defecto
          const defaultPrices: Record<string, Record<number, number>> = {
            vehicle: { 3: 9.99, 7: 19.99, 15: 34.99, 30: 59.99 },
            seller: { 3: 24.99, 7: 44.99, 15: 79.99, 30: 119.99 },
          };
          const price = data.price || defaultPrices[promotionScope]?.[duration] || 0;

          setPaymentData({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            requestId: data.requestId,
            amount: price,
            description: `Promoción ${promotionScope} - ${duration} días`,
          });
          setPaymentType('promotion');
          setShowPayment(true);
        } else {
          alert(`Error: ${data.error || 'Error al comprar la promoción'}`);
        }
      } else {
        alert(`Error: ${data.error || 'Error al comprar la promoción'}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const activePromotions = promotions.filter(p => p.status === 'active');
  const paidActivePromotions = promotions.filter(p => p.isPaid && p.status === 'active');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Mis Promociones y Ofertas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona tus promociones y aumenta la visibilidad con promociones pagadas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowBuyModal(true)}
            className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-medium"
          >
            💎 Comprar Promoción
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
          >
            + Nueva Promoción
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Activas</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Pagadas</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.paid}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Vistas</div>
          <div className="text-2xl font-bold text-blue-600">{stats.totalViews}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Clics</div>
          <div className="text-2xl font-bold text-purple-600">{stats.totalClicks}</div>
        </div>
      </div>

      {/* Promociones Pagadas Activas */}
      {paidActivePromotions.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <h2 className="text-xl font-bold">Promociones Pagadas Activas</h2>
                  <p className="text-sm text-gray-600">
                    Estas promociones aparecen en la landing page pública
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {paidActivePromotions.length} / 12 activas globalmente
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paidActivePromotions.map((promotion) => (
                <div key={promotion.id} className="bg-white rounded-lg border-2 border-yellow-300 p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{promotion.name}</h3>
                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                      {promotion.promotionScope === 'vehicle' ? '🚗 Vehículo' : '👤 Vendedor'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{promotion.description}</p>
                  {promotion.discount && (
                    <div className="mb-3">
                      <p className="text-2xl font-bold text-primary-600">
                        {promotion.discount.type === 'percentage'
                          ? `${promotion.discount.value}% OFF`
                          : `$${promotion.discount.value} OFF`}
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-gray-500">Vistas</div>
                      <div className="font-bold text-blue-600">{promotion.views || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Clics</div>
                      <div className="font-bold text-purple-600">{promotion.clicks || 0}</div>
                    </div>
                  </div>
                  {(promotion as any).expiresAt && (
                    <div className="text-xs text-gray-500 mb-2">
                      Expira: {(() => {
                        const expiresAt = (promotion as any).expiresAt;
                        const date = expiresAt instanceof Date 
                          ? expiresAt 
                          : (expiresAt as any)?.toDate?.() || new Date(expiresAt);
                        return date.toLocaleDateString();
                      })()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Progreso y Estadísticas de Todas las Promociones */}
      <PromotionProgressSection promotions={realtimePromotions || []} />

      {/* Promociones Regulares */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Mis Promociones</h2>
        {activePromotions.filter(p => !p.isPaid).length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎁</div>
            <h3 className="text-xl font-bold mb-2">No hay promociones activas</h3>
            <p className="text-gray-600 mb-6">
              Crea tu primera promoción para empezar a generar más ventas
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
            >
              Crear Primera Promoción
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activePromotions.filter(p => !p.isPaid).map((promotion) => (
              <div
                key={promotion.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-bold">{promotion.name}</h3>
                  <span className="px-3 py-1 rounded text-xs bg-green-100 text-green-700">
                    Activa
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{promotion.description}</p>
                {/* Calificaciones del Seller */}
                {sellerRating > 0 && (
                  <div className="mb-4">
                    <StarRating
                      rating={sellerRating}
                      count={sellerRatingCount}
                      size="sm"
                      showCount={true}
                    />
                  </div>
                )}
                {promotion.discount && (
                  <div className="mb-4">
                    <p className="text-2xl font-bold text-primary-600">
                      {promotion.discount.type === 'percentage'
                        ? `${promotion.discount.value}% OFF`
                        : `$${promotion.discount.value} OFF`}
                    </p>
                  </div>
                )}
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Inicio: {new Date(promotion.startDate).toLocaleDateString()}</p>
                  {promotion.endDate && (
                    <p>Fin: {new Date(promotion.endDate).toLocaleDateString()}</p>
                  )}
                  {promotion.autoSendToLeads && <p>📤 Envío automático a leads</p>}
                  {promotion.autoSendToCustomers && <p>📤 Envío automático a clientes</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Pago Integrado */}
      {showPayment && paymentData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-8 border-2 border-blue-200 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Completa el Pago</h2>
                <p className="text-gray-600 mt-1">{paymentData.description}</p>
              </div>
              <button
                onClick={() => {
                  setShowPayment(false);
                  setPaymentData(null);
                  setPaymentType(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <StripePaymentForm
              amount={paymentData.amount}
              currency="usd"
              description={paymentData.description}
              clientSecret={paymentData.clientSecret}
              onSuccess={async (paymentIntentId: string) => {
                try {
                  let confirmEndpoint = '';
                  let confirmBody: any = { paymentIntentId };

                  if (paymentType === 'promotion') {
                    confirmEndpoint = '/api/promotions/paid/confirm-payment';
                    confirmBody.requestId = paymentData.requestId;
                  } else if (paymentType === 'assigned_promotion') {
                    confirmEndpoint = '/api/promotions/assigned/confirm-payment';
                    confirmBody.promotionId = paymentData.promotionId;
                  }

                  const response = await fetch(confirmEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(confirmBody),
                  });

                  if (response.ok) {
                    alert('¡Pago completado exitosamente!');
                    setShowPayment(false);
                    setPaymentData(null);
                    setPaymentType(null);
                    fetchAssignedPromotions();
                    window.location.reload();
                  } else {
                    const data = await response.json();
                    alert(`Error al confirmar el pago: ${data.error || 'Error desconocido'}`);
                  }
                } catch (error: any) {
                  alert(`Error: ${error.message}`);
                }
              }}
              onError={(error: string) => {
                alert(`Error en el pago: ${error}`);
              }}
              metadata={{
                type: paymentType || 'promotion',
                requestId: paymentData.requestId || paymentData.promotionId,
              }}
            />
          </div>
        </div>
      )}

      {/* Modales */}
      {showCreateModal && (
        <CreatePromotionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            // Promotions will be updated automatically via realtimePromotions
          }}
          onRequestNotification={() => requestNotification('promotion')}
        />
      )}

      {showBuyModal && (
        <BuyPromotionModal
          onClose={() => setShowBuyModal(false)}
          onBuy={buyPromotion}
          paidPromotions={paidPromotions}
        />
      )}
    </div>
  );
}

// Modal para comprar promociones pagadas (solo vehicle y seller)
function BuyPromotionModal({
  onClose,
  onBuy,
  paidPromotions,
}: {
  onClose: () => void;
  onBuy: (scope: 'vehicle' | 'seller', vehicleId?: string, duration?: number, paymentMethodId?: string | null) => void;
  paidPromotions: PaidPromotion[];
}) {
  const [selectedScope, setSelectedScope] = useState<'vehicle' | 'seller'>('vehicle');
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<any[]>([]);

  useEffect(() => {
    if (selectedScope === 'vehicle') {
      fetchVehicles();
    }
  }, [selectedScope]);

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/vehicles?status=available');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }

  const prices: Record<number, number> = {
    3: 9.99,
    7: 19.99,
    15: 34.99,
    30: 59.99,
  };

  const sellerPrices: Record<number, number> = {
    3: 24.99,
    7: 44.99,
    15: 79.99,
    30: 99.99,
  };

  const getPrice = () => {
    if (selectedScope === 'seller') {
      return sellerPrices[selectedDuration] || 24.99;
    }
    return prices[selectedDuration] || 9.99;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Comprar Promoción Pagada</h2>
          <p className="text-sm text-gray-600 mt-1">
            Las promociones pagadas aparecen en la landing page pública y aumentan tu visibilidad
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Promoción *</label>
            <select
              value={selectedScope}
              onChange={(e) => setSelectedScope(e.target.value as any)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="vehicle">🚗 Promoción de Vehículo</option>
              <option value="seller">👤 Promoción de Vendedor</option>
            </select>
          </div>

          {selectedScope === 'vehicle' && (
            <div>
              <label className="block text-sm font-medium mb-2">Seleccionar Vehículo *</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required={selectedScope === 'vehicle'}
              >
                <option value="">Selecciona un vehículo</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.price?.toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Duración *</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="w-full border rounded px-3 py-2"
            >
              <option value={3}>3 días - ${getPrice().toFixed(2)}</option>
              <option value={7}>7 días - ${getPrice().toFixed(2)}</option>
              <option value={15}>15 días - ${getPrice().toFixed(2)}</option>
              <option value={30}>30 días - ${getPrice().toFixed(2)}</option>
            </select>
          </div>

          {/* Selector de Método de Pago */}
          <div className="border-t pt-4">
            <PaymentMethodSelector
              selectedPaymentMethodId={selectedPaymentMethodId}
              onSelect={(paymentMethodId) => setSelectedPaymentMethodId(paymentMethodId)}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Precio Total</div>
                <div className="text-3xl font-bold text-blue-600">${getPrice().toFixed(2)}</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Duración: {selectedDuration} días</div>
                <div>Tipo: {selectedScope === 'vehicle' ? 'Vehículo' : 'Vendedor'}</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>⚠️ Importante:</strong> Las promociones aumentan la visibilidad de los anuncios. No garantizan contactos ni ventas.
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                if (selectedScope === 'vehicle' && !selectedVehicleId) {
                  alert('Por favor selecciona un vehículo');
                  return;
                }
                onBuy(selectedScope, selectedVehicleId || undefined, selectedDuration, selectedPaymentMethodId);
              }}
              className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium"
            >
              Pagar ${getPrice().toFixed(2)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal para crear promoción (mantener el código existente)
function CreatePromotionModal({
  onClose,
  onSuccess,
  onRequestNotification,
}: {
  onClose: () => void;
  onSuccess: () => void;
  onRequestNotification?: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'discount',
    discount: {
      type: 'percentage' as PromotionDiscountType,
      value: 0,
    },
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    status: 'active',
    autoSendToLeads: false,
    autoSendToCustomers: false,
    applicableToAll: true,
    channels: ['whatsapp'] as string[],
    images: [] as string[],
    videos: [] as string[],
    publishOnLandingPage: false, // Nueva opción para publicar en landing page
    vehicleId: '', // ID del vehículo asociado
    vehiclePrice: '', // Precio del vehículo
  });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [availableCredits, setAvailableCredits] = useState(0);
  const [useCredit, setUseCredit] = useState(false);

  useEffect(() => {
    fetchVehicles();
    // Cargar créditos disponibles al abrir el modal
    fetch('/api/referrals/my-rewards', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        setAvailableCredits(data.activeRewards?.promotionCredits || 0);
      })
      .catch(err => console.error('Error loading credits:', err));
  }, []);

  async function fetchVehicles() {
    try {
      setLoadingVehicles(true);
      const response = await fetch('/api/vehicles?status=available');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function uploadFiles(files: File[], type: 'image' | 'video'): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const uploadFormData = new FormData();
      uploadFormData.append('file', file);
      uploadFormData.append('type', 'promotion');
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });
      
      if (uploadResponse.ok) {
        const { url } = await uploadResponse.json();
        urls.push(url);
      }
    }
    return urls;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.description) {
      alert('Por favor completa el nombre y descripción de la promoción');
      return;
    }

    if (discountRequiresValue(formData.discount.type) && formData.discount.value <= 0) {
      alert('Elige un tipo de descuento válido e ingresa un valor mayor a cero, o selecciona "Sin descuento"');
      return;
    }
    setLoading(true);
    setUploading(true);
    try {
      if (imageFiles.length > 0) {
        const imageUrls = await uploadFiles(imageFiles, 'image');
        formData.images = imageUrls;
      }
      
      if (videoFiles.length > 0) {
        const videoUrls = await uploadFiles(videoFiles, 'video');
        formData.videos = videoUrls;
      }
      
      setUploading(false);
      
      const response = await fetch('/api/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          startDate: new Date(formData.startDate).toISOString(),
          endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined,
          isFreePromotion: formData.publishOnLandingPage, // Si se marca publicar en landing, es promoción gratuita
          isPaid: useCredit || false, // Si usa crédito, es pagada
          useCredit: useCredit && availableCredits > 0, // Usar crédito si está disponible
          vehicleId: formData.vehicleId || undefined,
          vehiclePrice: formData.vehiclePrice ? parseFloat(formData.vehiclePrice) : undefined,
        }),
      });

      if (response.ok) {
        alert('Promoción creada exitosamente');
        onSuccess();
      } else {
        const error = await response.json();
        if (error.limitReached && onRequestNotification) {
          // Si el límite está alcanzado, mostrar opción de solicitar notificación
          const shouldRequest = confirm(
            `${error.message}\n\n¿Deseas recibir una notificación cuando haya espacios disponibles?`
          );
          if (shouldRequest) {
            onRequestNotification();
          }
        } else {
          alert(error.error || 'Error al crear promoción');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear promoción');
      setUploading(false);
    } finally {
      setLoading(false);
    }
  }
  
  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImageFiles([...imageFiles, ...files]);
    }
  }
  
  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setVideoFiles([...videoFiles, ...files]);
    }
  }
  
  function removeImage(index: number) {
    setImageFiles(imageFiles.filter((_, i) => i !== index));
  }
  
  function removeVideo(index: number) {
    setVideoFiles(videoFiles.filter((_, i) => i !== index));
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Crear Nueva Promoción</h2>
          <p className="text-sm text-gray-600 mt-1">
            Crea una promoción para enviar a tus leads/clientes o publicar en el landing page público
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre de la Promoción *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: Descuento del 15% en Verano"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Descripción *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              required
              placeholder="Describe tu promoción..."
            />
          </div>

          {/* Selección de Vehículo y Precio */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Vehículo (opcional)</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => {
                  const selectedVehicle = vehicles.find(v => v.id === e.target.value);
                  setFormData({
                    ...formData,
                    vehicleId: e.target.value,
                    vehiclePrice: selectedVehicle ? selectedVehicle.price.toString() : formData.vehiclePrice,
                  });
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccionar vehículo...</option>
                {vehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.year} {vehicle.make} {vehicle.model} - {vehicle.currency} {vehicle.price.toLocaleString()}
                  </option>
                ))}
              </select>
              {loadingVehicles && (
                <p className="text-xs text-gray-500 mt-1">Cargando vehículos...</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Precio del Vehículo (opcional)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value="USD"
                  disabled
                  className="w-20 border rounded px-2 py-2 bg-gray-100 text-gray-600"
                />
                <input
                  type="number"
                  value={formData.vehiclePrice}
                  onChange={(e) => setFormData({ ...formData, vehiclePrice: e.target.value })}
                  className="flex-1 border rounded px-3 py-2"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {formData.vehicleId ? 'Precio del vehículo seleccionado' : 'Ingresa el precio del vehículo'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Descuento (opcional)
              </label>
              <select
                value={formData.discount.type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: { ...formData.discount, type: e.target.value as PromotionDiscountType },
                  })
                }
                className="w-full border rounded px-3 py-2"
              >
                {discountOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Valor del Descuento (opcional)
              </label>
              <input
                type="number"
                value={formData.discount.value}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discount: { ...formData.discount, value: Number(e.target.value) },
                  })
                }
                className="w-full border rounded px-3 py-2"
                min="0"
                step={formData.discount.type === 'percentage' ? '1' : '0.01'}
                placeholder={discountPlaceholders[formData.discount.type]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Inicio *</label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha de Fin (opcional)</label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full border rounded px-3 py-2"
                min={formData.startDate}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="active">Activa</option>
              <option value="inactive">Inactiva</option>
            </select>
          </div>

          {/* Opción para usar crédito de referido */}
          {availableCredits > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useCredit}
                  onChange={(e) => setUseCredit(e.target.checked)}
                  className="w-5 h-5 text-purple-600 rounded mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900 block">
                    🎁 Usar Crédito de Referido ({availableCredits} disponible{availableCredits > 1 ? 's' : ''})
                  </span>
                  <p className="text-xs text-gray-600 mt-1">
                    Activa esta promoción usando uno de tus créditos de promoción obtenidos por referidos.
                    La promoción se activará inmediatamente sin costo adicional.
                  </p>
                  {useCredit && (
                    <p className="text-xs text-purple-700 mt-2 font-medium">
                      ✅ Se usará 1 crédito de promoción. Te quedarán {availableCredits - 1} crédito{availableCredits - 1 !== 1 ? 's' : ''}.
                    </p>
                  )}
                </div>
              </label>
            </div>
          )}

          {/* Opción para publicar en Landing Page */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.publishOnLandingPage}
                onChange={(e) =>
                  setFormData({ ...formData, publishOnLandingPage: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 rounded mt-0.5"
                disabled={useCredit} // Si usa crédito, no puede publicar en landing gratis
              />
              <div className="flex-1">
                <span className={`text-sm font-medium block ${useCredit ? 'text-gray-400' : 'text-gray-900'}`}>
                  🌐 Publicar en Landing Page Público
                </span>
                <p className={`text-xs mt-1 ${useCredit ? 'text-gray-400' : 'text-gray-600'}`}>
                  Esta promoción aparecerá en la página pública del sitio para que todos los visitantes la vean. 
                  Requiere que tu membresía incluya esta característica.
                </p>
                {useCredit && (
                  <p className="text-xs text-purple-700 mt-2 font-medium">
                    ℹ️ Al usar crédito, la promoción se activa automáticamente como pagada.
                  </p>
                )}
                {formData.publishOnLandingPage && !useCredit && (
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    ✅ Esta promoción será visible en el landing page público
                  </p>
                )}
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Fotos (opcional)</label>
            <input
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleImageChange}
              className="w-full border rounded px-3 py-2"
            />
            <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>📸 Especificaciones de Imágenes:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li><strong>Formatos permitidos:</strong> JPG, JPEG, PNG, WebP</li>
                <li><strong>Tamaño recomendado:</strong> 1200x800px o proporción 3:2</li>
                <li><strong>Tamaño máximo por archivo:</strong> 10MB</li>
                <li><strong>Resolución mínima:</strong> 800x600px</li>
                <li><strong>Resolución máxima:</strong> 4000x3000px</li>
              </ul>
            </div>
            {imageFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {imageFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Videos (opcional)</label>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              multiple
              onChange={handleVideoChange}
              className="w-full border rounded px-3 py-2"
            />
            <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
              <strong>🎥 Especificaciones de Videos:</strong>
              <ul className="mt-1 ml-4 list-disc space-y-1">
                <li><strong>Formatos permitidos:</strong> MP4, WebM, MOV</li>
                <li><strong>Resolución recomendada:</strong> 1920x1080px (Full HD) o 1280x720px (HD)</li>
                <li><strong>Tamaño máximo por archivo:</strong> 100MB</li>
                <li><strong>Duración recomendada:</strong> 15-60 segundos</li>
                <li><strong>Codec recomendado:</strong> H.264 para mejor compatibilidad</li>
                <li><strong>Relación de aspecto:</strong> 16:9 o 9:16 (vertical)</li>
              </ul>
            </div>
            {videoFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {videoFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex-1">
                      <span className="text-sm text-gray-700">{file.name}</span>
                      <span className="text-xs text-gray-500 ml-2">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Opción para publicar en Landing Page */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.publishOnLandingPage}
                onChange={(e) =>
                  setFormData({ ...formData, publishOnLandingPage: e.target.checked })
                }
                className="w-5 h-5 text-primary-600 rounded mt-0.5"
                disabled={useCredit} // Si usa crédito, no puede publicar en landing gratis
              />
              <div className="flex-1">
                <span className={`text-sm font-medium block ${useCredit ? 'text-gray-400' : 'text-gray-900'}`}>
                  🌐 Publicar en Landing Page Público
                </span>
                <p className={`text-xs mt-1 ${useCredit ? 'text-gray-400' : 'text-gray-600'}`}>
                  Esta promoción aparecerá en la página pública del sitio para que todos los visitantes la vean. 
                  Requiere que tu membresía incluya esta característica.
                </p>
                {useCredit && (
                  <p className="text-xs text-purple-700 mt-2 font-medium">
                    ℹ️ Al usar crédito, la promoción se activa automáticamente como pagada.
                  </p>
                )}
                {formData.publishOnLandingPage && !useCredit && (
                  <p className="text-xs text-blue-700 mt-2 font-medium">
                    ✅ Esta promoción será visible en el landing page público
                  </p>
                )}
              </div>
            </label>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium mb-2">Configuración de Envío (Opcional)</label>
            <p className="text-xs text-gray-500 mb-2">
              Estas opciones solo aplican si NO estás publicando en el landing page
            </p>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoSendToLeads}
                onChange={(e) =>
                  setFormData({ ...formData, autoSendToLeads: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded"
                disabled={formData.publishOnLandingPage}
              />
              <span className={`text-sm ${formData.publishOnLandingPage ? 'text-gray-400' : ''}`}>
                Envío automático a leads
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.autoSendToCustomers}
                onChange={(e) =>
                  setFormData({ ...formData, autoSendToCustomers: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded"
                disabled={formData.publishOnLandingPage}
              />
              <span className={`text-sm ${formData.publishOnLandingPage ? 'text-gray-400' : ''}`}>
                Envío automático a clientes
              </span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.applicableToAll}
                onChange={(e) =>
                  setFormData({ ...formData, applicableToAll: e.target.checked })
                }
                className="w-4 h-4 text-primary-600 rounded"
              />
              <span className="text-sm">Aplicable a todos los vehículos</span>
            </label>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
            >
              {uploading ? 'Subiendo archivos...' : loading ? 'Creando...' : 'Crear Promoción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sección de Progreso y Estadísticas de Promociones
function PromotionProgressSection({ promotions }: { promotions: any[] }) {
  const [selectedPromotion, setSelectedPromotion] = useState<any | null>(null);
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid' | 'active' | 'expired'>('all');

  // Convertir promociones a formato correcto
  const formattedPromotions = promotions.map(p => ({
    ...p,
    startDate: p.startDate instanceof Date ? p.startDate.toISOString() : p.startDate,
    endDate: p.endDate instanceof Date ? p.endDate.toISOString() : p.endDate,
    expiresAt: p.expiresAt instanceof Date ? p.expiresAt.toISOString() : p.expiresAt,
  }));

  const filteredPromotions = formattedPromotions.filter((p) => {
    if (filter === 'paid') return p.isPaid;
    if (filter === 'unpaid') return !p.isPaid;
    if (filter === 'active') return p.status === 'active';
    if (filter === 'expired') return p.status === 'expired';
    return true;
  });

  function calculateTotalMetrics(promotion: any) {
    const totalViews = (promotion.views || 0) + 
      (promotion.socialMetrics?.facebook?.views || 0) + 
      (promotion.socialMetrics?.instagram?.views || 0);
    
    const totalClicks = (promotion.clicks || 0) + 
      (promotion.socialMetrics?.facebook?.clicks || 0) + 
      (promotion.socialMetrics?.instagram?.clicks || 0);
    
    const totalLikes = (promotion.socialMetrics?.facebook?.likes || 0) + 
      (promotion.socialMetrics?.instagram?.likes || 0);
    
    const totalShares = (promotion.socialMetrics?.facebook?.shares || 0) + 
      (promotion.socialMetrics?.instagram?.shares || 0);
    
    const totalComments = (promotion.socialMetrics?.facebook?.comments || 0) + 
      (promotion.socialMetrics?.instagram?.comments || 0);

    return {
      totalViews,
      totalClicks,
      totalLikes,
      totalShares,
      totalComments,
      conversionRate: totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(2) : '0.00',
    };
  }

  return (
    <div className="mb-8">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold">📊 Progreso y Estadísticas de Promociones</h2>
            <p className="text-gray-600 mt-1">
              Visualiza el rendimiento de todas tus promociones, incluyendo métricas de redes sociales
            </p>
          </div>
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="border rounded px-3 py-2"
            >
              <option value="all">Todas</option>
              <option value="paid">Pagadas</option>
              <option value="unpaid">No Pagadas</option>
              <option value="active">Activas</option>
              <option value="expired">Expiradas</option>
            </select>
          </div>
        </div>

        {filteredPromotions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay promociones para mostrar con este filtro
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPromotions.map((promotion) => {
              const metrics = calculateTotalMetrics(promotion);
              const hasSocialMetrics = promotion.socialMetrics?.facebook || promotion.socialMetrics?.instagram;

              return (
                <div
                  key={promotion.id}
                  className="border rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-bold">{promotion.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs ${
                          promotion.isPaid 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promotion.isPaid ? '💰 Pagada' : '🆓 Gratis'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          promotion.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : promotion.status === 'expired'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {promotion.status === 'active' ? '✅ Activa' : 
                           promotion.status === 'expired' ? '❌ Expirada' : 
                           promotion.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{promotion.description}</p>
                      <div className="text-xs text-gray-500">
                        {promotion.startDate && (
                          <span>Inicio: {new Date(promotion.startDate).toLocaleDateString()}</span>
                        )}
                        {promotion.endDate && (
                          <span className="ml-4">Fin: {new Date(promotion.endDate).toLocaleDateString()}</span>
                        )}
                        {(promotion as any).expiresAt && (
                          <span className="ml-4">Expira: {(() => {
                            const expiresAt = (promotion as any).expiresAt;
                            const date = expiresAt instanceof Date 
                              ? expiresAt 
                              : (expiresAt as any)?.toDate?.() || new Date(expiresAt);
                            return date.toLocaleDateString();
                          })()}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedPromotion(selectedPromotion?.id === promotion.id ? null : promotion)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      {selectedPromotion?.id === promotion.id ? 'Ocultar' : 'Ver Detalles'}
                    </button>
                  </div>

                  {/* Métricas Principales */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-3">
                    <div className="bg-blue-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">👁️ Vistas Totales</div>
                      <div className="text-xl font-bold text-blue-600">{metrics.totalViews}</div>
                    </div>
                    <div className="bg-purple-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">🖱️ Clics Totales</div>
                      <div className="text-xl font-bold text-purple-600">{metrics.totalClicks}</div>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">❤️ Likes</div>
                      <div className="text-xl font-bold text-green-600">{metrics.totalLikes}</div>
                    </div>
                    <div className="bg-yellow-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">📤 Compartidos</div>
                      <div className="text-xl font-bold text-yellow-600">{metrics.totalShares}</div>
                    </div>
                    <div className="bg-pink-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">💬 Comentarios</div>
                      <div className="text-xl font-bold text-pink-600">{metrics.totalComments}</div>
                    </div>
                    <div className="bg-indigo-50 rounded p-3">
                      <div className="text-xs text-gray-600 mb-1">📈 Conversión</div>
                      <div className="text-xl font-bold text-indigo-600">{metrics.conversionRate}%</div>
                    </div>
                  </div>

                  {/* Detalles Expandidos */}
                  {selectedPromotion?.id === promotion.id && (
                    <div className="mt-4 pt-4 border-t space-y-4">
                      {/* Métricas de Landing Page */}
                      <div>
                        <h4 className="font-semibold mb-2 text-sm">🌐 Landing Page</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-gray-600">Vistas:</span>
                            <span className="ml-2 font-bold">{promotion.views || 0}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Clics:</span>
                            <span className="ml-2 font-bold">{promotion.clicks || 0}</span>
                          </div>
                        </div>
                      </div>

                      {/* Métricas de Facebook */}
                      {promotion.socialMetrics?.facebook && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                            <span>📘 Facebook</span>
                            {promotion.socialPostIds?.facebook && (
                              <a
                                href={`https://facebook.com/posts/${promotion.socialPostIds.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-xs"
                              >
                                Ver Post
                              </a>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm bg-blue-50 p-3 rounded">
                            <div>
                              <span className="text-gray-600">Vistas:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.views || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Clics:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.clicks || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Likes:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.likes || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compartidos:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.shares || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comentarios:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.facebook.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Métricas de Instagram */}
                      {promotion.socialMetrics?.instagram && (
                        <div>
                          <h4 className="font-semibold mb-2 text-sm flex items-center gap-2">
                            <span>📷 Instagram</span>
                            {promotion.socialPostIds?.instagram && (
                              <a
                                href={`https://instagram.com/p/${promotion.socialPostIds.instagram}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-600 hover:underline text-xs"
                              >
                                Ver Post
                              </a>
                            )}
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm bg-pink-50 p-3 rounded">
                            <div>
                              <span className="text-gray-600">Vistas:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.views || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Clics:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.clicks || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Likes:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.likes || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Compartidos:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.shares || 0}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Comentarios:</span>
                              <span className="ml-1 font-bold">{promotion.socialMetrics.instagram.comments || 0}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {!hasSocialMetrics && (
                        <div className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded">
                          ℹ️ Esta promoción no tiene métricas de redes sociales aún
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
