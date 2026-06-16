'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SocialIcon } from './SocialIcon';
import { ToastNotification, type ToastData } from './ToastNotification';

export interface PublishSocialVehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  price: number;
  currency?: string;
  condition?: string;
  status?: string;
  mileage?: number;
  location?: string;
  features?: string[];
  photos?: string[];
  images?: string[];
  tenantId?: string;
}

export interface PublishVehicleToSocialModalProps {
  vehicle: PublishSocialVehicle;
  onClose: () => void;
  onPublished?: () => void;
  /** admin: publica en nombre del tenant del vehículo */
  mode?: 'tenant' | 'admin';
  integrationsPath?: string;
  aiGeneratePath?: string;
  publishPath?: string;
  scheduleCreatePath?: string;
  settingsIntegrationsHref?: string;
}

type Platform = 'facebook' | 'instagram';

function vehicleImages(v: PublishSocialVehicle): string[] {
  if (v.photos?.length) return v.photos;
  if (v.images?.length) return v.images;
  return [];
}

export function PublishVehicleToSocialModal({
  vehicle,
  onClose,
  onPublished,
  mode = 'tenant',
  integrationsPath,
  aiGeneratePath,
  publishPath,
  scheduleCreatePath,
  settingsIntegrationsHref: settingsIntegrationsHrefProp,
}: PublishVehicleToSocialModalProps) {
  const images = useMemo(() => vehicleImages(vehicle), [vehicle]);
  const label = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const settingsIntegrationsHref =
    settingsIntegrationsHrefProp ??
    (mode === 'admin' ? '/admin/settings/integrations' : '/settings/integrations');

  const resolvedIntegrations =
    integrationsPath ??
    (mode === 'admin' ? '/api/admin/social/integrations' : '/api/settings/integrations');
  const resolvedAi = aiGeneratePath ?? (mode === 'admin' ? '/api/admin/social/ai-generate' : '/api/social/ai-generate');
  const resolvedPublish = publishPath ?? (mode === 'admin' ? '/api/admin/social/publish' : '/api/social/publish');
  const resolvedSchedule =
    scheduleCreatePath ?? (mode === 'admin' ? '/api/admin/social/schedule/create' : '/api/social/schedule/create');

  const [integrations, setIntegrations] = useState<Platform[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [postText, setPostText] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState(images[0] ?? '');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishMode, setPublishMode] = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [toast, setToast] = useState<ToastData | null>(null);
  const [lastPublishErrors, setLastPublishErrors] = useState<string | null>(null);

  const showToast = useCallback((type: ToastData['type'], title: string, message?: string) => {
    setToast({ id: String(Date.now()), type, title, message });
  }, []);

  useEffect(() => {
    setImageUrl(images[0] ?? '');
  }, [images]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingIntegrations(true);
      try {
        const res = await fetch(resolvedIntegrations, { credentials: 'include' });
        if (!res.ok) throw new Error('No se pudieron cargar las integraciones');
        const data = await res.json();
        const active = (data.integrations ?? [])
          .filter((i: { status?: string; type?: string }) => i.status === 'active')
          .map((i: { type: string }) => i.type)
          .filter((t: string): t is Platform => t === 'facebook' || t === 'instagram');
        if (!cancelled) {
          setIntegrations(active);
          setSelectedPlatforms(active);
        }
      } catch {
        if (!cancelled) setIntegrations([]);
      } finally {
        if (!cancelled) setLoadingIntegrations(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedIntegrations]);

  const vehiclePayload = useMemo(
    () => ({
      id: vehicle.id,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      price: vehicle.price,
      condition: vehicle.condition ?? 'used',
      mileage: vehicle.mileage,
      location: vehicle.location,
      features: vehicle.features,
      images,
    }),
    [vehicle, images]
  );

  async function generateWithAI() {
    if (selectedPlatforms.length === 0) {
      showToast('warning', 'Selecciona al menos una red');
      return;
    }
    setAiGenerating(true);
    try {
      const body: Record<string, unknown> = {
        vehicle: vehiclePayload,
        objective: 'more_messages',
      };
      const res = await fetch(resolvedAi, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al generar contenido');

      const post = data.post as {
        text?: string;
        hashtags?: string[];
        optimizedFor?: {
          facebook?: { text?: string; hashtags?: string[] };
          instagram?: { text?: string; hashtags?: string[] };
        };
      };

      let text = post.text ?? '';
      let tags = post.hashtags ?? [];

      if (selectedPlatforms.includes('facebook') && !selectedPlatforms.includes('instagram')) {
        text = post.optimizedFor?.facebook?.text ?? text;
        tags = post.optimizedFor?.facebook?.hashtags ?? tags;
      } else if (selectedPlatforms.includes('instagram') && !selectedPlatforms.includes('facebook')) {
        text = post.optimizedFor?.instagram?.text ?? text;
        tags = post.optimizedFor?.instagram?.hashtags ?? tags;
      }

      setPostText(text);
      setHashtags(tags);
      showToast('success', 'Contenido generado', 'Revisa el texto antes de publicar.');
    } catch (e) {
      showToast('error', 'Error al generar', e instanceof Error ? e.message : 'Intenta de nuevo');
    } finally {
      setAiGenerating(false);
    }
  }

  function extractPublishError(data: Record<string, unknown>): string {
    const results = data.results as Array<{ platform?: string; success?: boolean; error?: string }> | undefined;
    if (Array.isArray(results)) {
      const failed = results.filter((r) => r && r.success === false);
      if (failed.length > 0) {
        return failed.map((r) => `${r.platform ?? 'red'}: ${r.error ?? 'error'}`).join(' · ');
      }
    }
    const err = data.error ?? data.message ?? data.details;
    return typeof err === 'string' ? err : 'Error al publicar';
  }

  async function handlePublish() {
    setLastPublishErrors(null);
    if (!postText.trim()) {
      showToast('warning', 'Escribe o genera el texto del post');
      return;
    }
    if (selectedPlatforms.length === 0) {
      showToast('warning', 'Selecciona Facebook o Instagram');
      return;
    }
    if (!imageUrl) {
      showToast('warning', 'El vehículo necesita al menos una foto');
      return;
    }

    setPublishing(true);
    try {
      const content = {
        text: postText,
        imageUrl,
        hashtags,
      };

      if (publishMode === 'schedule') {
        if (!scheduleDate || !scheduleTime) {
          showToast('warning', 'Indica fecha y hora');
          setPublishing(false);
          return;
        }
        const scheduledFor = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();
        const body: Record<string, unknown> = {
          content,
          platforms: selectedPlatforms,
          scheduledFor,
          vehicleId: vehicle.id,
          aiGenerated: true,
        };
        const res = await fetch(resolvedSchedule, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al programar');
        showToast('success', 'Post programado', 'Se publicará en la fecha indicada.');
      } else {
        const body: Record<string, unknown> = { content, platforms: selectedPlatforms };

        const res = await fetch(resolvedPublish, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        let data: Record<string, unknown> = {};
        try {
          data = (await res.json()) as Record<string, unknown>;
        } catch {
          throw new Error(`Respuesta inválida del servidor (${res.status})`);
        }
        const anyOk = Array.isArray(data.results)
          ? (data.results as Array<{ success?: boolean }>).some((r) => r.success)
          : false;
        if (!res.ok || (data.success === false && !anyOk)) {
          const detail = extractPublishError(data);
          setLastPublishErrors(detail);
          throw new Error(detail);
        }
        if (!anyOk && data.success !== true) {
          const detail = extractPublishError(data);
          setLastPublishErrors(detail);
          throw new Error(detail);
        }
        const partial = extractPublishError(data);
        showToast(
          'success',
          anyOk && partial && data.success === false ? 'Publicado parcialmente' : 'Publicado en redes',
          (data.message as string) || partial || 'Revisa tu página de Facebook.'
        );
      }
      onPublished?.();
      setTimeout(onClose, 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verifica las integraciones en Configuración';
      setLastPublishErrors(msg);
      showToast('error', 'No se pudo publicar', msg);
    } finally {
      setPublishing(false);
    }
  }

  function togglePlatform(p: Platform) {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full my-6 max-h-[92vh] overflow-y-auto">
          <div className="p-6 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Publicar en redes sociales</h2>
                <p className="text-sm text-gray-600 mt-1">{label}</p>
                {mode === 'admin' ? (
                  <p className="text-xs text-amber-700 mt-1">
                    Publicación con la cuenta de soporte de AutoDealers
                    {vehicle.tenantId ? ` · inventario del tenant ${vehicle.tenantId}` : ''}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {imageUrl ? (
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <img src={imageUrl} alt={label} className="w-full max-h-48 object-cover" />
                {images.length > 1 ? (
                  <div className="flex gap-2 p-2 overflow-x-auto bg-gray-50">
                    {images.slice(0, 6).map((url) => (
                      <button
                        key={url}
                        type="button"
                        onClick={() => setImageUrl(url)}
                        className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 ${
                          imageUrl === url ? 'border-primary-600' : 'border-transparent'
                        }`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-900">
                Agrega fotos al vehículo antes de publicar en redes.
              </div>
            )}

            {loadingIntegrations ? (
              <p className="text-sm text-gray-500">Cargando integraciones…</p>
            ) : integrations.length === 0 ? (
              <div className="rounded-lg bg-primary-50 border border-primary-200 p-4 text-sm text-primary-900">
                <p className="font-medium mb-1">Redes no conectadas</p>
                <p>
                  {mode === 'admin' ? (
                    <>
                      Conecta la cuenta de soporte en{' '}
                      <a href={settingsIntegrationsHref} className="underline font-medium">
                        Admin → Integraciones Meta
                      </a>
                      . No necesitas las credenciales del concesionario.
                    </>
                  ) : (
                    <>
                      Conecta Facebook e Instagram en{' '}
                      <a href={settingsIntegrationsHref} className="underline font-medium">
                        Configuración → Integraciones
                      </a>{' '}
                      para poder publicar.
                    </>
                  )}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Publicar en</p>
                <div className="flex flex-wrap gap-3">
                  {(['facebook', 'instagram'] as const).map((p) => {
                    const active = integrations.includes(p);
                    const selected = selectedPlatforms.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        disabled={!active}
                        onClick={() => active && togglePlatform(p)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition ${
                          !active
                            ? 'opacity-40 cursor-not-allowed border-gray-200'
                            : selected
                              ? 'border-primary-600 bg-primary-50'
                              : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <SocialIcon platform={p} size={24} />
                        <span className="capitalize text-sm font-medium">{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {integrations.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={() => void generateWithAI()}
                  disabled={aiGenerating || selectedPlatforms.length === 0}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-600 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {aiGenerating ? (
                    <>
                      <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generando con IA…
                    </>
                  ) : (
                    <>✨ Generar texto con IA</>
                  )}
                </button>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Texto del post</label>
                  <textarea
                    value={postText}
                    onChange={(e) => setPostText(e.target.value)}
                    rows={5}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="Describe el vehículo o usa IA para generar…"
                  />
                </div>

                {hashtags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {hashtags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-primary-50 text-primary-800 rounded-full">
                        #{tag.replace(/^#/, '')}
                      </span>
                    ))}
                  </div>
                ) : null}

                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">¿Cuándo publicar?</p>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={publishMode === 'now'}
                        onChange={() => setPublishMode('now')}
                      />
                      Ahora
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="radio"
                        checked={publishMode === 'schedule'}
                        onChange={() => setPublishMode('schedule')}
                      />
                      Programar
                    </label>
                  </div>
                  {publishMode === 'schedule' ? (
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <input
                        type="date"
                        value={scheduleDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="border rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  ) : null}
                </div>

                {lastPublishErrors ? (
                  <div
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900"
                    role="alert"
                  >
                    <p className="font-medium mb-1">Último error al publicar</p>
                    <p className="break-words">{lastPublishErrors}</p>
                    <p className="text-xs mt-2 text-red-800">
                      Si ves error (#200) o &quot;page itself&quot;, desconecta y vuelve a conectar Meta en{' '}
                      <a href={settingsIntegrationsHref} className="underline font-medium">
                        Integraciones
                      </a>{' '}
                      (así se renueva el token de la página). Instagram requiere cuenta Business vinculada.
                    </p>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>

          <div className="p-6 border-t flex gap-3 justify-end sticky bottom-0 bg-white rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            {integrations.length > 0 ? (
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={publishing || !postText.trim()}
                className="px-5 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {publishing ? 'Publicando…' : publishMode === 'now' ? 'Publicar ahora' : 'Programar'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <ToastNotification toast={toast} onClose={() => setToast(null)} />
    </>
  );
}
