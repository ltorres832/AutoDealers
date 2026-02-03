'use client';

import { useState, useEffect } from 'react';

interface Review {
  photos?: string[];
  videos?: string[];
  id: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  rating: number;
  title?: string;
  comment: string;
  vehicleId?: string;
  saleId?: string;
  status: 'pending' | 'approved' | 'rejected';
  featured: boolean;
  response?: {
    text: string;
    respondedBy: string;
    respondedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ReviewStats {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  averageRating: number;
  ratingDistribution: { [key: number]: number };
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [filter]);

  async function fetchReviews() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const response = await fetch('/api/reviews?stats=true');
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  }

  async function handleStatusChange(reviewId: string, newStatus: 'pending' | 'approved' | 'rejected') {
    try {
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, status: newStatus }),
      });

      if (response.ok) {
        fetchReviews();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  }

  async function handleToggleFeatured(reviewId: string, featured: boolean) {
    try {
      const response = await fetch('/api/reviews', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reviewId, featured: !featured }),
      });

      if (response.ok) {
        fetchReviews();
      }
    } catch (error) {
      console.error('Error toggling featured:', error);
      alert('Error al actualizar');
    }
  }

  async function handleDelete(reviewId: string) {
    if (!confirm('¿Estás seguro de eliminar esta reseña?')) return;

    try {
      const response = await fetch(`/api/reviews?id=${reviewId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchReviews();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting review:', error);
      alert('Error al eliminar');
    }
  }

  async function handleAddResponse() {
    if (!selectedReview || !responseText.trim()) {
      alert('Por favor ingresa una respuesta');
      return;
    }

    try {
      const response = await fetch('/api/reviews/response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          responseText: responseText.trim(),
        }),
      });

      if (response.ok) {
        setShowResponseModal(false);
        setResponseText('');
        setSelectedReview(null);
        fetchReviews();
      } else {
        alert('Error al agregar respuesta');
      }
    } catch (error) {
      console.error('Error adding response:', error);
      alert('Error al agregar respuesta');
    }
  }

  function renderStars(rating: number) {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'text-yellow-400' : 'text-gray-300'}>
            ★
          </span>
        ))}
      </div>
    );
  }

  function getStatusBadge(status: string) {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    const labels = {
      pending: 'Pendiente',
      approved: 'Aprobada',
      rejected: 'Rechazada',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reseñas</h1>
          <p className="text-gray-600">Gestiona las reseñas de tus clientes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          ➕ Crear Reseña
        </button>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Total</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Aprobadas</div>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Pendientes</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Rechazadas</div>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-sm text-gray-600 mb-1">Rating Promedio</div>
            <div className="text-2xl font-bold text-primary-600">
              {stats.averageRating.toFixed(1)} ⭐
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="mb-6 flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : f === 'approved' ? 'Aprobadas' : 'Rechazadas'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Cargando reseñas...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">⭐</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No hay reseñas</h3>
          <p className="text-gray-600">
            {filter === 'all'
              ? 'Aún no hay reseñas. Las reseñas aparecerán aquí cuando los clientes las envíen.'
              : `No hay reseñas ${filter === 'pending' ? 'pendientes' : filter === 'approved' ? 'aprobadas' : 'rechazadas'}.`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{review.customerName}</h3>
                    {review.featured && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                        ⭐ Destacada
                      </span>
                    )}
                    {getStatusBadge(review.status)}
                  </div>
                  {review.title && (
                    <h4 className="text-md font-medium text-gray-700 mb-2">{review.title}</h4>
                  )}
                  <div className="mb-2">{renderStars(review.rating)}</div>
                  <p className="text-gray-700 mb-2">{review.comment}</p>
                  
                  {/* Fotos */}
                  {review.photos && review.photos.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {review.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Foto ${index + 1}`}
                            className="w-24 h-24 object-cover rounded cursor-pointer hover:opacity-80"
                            onClick={() => window.open(photo, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Videos */}
                  {review.videos && review.videos.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {review.videos.map((video, index) => (
                          <video
                            key={index}
                            src={video}
                            className="w-24 h-24 object-cover rounded cursor-pointer"
                            controls
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {review.customerEmail && (
                    <p className="text-sm text-gray-500">Email: {review.customerEmail}</p>
                  )}
                  {review.customerPhone && (
                    <p className="text-sm text-gray-500">Teléfono: {review.customerPhone}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(review.createdAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  {review.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleStatusChange(review.id, 'approved')}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        Aprobar
                      </button>
                      <button
                        onClick={() => handleStatusChange(review.id, 'rejected')}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Rechazar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleToggleFeatured(review.id, review.featured)}
                    className={`px-3 py-1 rounded text-sm ${
                      review.featured
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                    }`}
                  >
                    {review.featured ? 'Quitar Destacado' : 'Destacar'}
                  </button>
                  {!review.response && review.status === 'approved' && (
                    <button
                      onClick={() => {
                        setSelectedReview(review);
                        setShowResponseModal(true);
                      }}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      Responder
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {review.response && (
                <div className="mt-4 pt-4 border-t border-gray-200 bg-blue-50 rounded p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-medium text-blue-900">Respuesta del concesionario:</div>
                    <div className="text-xs text-blue-600">
                      {new Date(review.response.respondedAt).toLocaleDateString('es-ES')}
                    </div>
                  </div>
                  <p className="text-blue-800">{review.response.text}</p>
                  <p className="text-xs text-blue-600 mt-2">Por: {review.response.respondedBy}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Respuesta */}
      {showResponseModal && selectedReview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4 p-6">
            <h2 className="text-2xl font-bold mb-4">Responder Reseña</h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">Reseña de: {selectedReview.customerName}</p>
              <p className="text-gray-700 italic">"{selectedReview.comment}"</p>
            </div>
            <textarea
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder="Escribe tu respuesta..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 h-32"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResponseModal(false);
                  setResponseText('');
                  setSelectedReview(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddResponse}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Enviar Respuesta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Crear Reseña */}
      {showCreateModal && (
        <CreateReviewModal
          onClose={() => {
            setShowCreateModal(false);
            fetchReviews();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}

function CreateReviewModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    rating: 5,
    title: '',
    comment: '',
    status: 'approved' as 'pending' | 'approved' | 'rejected',
    featured: false,
  });
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.customerName || !formData.comment) {
      alert('Por favor completa todos los campos requeridos');
      return;
    }

    setLoading(true);
    try {
      // Subir fotos
      const uploadedPhotos: string[] = [];
      for (const photo of photos) {
        const formDataPhoto = new FormData();
        formDataPhoto.append('file', photo);
        formDataPhoto.append('type', 'review');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataPhoto,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedPhotos.push(uploadData.url);
        }
      }

      // Subir videos
      const uploadedVideos: string[] = [];
      for (const video of videos) {
        const formDataVideo = new FormData();
        formDataVideo.append('file', video);
        formDataVideo.append('type', 'review');

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataVideo,
        });

        if (uploadResponse.ok) {
          const uploadData = await uploadResponse.json();
          uploadedVideos.push(uploadData.url);
        }
      }

      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          photos: uploadedPhotos,
          videos: uploadedVideos,
        }),
      });

      if (response.ok) {
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al crear la reseña');
      }
    } catch (error) {
      console.error('Error creating review:', error);
      alert('Error al crear la reseña');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Crear Reseña</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">
              ×
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Cliente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={formData.customerEmail}
                onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rating <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: parseInt(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              required
            >
              <option value={5}>5 ⭐⭐⭐⭐⭐</option>
              <option value={4}>4 ⭐⭐⭐⭐</option>
              <option value={3}>3 ⭐⭐⭐</option>
              <option value={2}>2 ⭐⭐</option>
              <option value={1}>1 ⭐</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
              placeholder="Ej: Excelente servicio"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Comentario <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 h-32"
              required
              placeholder="Escribe el comentario de la reseña..."
            />
          </div>

          {/* Fotos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fotos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setPhotos([...photos, ...files]);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
            {photos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Preview ${index + 1}`}
                      className="w-20 h-20 object-cover rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setPhotos(photos.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Videos */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Videos</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setVideos([...videos, ...files]);
              }}
              className="w-full border border-gray-300 rounded-lg px-4 py-2"
            />
            {videos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {videos.map((video, index) => (
                  <div key={index} className="relative">
                    <video
                      src={URL.createObjectURL(video)}
                      className="w-20 h-20 object-cover rounded"
                      controls={false}
                    />
                    <button
                      type="button"
                      onClick={() => setVideos(videos.filter((_, i) => i !== index))}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as any })
                }
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>
            <div className="flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="w-4 h-4 text-primary-600"
                />
                <span className="text-sm text-gray-700">Reseña destacada</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Reseña'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

