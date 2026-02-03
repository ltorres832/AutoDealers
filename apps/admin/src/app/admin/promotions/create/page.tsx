'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import {
  discountOptions,
  discountPlaceholders,
  discountRequiresValue,
  PromotionDiscountType,
} from '@autodealers/shared/discounts';

interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  companyName?: string;
}

export default function CreatePromotionPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [formData, setFormData] = useState({
    tenantId: '',
    name: '',
    description: '',
    type: 'discount',
    discountType: 'percentage' as PromotionDiscountType,
    discountValue: 0,
    platforms: [] as string[],
    content: '',
    imageUrl: '',
    startDate: '',
    endDate: '',
    isPremium: false,
    price: 0,
    publishNow: false,
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      const response = await fetch('/api/admin/tenants');
      const data = await response.json();
      setTenants(data.tenants || []);
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function uploadFile(file: File, type: 'campaign' | 'promotion' | 'review'): Promise<string> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('type', type);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al subir archivo');
    }

    const data = await response.json();
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setUploading(true);

    try {
      let imageUrl = formData.imageUrl;

      // Subir imagen si hay una
      if (imageFile) {
        imageUrl = await uploadFile(imageFile, 'promotion');
      }

      setUploading(false);

      if (
        formData.type === 'discount' &&
        discountRequiresValue(formData.discountType) &&
        formData.discountValue <= 0
      ) {
        alert('Elige un tipo de descuento válido e ingresa un valor mayor a cero, o selecciona "Sin descuento"');
        setLoading(false);
        return;
      }

      const discount =
        formData.type === 'discount' && discountRequiresValue(formData.discountType)
          ? {
              type: formData.discountType,
              value: formData.discountValue,
            }
          : undefined;

      const response = await fetch('/api/admin/promotions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: formData.tenantId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          discount,
          platforms: formData.platforms,
          content: formData.content,
          imageUrl: imageUrl || undefined,
          startDate: formData.startDate || undefined,
          endDate: formData.endDate || undefined,
          isPremium: formData.isPremium,
          price: formData.isPremium ? formData.price : 0,
          publishNow: formData.isPremium ? false : formData.publishNow,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(formData.isPremium 
          ? 'Promoción premium creada. El tenant debe pagar para activarla.'
          : 'Promoción creada exitosamente');
        router.push('/admin/all-promotions');
      } else {
        alert(`Error: ${data.error || 'Error al crear la promoción'}`);
      }
    } catch (error: any) {
      setUploading(false);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview('');
    setFormData({ ...formData, imageUrl: '' });
  }

  function togglePlatform(platform: string) {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton href="/admin/all-promotions" label="Volver a Promociones" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear Promoción</h1>
        <p className="text-gray-600 mt-2">
          Crea una promoción regular (gratuita) o premium (con costo) para un dealer o vendedor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
        {/* Selección de Tenant */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Tenant (Dealer/Vendedor) *
          </label>
          <select
            value={formData.tenantId}
            onChange={(e) => setFormData({ ...formData, tenantId: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Seleccionar tenant...</option>
            {tenants.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name} {tenant.companyName ? `(${tenant.companyName})` : ''} - {tenant.type}
              </option>
            ))}
          </select>
        </div>

        {/* Tipo de Promoción */}
        <div>
          <label className="block text-sm font-medium mb-2">Tipo de Promoción *</label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="discount">Descuento</option>
            <option value="special">Especial</option>
            <option value="event">Evento</option>
            <option value="announcement">Anuncio</option>
          </select>
        </div>

        {/* Premium */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isPremium}
              onChange={(e) => setFormData({ ...formData, isPremium: e.target.checked })}
            />
            <span className="font-medium">Promoción Premium (con costo)</span>
          </label>
          <p className="text-xs text-gray-600 mt-2">
            Las promociones premium se publicarán en redes sociales Y en la página web de la plataforma después del pago.
          </p>
        </div>

        {/* Nombre */}
        <div>
          <label className="block text-sm font-medium mb-2">Nombre *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full border rounded px-3 py-2"
            required
            placeholder="Ej: Oferta Especial de Verano"
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium mb-2">Descripción *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={4}
            required
            placeholder="Descripción detallada de la promoción..."
          />
        </div>

        {/* Descuento (si es tipo discount) */}
        {formData.type === 'discount' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tipo de Descuento (opcional)
              </label>
              <select
                value={formData.discountType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    discountType: e.target.value as PromotionDiscountType,
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
                value={formData.discountValue}
                onChange={(e) => setFormData({ ...formData, discountValue: parseFloat(e.target.value) || 0 })}
                className="w-full border rounded px-3 py-2"
                min="0"
                step={formData.discountType === 'percentage' ? '1' : '0.01'}
                placeholder={discountPlaceholders[formData.discountType]}
              />
            </div>
          </div>
        )}

        {/* Precio (si es premium) */}
        {formData.isPremium && (
          <div>
            <label className="block text-sm font-medium mb-2">Precio (USD) *</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full border rounded px-3 py-2"
              required
              min="0"
              step="0.01"
            />
            <p className="text-xs text-gray-500 mt-1">
              El tenant deberá pagar este monto para activar la promoción
            </p>
          </div>
        )}

        {/* Plataformas (solo si no es premium o si es premium, para mostrar dónde se publicará) */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Plataformas (selecciona dónde se publicará)
          </label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.platforms.includes('facebook')}
                onChange={() => togglePlatform('facebook')}
              />
              <span>Facebook</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.platforms.includes('instagram')}
                onChange={() => togglePlatform('instagram')}
              />
              <span>Instagram</span>
            </label>
            {formData.isPremium && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked disabled />
                <span>Página Web de la Plataforma (automático)</span>
              </label>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {formData.isPremium 
              ? 'Las promociones premium se publican automáticamente después del pago'
              : 'Solo se publicará en las plataformas donde el tenant tenga credenciales configuradas'}
          </p>
        </div>

        {/* Contenido para Redes Sociales */}
        <div>
          <label className="block text-sm font-medium mb-2">Contenido para Redes Sociales</label>
          <textarea
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            className="w-full border rounded px-3 py-2"
            rows={4}
            placeholder="Texto que aparecerá en el post de redes sociales..."
          />
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium mb-2">Imagen</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="w-full border rounded px-3 py-2"
          />
          {imagePreview && (
            <div className="mt-2 relative inline-block">
              <img src={imagePreview} alt="Preview" className="max-w-xs max-h-48 rounded" />
              <button
                type="button"
                onClick={removeImage}
                className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
              >
                ×
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">Máximo 10MB. Formatos: JPG, PNG, GIF</p>
        </div>

        {/* Fechas */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">Fecha de Inicio</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fecha de Fin</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Publicar Ahora (solo si no es premium) */}
        {!formData.isPremium && (
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.publishNow}
                onChange={(e) => setFormData({ ...formData, publishNow: e.target.checked })}
              />
              <span className="font-medium">Publicar inmediatamente en redes sociales</span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Si está marcado, se publicará automáticamente si el tenant tiene credenciales configuradas
            </p>
          </div>
        )}

        {/* Botones */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {uploading ? 'Subiendo archivo...' : loading ? 'Creando...' : 'Crear Promoción'}
          </button>
          <Link
            href="/admin/all-promotions"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

