'use client';

import { useState } from 'react';

const PDF_TEMPLATES = [
  { id: 'lender_package', label: 'Paquete para banco' },
  { id: 'credit_application', label: 'Solicitud de crédito' },
  { id: 'pre_approval_letter', label: 'Carta pre-aprobación' },
  { id: 'financing_summary', label: 'Resumen financiamiento' },
  { id: 'rejection_letter', label: 'Comunicado de decisión' },
  { id: 'terms_agreement', label: 'Acuerdo de términos' },
  { id: 'cosigner_agreement', label: 'Co-signer' },
] as const;

interface FIDocumentPdfPanelProps {
  requestId: string;
  clientName?: string;
}

export default function FIDocumentPdfPanel({ requestId, clientName }: FIDocumentPdfPanelProps) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [showExternalEmail, setShowExternalEmail] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [attachPdf, setAttachPdf] = useState(true);
  const [pdfTemplate, setPdfTemplate] = useState('lender_package');
  const [externalEmail, setExternalEmail] = useState({
    to: '',
    subject: clientName ? `Solicitud de financiamiento — ${clientName}` : '',
    body: clientName
      ? `Estimados,\n\nAdjuntamos la solicitud de financiamiento del cliente ${clientName} para su evaluación crediticia.\n\nQuedamos atentos a su respuesta.\n\nSaludos cordiales.`
      : '',
  });

  async function handleGeneratePdf(template: string, downloadOnly = false) {
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/fi/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestId, template, downloadOnly }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al generar PDF');
        return;
      }
      if (downloadOnly) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `documento-${template}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const data = await res.json();
        alert(data.message || `PDF generado: ${data.title || template}`);
        if (data.document?.pdfUrl) {
          window.open(data.document.pdfUrl, '_blank');
        }
      }
    } catch (e) {
      console.error(e);
      alert('Error al generar PDF');
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleSendExternalEmail() {
    if (!externalEmail.to || !externalEmail.subject || !externalEmail.body) {
      alert('Completa email, asunto y mensaje');
      return;
    }
    setSendingEmail(true);
    try {
      const res = await fetch(`/api/fi/requests/${requestId}/send-external-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...externalEmail,
          attachPdf,
          pdfTemplate,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Error al enviar email');
        return;
      }
      alert(data.message || 'Email enviado correctamente.');
      setShowExternalEmail(false);
      setExternalEmail({ to: '', subject: '', body: '' });
    } catch (e) {
      console.error(e);
      alert('Error al enviar email');
    } finally {
      setSendingEmail(false);
    }
  }

  return (
    <>
      <div className="bg-white shadow rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Documentos PDF profesionales</h2>
            <p className="text-sm text-gray-600 mt-1">
              PDFs con tu branding (logo, colores y datos del cliente). Configura el branding en{' '}
              <a href="/settings/document-branding" className="text-primary-600 hover:underline">
                Ajustes → Branding de documentos
              </a>
              .
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setExternalEmail((prev) => ({
                ...prev,
                subject: prev.subject || (clientName ? `Solicitud de financiamiento — ${clientName}` : ''),
                body:
                  prev.body ||
                  (clientName
                    ? `Estimados,\n\nAdjuntamos la solicitud de financiamiento del cliente ${clientName} para su evaluación crediticia.\n\nQuedamos atentos a su respuesta.\n\nSaludos cordiales.`
                    : ''),
              }));
              setShowExternalEmail(true);
            }}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm font-medium whitespace-nowrap"
          >
            Enviar a banco / financiera
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PDF_TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              disabled={generatingPdf}
              onClick={() => void handleGeneratePdf(t.id, true)}
              className="text-left px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 text-sm disabled:opacity-50 transition-colors"
            >
              {generatingPdf ? 'Generando…' : `Descargar: ${t.label}`}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-500">
          También puedes guardar en el expediente sin descargar — usa el botón de envío a banco con adjunto PDF.
        </p>
      </div>

      {showExternalEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Enviar a banco / financiera</h2>
                <button
                  type="button"
                  onClick={() => setShowExternalEmail(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Para (email)</label>
                  <input
                    type="email"
                    value={externalEmail.to}
                    onChange={(e) => setExternalEmail({ ...externalEmail, to: e.target.value })}
                    placeholder="analista@banco.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                  <input
                    type="text"
                    value={externalEmail.subject}
                    onChange={(e) => setExternalEmail({ ...externalEmail, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                  <textarea
                    value={externalEmail.body}
                    onChange={(e) => setExternalEmail({ ...externalEmail, body: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Las respuestas a este correo pueden llegar automáticamente a la plataforma.
                  </p>
                </div>

                <div className="rounded-lg border border-primary-100 bg-primary-50/60 p-4 space-y-3">
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={attachPdf}
                      onChange={(e) => setAttachPdf(e.target.checked)}
                      className="mt-1"
                    />
                    <span className="text-sm text-gray-800">
                      <strong>Adjuntar PDF profesional</strong> — paquete completo con branding
                    </span>
                  </label>
                  {attachPdf && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Plantilla del adjunto
                      </label>
                      <select
                        value={pdfTemplate}
                        onChange={(e) => setPdfTemplate(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        <option value="lender_package">Paquete para banco / financiera</option>
                        <option value="credit_application">Solicitud de crédito</option>
                        <option value="financing_summary">Resumen de financiamiento</option>
                        <option value="pre_approval_letter">Carta de pre-aprobación</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowExternalEmail(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => void handleSendExternalEmail()}
                  disabled={sendingEmail}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {sendingEmail ? 'Enviando…' : attachPdf ? 'Enviar con PDF adjunto' : 'Enviar email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
