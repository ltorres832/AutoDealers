'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';

type Template = {
  id: string;
  name: string;
  type: string;
  engine: string;
  description?: string;
  requiresSignature?: boolean;
  aiDraft?: boolean;
  isActive?: boolean;
};

type Generated = {
  id: string;
  name: string;
  documentNumber: string;
  status: string;
  pdfUrl?: string;
  type: string;
  createdAt: string;
};

const TYPE_LABELS: Record<string, string> = {
  bill_of_sale: 'Bill of Sale',
  invoice: 'Factura',
  receipt: 'Recibo',
  delivery_receipt: 'Entrega',
  authorization: 'Autorización',
  disclosure: 'Disclosure',
  warranty: 'Garantía',
  custom: 'Personalizado',
};

const AI_DISCLAIMER_KEY = 'docs_ai_disclaimer_accepted_session';

export default function DocumentsPage() {
  const [tab, setTab] = useState<'library' | 'create' | 'generate' | 'generated'>('library');
  const [createMode, setCreateMode] = useState<'blocks' | 'photo' | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [generated, setGenerated] = useState<Generated[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Generate form
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [vehicleMake, setVehicleMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleVin, setVehicleVin] = useState('');
  const [price, setPrice] = useState('');

  // Blocks create
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('custom');
  const [legalText, setLegalText] = useState('');

  // AI disclaimer
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [disclaimerChecked, setDisclaimerChecked] = useState(false);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      await fetchWithAuth('/api/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });
      const [tRes, gRes] = await Promise.all([
        fetchWithAuth('/api/documents/templates', {}),
        fetchWithAuth('/api/documents/generated', {}),
      ]);
      const tData = await tRes.json();
      const gData = await gRes.json();
      if (!tRes.ok) throw new Error(tData.error || 'Error cargando plantillas');
      setTemplates(tData.templates || []);
      setGenerated(gData.documents || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runGenerate = async () => {
    if (!selectedTemplateId) return;
    setBusy(true);
    setMessage('');
    try {
      const res = await fetchWithAuth('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          payload: {
            parties: { buyerName, buyerEmail, buyerPhone },
            buyer: { name: buyerName, email: buyerEmail, phone: buyerPhone },
            vehicle: {
              year: vehicleYear,
              make: vehicleMake,
              model: vehicleModel,
              vin: vehicleVin,
              price: price ? Number(price) : undefined,
            },
            sale: { price: price ? Number(price) : undefined },
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error generando');
      setMessage(`Documento ${data.document.documentNumber} generado`);
      setTab('generated');
      await load();
      if (data.document.pdfUrl) window.open(data.document.pdfUrl, '_blank');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const createBlocksTemplate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const res = await fetchWithAuth('/api/documents/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          engine: 'blocks',
          type: newType,
          name: newName.trim(),
          requiresSignature: true,
          layout: {
            sections: [
              { id: 't1', type: 'title', title: newName.trim(), enabled: true },
              { id: 'p1', type: 'party_info', title: 'Partes', enabled: true },
              { id: 'v1', type: 'vehicle_info', title: 'Vehículo', enabled: true },
              { id: 's1', type: 'sale_terms', title: 'Términos', enabled: true },
              {
                id: 'l1',
                type: 'legal_text',
                title: 'Cláusulas',
                content: legalText || 'Personaliza este texto legal según tu operación.',
                enabled: true,
              },
              {
                id: 'sig1',
                type: 'signature_block',
                signatureLabels: ['Firma del comprador', 'Firma del vendedor'],
                enabled: true,
              },
            ],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando plantilla');
      setMessage('Plantilla creada');
      setCreateMode(null);
      setTab('library');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const startPhotoFlow = (file: File) => {
    const accepted =
      typeof sessionStorage !== 'undefined' &&
      sessionStorage.getItem(AI_DISCLAIMER_KEY) === '1';
    if (accepted) {
      void uploadPhoto(file);
      return;
    }
    setPendingPhotoFile(file);
    setShowDisclaimer(true);
    setDisclaimerChecked(false);
  };

  const confirmDisclaimerAndUpload = () => {
    if (!disclaimerChecked || !pendingPhotoFile) return;
    try {
      sessionStorage.setItem(AI_DISCLAIMER_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowDisclaimer(false);
    void uploadPhoto(pendingPhotoFile);
    setPendingPhotoFile(null);
  };

  const uploadPhoto = async (file: File) => {
    setBusy(true);
    setError('');
    setMessage('La IA está analizando el documento…');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('disclaimerAccepted', 'true');
      const res = await fetchWithAuth('/api/documents/templates/recreate-from-image', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error en recreación IA');
      setMessage(
        `Borrador IA creado (${Math.round((data.result?.confidence || 0) * 100)}% confianza). Revísalo y confírmalo antes de usarlo.`
      );
      setCreateMode(null);
      setTab('library');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
      setMessage('');
    } finally {
      setBusy(false);
    }
  };

  const confirmAiDraft = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetchWithAuth(`/api/documents/templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_ai' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setMessage('Plantilla IA confirmada y lista para usar');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  const docAction = async (documentId: string, action: string, extra: Record<string, unknown> = {}) => {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithAuth('/api/documents/generated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId, action, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      if (action === 'share' && data.url) {
        await navigator.clipboard?.writeText(data.url);
        setMessage(`Enlace copiado: ${data.url}`);
      } else {
        setMessage('Acción completada');
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Documentos</h1>
          <p className="text-gray-500 mt-1">
            Crea plantillas a tu manera, sube un PDF legal o recrea desde foto con IA. Imprime, descarga, envía y firma.
          </p>
        </div>
        <Link
          href="/settings/document-branding"
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50"
        >
          Logo y nombre en PDFs
        </Link>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {(
          [
            { id: 'library' as const, label: 'Plantillas' },
            { id: 'create' as const, label: 'Crear plantilla' },
            { id: 'generate' as const, label: 'Generar documento' },
            { id: 'generated' as const, label: 'Documentos generados' },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setCreateMode(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${
              tab === t.id
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800 text-sm">{error}</div>
      )}
      {message && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <>
          {tab === 'library' && (
            <div className="grid gap-4 md:grid-cols-2">
              {templates.length === 0 ? (
                <p className="text-gray-500 col-span-full">No hay plantillas. Crea una o instala las semilla.</p>
              ) : (
                templates.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{t.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {TYPE_LABELS[t.type] || t.type} · {t.engine === 'blocks' ? 'Bloques' : 'PDF'}
                          {t.requiresSignature ? ' · Requiere firma' : ''}
                        </p>
                      </div>
                      {t.aiDraft && (
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                          Borrador IA
                        </span>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</p>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {t.aiDraft ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void confirmAiDraft(t.id)}
                          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-sm hover:bg-amber-500 disabled:opacity-50"
                        >
                          Confirmar plantilla IA
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTemplateId(t.id);
                            setTab('generate');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-sm hover:bg-primary-500"
                        >
                          Usar
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'create' && !createMode && (
            <div className="grid gap-4 md:grid-cols-2">
              {[
                {
                  id: 'blocks' as const,
                  title: 'Crear a tu manera',
                  desc: 'Constructor por bloques: partes, vehículo, precios, cláusulas y firmas con tu logo.',
                },
                {
                  id: 'photo' as const,
                  title: 'Desde foto (IA)',
                  desc: 'Toma o sube una foto; la IA reconstruye un borrador editable (con aviso previo).',
                },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCreateMode(opt.id)}
                  className="text-left rounded-xl border border-gray-200 bg-white p-6 hover:border-primary-400 hover:shadow-md transition"
                >
                  <h3 className="font-semibold text-lg text-gray-900">{opt.title}</h3>
                  <p className="text-sm text-gray-600 mt-2">{opt.desc}</p>
                </button>
              ))}
            </div>
          )}

          {tab === 'create' && createMode === 'blocks' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
              <h2 className="text-lg font-semibold">Nueva plantilla por bloques</h2>
              <input
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Nombre de la plantilla"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <textarea
                className="w-full border rounded-lg px-3 py-2 min-h-[120px]"
                placeholder="Cláusulas legales (editables)"
                value={legalText}
                onChange={(e) => setLegalText(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreateMode(null)}
                  className="px-4 py-2 border rounded-lg"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  disabled={busy || !newName.trim()}
                  onClick={() => void createBlocksTemplate()}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                >
                  Guardar plantilla
                </button>
              </div>
            </div>
          )}

          {tab === 'create' && createMode === 'photo' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
              <h2 className="text-lg font-semibold">Recrear desde foto (IA)</h2>
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                Antes de escanear o subir verás una aclaración obligatoria: la IA no garantiza una copia 100% idéntica;
                el resultado es un borrador que debes revisar.
              </p>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) startPhotoFlow(file);
                }}
              />
              <button type="button" onClick={() => setCreateMode(null)} className="px-4 py-2 border rounded-lg">
                Atrás
              </button>
            </div>
          )}

          {tab === 'generate' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
              <h2 className="text-lg font-semibold">Generar documento</h2>
              <select
                className="w-full border rounded-lg px-3 py-2"
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
              >
                <option value="">Selecciona plantilla</option>
                {templates
                  .filter((t) => !t.aiDraft)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
              </select>
              <div className="grid md:grid-cols-2 gap-3">
                <input className="border rounded-lg px-3 py-2" placeholder="Nombre comprador" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Email comprador" value={buyerEmail} onChange={(e) => setBuyerEmail(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Teléfono" value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Precio" value={price} onChange={(e) => setPrice(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Año" value={vehicleYear} onChange={(e) => setVehicleYear(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Marca" value={vehicleMake} onChange={(e) => setVehicleMake(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="Modelo" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                <input className="border rounded-lg px-3 py-2" placeholder="VIN" value={vehicleVin} onChange={(e) => setVehicleVin(e.target.value)} />
              </div>
              <button
                type="button"
                disabled={busy || !selectedTemplateId}
                onClick={() => void runGenerate()}
                className="px-5 py-2.5 bg-primary-600 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {busy ? 'Generando…' : 'Generar PDF'}
              </button>
            </div>
          )}

          {tab === 'generated' && (
            <div className="overflow-x-auto border border-gray-200 rounded-xl bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3 text-left">Número</th>
                    <th className="px-3 py-3 text-left">Documento</th>
                    <th className="px-3 py-3 text-left">Estado</th>
                    <th className="px-3 py-3 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {generated.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 font-mono text-xs">{d.documentNumber}</td>
                      <td className="px-3 py-2">{d.name}</td>
                      <td className="px-3 py-2">{d.status}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          {d.pdfUrl && (
                            <>
                              <a
                                href={d.pdfUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs"
                              >
                                Descargar
                              </a>
                              <button
                                type="button"
                                className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs"
                                onClick={() => {
                                  const w = window.open(d.pdfUrl, '_blank');
                                  w?.addEventListener('load', () => w.print());
                                }}
                              >
                                Imprimir
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs"
                            onClick={() => void docAction(d.id, 'share')}
                          >
                            Compartir
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs"
                            onClick={() => {
                              const to = window.prompt('Email destino');
                              if (to) void docAction(d.id, 'email', { to });
                            }}
                          >
                            Email
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="px-2 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-xs text-emerald-900"
                            onClick={() => {
                              const to = window.prompt('Teléfono WhatsApp (con código de país)');
                              if (to) void docAction(d.id, 'whatsapp', { to });
                            }}
                          >
                            WhatsApp
                          </button>
                          <button
                            type="button"
                            disabled={busy}
                            className="px-2 py-1 rounded bg-indigo-100 hover:bg-indigo-200 text-xs text-indigo-900"
                            onClick={() => {
                              const signerEmail = window.prompt('Email del firmante');
                              const signerName = window.prompt('Nombre del firmante') || 'Firmante';
                              if (signerEmail) {
                                void docAction(d.id, 'send_for_signature', { signerEmail, signerName });
                              }
                            }}
                          >
                            Enviar a firmar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Diálogo obligatorio de aclaración IA */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900">Antes de subir o escanear</h3>
            <ul className="mt-4 text-sm text-gray-700 space-y-2 list-disc pl-5">
              <li>
                La IA <strong>reconstruye</strong> el documento lo más fiel posible, pero{' '}
                <strong>no garantiza una copia idéntica al 100%</strong> (ángulo, luz, pliegues, calidad).
              </li>
              <li>
                El resultado es un <strong>borrador editable</strong>: debes revisar textos, campos y firmas antes de usarlo.
              </li>
              <li>
                Si prefieres control total del texto legal, crea la plantilla con <strong>Crear a tu manera</strong> (constructor por bloques) y revisa cada cláusula antes de usarla.
              </li>
              <li>Tips: foto nítida, bien iluminada, documento plano, una página por foto.</li>
            </ul>
            <label className="mt-5 flex items-start gap-2 text-sm text-gray-800">
              <input
                type="checkbox"
                className="mt-1"
                checked={disclaimerChecked}
                onChange={(e) => setDisclaimerChecked(e.target.checked)}
              />
              Entiendo que el resultado es un borrador a revisar y no una copia garantizada al 100%.
            </label>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 border rounded-lg"
                onClick={() => {
                  setShowDisclaimer(false);
                  setPendingPhotoFile(null);
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!disclaimerChecked}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg disabled:opacity-50"
                onClick={confirmDisclaimerAndUpload}
              >
                Entendido, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
