'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Integration {
  type: 'facebook' | 'instagram';
  status: 'active' | 'inactive';
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  condition: 'new' | 'used' | 'certified';
  status?: 'available' | 'reserved' | 'sold';
  mileage?: number;
  location?: string;
  features?: string[];
  images?: string[];
}

interface AIGeneratedPost {
  text: string;
  hashtags: string[];
  cta: string;
  optimizedFor: {
    facebook: { text: string; hashtags: string[] };
    instagram: { text: string; hashtags: string[]; caption: string };
  };
}

interface ScheduledPost {
  id: string;
  content: { text: string; imageUrl?: string; hashtags: string[] };
  platforms: ('facebook' | 'instagram')[];
  scheduledFor: string;
  status: 'scheduled' | 'published' | 'failed' | 'cancelled';
  aiGenerated: boolean;
}

interface AdCampaign {
  id: string;
  name: string;
  objective: 'more_messages' | 'more_visits';
  vehicleId?: string;
  budget: number;
  duration: number;
  platforms: ('facebook' | 'instagram')[];
  status: 'draft' | 'active' | 'paused' | 'completed';
  spent: number;
  impressions: number;
  clicks: number;
}

export default function SocialPostsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'posts' | 'ads' | 'scheduled'>('posts');
  
  // Estados para crear post
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<string>('');
  const [postContent, setPostContent] = useState({
    text: '',
    imageUrl: '',
    hashtags: [] as string[],
  });
  const [selectedPlatforms, setSelectedPlatforms] = useState<('facebook' | 'instagram')[]>([]);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  // Estados para ads
  const [showAdModal, setShowAdModal] = useState(false);
  const [adCampaigns, setAdCampaigns] = useState<AdCampaign[]>([]);
  const [adForm, setAdForm] = useState({
    name: '',
    objective: 'more_messages' as 'more_messages' | 'more_visits',
    vehicleId: '',
    budget: 0,
    dailyBudget: 0,
    duration: 7,
    platforms: [] as ('facebook' | 'instagram')[],
  });

  // Estados para posts programados
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      await Promise.all([
        fetchIntegrations(),
        fetchVehicles(),
        fetchAdCampaigns(),
        fetchScheduledPosts(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function fetchIntegrations() {
    try {
      const response = await fetch('/api/settings/integrations');
      if (response.ok) {
        const data = await response.json();
        const activeIntegrations = data.integrations
          ?.filter((i: any) => i.status === 'active' && (i.type === 'facebook' || i.type === 'instagram'))
          .map((i: any) => ({ type: i.type, status: i.status }));
        setIntegrations(activeIntegrations || []);
      }
    } catch (error) {
      console.error('Error fetching integrations:', error);
    }
  }

  async function fetchVehicles() {
    try {
      const response = await fetch('/api/vehicles');
      if (response.ok) {
        const data = await response.json();
        setVehicles(data.vehicles || []);
      }
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  }

  async function fetchAdCampaigns() {
    try {
      const response = await fetch('/api/social/ads');
      if (response.ok) {
        const data = await response.json();
        setAdCampaigns(data.campaigns || []);
      }
    } catch (error) {
      console.error('Error fetching ad campaigns:', error);
    }
  }

  async function fetchScheduledPosts() {
    try {
      const response = await fetch('/api/social/schedule');
      if (response.ok) {
        const data = await response.json();
        setScheduledPosts(data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching scheduled posts:', error);
    }
  }

  async function generatePostWithAI() {
    if (!selectedVehicle) {
      alert('Por favor selecciona un vehículo');
      return;
    }

    const vehicle = vehicles.find(v => v.id === selectedVehicle);
    if (!vehicle) {
      alert('Vehículo no encontrado');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('/api/social/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: {
            id: vehicle.id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            price: vehicle.price,
            condition: vehicle.condition,
            mileage: vehicle.mileage,
            location: vehicle.location,
            features: vehicle.features,
            images: vehicle.images,
          },
          objective: adForm.objective,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const post: AIGeneratedPost = data.post;
        
        // Usar contenido optimizado según plataformas seleccionadas
        if (selectedPlatforms.includes('facebook') && selectedPlatforms.includes('instagram')) {
          // Si ambas, usar texto base y agregar hashtags
          setPostContent({
            text: post.text,
            imageUrl: vehicle.images?.[0] || '',
            hashtags: post.hashtags,
          });
        } else if (selectedPlatforms.includes('facebook')) {
          setPostContent({
            text: post.optimizedFor.facebook.text,
            imageUrl: vehicle.images?.[0] || '',
            hashtags: post.optimizedFor.facebook.hashtags,
          });
        } else if (selectedPlatforms.includes('instagram')) {
          setPostContent({
            text: post.optimizedFor.instagram.text,
            imageUrl: vehicle.images?.[0] || '',
            hashtags: post.optimizedFor.instagram.hashtags,
          });
        } else {
          setPostContent({
            text: post.text,
            imageUrl: vehicle.images?.[0] || '',
            hashtags: post.hashtags,
          });
        }
      } else {
        alert('Error al generar contenido con IA');
      }
    } catch (error) {
      console.error('Error generating post:', error);
      alert('Error al generar contenido con IA');
    } finally {
      setAiGenerating(false);
    }
  }

  async function handlePublishPost() {
    if (!postContent.text.trim()) {
      alert('Por favor ingresa el contenido del post');
      return;
    }

    if (selectedPlatforms.length === 0) {
      alert('Por favor selecciona al menos una plataforma');
      return;
    }

    try {
      if (publishMode === 'schedule') {
        if (!scheduleDate || !scheduleTime) {
          alert('Por favor selecciona fecha y hora para programar');
          return;
        }

        const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        const response = await fetch('/api/social/schedule/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: postContent,
            platforms: selectedPlatforms,
            scheduledFor,
            vehicleId: selectedVehicle || undefined,
            aiGenerated: true,
          }),
        });

        if (response.ok) {
          alert('✅ Post programado exitosamente');
          setShowCreateModal(false);
          resetPostForm();
          fetchScheduledPosts();
        } else {
          alert('Error al programar el post');
        }
      } else {
        // Publicar ahora
        const response = await fetch('/api/social/publish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: postContent,
            platforms: selectedPlatforms,
          }),
        });

        if (response.ok) {
          alert('✅ Publicado exitosamente');
          setShowCreateModal(false);
          resetPostForm();
        } else {
          alert('Error al publicar');
        }
      }
    } catch (error) {
      console.error('Error publishing:', error);
      alert('Error al publicar');
    }
  }

  async function handleCreateAdCampaign() {
    if (!adForm.name || !adForm.vehicleId || !adForm.budget || !adForm.duration || adForm.platforms.length === 0) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      const response = await fetch('/api/social/ads/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adForm),
      });

      if (response.ok) {
        const data = await response.json();
        alert('✅ Campaña de ads creada. Puedes iniciarla desde la lista.');
        setShowAdModal(false);
        resetAdForm();
        fetchAdCampaigns();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al crear campaña');
      }
    } catch (error) {
      console.error('Error creating ad campaign:', error);
      alert('Error al crear campaña');
    }
  }

  async function handleStartAdCampaign(campaignId: string) {
    try {
      const response = await fetch('/api/social/ads/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (response.ok) {
        alert('✅ Campaña iniciada exitosamente');
        fetchAdCampaigns();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al iniciar campaña');
      }
    } catch (error) {
      console.error('Error starting campaign:', error);
      alert('Error al iniciar campaña');
    }
  }

  async function handlePauseAdCampaign(campaignId: string) {
    try {
      const response = await fetch('/api/social/ads/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId }),
      });

      if (response.ok) {
        alert('✅ Campaña pausada');
        fetchAdCampaigns();
      } else {
        const error = await response.json();
        alert(error.error || 'Error al pausar campaña');
      }
    } catch (error) {
      console.error('Error pausing campaign:', error);
      alert('Error al pausar campaña');
    }
  }

  async function handlePauseScheduledPost(postId: string) {
    try {
      const response = await fetch('/api/social/schedule/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'pause' }),
      });

      if (response.ok) {
        alert('✅ Post pausado');
        fetchScheduledPosts();
      } else {
        alert('Error al pausar post');
      }
    } catch (error) {
      console.error('Error pausing post:', error);
      alert('Error al pausar post');
    }
  }

  async function handleReactivateScheduledPost(postId: string) {
    try {
      const response = await fetch('/api/social/schedule/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, action: 'reactivate' }),
      });

      if (response.ok) {
        alert('✅ Post reactivado');
        fetchScheduledPosts();
      } else {
        alert('Error al reactivar post');
      }
    } catch (error) {
      console.error('Error reactivating post:', error);
      alert('Error al reactivar post');
    }
  }

  function resetPostForm() {
    setPostContent({ text: '', imageUrl: '', hashtags: [] });
    setSelectedPlatforms([]);
    setSelectedVehicle('');
    setPublishMode('now');
    setScheduleDate('');
    setScheduleTime('');
  }

  function resetAdForm() {
    setAdForm({
      name: '',
      objective: 'more_messages',
      vehicleId: '',
      budget: 0,
      dailyBudget: 0,
      duration: 7,
      platforms: [],
    });
  }

  function handlePlatformToggle(platform: 'facebook' | 'instagram') {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    );
  }

  function handleAdPlatformToggle(platform: 'facebook' | 'instagram') {
    setAdForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const hasActiveIntegrations = integrations.some((i) => i.status === 'active');
  const availableVehicles = vehicles.filter(v => !v.status || v.status === 'available');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">📱 Redes Sociales</h1>
            <p className="text-gray-600">
              Gestiona tus publicaciones, ads pagados y programación automática
            </p>
          </div>
          {hasActiveIntegrations && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium flex items-center gap-2"
              >
                <span>✨</span> Crear Post
              </button>
              <button
                onClick={() => setShowAdModal(true)}
                className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
              >
                <span>💰</span> Crear Ads
              </button>
            </div>
          )}
        </div>
      </div>

      {!hasActiveIntegrations && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-8 mb-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="text-4xl">🔗</div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-yellow-900 mb-3">
                ⚠️ Conexión de Redes Sociales Requerida
              </h3>
              <p className="text-yellow-800 mb-2 text-lg">
                Para usar todas las funcionalidades de redes sociales, necesitas conectar tus cuentas <strong>una sola vez</strong>.
              </p>
              <div className="bg-white rounded-lg p-4 my-4 border border-yellow-200">
                <p className="text-sm text-gray-700 mb-2"><strong>📍 ¿Dónde conectar?</strong></p>
                <p className="text-sm text-gray-600 mb-3">
                  Ve a <strong>Configuración → Integraciones</strong> o haz clic en el botón de abajo.
                </p>
                <p className="text-xs text-gray-500">
                  💡 <strong>Importante:</strong> Una vez conectadas, nunca volverás a ver Meta. 
                  El sistema controla automáticamente qué se publica, límites y formatos.
                </p>
              </div>
              <div className="flex gap-3">
                <Link
                  href="/settings/integrations"
                  className="px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium text-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                >
                  <span>🔗</span>
                  <span>Ir a Conectar Redes Sociales</span>
                  <span>→</span>
                </Link>
                <Link
                  href="/settings/integrations"
                  className="px-6 py-3 bg-white border-2 border-yellow-600 text-yellow-700 rounded-lg hover:bg-yellow-50 font-medium text-lg transition-all"
                >
                  Ver Guía de Conexión
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {hasActiveIntegrations && (
        <>
          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b">
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'posts'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📝 Posts Generados
            </button>
            <button
              onClick={() => setActiveTab('ads')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'ads'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Ads Pagados
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-4 py-2 font-medium ${
                activeTab === 'scheduled'
                  ? 'border-b-2 border-primary-600 text-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📅 Programados
            </button>
          </div>

          {/* Redes Conectadas */}
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Redes Conectadas:</span>
              {integrations.map((integration) => (
                <div
                  key={integration.type}
                  className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-lg"
                >
                  <span className="text-xl">
                    {integration.type === 'facebook' ? '📘' : '📷'}
                  </span>
                  <span className="font-medium capitalize text-sm">{integration.type}</span>
                  <span className="text-green-600 text-xs">✓</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          {activeTab === 'posts' && (
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
              <h2 className="text-xl font-bold mb-4">Posts Generados Automáticamente</h2>
              <p className="text-gray-600 mb-4">
                Los posts se generan automáticamente con IA. Solo selecciona el vehículo y el sistema hace el resto.
              </p>
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg mb-2">🤖 Post generado automáticamente</p>
                <p className="text-sm">Usa el botón "Crear Post" para generar contenido con IA</p>
              </div>
            </div>
          )}

          {activeTab === 'ads' && (
            <div className="space-y-4">
              {adCampaigns.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
                  <p className="text-gray-600 mb-4">No hay campañas de ads creadas</p>
                  <button
                    onClick={() => setShowAdModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Crear Primera Campaña
                  </button>
                </div>
              ) : (
                adCampaigns.map((campaign) => {
                  const vehicle = vehicles.find(v => v.id === campaign.vehicleId);
                  return (
                    <div key={campaign.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{campaign.name}</h3>
                          {vehicle && (
                            <p className="text-sm text-gray-600">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                          )}
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          campaign.status === 'active' ? 'bg-green-100 text-green-700' :
                          campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {campaign.status === 'active' ? 'Activa' :
                           campaign.status === 'paused' ? 'Pausada' :
                           campaign.status === 'completed' ? 'Completada' : 'Borrador'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-gray-500">Objetivo</p>
                          <p className="font-medium">
                            {campaign.objective === 'more_messages' ? 'Más Mensajes' : 'Más Visitas'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Presupuesto</p>
                          <p className="font-medium">${campaign.budget.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Gastado</p>
                          <p className="font-medium">${campaign.spent.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Clics</p>
                          <p className="font-medium">{campaign.clicks}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {campaign.status === 'draft' && (
                          <button
                            onClick={() => handleStartAdCampaign(campaign.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            ▶ Iniciar
                          </button>
                        )}
                        {campaign.status === 'active' && (
                          <button
                            onClick={() => handlePauseAdCampaign(campaign.id)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                          >
                            ⏸ Pausar
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <button
                            onClick={() => handleStartAdCampaign(campaign.id)}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                          >
                            ▶ Reactivar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'scheduled' && (
            <div className="space-y-4">
              {scheduledPosts.length === 0 ? (
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6 text-center">
                  <p className="text-gray-600">No hay posts programados</p>
                </div>
              ) : (
                scheduledPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <p className="text-sm text-gray-500 mb-2">
                          Programado para: {new Date(post.scheduledFor).toLocaleString('es-MX')}
                        </p>
                        <p className="text-gray-900 mb-2">{post.content.text.substring(0, 150)}...</p>
                        <div className="flex gap-2 flex-wrap">
                          {post.platforms.map((platform) => (
                            <span key={platform} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                              {platform === 'facebook' ? '📘' : '📷'} {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                        post.status === 'published' ? 'bg-green-100 text-green-700' :
                        post.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {post.status === 'scheduled' ? 'Programado' :
                         post.status === 'published' ? 'Publicado' :
                         post.status === 'cancelled' ? 'Cancelado' : 'Fallido'}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {post.status === 'scheduled' && (
                        <>
                          <button
                            onClick={() => handlePauseScheduledPost(post.id)}
                            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                          >
                            ⏸ Pausar
                          </button>
                        </>
                      )}
                      {post.status === 'cancelled' && (
                        <button
                          onClick={() => handleReactivateScheduledPost(post.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                        >
                          ▶ Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Modal Crear Post */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-3xl w-full my-8">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">🤖 Crear Post con IA</h2>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona un vehículo y la IA generará el contenido automáticamente
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Selección de Vehículo */}
              <div>
                <label className="block text-sm font-medium mb-2">Seleccionar Vehículo</label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => {
                    setSelectedVehicle(e.target.value);
                    const vehicle = vehicles.find(v => v.id === e.target.value);
                    if (vehicle && vehicle.images?.[0]) {
                      setPostContent(prev => ({ ...prev, imageUrl: vehicle.images?.[0] || '' }));
                    }
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Selecciona un vehículo</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} - ${vehicle.price.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selección de Plataformas */}
              <div>
                <label className="block text-sm font-medium mb-3">Plataformas</label>
                <div className="flex gap-4">
                  {integrations.map((integration) => (
                    <label key={integration.type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(integration.type)}
                        onChange={() => handlePlatformToggle(integration.type)}
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                      <span className="text-xl">
                        {integration.type === 'facebook' ? '📘' : '📷'}
                      </span>
                      <span className="font-medium capitalize">{integration.type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Generar con IA */}
              {selectedVehicle && selectedPlatforms.length > 0 && (
                <div>
                  <button
                    onClick={generatePostWithAI}
                    disabled={aiGenerating}
                    className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {aiGenerating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        <span>Generando con IA...</span>
                      </>
                    ) : (
                      <>
                        <span>✨</span>
                        <span>Generar Post Automáticamente</span>
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    La IA analizará el vehículo y generará texto, hashtags y CTA optimizados
                  </p>
                </div>
              )}

              {/* Contenido Generado */}
              {postContent.text && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Contenido Generado</label>
                    <textarea
                      value={postContent.text}
                      onChange={(e) => setPostContent(prev => ({ ...prev, text: e.target.value }))}
                      className="w-full border rounded px-3 py-2 min-h-[120px]"
                      placeholder="El contenido se generará automáticamente..."
                    />
                  </div>

                  {postContent.imageUrl && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Imagen</label>
                      <img
                        src={postContent.imageUrl}
                        alt="Vehículo"
                        className="w-full max-h-64 object-cover rounded border"
                      />
                    </div>
                  )}

                  {postContent.hashtags.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Hashtags</label>
                      <div className="flex flex-wrap gap-2">
                        {postContent.hashtags.map((hashtag) => (
                          <span key={hashtag} className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                            #{hashtag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Modo de Publicación */}
                  <div>
                    <label className="block text-sm font-medium mb-2">¿Cuándo publicar?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={publishMode === 'now'}
                          onChange={() => setPublishMode('now')}
                          className="w-5 h-5 text-primary-600"
                        />
                        <span>Publicar Ahora</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={publishMode === 'schedule'}
                          onChange={() => setPublishMode('schedule')}
                          className="w-5 h-5 text-primary-600"
                        />
                        <span>Programar</span>
                      </label>
                    </div>
                  </div>

                  {publishMode === 'schedule' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Fecha</label>
                        <input
                          type="date"
                          value={scheduleDate}
                          onChange={(e) => setScheduleDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">Hora</label>
                        <input
                          type="time"
                          value={scheduleTime}
                          onChange={(e) => setScheduleTime(e.target.value)}
                          className="w-full border rounded px-3 py-2"
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Botones */}
              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    resetPostForm();
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                {postContent.text && (
                  <button
                    onClick={handlePublishPost}
                    className="px-6 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 font-medium"
                  >
                    {publishMode === 'now' ? '📤 Publicar Ahora' : '📅 Programar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear Ads */}
      {showAdModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full my-8">
            <div className="p-6 border-b">
              <h2 className="text-2xl font-bold">💰 Crear Ads Pagados</h2>
              <p className="text-sm text-gray-600 mt-1">
                Crea campañas de ads pagados 100% desde la plataforma
              </p>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nombre de la Campaña</label>
                <input
                  type="text"
                  value={adForm.name}
                  onChange={(e) => setAdForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Ej: Promoción Toyota Corolla 2024"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Objetivo</label>
                <select
                  value={adForm.objective}
                  onChange={(e) => setAdForm(prev => ({ ...prev, objective: e.target.value as any }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="more_messages">Más Mensajes</option>
                  <option value="more_visits">Más Visitas</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Vehículo</label>
                <select
                  value={adForm.vehicleId}
                  onChange={(e) => setAdForm(prev => ({ ...prev, vehicleId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Selecciona un vehículo</option>
                  {availableVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Plataformas</label>
                <div className="flex gap-4">
                  {integrations.map((integration) => (
                    <label key={integration.type} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={adForm.platforms.includes(integration.type)}
                        onChange={() => handleAdPlatformToggle(integration.type)}
                        className="w-5 h-5 text-primary-600 rounded"
                      />
                      <span className="text-xl">
                        {integration.type === 'facebook' ? '📘' : '📷'}
                      </span>
                      <span className="font-medium capitalize">{integration.type}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Presupuesto Total ($)</label>
                  <input
                    type="number"
                    value={adForm.budget || ''}
                    onChange={(e) => setAdForm(prev => ({ ...prev, budget: parseFloat(e.target.value) || 0 }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="1000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Duración (días)</label>
                  <input
                    type="number"
                    value={adForm.duration}
                    onChange={(e) => setAdForm(prev => ({ ...prev, duration: parseInt(e.target.value) || 7 }))}
                    className="w-full border rounded px-3 py-2"
                    placeholder="7"
                  />
                </div>
              </div>

              {adForm.budget > 0 && adForm.duration > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Presupuesto diario estimado:</strong> ${(adForm.budget / adForm.duration).toFixed(2)}
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-4 border-t">
                <button
                  onClick={() => {
                    setShowAdModal(false);
                    resetAdForm();
                  }}
                  className="px-4 py-2 border rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateAdCampaign}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-medium"
                >
                  Crear Campaña
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
