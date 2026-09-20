'use client';
import { useEffect, useMemo, useState } from 'react';


type VisiblePolicy = {
  id: string;
  type: string;
  title: string;
  content: string;
  version?: string;
  isRequired?: boolean;
  requiresAcceptance?: boolean;
  lastUpdated?: string;
};

const TYPE_LABELS: Record<string, string> = {
  privacy: 'Privacidad',
  terms: 'Términos',
  cookies: 'Cookies',
  returns: 'Devoluciones',
  warranty: 'Garantías',
  shipping: 'Envíos',
  data_protection: 'Protección de Datos',
  disclaimer: 'Disclosures',
  custom: 'Personalizada',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatMarkdown(text: string): string {
  let html = escapeHtml(text || '');
  html = html.replace(/^### (.*$)/gim, '<h3 class="mt-6 mb-3 text-xl font-bold">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="mt-8 mb-4 text-2xl font-bold">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="mt-8 mb-4 text-3xl font-bold">$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold">$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code class="rounded bg-gray-100 px-1 text-sm">$1</code>');
  return html
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      if (trimmed.startsWith('<h')) return trimmed;
      if (/^(?:- |\d+\. )/m.test(trimmed)) {
        const items = trimmed
          .split('\n')
          .map((line) => line.replace(/^(?:- |\d+\. )/, '').trim())
          .filter(Boolean)
          .map((line) => `<li>${line}</li>`)
          .join('');
        return `<ul class="my-4 list-disc space-y-2 pl-6">${items}</ul>`;
      }
      return `<p class="mb-4 leading-relaxed text-gray-700">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');
}

function PoliciesContent({ audienceLabel }: { audienceLabel: string }) {
  const [policies, setPolicies] = useState<VisiblePolicy[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function loadPolicies() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/policies/visible', { cache: 'no-store', credentials: 'include' });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'No se pudieron cargar las políticas');
        const nextPolicies = Array.isArray(data.policies) ? data.policies : [];
        if (!cancelled) {
          setPolicies(nextPolicies);
          setSelectedId((current) => current || nextPolicies[0]?.id || '');
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Error al cargar políticas');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPolicies();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedPolicy = useMemo(
    () => policies.find((policy) => policy.id === selectedId) || policies[0] || null,
    [policies, selectedId]
  );

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-800">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">{audienceLabel}</p>
        <h1 className="mt-2 text-3xl font-bold text-gray-900">Políticas y Disclosures</h1>
        <p className="mt-2 max-w-3xl text-gray-600">
          Estas son las políticas activas que la administración marcó como visibles para esta app.
        </p>
      </div>

      {policies.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600 shadow-sm">
          No hay políticas activas para esta app en este momento.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <aside className="space-y-3">
            {policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                onClick={() => setSelectedId(policy.id)}
                className={`w-full rounded-xl border p-4 text-left shadow-sm transition ${
                  selectedPolicy?.id === policy.id
                    ? 'border-primary-300 bg-primary-50 text-primary-900'
                    : 'border-gray-200 bg-white hover:border-primary-200 hover:bg-gray-50'
                }`}
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {TYPE_LABELS[policy.type] || TYPE_LABELS.custom}
                </div>
                <div className="mt-1 font-semibold text-gray-900">{policy.title}</div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {policy.isRequired ? (
                    <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Requerida</span>
                  ) : null}
                  {policy.requiresAcceptance ? (
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">Aceptación</span>
                  ) : null}
                </div>
              </button>
            ))}
          </aside>

          {selectedPolicy ? (
            <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="mb-6 border-b border-gray-100 pb-5">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary-600">
                  {TYPE_LABELS[selectedPolicy.type] || TYPE_LABELS.custom}
                </p>
                <h2 className="mt-2 text-3xl font-bold text-gray-900">{selectedPolicy.title}</h2>
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-500">
                  {selectedPolicy.version ? <span>Versión {selectedPolicy.version}</span> : null}
                  {selectedPolicy.lastUpdated ? (
                    <span>
                      Última actualización:{' '}
                      {new Date(selectedPolicy.lastUpdated).toLocaleDateString('es-PR')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div
                className="prose max-w-none prose-headings:text-gray-900 prose-a:text-primary-600"
                dangerouslySetInnerHTML={{ __html: formatMarkdown(selectedPolicy.content) }}
              />
            </article>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function PoliciesPage() {
  const content = <PoliciesContent audienceLabel="Vendedor" />;
  return content;
}
