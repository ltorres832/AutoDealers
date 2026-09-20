'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchWithAuth } from '@/lib/fetch-with-auth';
import { useFeatureFlag } from '@/hooks/useFeatureFlag';
import type { DealerSiteConfig, DealerSiteTemplateId } from '@autodealers/inventory/client';

export default function DealerSiteBuilderPage() {
  const enabled = useFeatureFlag('dealer_site_builder');
  const [site, setSite] = useState<Partial<DealerSiteConfig>>({
    templateId: 'starter',
    published: false,
    slug: '',
    primaryColor: '#0f172a',
  });
  const [servicesText, setServicesText] = useState('');
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWithAuth('/api/dealer-site', {})
      .then((r) => r.json())
      .then((json) => {
        if (json.site) {
          setSite(json.site);
          setServicesText(Array.isArray(json.site.services) ? json.site.services.join(', ') : '');
        }
        setTemplates(json.templates || []);
        setPublicUrl(json.publicUrl || null);
        setPreviewUrl(json.previewUrl || '');
      })
      .catch(() => setError('No se pudo cargar el sitio'));
  }, []);

  async function save(publish?: boolean) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const services = servicesText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetchWithAuth('/api/dealer-site', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...site,
          services,
          published: publish !== undefined ? publish : site.published,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error');
      setSite(json.site);
      setServicesText(Array.isArray(json.site?.services) ? json.site.services.join(', ') : '');
      setPublicUrl(json.publicUrl || null);
      setMessage(publish ? 'Sitio publicado.' : 'Guardado.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-4">
      <Link href="/inventory" className="text-sm text-slate-600 hover:underline">
        ← Inventario
      </Link>
      <h1 className="text-2xl font-bold">Mi sitio de concesionario</h1>
      <p className="text-sm text-slate-600">
        Plantillas propias. No cambia el marketplace de AutoDealers. Publica cuando esté listo.
      </p>

      {!enabled ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Feature `dealer_site_builder` desactivada. Actívala en Admin → Feature flags.
        </div>
      ) : null}

      {error ? <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">{message}</div> : null}

      <div className="bg-white border rounded-xl p-4 space-y-3">
        <label className="block text-sm font-medium">Plantilla</label>
        <select
          value={site.templateId || 'starter'}
          onChange={(e) => setSite({ ...site, templateId: e.target.value as DealerSiteTemplateId })}
          className="w-full border rounded-lg px-3 py-2"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.description}
            </option>
          ))}
        </select>
        <input
          placeholder="Slug público (ej: mi-dealer)"
          value={site.slug || ''}
          onChange={(e) => setSite({ ...site, slug: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="URL del logo"
          value={site.logoUrl || ''}
          onChange={(e) => setSite({ ...site, logoUrl: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="URL imagen hero"
          value={site.heroImageUrl || ''}
          onChange={(e) => setSite({ ...site, heroImageUrl: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Titular"
          value={site.headline || ''}
          onChange={(e) => setSite({ ...site, headline: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Frase corta"
          value={site.tagline || ''}
          onChange={(e) => setSite({ ...site, tagline: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <textarea
          placeholder="Sobre nosotros (texto o HTML simple)"
          value={site.aboutHtml || ''}
          onChange={(e) => setSite({ ...site, aboutHtml: e.target.value })}
          rows={4}
          className="w-full border rounded-lg px-3 py-2"
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            placeholder="Texto del CTA (ej: Agendar cita)"
            value={site.ctaLabel || ''}
            onChange={(e) => setSite({ ...site, ctaLabel: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            placeholder="URL del CTA"
            value={site.ctaUrl || ''}
            onChange={(e) => setSite({ ...site, ctaUrl: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <textarea
          placeholder="Servicios (separados por coma: Financiamiento, Taller, Trade-in)"
          value={servicesText}
          onChange={(e) => setServicesText(e.target.value)}
          rows={2}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Teléfono"
          value={site.phone || ''}
          onChange={(e) => setSite({ ...site, phone: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="WhatsApp"
          value={site.whatsapp || ''}
          onChange={(e) => setSite({ ...site, whatsapp: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Correo"
          value={site.email || ''}
          onChange={(e) => setSite({ ...site, email: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Dirección"
          value={site.address || ''}
          onChange={(e) => setSite({ ...site, address: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="URL de mapa (Google Maps)"
          value={site.mapUrl || ''}
          onChange={(e) => setSite({ ...site, mapUrl: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <input
          placeholder="Horario"
          value={site.hours || ''}
          onChange={(e) => setSite({ ...site, hours: e.target.value })}
          className="w-full border rounded-lg px-3 py-2"
        />
        <div className="grid gap-2 sm:grid-cols-3">
          <input
            placeholder="Facebook URL"
            value={site.facebookUrl || ''}
            onChange={(e) => setSite({ ...site, facebookUrl: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            placeholder="Instagram URL"
            value={site.instagramUrl || ''}
            onChange={(e) => setSite({ ...site, instagramUrl: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
          <input
            placeholder="YouTube URL"
            value={site.youtubeUrl || ''}
            onChange={(e) => setSite({ ...site, youtubeUrl: e.target.value })}
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <input
          type="color"
          value={site.primaryColor || '#0f172a'}
          onChange={(e) => setSite({ ...site, primaryColor: e.target.value })}
          className="h-10 w-20 border rounded"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={site.showFinancing === true}
            onChange={(e) => setSite({ ...site, showFinancing: e.target.checked })}
          />
          Mostrar bloque financiamiento (Premium/Growth)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={site.showJobs === true}
            onChange={(e) => setSite({ ...site, showJobs: e.target.checked })}
          />
          Mostrar bloque empleo
        </label>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(false)}
            className="px-4 py-2 rounded-lg border text-sm"
          >
            Guardar borrador
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save(true)}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm"
          >
            Publicar
          </button>
          {publicUrl ? (
            <a href={publicUrl} target="_blank" rel="noreferrer" className="px-4 py-2 rounded-lg border text-sm">
              Ver sitio público
            </a>
          ) : previewUrl ? (
            <span className="text-xs text-slate-500 self-center">Vista previa tras publicar: {previewUrl}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
