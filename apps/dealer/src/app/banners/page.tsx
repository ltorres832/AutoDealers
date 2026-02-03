'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRealtimeBanners } from '@/hooks/useRealtimeBanners';
import { StripePaymentForm } from '@autodealers/shared';
import { PaymentMethodSelector } from '@/components/PaymentMethodSelector';

interface Banner {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  ctaText: string;
  linkType: 'vehicle' | 'dealer' | 'seller' | 'filter';
  linkValue: string;
  status: 'pending' | 'active' | 'expired' | 'rejected' | 'assigned';
  approved: boolean;
  duration: number;
  price: number;
  views: number;
  clicks: number;
  expiresAt?: string;
  createdAt?: string;
  rejectionReason?: string;
  paymentStatus?: 'pending' | 'paid';
  assignedBy?: string;
}

export default function BannersPage() {
  const { user, loading: authLoading } = useAuth();
  const { banners: realtimeBanners, stats: realtimeStats, loading: bannersLoading } = useRealtimeBanners(
    user?.tenantId || '',
    user?.userId || ''
  );
  
  const [banners, setBanners] = useState<Banner[]>([]);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [paymentType, setPaymentType] = useState<'banner' | 'assigned_banner' | null>(null);
  
  const loading = authLoading || bannersLoading;
  const stats = realtimeStats;

  // Sincronizar banners en tiempo real
  useEffect(() => {
    if (realtimeBanners) {
      setBanners(realtimeBanners.map((b: any) => ({
        ...b,
        ctaText: b.ctaText || '',
        linkType: b.linkType || 'dealer',
        linkValue: b.linkValue || '',
        duration: b.duration || 30,
        price: b.price || 0,
        expiresAt: b.expiresAt instanceof Date ? b.expiresAt.toISOString() : b.expiresAt,
        createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
      })));
    }
  }, [realtimeBanners]);

  async function buyBanner(formData: any) {
    try {
      const response = await fetch('/api/banners/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          paymentMethodId: formData.paymentMethodId || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Si se usó un método guardado y el pago se completó automáticamente
        if (formData.paymentMethodId && data.success && data.paymentCompleted) {
          alert('¡Pago completado exitosamente! Tu banner está pendiente de aprobación.');
          window.location.reload();
          return;
        }

        // Si requiere autenticación adicional o es una nueva tarjeta
        if (data.clientSecret) {
          setPaymentData({
            clientSecret: data.clientSecret,
            paymentIntentId: data.paymentIntentId,
            bannerId: data.bannerId,
            amount: formData.price || 0,
            description: `Banner Premium: ${formData.title || 'Banner publicitario'}`,
          });
          setPaymentType('banner');
          setShowPayment(true);
        } else if (data.limitReached) {
          // Si el límite está alcanzado, mostrar opción de solicitar notificación
          const shouldRequest = confirm(
            `${data.message}\n\n¿Deseas recibir una notificación cuando haya espacios disponibles?`
          );
          if (shouldRequest) {
            await requestNotification('banner');
          }
        } else {
          alert(`Error: ${data.error || 'Error al comprar el banner'}`);
        }
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  }

  async function requestNotification(type: 'banner' | 'promotion') {
    try {
      const response = await fetch('/api/banners/request-notification', {
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

  async function payAssignedBanner(bannerId: string) {
    try {
      const response = await fetch('/api/banners/assigned/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bannerId }),
      });

      const data = await response.json();

      if (response.ok && data.clientSecret) {
        const banner = banners.find(b => b.id === bannerId);
        setPaymentData({
          clientSecret: data.clientSecret,
          paymentIntentId: data.paymentIntentId,
          bannerId: bannerId,
          amount: banner?.price || 0,
          description: `Banner asignado: ${banner?.title || 'Banner premium'}`,
        });
        setPaymentType('assigned_banner');
        setShowPayment(true);
      } else {
        alert(`Error: ${data.error || 'Error al procesar el pago'}`);
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

  const activeBanners = banners.filter(b => b.status === 'active');
  const pendingBanners = banners.filter(b => b.status === 'pending');
  const assignedBanners = banners.filter(b => b.status === 'assigned' && b.paymentStatus === 'pending');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Banners Premium</h1>
          <p className="text-gray-600 mt-2">
            Aumenta tu visibilidad con banners premium en la landing page pública
          </p>
        </div>
        <button
          onClick={() => setShowBuyModal(true)}
          className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-medium"
        >
          💎 Comprar Banner Premium
        </button>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Total</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Activos</div>
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-sm text-gray-600 mb-1">Pendientes</div>
          <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
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

      {/* Banners Activos */}
      {activeBanners.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">⭐</span>
                <div>
                  <h2 className="text-xl font-bold">Banners Premium Activos</h2>
                  <p className="text-sm text-gray-600">
                    Estos banners aparecen en la landing page pública
                  </p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                {activeBanners.length} / 4 activos globalmente
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeBanners.map((banner) => (
                <div key={banner.id} className="bg-white rounded-lg border-2 border-yellow-300 p-4">
                  {banner.imageUrl && (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="font-bold text-lg mb-2">{banner.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{banner.description}</p>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <div className="text-gray-500">Vistas</div>
                      <div className="font-bold text-blue-600">{banner.views || 0}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Clics</div>
                      <div className="font-bold text-purple-600">{banner.clicks || 0}</div>
                    </div>
                  </div>
                  {banner.expiresAt && (
                    <div className="text-xs text-gray-500">
                      Expira: {new Date(banner.expiresAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banners Asignados (Pendientes de Pago) */}
      {assignedBanners.length > 0 && (
        <div className="mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎁</span>
                <div>
                  <h2 className="text-xl font-bold">Banners Asignados por el Admin</h2>
                  <p className="text-sm text-gray-600">
                    Realiza el pago para activar estos banners premium
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignedBanners.map((banner) => (
                <div key={banner.id} className="bg-white rounded-lg border-2 border-blue-300 p-4">
                  {banner.imageUrl && (
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-32 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="font-bold text-lg mb-2">{banner.title}</h3>
                  <p className="text-sm text-gray-600 mb-3">{banner.description}</p>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-xs text-gray-600">Duración</div>
                        <div className="font-bold">{banner.duration} días</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600">Precio</div>
                        <div className="font-bold text-lg text-blue-600">${banner.price}</div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => payAssignedBanner(banner.id)}
                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium"
                  >
                    💳 Pagar y Activar Banner
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Banners Pendientes */}
      {pendingBanners.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Banners Pendientes de Aprobación</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingBanners.map((banner) => (
              <div key={banner.id} className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-32 object-cover rounded mb-3"
                  />
                )}
                <h3 className="font-bold mb-2">{banner.title}</h3>
                <p className="text-sm text-gray-600 mb-3">{banner.description}</p>
                <div className="text-xs text-yellow-600 font-medium">
                  ⏳ Esperando aprobación del administrador
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Todos los Banners */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">Todos mis Banners</h2>
        {banners.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🎨</div>
            <h3 className="text-xl font-bold mb-2">No tienes banners premium</h3>
            <p className="text-gray-600 mb-6">
              Compra tu primer banner premium para aumentar tu visibilidad
            </p>
            <button
              onClick={() => setShowBuyModal(true)}
              className="bg-yellow-500 text-white px-6 py-3 rounded-lg hover:bg-yellow-600 font-medium"
            >
              Comprar Banner Premium
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition p-6"
              >
                {banner.imageUrl && (
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-40 object-cover rounded mb-4"
                  />
                )}
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">{banner.title}</h3>
                  <span className={`px-3 py-1 rounded text-xs ${
                    banner.status === 'active' ? 'bg-green-100 text-green-700' :
                    banner.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    banner.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                    banner.status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {banner.status === 'active' ? 'Activo' :
                     banner.status === 'pending' ? 'Pendiente' :
                     banner.status === 'assigned' ? 'Asignado' :
                     banner.status === 'rejected' ? 'Rechazado' :
                     'Expirado'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{banner.description}</p>
                {banner.status === 'rejected' && banner.rejectionReason && (
                  <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                    <p className="text-xs text-red-700">
                      <strong>Razón:</strong> {banner.rejectionReason}
                    </p>
                  </div>
                )}
                <div className="flex justify-between items-center text-xs text-gray-500 mb-2">
                  <span>👁️ {banner.views || 0} vistas</span>
                  <span>👆 {banner.clicks || 0} clics</span>
                </div>
                {banner.expiresAt && (
                  <div className="text-xs text-gray-500">
                    Expira: {new Date(banner.expiresAt).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Copy Legal */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
        <p className="text-sm text-yellow-800">
          <strong>⚠️ Importante:</strong> Los banners premium aumentan la visibilidad de tu marca. No garantizan contactos ni ventas.
        </p>
      </div>

      {/* Historial de Pagos */}
      <PaymentHistorySection />

      {/* Modal de Compra */}
      {showBuyModal && (
        <BuyBannerModal
          onClose={() => setShowBuyModal(false)}
          onBuy={buyBanner}
        />
      )}

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

                  if (paymentType === 'banner') {
                    confirmEndpoint = '/api/banners/confirm-payment';
                    confirmBody.bannerId = paymentData.bannerId;
                  } else if (paymentType === 'assigned_banner') {
                    confirmEndpoint = '/api/banners/assigned/confirm-payment';
                    confirmBody.bannerId = paymentData.bannerId;
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
                type: paymentType || 'banner',
                bannerId: paymentData.bannerId,
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PaymentHistorySection() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'promotion' | 'banner'>('banner');

  useEffect(() => {
    fetchPayments();
  }, [filter]);

  async function fetchPayments() {
    try {
      const url = filter === 'all' 
        ? '/api/payments/history'
        : `/api/payments/history?type=${filter}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'completed':
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'rejected':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'completed':
        return 'Completado';
      case 'active':
        return 'Activo';
      case 'pending':
        return 'Pendiente';
      case 'rejected':
        return 'Rechazado';
      default:
        return status;
    }
  }

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Historial de Pagos de Banners</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('banner')}
            className={`px-3 py-1 rounded text-sm ${
              filter === 'banner' ? 'bg-primary-600 text-white' : 'bg-gray-200'
            }`}
          >
            Banners
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-4xl mb-2">💳</div>
          <p className="text-gray-600">No hay pagos de banners registrados</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Monto</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">
                    {payment.paidAt 
                      ? new Date(payment.paidAt).toLocaleDateString()
                      : payment.createdAt 
                      ? new Date(payment.createdAt).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">{payment.description}</td>
                  <td className="px-4 py-3 text-sm font-semibold">
                    ${payment.amount?.toFixed(2) || '0.00'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(payment.status)}`}>
                      {getStatusText(payment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BuyBannerModal({
  onClose,
  onBuy,
}: {
  onClose: () => void;
  onBuy: (formData: any) => void;
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    ctaText: 'Ver Más',
    linkType: 'dealer' as 'vehicle' | 'dealer' | 'seller' | 'filter',
    linkValue: '',
    duration: 7,
    imageFile: null as File | null,
    videoFile: null as File | null,
    mediaType: 'image' as 'image' | 'video',
    paymentMethodId: null as string | null,
  });
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (formData.linkType === 'vehicle') {
      fetchVehicles();
    }
  }, [formData.linkType]);

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
    7: 99,
    15: 149,
    30: 299,
  };

  const getPrice = () => prices[formData.duration] || 99;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    if (formData.mediaType === 'image' && !formData.imageFile) {
      alert('Por favor selecciona una imagen');
      return;
    }

    if (formData.mediaType === 'video' && !formData.videoFile) {
      alert('Por favor selecciona un video');
      return;
    }

    if (formData.linkType === 'vehicle' && !formData.linkValue) {
      alert('Por favor selecciona un vehículo');
      return;
    }

    setUploading(true);
    try {
      // Subir imagen o video
      const uploadFormData = new FormData();
      const fileToUpload = formData.mediaType === 'image' ? formData.imageFile : formData.videoFile;
      uploadFormData.append('file', fileToUpload!);
      uploadFormData.append('type', 'banner');

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: uploadFormData,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Error al subir el ${formData.mediaType === 'image' ? 'archivo' : 'video'}`);
      }

      const { url } = await uploadResponse.json();

      // Enviar solicitud de compra
      onBuy({
        ...formData,
        imageUrl: formData.mediaType === 'image' ? url : undefined,
        videoUrl: formData.mediaType === 'video' ? url : undefined,
        mediaType: formData.mediaType,
      });
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-2xl font-bold">Comprar Banner Premium</h2>
          <p className="text-sm text-gray-600 mt-1">
            Los banners premium aparecen en la landing page pública y requieren aprobación del administrador
          </p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Título del Banner *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: Ofertas Especiales de Verano"
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
              placeholder="Describe tu oferta o mensaje..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Texto del Botón CTA *</label>
            <input
              type="text"
              value={formData.ctaText}
              onChange={(e) => setFormData({ ...formData, ctaText: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
              placeholder="Ej: Ver Más, Comprar Ahora"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Enlace *</label>
            <select
              value={formData.linkType}
              onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any, linkValue: '' })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="dealer">Página del Dealer</option>
              <option value="vehicle">Vehículo Específico</option>
              <option value="filter">Filtro de Búsqueda</option>
            </select>
          </div>

          {formData.linkType === 'vehicle' && (
            <div>
              <label className="block text-sm font-medium mb-2">Seleccionar Vehículo *</label>
              <select
                value={formData.linkValue}
                onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
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

          {formData.linkType === 'filter' && (
            <div>
              <label className="block text-sm font-medium mb-2">Filtro (JSON) *</label>
              <input
                type="text"
                value={formData.linkValue}
                onChange={(e) => setFormData({ ...formData, linkValue: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
                placeholder='{"make": "Toyota", "priceMax": 30000}'
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingresa un objeto JSON con los filtros a aplicar
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Media *</label>
            <select
              value={formData.mediaType}
              onChange={(e) => setFormData({ ...formData, mediaType: e.target.value as 'image' | 'video', imageFile: null, videoFile: null })}
              className="w-full border rounded px-3 py-2 mb-3"
            >
              <option value="image">Imagen</option>
              <option value="video">Video</option>
            </select>
          </div>

          {formData.mediaType === 'image' ? (
            <div>
              <label className="block text-sm font-medium mb-2">Imagen del Banner *</label>
              <input
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFormData({ ...formData, imageFile: e.target.files[0] });
                  }
                }}
                className="w-full border rounded px-3 py-2"
                required
              />
              <div className="mt-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                <strong>📸 Especificaciones de Imagen para Banner:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li><strong>Formatos permitidos:</strong> JPG, JPEG, PNG, WebP</li>
                  <li><strong>Tamaño recomendado:</strong> 1920x600px (proporción 16:5)</li>
                  <li><strong>Tamaño mínimo:</strong> 1200x400px</li>
                  <li><strong>Tamaño máximo por archivo:</strong> 10MB</li>
                  <li><strong>Resolución máxima:</strong> 4000x1500px</li>
                  <li><strong>Relación de aspecto:</strong> 16:5 o 3:1 (horizontal)</li>
                </ul>
              </div>
              {formData.imageFile && (
                <div className="mt-2 text-xs text-gray-600">
                  Archivo seleccionado: {formData.imageFile.name} ({(formData.imageFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium mb-2">Video del Banner *</label>
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFormData({ ...formData, videoFile: e.target.files[0] });
                  }
                }}
                className="w-full border rounded px-3 py-2"
                required
              />
              <div className="mt-2 bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs text-purple-800">
                <strong>🎥 Especificaciones de Video para Banner:</strong>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li><strong>Formatos permitidos:</strong> MP4, WebM, MOV</li>
                  <li><strong>Resolución recomendada:</strong> 1920x600px (proporción 16:5)</li>
                  <li><strong>Resolución mínima:</strong> 1280x400px</li>
                  <li><strong>Tamaño máximo por archivo:</strong> 100MB</li>
                  <li><strong>Duración recomendada:</strong> 15-30 segundos</li>
                  <li><strong>Codec recomendado:</strong> H.264 para mejor compatibilidad</li>
                  <li><strong>Relación de aspecto:</strong> 16:5 o 3:1 (horizontal)</li>
                </ul>
              </div>
              {formData.videoFile && (
                <div className="mt-2 text-xs text-gray-600">
                  Archivo seleccionado: {formData.videoFile.name} ({(formData.videoFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Duración *</label>
            <select
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
              className="w-full border rounded px-3 py-2"
            >
              <option value={7}>7 días - ${getPrice().toFixed(2)}</option>
              <option value={15}>15 días - ${getPrice().toFixed(2)}</option>
              <option value={30}>30 días - ${getPrice().toFixed(2)}</option>
            </select>
          </div>

          {/* Selector de Método de Pago */}
          <div className="border-t pt-4">
            <PaymentMethodSelector
              selectedPaymentMethodId={formData.paymentMethodId}
              onSelect={(paymentMethodId) => setFormData({ ...formData, paymentMethodId })}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-gray-600">Precio Total</div>
                <div className="text-3xl font-bold text-blue-600">${getPrice().toFixed(2)}</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Duración: {formData.duration} días</div>
                <div className="text-xs mt-1">Requiere aprobación del admin</div>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
            <strong>⚠️ Importante:</strong> Los banners aumentan la visibilidad. No garantizan contactos ni ventas.
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium disabled:opacity-50"
            >
              {uploading ? 'Subiendo...' : `Pagar $${getPrice().toFixed(2)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

