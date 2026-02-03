'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import { CollaborationIndicator } from '@/components/CollaborationIndicator';
import { RealtimeIndicator } from '@/components/RealtimeIndicator';

interface Lead {
  id: string;
  contact: {
    name: string;
    phone: string;
    email?: string;
  };
  source: string;
  status: string;
  notes: string;
  interactions: any[];
  aiClassification?: {
    priority: string;
    sentiment: string;
    intent: string;
  };
  createdAt: string;
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { auth } = useAuth();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [suggestedVehicles, setSuggestedVehicles] = useState<string[]>([]);
  const [loadingAI, setLoadingAI] = useState(false);

  // Sincronización en tiempo real del lead
  useEffect(() => {
    if (!auth?.tenantId || !params.id) return;

    setLoading(true);

    const leadRef = doc(db, 'tenants', auth.tenantId, 'leads', params.id as string);
    
    const unsubscribe = onSnapshot(leadRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setLead({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        } as Lead);
      } else {
        setLead(null);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error en listener de lead:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth?.tenantId, params.id]);

  async function analyzeConversationWithAI() {
    if (!lead || !auth?.tenantId) return;
    
    setLoadingAI(true);
    try {
      const response = await fetch('/api/ai/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      
      const data = await response.json();
      if (data.analysis) {
        setAiAnalysis(data.analysis);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al analizar conversación');
    } finally {
      setLoadingAI(false);
    }
  }

  async function suggestVehicles() {
    if (!lead || !auth?.tenantId) return;
    
    setLoadingAI(true);
    try {
      const response = await fetch('/api/ai/suggest-vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      
      const data = await response.json();
      if (data.suggestions) {
        setSuggestedVehicles(data.suggestions);
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al sugerir vehículos');
    } finally {
      setLoadingAI(false);
    }
  }

  async function updateStatus(newStatus: string) {
    try {
      const response = await fetch(`/api/leads/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // El listener en tiempo real actualizará automáticamente
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }

  async function addNote() {
    if (!newNote.trim()) return;

    try {
      const response = await fetch(`/api/leads/${params.id}/interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'note',
          content: newNote,
        }),
      });

      if (response.ok) {
        setNewNote('');
        // El listener en tiempo real actualizará automáticamente
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

  if (!lead) {
    return <div>Lead no encontrado</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Link href="/leads" className="text-primary-600 hover:underline mb-4">
        ← Volver a Leads
      </Link>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-l-4 border-blue-500">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold">{lead.contact.name}</h1>
              <RealtimeIndicator isActive={!loading} />
            </div>
            <p className="text-gray-600">{lead.contact.phone}</p>
            {lead.contact.email && (
              <p className="text-gray-600">{lead.contact.email}</p>
            )}
            {auth?.tenantId && (
              <div className="mt-3">
                <CollaborationIndicator 
                  tenantId={auth.tenantId} 
                  leadId={lead.id}
                  resourceType="lead"
                  resourceId={lead.id}
                />
              </div>
            )}
          </div>
          <div>
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              className="border rounded px-3 py-2 bg-white shadow-sm hover:shadow-md transition-shadow"
            >
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="appointment">Cita</option>
              <option value="test_drive">Prueba de Manejo</option>
              <option value="negotiation">Negociación</option>
              <option value="closed">Cerrado</option>
              <option value="lost">Perdido</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <span className="text-sm text-gray-500">Fuente:</span>
            <p className="font-medium">{lead.source}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Fecha:</span>
            <p className="font-medium">
              {new Date(lead.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {lead.aiClassification && (
          <div className="bg-blue-50 p-4 rounded mb-4">
            <h3 className="font-bold mb-2">🤖 Clasificación IA</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-gray-500">Prioridad:</span>
                <p className="font-medium capitalize">{lead.aiClassification.priority}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Sentimiento:</span>
                <p className="font-medium capitalize">{lead.aiClassification.sentiment}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Intención:</span>
                <p className="font-medium">{lead.aiClassification.intent}</p>
              </div>
            </div>
          </div>
        )}

        {/* Análisis de IA */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={analyzeConversationWithAI}
            disabled={loadingAI}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingAI ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Analizando...
              </>
            ) : (
              <>
                🤖 Analizar Conversación con IA
              </>
            )}
          </button>
          <button
            onClick={suggestVehicles}
            disabled={loadingAI}
            className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loadingAI ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Buscando...
              </>
            ) : (
              <>
                🚗 Sugerir Vehículos
              </>
            )}
          </button>
        </div>

        {aiAnalysis && (
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3 text-purple-900">📊 Análisis de Conversación (IA)</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-purple-800 mb-1">Resumen:</p>
                <p className="text-sm text-gray-700">{aiAnalysis.summary}</p>
              </div>
              {aiAnalysis.keyPoints && aiAnalysis.keyPoints.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-purple-800 mb-1">Puntos Clave:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {aiAnalysis.keyPoints.map((point: string, idx: number) => (
                      <li key={idx}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiAnalysis.nextSteps && aiAnalysis.nextSteps.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-purple-800 mb-1">Próximos Pasos:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {aiAnalysis.nextSteps.map((step: string, idx: number) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <span className="text-sm font-medium text-purple-800">Sentimiento: </span>
                <span className={`text-sm font-medium capitalize ${
                  aiAnalysis.sentiment === 'positive' ? 'text-green-600' :
                  aiAnalysis.sentiment === 'negative' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {aiAnalysis.sentiment}
                </span>
              </div>
            </div>
          </div>
        )}

        {suggestedVehicles.length > 0 && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg mb-4">
            <h3 className="font-bold mb-3 text-green-900">🚗 Vehículos Sugeridos por IA</h3>
            <div className="space-y-2">
              {suggestedVehicles.map((vehicleId) => (
                <div key={vehicleId} className="bg-white p-3 rounded border border-green-200">
                  <Link 
                    href={`/inventory/${vehicleId}`}
                    className="text-primary-600 hover:underline font-medium"
                  >
                    Ver vehículo {vehicleId}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h3 className="font-bold mb-2">Notas</h3>
          <p className="text-gray-700">{lead.notes || 'Sin notas'}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-bold mb-4">Interacciones</h2>
        <div className="space-y-4 mb-4">
          {lead.interactions.map((interaction, index) => (
            <div key={index} className="border-l-4 border-primary-500 pl-4">
              <div className="flex justify-between">
                <span className="font-medium">{interaction.type}</span>
                <span className="text-sm text-gray-500">
                  {new Date(interaction.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="text-gray-700 mt-1">{interaction.content}</p>
            </div>
          ))}
        </div>

        <div className="border-t pt-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Agregar nota..."
            className="w-full border rounded px-3 py-2 mb-2"
            rows={3}
          />
          <button
            onClick={addNote}
            className="bg-primary-600 text-white px-4 py-2 rounded hover:bg-primary-700"
          >
            Agregar Nota
          </button>
        </div>
      </div>
    </div>
  );
}




