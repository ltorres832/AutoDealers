'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import Link from 'next/link';
import { usePricingConfig, getBannerPrice } from '../../../../hooks/usePricingConfig';
import { StripePaymentForm } from '@autodealers/shared';

interface Plan {
  id: string;
  name: string;
  price: number;
  features: string[];
  popular?: boolean;
  stripePriceId?: string;
}

function CreateAdPageContent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showPlanSelection, setShowPlanSelection] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [formData, setFormData] = useState({
    campaignName: '',
    type: 'banner' as 'banner' | 'promotion' | 'sponsor',
    placement: 'sidebar' as 'hero' | 'sidebar' | 'sponsors_section' | 'between_content',
    durationDays: 7 as 7 | 15 | 30,
    title: '',
    description: '',
    imageUrl: '',
    imageName: '',
    videoName: '',
    videoUrl: '',
    linkUrl: '',
    linkType: 'external' as 'external' | 'landing_page',
    targetLocation: [] as string[],
    targetVehicleTypes: [] as string[],
    // Las fechas se calculan automáticamente según la duración
    startDate: '',
  });
  const { config: pricingConfig, loading: pricingLoading } = usePricingConfig();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [createdAd, setCreatedAd] = useState<any>(null);
  const searchParams = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');

  // Calcular precio dinámicamente desde la configuración
  const price = formData.type === 'banner' 
    ? getBannerPrice(pricingConfig, formData.placement, formData.durationDays)
    : (pricingConfig?.promotions?.[formData.type === 'promotion' ? 'vehicle' : 'dealer']?.prices[formData.durationDays] || 0);

  useEffect(() => {
    fetchAdvertiser();
    fetchPlans();
    if (copyFrom) {
      preloadAd(copyFrom);
    }
  }, [copyFrom]);

  async function preloadAd(adId: string) {
    try {
      const res = await fetch(`/api/advertiser/ads/${adId}`);
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) return;
      const data = await res.json();
      if (!res.ok || !data.ad) return;

      const ad = data.ad;
      const media = ad.videoUrl ? 'video' : 'image';
      const dur = ad.durationDays && [7, 15, 30].includes(ad.durationDays) ? ad.durationDays : 7;

      setMediaType(media);
      setFormData((prev) => ({
        ...prev,
        campaignName: ad.campaignName || '',
        type: ad.type || 'banner',
        placement: ad.placement || 'sidebar',
        durationDays: dur,
        title: ad.title || '',
        description: ad.description || '',
        imageUrl: media === 'image' ? ad.imageUrl || '' : '',
        imageName: '',
        videoUrl: media === 'video' ? ad.videoUrl || '' : '',
        videoName: '',
        linkUrl: ad.linkUrl || '',
        linkType: (ad.linkType as any) || 'external',
        targetLocation: ad.targetLocation || [],
        targetVehicleTypes: ad.targetVehicleTypes || [],
      }));
    } catch (err) {
      console.error('Error preloading ad:', err);
    }
  }

  async function fetchAdvertiser() {
    try {
      const response = await fetch('/api/advertiser/me');
      
      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        const errorMsg = text.includes('<!DOCTYPE') 
          ? 'El servidor no está respondiendo correctamente. Verifica que esté corriendo en el puerto 3004.'
          : 'Error al cargar la información. Por favor recarga la página.';
        setError(errorMsg);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setAdvertiser(data.advertiser);
        // Si no tiene plan, mostrar selección de plan
        if (!data.advertiser.plan) {
          setShowPlanSelection(true);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        setError(errorData.error || 'Error al cargar la información');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('Failed to fetch')) {
        setError('No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo: npm run dev');
      } else if (error.message && (error.message.includes('JSON') || error.message.includes('DOCTYPE'))) {
        setError('El servidor devolvió una respuesta inválida. Verifica que esté corriendo correctamente.');
      } else {
        setError('Error al cargar la información: ' + (error.message || 'Error desconocido'));
      }
    }
  }

  async function handleUpload(file: File, kind: 'image' | 'video') {
    if (!file) return;
    const maxSizeMb = kind === 'video' ? 50 : 10;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`El archivo supera el límite de ${maxSizeMb}MB`);
      return;
    }
    try {
      kind === 'image' ? setUploadingImage(true) : setUploadingVideo(true);
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      const res = await fetch('/api/advertiser/upload', {
        method: 'POST',
        body: form,
      });
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        setError(`Error al subir archivo: ${text.substring(0, 200)}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al subir archivo');
        return;
      }
      if (kind === 'image') {
        setFormData((prev) => ({
          ...prev,
          imageUrl: data.url,
          imageName: file.name,
          // Si se sube imagen, limpiamos video
          videoUrl: '',
          videoName: '',
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          videoUrl: data.url,
          videoName: file.name,
          // Si se sube video, limpiamos imagen
          imageUrl: '',
          imageName: '',
        }));
      }
    } catch (err: any) {
      setError(err.message || 'Error al subir archivo');
    } finally {
      kind === 'image' ? setUploadingImage(false) : setUploadingVideo(false);
    }
  }

  async function fetchPlans() {
    try {
      const response = await fetch('/api/public/advertiser-pricing');
      
      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        const errorMsg = text.includes('<!DOCTYPE') 
          ? 'El servidor no está respondiendo correctamente. Verifica que esté corriendo en el puerto 3004.'
          : 'Error al cargar los planes. Por favor recarga la página.';
        setError(errorMsg);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const plansData: Plan[] = [
          {
            id: 'starter',
            name: data.plans.starter.name,
            price: data.plans.starter.amount / 100,
            features: data.plans.starter.features,
            stripePriceId: data.plans.starter.priceId,
          },
          {
            id: 'professional',
            name: data.plans.professional.name,
            price: data.plans.professional.amount / 100,
            features: data.plans.professional.features,
            popular: true,
            stripePriceId: data.plans.professional.priceId,
          },
          {
            id: 'premium',
            name: data.plans.premium.name,
            price: data.plans.premium.amount / 100,
            features: data.plans.premium.features,
            stripePriceId: data.plans.premium.priceId,
          },
        ];
        setPlans(plansData);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        setError(errorData.error || 'Error al cargar los planes');
      }
    } catch (error: any) {
      if (error.message && error.message.includes('Failed to fetch')) {
        setError('No se pudo conectar con el servidor. Asegúrate de que el servidor esté corriendo: npm run dev');
      } else if (error.message && (error.message.includes('JSON') || error.message.includes('DOCTYPE'))) {
        setError('El servidor devolvió una respuesta inválida. Verifica que esté corriendo correctamente.');
      } else {
        setError('Error al cargar los planes: ' + (error.message || 'Error de conexión'));
      }
    }
  }

  async function handleSelectPlan(planId: string) {
    setSelectedPlan(planId);
    setLoading(true);
    try {
      const response = await fetch('/api/advertiser/plan/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPlan: planId }),
      });

      // Verificar que la respuesta sea JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('Expected JSON but got:', contentType, text.substring(0, 200));
        setError('Error al procesar la solicitud. Por favor intenta de nuevo.');
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        // Redirigir a Stripe Checkout
        window.location.href = data.checkoutUrl;
      } else {
        setError(data.error || 'Error al seleccionar plan');
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error selecting plan:', err);
      if (err.message && err.message.includes('JSON')) {
        setError('Error al procesar la solicitud. Por favor intenta de nuevo.');
      } else {
        setError('Error al seleccionar plan: ' + err.message);
      }
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Si no tiene plan, debe seleccionar uno primero
    if (!advertiser?.plan) {
      setShowPlanSelection(true);
      setError('Debes seleccionar un plan para crear anuncios');
      return;
    }

    setLoading(true);

    try {
      // Validar medio obligatorio según selección
      if (mediaType === 'image' && !formData.imageUrl) {
        setError('Debes subir o pegar una imagen.');
        setLoading(false);
        return;
      }
      if (mediaType === 'video' && !formData.videoUrl) {
        setError('Debes subir o pegar un video.');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/advertiser/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          mediaType,
          price,
          durationDays: formData.durationDays,
          budget: price,
          targetLocation: formData.targetLocation.length > 0 ? formData.targetLocation : undefined,
          targetVehicleTypes: formData.targetVehicleTypes.length > 0 ? formData.targetVehicleTypes : undefined,
          videoUrl: formData.videoUrl || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Si requiere pago, mostrar formulario de pago integrado
        if (data.payment?.required && data.payment?.clientSecret) {
          setCreatedAd(data.ad);
          setPaymentData({
            clientSecret: data.payment.clientSecret,
            paymentIntentId: data.payment.paymentIntentId,
            amount: price,
            description: `Anuncio: ${formData.title || formData.campaignName}`,
          });
          setShowPayment(true);
        } else {
          // Si no requiere pago, redirigir directamente
          router.push('/dashboard/ads');
        }
      } else {
        setError(data.error || 'Error al crear anuncio');
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear anuncio');
    } finally {
      setLoading(false);
    }
  }

  // Mostrar selección de plan si no tiene uno
  if (showPlanSelection) {
    return (
      <DashboardLayout>
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Selecciona tu Plan</h1>
            <p className="text-gray-600 mt-2">
              Para crear anuncios, necesitas seleccionar un plan de suscripción
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`bg-white rounded-xl shadow-lg p-8 border-2 ${
                  plan.popular ? 'border-blue-500 scale-105' : 'border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-4">
                    MÁS POPULAR
                  </div>
                )}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/mes</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-green-500 mt-1">✓</span>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={loading || selectedPlan === plan.id}
                  className={`w-full py-3 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {loading && selectedPlan === plan.id ? 'Procesando...' : 'Seleccionar Plan'}
                </button>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/dashboard/ads"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Volver a mis anuncios
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Crear Nuevo Anuncio</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Anuncio *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="banner">Banner</option>
                <option value="promotion">Promoción</option>
                <option value="sponsor">Patrocinador</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ubicación *
              </label>
              <select
                value={formData.placement}
                onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="hero">Hero (Principal)</option>
                <option value="sidebar">Sidebar</option>
                <option value="sponsors_section">Sección Patrocinadores</option>
                <option value="between_content">Entre Contenido</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración *
              </label>
              <select
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) as 7 | 15 | 30 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value={7}>7 días</option>
                <option value={15}>15 días</option>
                <option value={30}>30 días</option>
              </select>
              <p className="text-xs text-gray-600 mt-1">
                La fecha de fin se calculará automáticamente según la duración seleccionada.
              </p>
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-sm text-gray-600">Precio estimado</div>
              <div className="text-2xl font-bold text-gray-900">${price.toFixed(2)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Medio *
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="mediaType"
                    value="image"
                    checked={mediaType === 'image'}
                    onChange={() => {
                      setMediaType('image');
                      setFormData((prev) => ({ ...prev, videoUrl: '', videoName: '' }));
                    }}
                  />
                  Imagen
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="radio"
                    name="mediaType"
                    value="video"
                    checked={mediaType === 'video'}
                    onChange={() => {
                      setMediaType('video');
                      setFormData((prev) => ({ ...prev, imageUrl: '', imageName: '' }));
                    }}
                  />
                  Video
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de campaña *
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
            />
          </div>

          {/* Vista previa */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vista previa</h3>
                <p className="text-sm text-gray-600">Así se verá tu anuncio con la configuración actual.</p>
              </div>
              <div className="text-sm text-gray-600">
                {formData.durationDays} días · ${price.toFixed(2)} · {formData.type} · {formData.placement}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
              {mediaType === 'image' && formData.imageUrl ? (
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full max-h-56 object-cover rounded-md"
                />
              ) : mediaType === 'image' ? (
                <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-sm">
                  Sin imagen
                </div>
              ) : null}
              {mediaType === 'video' && formData.videoUrl && (
                <video
                  src={formData.videoUrl}
                  controls
                  className="w-full max-h-56 rounded-md bg-black"
                />
              )}
              {mediaType === 'video' && !formData.videoUrl && (
                <div className="w-full h-40 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 text-sm">
                  Sin video
                </div>
              )}
              <div>
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  {formData.campaignName || 'Nombre de campaña'}
                </p>
                <h4 className="text-xl font-bold text-gray-900">{formData.title || 'Título del anuncio'}</h4>
                <p className="text-gray-700 mt-1">
                  {formData.description || 'Aquí verás la descripción de tu anuncio.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">
                  {formData.type}
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">
                  {formData.placement}
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">
                  {formData.durationDays} días
                </span>
                <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">
                  ${price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {mediaType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imagen (subir o pegar URL) *
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, 'image');
                    }}
                    className="text-sm"
                  />
                  {uploadingImage && <span className="text-sm text-gray-600">Subiendo...</span>}
                </div>
                <p className="text-xs text-gray-600">
                  Formatos: JPG/PNG/WebP. Máx: 10MB. Se mostrará el tamaño original.
                </p>
                {formData.imageName && (
                  <p className="text-xs text-gray-700">Archivo: {formData.imageName}</p>
                )}
              </div>
              {formData.imageUrl && (
                <img src={formData.imageUrl} alt="Preview" className="mt-2 w-32 h-32 object-cover rounded" />
              )}
            </div>
          )}

          {mediaType === 'video' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video (subir o pegar URL) *
              </label>
              <div className="space-y-2">
                <input
                  type="url"
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file, 'video');
                    }}
                    className="text-sm"
                  />
                  {uploadingVideo && <span className="text-sm text-gray-600">Subiendo...</span>}
                </div>
                <p className="text-xs text-gray-600">
                  Formatos: MP4/MOV/WebM. Máx: 50MB.
                </p>
                {formData.videoName && (
                  <p className="text-xs text-gray-700">Archivo: {formData.videoName}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL de Destino *
              </label>
              <input
                type="url"
                value={formData.linkUrl}
                onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Enlace *
              </label>
              <select
                value={formData.linkType}
                onChange={(e) => setFormData({ ...formData, linkType: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="external">Externo</option>
                <option value="landing_page">Landing Page</option>
              </select>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Resumen de costo</div>
            <div className="text-lg font-semibold text-gray-900">
              ${price.toFixed(2)} por {formData.durationDays} días ({formData.type} · {formData.placement})
            </div>
            <p className="text-xs text-gray-600 mt-1">
              La fecha de inicio será hoy y la fecha de fin se calcula automáticamente según la duración seleccionada.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-indigo-700 font-semibold transition-all disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Anuncio'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
          </div>
        </form>

        {/* Formulario de Pago Integrado */}
        {showPayment && paymentData && (
          <div className="mt-8 bg-white rounded-xl shadow-xl p-8 border-2 border-blue-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Completa el Pago</h2>
                <p className="text-gray-600 mt-1">
                  Anuncio creado: <span className="font-semibold">{createdAd?.title || paymentData.description}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowPayment(false);
                  router.push('/dashboard/ads');
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
              onSuccess={async (paymentIntentId: string) => {
                // Actualizar el anuncio con el pago completado
                try {
                  const response = await fetch(`/api/advertiser/ads/${createdAd.id}/confirm-payment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ paymentIntentId }),
                  });

                  if (response.ok) {
                    alert('¡Pago completado exitosamente!');
                    router.push('/dashboard/ads');
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
                adId: createdAd?.id,
                advertiserId: advertiser?.id,
              }}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function CreateAdPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <CreateAdPageContent />
    </Suspense>
  );
}
