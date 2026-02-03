'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import BackButton from '@/components/BackButton';

interface Tenant {
  id: string;
  name: string;
  type: 'dealer' | 'seller';
  companyName?: string;
}

export default function CreateReviewPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    tenantId: '',
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    rating: 5,
    title: '',
    comment: '',
    photos: '',
    videos: '',
    vehicleId: '',
    saleId: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
    featured: false,
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
      const photos: string[] = [];
      const videos: string[] = [];

      // Subir fotos
      for (const file of photoFiles) {
        const url = await uploadFile(file, 'review');
        photos.push(url);
      }

      // Subir videos
      for (const file of videoFiles) {
        const url = await uploadFile(file, 'review');
        videos.push(url);
      }

      setUploading(false);

      const response = await fetch('/api/admin/reviews/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: formData.tenantId,
          customerName: formData.customerName,
          customerEmail: formData.customerEmail || undefined,
          customerPhone: formData.customerPhone || undefined,
          rating: formData.rating,
          title: formData.title || undefined,
          comment: formData.comment,
          photos: photos.length > 0 ? photos : undefined,
          videos: videos.length > 0 ? videos : undefined,
          vehicleId: formData.vehicleId || undefined,
          saleId: formData.saleId || undefined,
          status: formData.status,
          featured: formData.featured,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Reseña creada exitosamente');
        router.push('/admin/reviews');
      } else {
        alert(`Error: ${data.error || 'Error al crear la reseña'}`);
      }
    } catch (error: any) {
      setUploading(false);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setPhotoFiles([...photoFiles, ...files]);
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPhotoPreviews([...photoPreviews, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function handleVideoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setVideoFiles([...videoFiles, ...files]);
      
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setVideoPreviews([...videoPreviews, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  function removePhoto(index: number) {
    setPhotoFiles(photoFiles.filter((_, i) => i !== index));
    setPhotoPreviews(photoPreviews.filter((_, i) => i !== index));
  }

  function removeVideo(index: number) {
    setVideoFiles(videoFiles.filter((_, i) => i !== index));
    setVideoPreviews(videoPreviews.filter((_, i) => i !== index));
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData({ ...formData, rating: star })}
            className={`text-3xl ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-500 transition-colors`}
          >
            ★
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <BackButton href="/admin/reviews" label="Volver a Reseñas" />
      </div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Crear Reseña</h1>
        <p className="text-gray-600 mt-2">
          Crea una reseña para un dealer o vendedor. Por defecto será aprobada.
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

        {/* Información del Cliente */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Información del Cliente</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre del Cliente *</label>
              <input
                type="text"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email del Cliente</label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Teléfono del Cliente</label>
            <input
              type="tel"
              value={formData.customerPhone}
              onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>
        </div>

        {/* Calificación */}
        <div className="border-t pt-6">
          <label className="block text-sm font-medium mb-2">Calificación *</label>
          {renderStars(formData.rating)}
          <p className="text-sm text-gray-500 mt-2">Selecciona {formData.rating} estrellas</p>
        </div>

        {/* Título y Comentario */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Contenido de la Reseña</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Excelente servicio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Comentario *</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={5}
              required
              placeholder="Escribe el comentario de la reseña..."
            />
          </div>
        </div>

        {/* Media */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Fotos y Videos</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Fotos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handlePhotoChange}
              className="w-full border rounded px-3 py-2"
            />
            {photoPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-3 gap-2">
                {photoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-32 object-cover rounded" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Máximo 10MB por foto. Formatos: JPG, PNG, GIF</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Videos</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleVideoChange}
              className="w-full border rounded px-3 py-2"
            />
            {videoPreviews.length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2">
                {videoPreviews.map((preview, index) => (
                  <div key={index} className="relative">
                    <video src={preview} controls className="w-full h-48 rounded" />
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-700"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">Máximo 100MB por video. Formatos: MP4, MOV, AVI</p>
          </div>
        </div>

        {/* Referencias */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4">Referencias (Opcional)</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">ID del Vehículo</label>
              <input
                type="text"
                value={formData.vehicleId}
                onChange={(e) => setFormData({ ...formData, vehicleId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="ID del vehículo relacionado"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">ID de la Venta</label>
              <input
                type="text"
                value={formData.saleId}
                onChange={(e) => setFormData({ ...formData, saleId: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="ID de la venta relacionada"
              />
            </div>
          </div>
        </div>

        {/* Estado y Destacado */}
        <div className="border-t pt-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="approved">Aprobada</option>
                <option value="pending">Pendiente</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                />
                <span className="font-medium">Reseña Destacada</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Las reseñas destacadas aparecen primero en la página web
              </p>
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || uploading}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {uploading ? 'Subiendo archivos...' : loading ? 'Creando...' : 'Crear Reseña'}
          </button>
          <Link
            href="/admin/reviews"
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}

