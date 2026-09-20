'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type PublicDoc = {
  id: string;
  name: string;
  documentNumber: string;
  type: string;
  status: string;
  pdfUrl?: string;
  createdAt?: string;
};

export default function PublicDocumentViewPage() {
  const params = useParams();
  const token = params.token as string;
  const [doc, setDoc] = useState<PublicDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/public/documents/${token}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'No encontrado');
        if (!cancelled) setDoc(data.document);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Cargando documento…</p>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 text-center">
          <h1 className="text-xl font-semibold text-slate-900">Documento no disponible</h1>
          <p className="mt-2 text-sm text-slate-600">
            {error || 'El enlace no es válido o ha expirado.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">Documento compartido</p>
            <h1 className="text-xl font-semibold text-slate-900">{doc.name}</h1>
            <p className="text-sm text-slate-500 font-mono">{doc.documentNumber}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {doc.pdfUrl ? (
              <>
                <a
                  href={doc.pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
                >
                  Descargar PDF
                </a>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg border border-slate-300 bg-white text-sm font-medium hover:bg-slate-50"
                  onClick={() => {
                    const w = window.open(doc.pdfUrl, '_blank');
                    w?.addEventListener('load', () => w.print());
                  }}
                >
                  Imprimir
                </button>
              </>
            ) : null}
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">
        {doc.pdfUrl ? (
          <iframe
            title={doc.name}
            src={doc.pdfUrl}
            className="w-full min-h-[80vh] rounded-xl border border-slate-200 bg-white shadow-sm"
          />
        ) : (
          <p className="text-center text-slate-600">Este documento no tiene PDF adjunto.</p>
        )}
      </main>
    </div>
  );
}
