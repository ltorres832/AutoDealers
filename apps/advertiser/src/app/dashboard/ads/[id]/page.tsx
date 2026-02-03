'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import DashboardLayout from '../../../../components/DashboardLayout';

interface Ad {
  id: string;
  title: string;
  type: string;
  placement: string;
  status: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  linkUrl: string;
  linkType: string;
  budget: number;
  budgetType: string;
  startDate: Date;
  endDate: Date;
  impressions: number;
  clicks: number;
  ctr: number;
}

export default function AdDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    videoUrl: '',
    linkUrl: '',
    linkType: 'external' as 'external' | 'landing_page',
    budget: '',
    budgetType: 'monthly' as 'monthly' | 'total',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (params.id) {
      fetchAd();
    }
  }, [params.id]);

  async function fetchAd() {
    try {
      const response = await fetch(`/api/advertiser/ads/${params.id}`);
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        if (response.ok) {
          const data = await response.json();
          setAd(data.ad);
          setFormData({
            title: data.ad.title,
            description: data.ad.description || '',
            imageUrl: data.ad.imageUrl,
            videoUrl: data.ad.videoUrl || '',
            linkUrl: data.ad.linkUrl,
            linkType: data.ad.linkType,
            budget: data.ad.budget.toString(),
            budgetType: data.ad.budgetType,
            startDate: new Date(data.ad.startDate).toISOString().split('T')[0],
            endDate: new Date(data.ad.endDate).toISOString().split('T')[0],
          });
        }
      } else {
        console.error('Expected JSON but got:', contentType);
      }
    } catch (error: any) {
      console.error('Error fetching ad:', error);
      if (error.message && (error.message.includes('JSON') || error.message.includes('DOCTYPE'))) {
        console.error('Received HTML instead of JSON');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdate() {
    try {
      const response = await fetch(`/api/advertiser/ads/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          budget: Number(formData.budget),
          videoUrl: formData.videoUrl || undefined,
        }),
      });

      if (response.ok) {
        setEditing(false);
        fetchAd();
      }
    } catch (error) {
      console.error('Error updating ad:', error);
    }
  }

  async function handlePauseResume() {
    if (!ad) return;
    const action = ad.status === 'paused' ? 'resume' : 'pause';
    try {
      const response = await fetch(`/api/advertiser/ads/${params.id}/pause`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (response.ok) {
        fetchAd();
      }
    } catch (error) {
      console.error('Error pausing/resuming ad:', error);
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!ad) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Anuncio no encontrado</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">{ad.title}</h1>
          <div className="flex gap-2">
            {ad.status === 'pending' || ad.status === 'paused' ? (
              <button
                onClick={() => setEditing(!editing)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              >
                {editing ? 'Cancelar' : 'Editar'}
              </button>
            ) : null}
            {(ad.status === 'active' || ad.status === 'paused') && (
              <button
                onClick={handlePauseResume}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium"
              >
                {ad.status === 'paused' ? 'Reanudar' : 'Pausar'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Estado</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                ad.status === 'active' ? 'bg-green-100 text-green-800' :
                ad.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                ad.status === 'paused' ? 'bg-gray-100 text-gray-800' :
                'bg-red-100 text-red-800'
              }`}>
                {ad.status === 'active' ? 'Activo' :
                 ad.status === 'pending' ? 'Pendiente' :
                 ad.status === 'paused' ? 'Pausado' :
                 'Rechazado'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Tipo</h3>
              <p className="text-gray-900 capitalize">{ad.type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Ubicación</h3>
              <p className="text-gray-900 capitalize">{ad.placement}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Presupuesto</h3>
              <p className="text-gray-900">${ad.budget.toLocaleString()} ({ad.budgetType === 'monthly' ? 'Mensual' : 'Total'})</p>
            </div>
          </div>

          {ad.imageUrl && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Imagen</h3>
              <img src={ad.imageUrl} alt={ad.title} className="w-full max-w-md rounded-lg" />
            </div>
          )}

          <div className="grid grid-cols-3 gap-6 bg-gray-50 p-6 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Impresiones</h3>
              <p className="text-2xl font-bold text-gray-900">{ad.impressions.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Clics</h3>
              <p className="text-2xl font-bold text-gray-900">{ad.clicks.toLocaleString()}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">CTR</h3>
              <p className="text-2xl font-bold text-green-600">{ad.ctr.toFixed(2)}%</p>
            </div>
          </div>

          {editing && (
            <div className="border-t pt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                  rows={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL de Imagen</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">URL de Destino</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                />
              </div>
              <div className="flex gap-4">
                <button
                  onClick={handleUpdate}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Guardar Cambios
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

