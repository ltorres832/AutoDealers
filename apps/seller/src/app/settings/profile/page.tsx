'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface ProfileData {
  name: string;
  email: string;
  phone?: string;
  photo?: string;
  bio?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  website?: string;
  description?: string;
  businessHours?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    linkedin?: string;
  };
  // Calificaciones
  sellerRating?: number;
  sellerRatingCount?: number;
}

export default function ProfileSettingsPage() {
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    photo: '',
    bio: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    website: '',
    description: '',
    businessHours: '',
    socialMedia: {},
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    setLoading(true);
    try {
      const response = await fetch('/api/settings/profile');
      if (response.ok) {
        const data = await response.json();
        setProfileData(data.profile || profileData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona una imagen');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen debe ser menor a 5MB');
      return;
    }

    setUploadingPhoto(true);
    try {
      // Subir foto a Firebase Storage
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch('/api/settings/profile/photo', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData({ ...profileData, photo: data.photoUrl });
        alert('Foto actualizada exitosamente');
      } else {
        const error = await response.json();
        alert(`Error al subir foto: ${error.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir foto');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleRemovePhoto() {
    if (!confirm('¿Estás seguro de que quieres eliminar tu foto de perfil?')) {
      return;
    }

    try {
      const response = await fetch('/api/settings/profile/photo', {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfileData({ ...profileData, photo: '' });
        alert('Foto eliminada exitosamente');
      } else {
        alert('Error al eliminar foto');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      alert('Error al eliminar foto');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });

      if (response.ok) {
        alert('Perfil actualizado exitosamente');
      } else {
        alert('Error al actualizar perfil');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al actualizar perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Configuración</h1>
        <p className="text-gray-600">
          Esta información será visible para tus clientes
        </p>
        
        {/* Settings Tabs */}
        <div className="mt-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <Link
              href="/settings/branding"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Branding
            </Link>
            <Link
              href="/settings/profile"
              className="border-b-2 border-primary-500 py-4 px-1 text-sm font-medium text-primary-600"
            >
              Perfil
            </Link>
            <Link
              href="/settings/integrations"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Integraciones
            </Link>
            <Link
              href="/settings/membership"
              className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Membresía
            </Link>
          </nav>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Calificaciones */}
        {(profileData.sellerRating || 0) > 0 && (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
            <h2 className="text-xl font-bold mb-4">⭐ Calificaciones</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      className={`text-3xl ${
                        star <= Math.round(profileData.sellerRating || 0)
                          ? 'text-yellow-400'
                          : 'text-gray-300'
                      }`}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div className="ml-2">
                  <div className="text-2xl font-bold text-gray-900">
                    {(profileData.sellerRating || 0).toFixed(1)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {profileData.sellerRatingCount || 0} calificación{profileData.sellerRatingCount !== 1 ? 'es' : ''}
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Esta es tu calificación promedio basada en las opiniones de tus clientes.
            </p>
          </div>
        )}

        {/* Foto de Perfil */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Foto de Perfil</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profileData.photo ? (
                <img
                  src={profileData.photo}
                  alt="Foto de perfil"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gray-200"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl text-gray-600 border-4 border-gray-200">
                  {profileData.name.charAt(0).toUpperCase() || '👤'}
                </div>
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-3">
                Esta foto será visible para tus clientes cuando soliciten citas contigo.
              </p>
              <label className="block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                <span className="inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer disabled:opacity-50">
                  {uploadingPhoto ? 'Subiendo...' : profileData.photo ? 'Cambiar Foto' : 'Subir Foto'}
                </span>
              </label>
              {profileData.photo && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="ml-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Información Básica */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Información Básica</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Nombre *</label>
              <input
                type="text"
                value={profileData.name}
                onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email *</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Teléfono</label>
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Biografía (Opcional)</label>
              <textarea
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="w-full border rounded px-3 py-2"
                rows={3}
                placeholder="Escribe una breve biografía sobre ti. Esto aparecerá cuando los clientes seleccionen un vendedor."
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {profileData.bio?.length || 0}/200 caracteres
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sitio Web</label>
              <input
                type="url"
                value={profileData.website}
                onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              value={profileData.description}
              onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              placeholder="Describe tu negocio o servicios..."
            />
          </div>
        </div>

        {/* Dirección */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Dirección</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Dirección</label>
              <input
                type="text"
                value={profileData.address}
                onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Ciudad</label>
                <input
                  type="text"
                  value={profileData.city}
                  onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estado/Provincia</label>
                <input
                  type="text"
                  value={profileData.state}
                  onChange={(e) => setProfileData({ ...profileData, state: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Código Postal</label>
                <input
                  type="text"
                  value={profileData.zipCode}
                  onChange={(e) => setProfileData({ ...profileData, zipCode: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">País</label>
              <input
                type="text"
                value={profileData.country}
                onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* Horarios de Atención */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Horarios de Atención</h2>
          <div>
            <label className="block text-sm font-medium mb-2">Horarios</label>
            <textarea
              value={profileData.businessHours}
              onChange={(e) => setProfileData({ ...profileData, businessHours: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={3}
              placeholder="Ej: Lunes a Viernes: 9:00 AM - 6:00 PM&#10;Sábados: 10:00 AM - 4:00 PM"
            />
          </div>
        </div>

        {/* Redes Sociales */}
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <h2 className="text-xl font-bold mb-4">Redes Sociales</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Facebook</label>
              <input
                type="url"
                value={profileData.socialMedia?.facebook || ''}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socialMedia: { ...profileData.socialMedia, facebook: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://facebook.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Instagram</label>
              <input
                type="url"
                value={profileData.socialMedia?.instagram || ''}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socialMedia: { ...profileData.socialMedia, instagram: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://instagram.com/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">TikTok</label>
              <input
                type="url"
                value={profileData.socialMedia?.tiktok || ''}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socialMedia: { ...profileData.socialMedia, tiktok: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://tiktok.com/@..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">LinkedIn</label>
              <input
                type="url"
                value={profileData.socialMedia?.linkedin || ''}
                onChange={(e) => setProfileData({
                  ...profileData,
                  socialMedia: { ...profileData.socialMedia, linkedin: e.target.value }
                })}
                className="w-full border rounded px-3 py-2"
                placeholder="https://linkedin.com/in/..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}


