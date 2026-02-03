'use client';

import { useState, useEffect } from 'react';

interface AutoResponse {
  id: string;
  name: string;
  trigger: {
    type: 'keyword' | 'question' | 'always';
    keywords?: string[];
    question?: string;
  };
  response: string;
  channels: string[];
  isActive: boolean;
  priority: number;
}

export default function AutoResponsesPage() {
  const [responses, setResponses] = useState<AutoResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchResponses();
  }, []);

  async function fetchResponses() {
    try {
      const response = await fetch('/api/auto-responses');
      const data = await response.json();
      setResponses(data.responses || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(id: string, isActive: boolean) {
    try {
      const response = await fetch(`/api/auto-responses/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive }),
      });

      if (response.ok) {
        fetchResponses();
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
          <h1 className="text-3xl font-bold">Respuestas Automáticas</h1>
          <p className="text-gray-600 mt-2">
            Crea respuestas automáticas que se enviarán cuando los clientes escriban
            palabras clave o hagan preguntas específicas.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 font-medium"
        >
          + Nueva Respuesta
        </button>
      </div>

      {responses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h2 className="text-xl font-bold mb-2">No hay respuestas automáticas</h2>
          <p className="text-gray-600 mb-6">
            Crea tu primera respuesta automática para mejorar la atención al cliente
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
          >
            Crear Primera Respuesta
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {responses.map((response) => (
            <div
              key={response.id}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold">{response.name}</h3>
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">
                      Prioridad: {response.priority}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Trigger:</p>
                    {response.trigger.type === 'keyword' && (
                      <div className="flex gap-2 flex-wrap">
                        {response.trigger.keywords?.map((keyword, i) => (
                          <span
                            key={i}
                            className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    {response.trigger.type === 'question' && (
                      <p className="text-sm font-medium">{response.trigger.question}</p>
                    )}
                    {response.trigger.type === 'always' && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        Siempre activa
                      </span>
                    )}
                  </div>

                  <div className="mb-3">
                    <p className="text-sm text-gray-600 mb-1">Respuesta:</p>
                    <p className="text-sm">{response.response}</p>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {response.channels.map((channel) => (
                      <span
                        key={channel}
                        className="px-2 py-1 bg-gray-100 rounded text-xs capitalize"
                      >
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="ml-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={response.isActive}
                      onChange={(e) => toggleActive(response.id, e.target.checked)}
                      className="w-5 h-5"
                    />
                    <span className="text-sm">
                      {response.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateAutoResponseModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={fetchResponses}
        />
      )}
    </div>
  );
}

function CreateAutoResponseModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    triggerType: 'keyword' as 'keyword' | 'question' | 'always',
    keywords: [] as string[],
    question: '',
    response: '',
    channels: ['whatsapp'] as string[],
    priority: 1,
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
      const trigger: any = { type: formData.triggerType };
      if (formData.triggerType === 'keyword') {
        trigger.keywords = formData.keywords;
      } else if (formData.triggerType === 'question') {
        trigger.question = formData.question;
      }

      const response = await fetch('/api/auto-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          trigger,
          response: formData.response,
          channels: formData.channels,
          isActive: true,
          priority: formData.priority,
        }),
      });

      if (response.ok) {
        onClose();
        onSuccess();
      } else {
        alert('Error al crear respuesta automática');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al crear respuesta automática');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Nueva Respuesta Automática</h2>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de Trigger</label>
            <select
              value={formData.triggerType}
              onChange={(e) =>
                setFormData({ ...formData, triggerType: e.target.value as any })
              }
              className="w-full border rounded px-3 py-2"
            >
              <option value="keyword">Palabras Clave</option>
              <option value="question">Pregunta Específica</option>
              <option value="always">Siempre Activa</option>
            </select>
          </div>

          {formData.triggerType === 'keyword' && (
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
          )}

          {formData.triggerType === 'question' && (
            <div>
              <label className="block text-sm font-medium mb-2">Pregunta</label>
              <input
                type="text"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: ¿Cuáles son sus horarios?"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Respuesta</label>
            <textarea
              value={formData.response}
              onChange={(e) => setFormData({ ...formData, response: e.target.value })}
              className="w-full border rounded px-3 py-2"
              rows={4}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Canales</label>
            <div className="space-y-2">
              {['whatsapp', 'facebook', 'instagram', 'email', 'sms'].map((channel) => (
                <label key={channel} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.channels.includes(channel)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          channels: [...formData.channels, channel],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          channels: formData.channels.filter((c) => c !== channel),
                        });
                      }
                    }}
                  />
                  <span className="capitalize">{channel}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Prioridad</label>
            <input
              type="number"
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: parseInt(e.target.value) })
              }
              className="w-full border rounded px-3 py-2"
              min="1"
              max="10"
            />
            <p className="text-xs text-gray-500 mt-1">
              Mayor prioridad = se evalúa primero (1-10)
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
              {loading ? 'Creando...' : 'Crear Respuesta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}





