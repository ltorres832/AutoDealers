'use client';

import { useState, useEffect } from 'react';

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords: string[];
  isActive: boolean;
  order: number;
}

export default function FAQsPage() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchFAQs();
  }, []);

  async function fetchFAQs() {
    try {
      const response = await fetch('/api/faqs');
      const data = await response.json();
      setFaqs(data.faqs || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/faqs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        fetchFAQs();
      }
    } catch (error) {
      console.error('Error:', error);
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
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Preguntas Frecuentes</h1>
          <p className="text-gray-600 mt-2">
            Crea preguntas frecuentes que se mostrarán automáticamente cuando los clientes
            escriban palabras clave relacionadas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nueva FAQ
        </button>
      </div>

      {faqs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">❓</div>
          <h2 className="text-xl font-bold mb-2">No hay FAQs creadas</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera pregunta frecuente para ayudar a tus clientes
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primera FAQ
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {faqs.map((faq) => (
            <div
              key={faq.id}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{faq.question}</h3>
                    {faq.category && (
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                        {faq.category}
                      </span>
                    )}
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      Orden: {faq.order}
                    </span>
                  </div>

                  <p className="text-gray-700 mb-3">{faq.answer}</p>

                  {faq.keywords.length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {faq.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={faq.isActive}
                      onChange={(e) => toggleActive(faq.id, e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm">
                      {faq.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateFAQModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchFAQs}
        />
      )}
    </div>
  );
}

function CreateFAQModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    question: '',
    answer: '',
    category: '',
    keywords: [] as string[],
    order: 1,
  });
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(false);

  function addKeyword() {
    if (newKeyword.trim()) {
      setFormData({
        ...formData,
        keywords: [...formData.keywords, newKeyword.trim()],
      });
      setNewKeyword('');
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/faqs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: formData.question,
          answer: formData.answer,
          category: formData.category || undefined,
          keywords: formData.keywords,
          isActive: true,
          order: formData.order,
        }),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear FAQ');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear FAQ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Nueva Pregunta Frecuente</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Pregunta</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData({ ...formData, question: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Respuesta</label>
            <textarea
              value={formData.answer}
              onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Categoría (Opcional)</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Precios, Horarios, Servicios"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Palabras Clave</label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                className="flex-1 border rounded px-3 py-2"
                placeholder="Escribe una palabra clave y presiona Enter"
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Agregar
              </button>
            </div>
            {formData.keywords.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {formData.keywords.map((keyword, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-2"
                  >
                    {keyword}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          keywords: formData.keywords.filter((_, idx) => idx !== i),
                        });
                      }}
                      className="text-blue-700 hover:text-blue-900"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Orden</label>
            <input
              type="number"
              value={formData.order}
              onChange={(e) =>
                setFormData({ ...formData, order: parseInt(e.target.value) })
              }
              className="w-full border rounded px-3 py-2"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Define el orden en que se mostrarán las FAQs
            </p>
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
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700"
            >
              {loading ? 'Creando...' : 'Crear FAQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





