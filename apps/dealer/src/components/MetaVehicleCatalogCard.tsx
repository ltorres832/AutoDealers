'use client';

/**
 * Tarjeta "Catálogo de vehículos Meta" (settings → integraciones).
 * Activa el catálogo de Commerce (vertical vehicles), muestra estado del feed
 * y permite crear campañas dinámicas de inventario (AIA).
 */

import { useCallback, useEffect, useState } from 'react';

interface CatalogStatus {
  enabled: boolean;
  facebookConnected: boolean;
  catalogScopeGranted?: boolean;
  hasBusinessManager?: boolean;
  config?: {
    businessId: string;
    catalogId: string;
    feedId: string;
    productSetId: string;
    feedUrl: string;
  };
  productCount?: number;
  latestUpload?: {
    startTime?: string;
    endTime?: string;
    errorCount?: number;
    warningCount?: number;
  };
  error?: string;
}

interface Props {
  onNotify: (type: 'success' | 'error' | 'warning', title: string, message?: string) => void;
}

async function catalogRequest(body: Record<string, unknown>) {
  const res = await fetch('/api/settings/integrations/meta-catalog', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export default function MetaVehicleCatalogCard({ onNotify }: Props) {
  const [status, setStatus] = useState<CatalogStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [campaign, setCampaign] = useState({ name: '', dailyBudget: '', durationDays: '7' });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/integrations/meta-catalog', {
        credentials: 'include',
      });
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch {
      // silencioso: la tarjeta muestra estado por defecto
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  async function handleAction(action: 'enable' | 'sync' | 'disable') {
    setWorking(action);
    try {
      await catalogRequest({ action });
      if (action === 'enable') {
        onNotify('success', 'Catálogo activado', 'Meta descargará tu inventario cada hora.');
      } else if (action === 'sync') {
        onNotify('success', 'Sincronización solicitada', 'Meta descargará el feed en unos minutos.');
      } else {
        onNotify('success', 'Catálogo desactivado');
      }
      await fetchStatus();
    } catch (e) {
      onNotify('error', 'Error', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setWorking(null);
    }
  }

  async function handleCreateCampaign() {
    const dailyBudget = parseFloat(campaign.dailyBudget);
    const durationDays = parseInt(campaign.durationDays, 10);
    if (!campaign.name.trim() || !Number.isFinite(dailyBudget) || dailyBudget <= 0 || !durationDays) {
      onNotify('warning', 'Campos requeridos', 'Nombre, presupuesto diario y días son obligatorios.');
      return;
    }
    setWorking('create_campaign');
    try {
      await catalogRequest({
        action: 'create_campaign',
        name: campaign.name.trim(),
        dailyBudget,
        durationDays,
      });
      onNotify(
        'success',
        'Campaña creada (pausada)',
        'Revísala y actívala en el Administrador de anuncios de Meta.'
      );
      setShowCampaignForm(false);
      setCampaign({ name: '', dailyBudget: '', durationDays: '7' });
    } catch (e) {
      onNotify('error', 'Error al crear campaña', e instanceof Error ? e.message : undefined);
    } finally {
      setWorking(null);
    }
  }

  const lastUpload = status?.latestUpload?.endTime || status?.latestUpload?.startTime;

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold mb-1">Catálogo de vehículos Meta</h3>
          <p className="text-gray-600 text-sm mb-3">
            Sube tu inventario al catálogo de Meta para anuncios dinámicos en Facebook e Instagram
            (Automotive Inventory Ads). Meta descarga tus vehículos publicados cada hora; los
            vendidos u ocultos salen solos del catálogo.
          </p>

          {loading ? (
            <p className="text-sm text-gray-500">Cargando estado…</p>
          ) : !status?.facebookConnected ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
              Conecta Facebook (Meta) primero para activar el catálogo
            </span>
          ) : status.enabled ? (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                ✓ Catálogo activo
              </span>
              <div className="text-xs text-gray-600 space-y-1">
                {typeof status.productCount === 'number' && (
                  <p>
                    Vehículos en el catálogo: <strong>{status.productCount}</strong>
                  </p>
                )}
                {lastUpload && (
                  <p>
                    Última descarga del feed: {new Date(lastUpload).toLocaleString()}
                    {status.latestUpload?.errorCount ? (
                      <span className="text-red-600"> · {status.latestUpload.errorCount} errores</span>
                    ) : null}
                    {status.latestUpload?.warningCount ? (
                      <span className="text-amber-600"> · {status.latestUpload.warningCount} avisos</span>
                    ) : null}
                  </p>
                )}
                {status.config?.catalogId && (
                  <p className="text-gray-400">Catalog ID: {status.config.catalogId}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                Facebook conectado — catálogo sin activar
              </span>
              {status.catalogScopeGranted === false && (
                <p className="text-xs text-red-600">
                  Tu conexión con Meta no incluye el permiso <code>catalog_management</code>. Usa
                  «Actualizar permisos de Facebook» en la tarjeta de Meta (arriba) y acepta todos
                  los permisos; luego vuelve a intentar.
                </p>
              )}
              {status.hasBusinessManager === false && (
                <p className="text-xs text-amber-700">
                  Tu cuenta de Meta no tiene un Business Manager (requisito del catálogo). Créalo
                  gratis en{' '}
                  <a
                    href="https://business.facebook.com/overview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    business.facebook.com
                  </a>{' '}
                  y luego usa «Actualizar permisos de Facebook».
                </p>
              )}
            </div>
          )}
        </div>

        {!loading && status?.facebookConnected && (
          <div className="flex flex-col gap-2 shrink-0">
            {status.enabled ? (
              <>
                <button
                  type="button"
                  disabled={working !== null}
                  onClick={() => void handleAction('sync')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-60"
                >
                  {working === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
                </button>
                <button
                  type="button"
                  disabled={working !== null}
                  onClick={() => setShowCampaignForm((v) => !v)}
                  className="px-4 py-2 border border-primary-300 text-primary-700 rounded-lg hover:bg-primary-50 text-sm font-medium disabled:opacity-60"
                >
                  Campaña dinámica
                </button>
                <button
                  type="button"
                  disabled={working !== null}
                  onClick={() => void handleAction('disable')}
                  className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium disabled:opacity-60"
                >
                  {working === 'disable' ? 'Desactivando…' : 'Desactivar'}
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={working !== null}
                onClick={() => void handleAction('enable')}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-60"
              >
                {working === 'enable' ? 'Activando…' : 'Activar catálogo'}
              </button>
            )}
          </div>
        )}
      </div>

      {showCampaignForm && status?.enabled && (
        <div className="mt-4 border-t pt-4">
          <h4 className="text-sm font-semibold mb-2">Nueva campaña dinámica de inventario</h4>
          <p className="text-xs text-gray-500 mb-3">
            Meta muestra automáticamente el vehículo adecuado a cada persona. La campaña se crea
            pausada para que la revises antes de gastar presupuesto.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={campaign.name}
                onChange={(e) => setCampaign({ ...campaign, name: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Ej: Inventario Julio"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Presupuesto diario (USD)</label>
              <input
                type="number"
                min={1}
                step="0.01"
                value={campaign.dailyBudget}
                onChange={(e) => setCampaign({ ...campaign, dailyBudget: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
                placeholder="Ej: 10"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Duración (días)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={campaign.durationDays}
                onChange={(e) => setCampaign({ ...campaign, durationDays: e.target.value })}
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={working !== null}
              onClick={() => void handleCreateCampaign()}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-60"
            >
              {working === 'create_campaign' ? 'Creando…' : 'Crear campaña (pausada)'}
            </button>
            <button
              type="button"
              onClick={() => setShowCampaignForm(false)}
              className="px-4 py-2 border rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
