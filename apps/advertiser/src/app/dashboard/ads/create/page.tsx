'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';
import Link from 'next/link';
import { usePricingConfig, getBannerPrice } from '../../../../hooks/usePricingConfig';
import { StripePaymentForm } from '@autodealers/shared/client';
import { AdPlacementPreview } from '@/components/AdPlacementPreview';
import { AdPlacementDimensionsPanel } from '@/components/AdPlacementDimensionsPanel';
import {
  getPlacementPreviewSpec,
  getPlacementDimensionSummary,
  type AdPlacement,
} from '@/lib/ad-placement-preview';
import {
  AD_PLACEMENT_CAPACITY,
  AD_PLACEMENT_DESCRIPTIONS,
  AD_PLACEMENT_LABELS,
  AD_PLACEMENT_NOT_WHERE,
  AD_PLACEMENT_VISIBLE_SLOTS,
  isAdPlacement,
} from '@/lib/ad-placements';
import {
  AD_LINK_TYPE_OPTIONS,
  normalizeExternalUrl,
  parseAdLinkType,
  requiresDestinationUrl,
  showsOptionalDestinationUrl,
  type AdLinkType,
} from '@/lib/ad-link-types';
import { MAX_AD_CREATIVE_IMAGES } from '@autodealers/core/ad-creative';

function CreateAdPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');
  const placementFromUrl = searchParams.get('placement');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [advertiser, setAdvertiser] = useState<any>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [formData, setFormData] = useState({
    campaignName: '',
    type: 'banner' as 'banner' | 'promotion' | 'sponsor',
    placement: (isAdPlacement(placementFromUrl) ? placementFromUrl : 'between_content') as AdPlacement,
    durationDays: 7 as 7 | 15 | 30,
    title: '',
    description: '',
    imageUrl: '',
    images: [] as string[],
    animation: 'fade' as 'none' | 'fade' | 'slide' | 'kenburns',
    imageName: '',
    videoName: '',
    videoUrl: '',
    linkUrl: '',
    linkType: 'marketplace' as AdLinkType,
    targetLocation: [] as string[],
    targetVehicleTypes: [] as string[],
    // Las fechas se calculan automáticamente según la duración
    startDate: '',
  });
  const { config: pricingConfig, loading: _pricingLoading } = usePricingConfig();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [createdAd, setCreatedAd] = useState<any>(null);
  const [queueOffer, setQueueOffer] = useState<any>(null);
  // Calcular precio dinámicamente desde la configuración
  const price = formData.type === 'banner' 
    ? getBannerPrice(pricingConfig, formData.placement, formData.durationDays)
    : (pricingConfig?.promotions?.[formData.type === 'promotion' ? 'vehicle' : 'dealer']?.prices[formData.durationDays] || 0);

  useEffect(() => {
    fetchAdvertiser();
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
        imageUrl: media === 'image' ? ad.imageUrl || (ad.images?.[0] || '') : '',
        images: media === 'image' ? (Array.isArray(ad.images) && ad.images.length ? ad.images : ad.imageUrl ? [ad.imageUrl] : []).slice(0, MAX_AD_CREATIVE_IMAGES) : [],
        animation: ad.animation || 'fade',
        imageName: '',
        videoUrl: media === 'video' ? ad.videoUrl || '' : '',
        videoName: '',
        linkUrl: ad.linkUrl || '',
        linkType: parseAdLinkType(ad.linkType),
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

  const placementSpec = getPlacementPreviewSpec(formData.placement as AdPlacement);
  const placementDimensions = getPlacementDimensionSummary(formData.placement as AdPlacement);
  const placementOptions = Object.keys(AD_PLACEMENT_LABELS) as AdPlacement[];

  async function handleUpload(file: File, kind: 'image' | 'video') {
    if (!file) return;
    const maxSizeMb =
      kind === 'video' ? 50 : placementSpec.maxUploadMb;
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`El archivo supera el límite de ${maxSizeMb}MB`);
      return;
    }
    try {
      setUploadNotice('');
      if (kind === 'image') {
        setUploadingImage(true);
      } else {
        setUploadingVideo(true);
      }
      const form = new FormData();
      form.append('file', file);
      form.append('kind', kind);
      form.append('placement', formData.placement);
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
        setFormData((prev) => {
          const nextImages = Array.from(new Set([...(prev.images || []), data.url].filter(Boolean))).slice(
            0,
            MAX_AD_CREATIVE_IMAGES
          );
          return {
            ...prev,
            imageUrl: nextImages[0] || data.url,
            images: nextImages,
            imageName: file.name,
            videoUrl: '',
            videoName: '',
          };
        });
        if (data.optimized && data.width && data.height) {
          setUploadNotice(
            `Imagen optimizada automáticamente a ${data.width}×${data.height}px para "${placementSpec.label}" (foto completa, sin recortes, alta calidad).`
          );
        }
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
      if (kind === 'image') {
        setUploadingImage(false);
      } else {
        setUploadingVideo(false);
      }
    }
  }

  async function handleSubmit(e?: React.FormEvent, allowQueue = false) {
    e?.preventDefault();
    setError('');
    if (!allowQueue) setQueueOffer(null);

    setLoading(true);

    try {
      // Validar medio obligatorio según selección
      if (mediaType === 'image' && !formData.imageUrl && formData.images.length === 0) {
        setError('Debes subir o pegar al menos una imagen.');
        setLoading(false);
        return;
      }
      if (mediaType === 'video' && !formData.videoUrl) {
        setError('Debes subir o pegar un video.');
        setLoading(false);
        return;
      }

      if (requiresDestinationUrl(formData.linkType)) {
        if (!normalizeExternalUrl(formData.linkUrl)) {
          setError('Ingresa una URL válida para enlace externo (ej: https://tusitio.com o tusitio.com).');
          setLoading(false);
          return;
        }
      }

      const response = await fetch('/api/advertiser/ads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          allowQueue,
          mediaType,
          price,
          durationDays: formData.durationDays,
          budget: price,
          targetLocation: formData.targetLocation.length > 0 ? formData.targetLocation : undefined,
          targetVehicleTypes: formData.targetVehicleTypes.length > 0 ? formData.targetVehicleTypes : undefined,
          videoUrl: formData.videoUrl || undefined,
          images: formData.images.length > 0 ? formData.images : formData.imageUrl ? [formData.imageUrl] : [],
          animation: formData.animation,
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
            setupIntentId: data.payment.setupIntentId,
            intentType: data.payment.intentType || 'payment',
            queued: data.queue?.queued === true,
            queuePosition: data.queue?.queuePosition,
            amount: price,
            description: `Anuncio: ${formData.title || formData.campaignName}`,
          });
          setShowPayment(true);
        } else {
          // Si no requiere pago, redirigir directamente
          router.push('/dashboard/ads');
        }
      } else {
        if (data.code === 'PLACEMENT_FULL' && data.canQueue) {
          setQueueOffer(data);
          setError('');
        } else {
          setError(data.error || 'Error al crear anuncio');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error al crear anuncio');
    } finally {
      setLoading(false);
    }
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Nuevo Anuncio</h1>
        <p className="text-gray-600 mb-6">
          Sin suscripción mensual: pagas una sola vez por este anuncio al confirmar con tarjeta.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {uploadNotice && (
          <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg mb-6 text-sm">
            {uploadNotice}
          </div>
        )}

        {queueOffer && !showPayment && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
            <h2 className="text-lg font-bold">Esta ubicación está llena ahora mismo</h2>
            <p className="mt-2 text-sm leading-relaxed">
              {queueOffer.error}
            </p>
            <p className="mt-2 text-sm leading-relaxed">
              Si aceptas entrar en turno, Stripe aprobará y guardará tu método de pago ahora, pero no se cobrará hasta
              que haya espacio disponible. Cuando llegue tu turno, el sistema intentará cobrar automáticamente y activará
              el anuncio solo si Stripe aprueba el pago.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(undefined, true)}
                className="rounded-lg bg-primary-600 px-5 py-3 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
              >
                Aceptar y entrar en turno
              </button>
              <button
                type="button"
                onClick={() => setQueueOffer(null)}
                className="rounded-lg border border-amber-300 px-5 py-3 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              >
                Escoger otra ubicación
              </button>
            </div>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="bg-white rounded-lg shadow p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Anuncio *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              <option value="banner">Banner</option>
              <option value="promotion">Promoción</option>
              <option value="sponsor">Patrocinador</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ¿Dónde va a salir tu anuncio? *
            </label>
            <select
              value={formData.placement}
              onChange={(e) => setFormData({ ...formData, placement: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              required
            >
              {placementOptions.map((placement) => {
                const dims = getPlacementDimensionSummary(placement);
                return (
                  <option key={placement} value={placement}>
                    {AD_PLACEMENT_LABELS[placement]} — {dims.pixelSize}
                  </option>
                );
              })}
            </select>
            <p className="mt-2 text-sm leading-relaxed text-gray-800">
              {AD_PLACEMENT_DESCRIPTIONS[formData.placement as AdPlacement]}
            </p>
            <p className="mt-1 text-sm font-medium text-amber-800">
              {AD_PLACEMENT_NOT_WHERE[formData.placement as AdPlacement]}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Límite activo: {AD_PLACEMENT_CAPACITY[formData.placement as AdPlacement]} anuncios.
              Visibles al mismo tiempo: {AD_PLACEMENT_VISIBLE_SLOTS[formData.placement as AdPlacement]}.
            </p>
          </div>

          <AdPlacementDimensionsPanel placement={formData.placement as AdPlacement} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duración *
              </label>
              <select
                value={formData.durationDays}
                onChange={(e) => setFormData({ ...formData, durationDays: Number(e.target.value) as 7 | 15 | 30 })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
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
                Nombre de campaña <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={formData.campaignName}
                onChange={(e) => setFormData({ ...formData, campaignName: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Solo si quieres texto sobre la imagen"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Título <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Déjalo vacío si la imagen ya tiene el mensaje"
              />
            </div>
          </div>

          <p className="text-xs text-gray-500 -mt-2">
            Si tu imagen ya incluye toda la información, puedes omitir campaña, título y descripción.
            El anuncio mostrará solo la imagen a pantalla completa.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows={4}
            />
          </div>

          {/* Vista previa — mismo layout que el sitio público */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4 border border-gray-200">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Vista previa</h3>
                <p className="text-sm text-gray-600">
                  Vista fiel a cómo se verá en el sitio ({placementSpec.label}).
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Canvas del anuncio: <strong>{placementDimensions.pixelSize}</strong> (proporción{' '}
                  {placementDimensions.aspectRatio}). La imagen se muestra completa, sin recortes.
                </p>
              </div>
              <div className="text-sm text-gray-600 shrink-0 text-right">
                <div className="font-bold text-gray-900">{placementDimensions.pixelSize}</div>
                <div>
                  {formData.durationDays} días · ${price.toFixed(2)} · {formData.type}
                </div>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <AdPlacementPreview
                placement={formData.placement as AdPlacement}
                mediaType={mediaType}
                imageUrl={formData.images[0] || formData.imageUrl}
                images={formData.images}
                animation={formData.animation}
                videoUrl={formData.videoUrl}
                title={formData.title}
                description={formData.description}
                campaignName={formData.campaignName}
              />
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">{formData.type}</span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">
                {placementDimensions.pixelSize}
              </span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">{formData.durationDays} días</span>
              <span className="px-2 py-1 bg-white border border-gray-200 rounded-full">${price.toFixed(2)}</span>
            </div>
          </div>

          {mediaType === 'image' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Imágenes del anuncio (slideshow) *
              </label>
              <p className="text-xs text-gray-600 mb-2">
                Puedes subir varias fotos en el mismo anuncio (máximo {MAX_AD_CREATIVE_IMAGES}). Se rotan como
                carrusel en el sitio público, dentro de este anuncio.
              </p>
              <AdPlacementDimensionsPanel
                placement={formData.placement as AdPlacement}
                showReferenceTable={false}
                variant="compact"
              />
              <div className="space-y-2 mt-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const url = formData.imageUrl.trim();
                      if (!url) return;
                      setFormData((prev) => {
                        const next = Array.from(new Set([...(prev.images || []), url])).slice(
                          0,
                          MAX_AD_CREATIVE_IMAGES
                        );
                        return { ...prev, images: next, imageUrl: next[0] || url };
                      });
                    }}
                    className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
                  >
                    Agregar
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []);
                      for (const file of files) {
                        await handleUpload(file, 'image');
                      }
                      e.target.value = '';
                    }}
                    className="text-sm"
                  />
                  {uploadingImage && <span className="text-sm text-gray-600">Subiendo...</span>}
                </div>
                <p className="text-xs text-gray-600">
                  Formatos: JPG/PNG/WebP. Máx. {placementSpec.maxUploadMb}MB. Tamaño ideal:{' '}
                  <strong>{placementDimensions.pixelSize}</strong>. Hasta 8 fotos por anuncio.
                </p>
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {formData.images.map((url, index) => (
                      <div key={`${url}-${index}`} className="relative overflow-hidden rounded-lg border border-gray-200">
                        <img src={url} alt={`Foto ${index + 1}`} className="h-20 w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setFormData((prev) => {
                              const next = prev.images.filter((_, i) => i !== index);
                              return { ...prev, images: next, imageUrl: next[0] || '' };
                            });
                          }}
                          className="absolute right-1 top-1 rounded bg-black/60 px-1.5 text-xs text-white"
                        >
                          Quitar
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Animación del anuncio
                </label>
                <select
                  value={formData.animation}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      animation: e.target.value as typeof formData.animation,
                    })
                  }
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="fade">Fundido (fade)</option>
                  <option value="slide">Deslizamiento</option>
                  <option value="kenburns">Ken Burns (zoom suave)</option>
                  <option value="none">Sin movimiento</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  El movimiento se aplica a las fotos del mismo anuncio. Fundido: transiciona suave. Deslizamiento:
                  entra de lado. Ken Burns: zoom lento profesional. Sin movimiento: fotos estáticas.
                </p>
              </div>
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://..."
                />
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    accept="video/mp4,video/webm,video/quicktime"
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

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de enlace *
              </label>
              <select
                value={formData.linkType}
                onChange={(e) => {
                  const linkType = e.target.value as AdLinkType;
                  setFormData((prev) => ({
                    ...prev,
                    linkType,
                    linkUrl:
                      requiresDestinationUrl(linkType) || showsOptionalDestinationUrl(linkType)
                        ? prev.linkUrl
                        : '',
                  }));
                }}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              >
                {AD_LINK_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {AD_LINK_TYPE_OPTIONS.find((o) => o.value === formData.linkType)?.description}
              </p>
            </div>

            {(requiresDestinationUrl(formData.linkType) ||
              showsOptionalDestinationUrl(formData.linkType)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  URL de destino
                  {requiresDestinationUrl(formData.linkType) ? ' *' : ' (opcional)'}
                </label>
                <input
                  type="text"
                  inputMode="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://tusitio.com o tusitio.com"
                  required={requiresDestinationUrl(formData.linkType)}
                />
                {showsOptionalDestinationUrl(formData.linkType) && (
                  <p className="text-xs text-gray-500 mt-1">
                    Si no indicas URL, usamos el sitio web de tu perfil de anunciante.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-1">Resumen de costo</div>
            <div className="text-lg font-semibold text-gray-900">
              ${price.toFixed(2)} por {formData.durationDays} días ({formData.type} · {placementSpec.label})
            </div>
            <p className="text-xs text-gray-600 mt-1">
              La fecha de inicio será hoy y la fecha de fin se calcula automáticamente según la duración seleccionada.
            </p>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-primary-600 to-primary-600 text-white px-6 py-3 rounded-lg hover:from-primary-700 hover:to-primary-700 font-semibold transition-all disabled:opacity-50"
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
          <div className="mt-8 bg-white rounded-xl shadow-xl p-8 border-2 border-primary-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {paymentData.intentType === 'setup' ? 'Guardar método de pago para tu turno' : 'Completa el Pago'}
                </h2>
                <p className="text-gray-600 mt-1">
                  {paymentData.intentType === 'setup'
                    ? 'No se cobrará ahora. Se cobrará automáticamente cuando haya espacio disponible.'
                    : 'Anuncio creado:'}{' '}
                  <span className="font-semibold">{createdAd?.title || paymentData.description}</span>
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
              publishableKeyUrl="/api/advertiser/stripe/publishable-key"
              clientSecret={paymentData.clientSecret}
              intentType={paymentData.intentType || 'payment'}
              amount={paymentData.amount}
              currency="usd"
              description={paymentData.description}
              totalLabel={paymentData.intentType === 'setup' ? 'Importe que se cobrará al activarse:' : 'Total a pagar:'}
              submitLabel={paymentData.intentType === 'setup' ? 'Guardar método y confirmar turno' : undefined}
              onSuccess={async (intentId: string) => {
                try {
                  const response =
                    paymentData.intentType === 'setup'
                      ? await fetch(`/api/advertiser/ads/${createdAd.id}/confirm-queue-setup`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ setupIntentId: intentId }),
                        })
                      : await fetch(`/api/advertiser/ads/${createdAd.id}/confirm-payment`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ paymentIntentId: intentId }),
                        });

                  if (response.ok) {
                    alert(
                      paymentData.intentType === 'setup'
                        ? 'Tu anuncio quedó en turno. Se cobrará y activará automáticamente cuando haya espacio.'
                        : '¡Pago completado exitosamente!'
                    );
                    router.push('/dashboard/ads');
                  } else {
                    const data = await response.json();
                    alert(`Error al confirmar: ${data.error || 'Error desconocido'}`);
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
