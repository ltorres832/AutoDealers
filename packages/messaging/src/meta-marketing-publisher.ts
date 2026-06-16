/**
 * Meta Marketing API: campaña de pago completa (campaña + conjunto + creativo + anuncio) en ACTIVE.
 * Requiere integración Facebook activa con accessToken, pageId y adAccountId (act_…).
 */

import { getFirestore } from '@autodealers/shared';

const GRAPH_VERSION = 'v18.0';
const GRAPH_RETRIES = 3;
const GRAPH_BASE_DELAY_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function graphResponseRetryable(status: number, body: { error?: { code?: number } }): boolean {
  if (status === 429 || status === 500 || status === 502 || status === 503 || status === 408) return true;
  const c = body?.error?.code;
  if (typeof c === 'number' && (c === 4 || c === 17 || c === 32 || c === 613 || c === 80001 || c === 80003)) {
    return true;
  }
  return false;
}

async function fetchGraphWithRetry(url: string, init: RequestInit): Promise<Response> {
  let last: Response | null = null;
  for (let attempt = 0; attempt < GRAPH_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, init);
    } catch {
      if (attempt === GRAPH_RETRIES - 1) {
        throw new Error('Error de red al contactar Graph API');
      }
      await sleep(GRAPH_BASE_DELAY_MS * (attempt + 1));
      continue;
    }
    last = res;
    if (res.ok) return res;
    let body: { error?: { code?: number; message?: string } } = {};
    try {
      body = (await res.clone().json()) as { error?: { code?: number; message?: string } };
    } catch {
      /* ignore */
    }
    if (!graphResponseRetryable(res.status, body) || attempt === GRAPH_RETRIES - 1) {
      return res;
    }
    await sleep(GRAPH_BASE_DELAY_MS * Math.pow(2, attempt));
  }
  return last!;
}

function graphErrorMessage(json: { error?: { message?: string } }, fallback: string): string {
  return json.error?.message?.trim() || fallback;
}

function normalizeExternalUrl(raw: string): string {
  const s = (raw || '').trim();
  if (!s) return '';
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

export function normalizeAdAccountId(raw: string | undefined | null): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  if (s.startsWith('act_')) return s;
  const digits = s.replace(/^act_/i, '');
  if (/^\d+$/.test(digits)) return `act_${digits}`;
  return s;
}

export interface CreatePaidMetaParams {
  name: string;
  /** Presupuesto diario en unidades mayores de moneda; se convierte a centavos (mínimo 1.00). */
  dailyBudgetMajorUnits: number;
  /** Texto del anuncio */
  message: string;
  /** URL de destino del clic */
  linkUrl: string;
  /** Imagen pública (Storage/CDN) — recomendado para el creativo */
  imageUrl?: string;
  /** Países ISO 3166-1 alpha-2, p. ej. ['MX'] */
  countries?: string[];
  /** Dónde mostrar el anuncio */
  platforms?: ('facebook' | 'instagram')[];
}

export interface MetaPaidAdsResult {
  success: boolean;
  metaCampaignId?: string;
  metaAdSetId?: string;
  metaCreativeId?: string;
  metaAdId?: string;
  error?: string;
}

/** @deprecated Usar CreatePaidMetaParams */
export type CreateDraftPaidMetaParams = Pick<
  CreatePaidMetaParams,
  'name' | 'dailyBudgetMajorUnits' | 'countries'
>;

/** @deprecated Usar MetaPaidAdsResult */
export type MetaDraftAdsResult = MetaPaidAdsResult;

export class MetaMarketingPublisherService {
  private db = getFirestore();

  private async getFacebookAdsIntegration(tenantId: string): Promise<{
    accessToken: string;
    adAccountId: string;
    pageId: string;
  } | null> {
    const snap = await this.db
      .collection('tenants')
      .doc(tenantId)
      .collection('integrations')
      .where('type', '==', 'facebook')
      .where('status', '==', 'active')
      .get();

    if (snap.empty) return null;

    const data = snap.docs[0].data();
    const cred = data.credentials as Record<string, unknown> | undefined;
    const accessToken = cred?.accessToken != null ? String(cred.accessToken) : '';
    const pageId = cred?.pageId != null ? String(cred.pageId) : '';
    const normalized = normalizeAdAccountId(
      cred?.adAccountId != null ? String(cred.adAccountId) : null
    );
    if (!accessToken || !normalized || !pageId) return null;

    const health = cred?.metaTokenHealth as
      | { readyForPaidAds?: boolean; missingScopes?: string[] }
      | undefined;
    if (health && health.readyForPaidAds === false) {
      console.warn('[MetaMarketingPublisher] Token sin permisos de ads completos', health.missingScopes);
    }

    return { accessToken, adAccountId: normalized, pageId };
  }

  /** URL de destino para anuncios de tráfico (contenido, settings del tenant o mini-sitio). */
  async resolveTenantLandingUrl(
    tenantId: string,
    contentLink?: string | null
  ): Promise<string> {
    const fromContent = contentLink != null ? normalizeExternalUrl(String(contentLink)) : '';
    if (fromContent) return fromContent;

    const tenantSnap = await this.db.collection('tenants').doc(tenantId).get();
    const t = tenantSnap.data() as Record<string, unknown> | undefined;
    const settings = (t?.settings || {}) as Record<string, unknown>;
    for (const key of ['publicCatalogUrl', 'websiteUrl', 'publicWebsiteUrl', 'catalogUrl']) {
      const v = settings[key];
      if (typeof v === 'string' && v.trim()) {
        return normalizeExternalUrl(v);
      }
    }

    const subdomain = t?.subdomain != null ? String(t.subdomain).trim().toLowerCase() : '';
    if (subdomain) {
      const domain = (process.env.NEXT_PUBLIC_PLATFORM_DOMAIN || 'autodealers.com').replace(
        /^\./,
        ''
      );
      return `https://${subdomain}.${domain}`;
    }

    const base = (
      process.env.NEXT_PUBLIC_PUBLIC_WEB_URL || 'https://autodealers-7f62e.web.app'
    ).replace(/\/$/, '');
    return base;
  }

  private async uploadAdImageHash(
    actId: string,
    accessToken: string,
    imageUrl: string
  ): Promise<string | null> {
    const res = await fetchGraphWithRetry(
      `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/adimages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: imageUrl }),
      }
    );
    const json = (await res.json()) as {
      images?: Record<string, { hash?: string }>;
      error?: { message?: string };
    };
    if (!res.ok) {
      console.warn('[MetaMarketingPublisher] adimages:', json.error?.message);
      return null;
    }
    const images = json.images;
    if (!images || typeof images !== 'object') return null;
    for (const entry of Object.values(images)) {
      if (entry?.hash) return entry.hash;
    }
    return null;
  }

  private publisherPlatforms(platforms?: ('facebook' | 'instagram')[]): string[] {
    const hasIg = platforms?.includes('instagram');
    const hasFb = platforms?.includes('facebook');
    if (hasIg && hasFb) return ['facebook', 'instagram'];
    if (hasIg) return ['facebook', 'instagram'];
    return ['facebook'];
  }

  /**
   * Crea y activa en Meta una campaña de pago con anuncio (cobro en la cuenta publicitaria del tenant).
   */
  async createAndLaunchPaidCampaign(
    tenantId: string,
    params: CreatePaidMetaParams
  ): Promise<MetaPaidAdsResult> {
    try {
      const ctx = await this.getFacebookAdsIntegration(tenantId);
      if (!ctx) {
        return {
          success: false,
          error:
            'Falta integración de Facebook activa con página, token e ID de cuenta publicitaria (act_…). Ve a Integraciones → Actualizar permisos de Facebook y acepta ads_management, ads_read y business_management.',
        };
      }

      const fbSnap = await this.db
        .collection('tenants')
        .doc(tenantId)
        .collection('integrations')
        .where('type', '==', 'facebook')
        .where('status', '==', 'active')
        .limit(1)
        .get();
      if (!fbSnap.empty) {
        const cred = (fbSnap.docs[0].data().credentials || {}) as Record<string, unknown>;
        const health = cred.metaTokenHealth as { readyForPaidAds?: boolean; missingScopes?: string[] } | undefined;
        if (health?.readyForPaidAds === false) {
          const missing = health.missingScopes?.length
            ? ` Faltan: ${health.missingScopes.join(', ')}.`
            : '';
          return {
            success: false,
            error: `El token de Meta no tiene permisos de publicidad completos.${missing} Integraciones → Actualizar permisos de Facebook.`,
          };
        }
      }

      const linkUrl = normalizeExternalUrl(params.linkUrl);
      if (!linkUrl) {
        return {
          success: false,
          error:
            'Falta URL de destino para el anuncio. Configura el enlace en el contenido de la campaña o el sitio público del tenant (subdominio).',
        };
      }

      const message = (params.message || params.name).slice(0, 2000).trim();
      if (!message) {
        return { success: false, error: 'El texto del anuncio es obligatorio.' };
      }

      const actId = ctx.adAccountId;
      const authHeader = { Authorization: `Bearer ${ctx.accessToken}` };
      const jsonHeaders = { ...authHeader, 'Content-Type': 'application/json' };

      let imageHash: string | null = null;
      if (params.imageUrl?.trim()) {
        imageHash = await this.uploadAdImageHash(actId, ctx.accessToken, params.imageUrl.trim());
      }

      const campaignRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/campaigns`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            name: params.name.slice(0, 200),
            objective: 'OUTCOME_TRAFFIC',
            status: 'PAUSED',
            special_ad_categories: [],
            is_adset_budget_sharing_enabled: false,
          }),
        }
      );

      const campaignJson = (await campaignRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!campaignRes.ok) {
        return {
          success: false,
          error: graphErrorMessage(campaignJson, 'No se pudo crear la campaña en Meta'),
        };
      }

      const metaCampaignId = campaignJson.id;
      if (!metaCampaignId) {
        return { success: false, error: 'Meta no devolvió el ID de campaña' };
      }

      const countries =
        params.countries && params.countries.length > 0 ? params.countries : ['MX'];
      const dailyBudgetCents = Math.max(
        100,
        Math.round(Math.max(params.dailyBudgetMajorUnits, 1) * 100)
      );
      const publisherPlatforms = this.publisherPlatforms(params.platforms);

      const adSetRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/adsets`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            name: `${params.name.slice(0, 120)} — conjunto`,
            campaign_id: metaCampaignId,
            daily_budget: dailyBudgetCents,
            billing_event: 'IMPRESSIONS',
            optimization_goal: 'LINK_CLICKS',
            bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
            promoted_object: { page_id: ctx.pageId },
            targeting: {
              geo_locations: { countries },
              age_min: 18,
              age_max: 65,
              publisher_platforms: publisherPlatforms,
            },
            status: 'PAUSED',
          }),
        }
      );

      const adSetJson = (await adSetRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!adSetRes.ok) {
        return {
          success: false,
          metaCampaignId,
          error:
            graphErrorMessage(adSetJson, 'La campaña se creó en Meta pero falló el conjunto de anuncios.'),
        };
      }

      const metaAdSetId = adSetJson.id;
      if (!metaAdSetId) {
        return {
          success: false,
          metaCampaignId,
          error: 'Meta no devolvió el ID del conjunto de anuncios',
        };
      }

      const linkData: Record<string, unknown> = {
        message,
        link: linkUrl,
        call_to_action: {
          type: 'LEARN_MORE',
          value: { link: linkUrl },
        },
      };
      if (imageHash) {
        linkData.image_hash = imageHash;
      } else if (params.imageUrl?.trim()) {
        linkData.picture = params.imageUrl.trim();
      }

      const creativeRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/adcreatives`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            name: `${params.name.slice(0, 100)} — creativo`,
            object_story_spec: {
              page_id: ctx.pageId,
              link_data: linkData,
            },
          }),
        }
      );

      const creativeJson = (await creativeRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!creativeRes.ok) {
        return {
          success: false,
          metaCampaignId,
          metaAdSetId,
          error: graphErrorMessage(
            creativeJson,
            'No se pudo crear el creativo del anuncio. Añade una imagen válida (JPG/PNG, URL pública).'
          ),
        };
      }

      const metaCreativeId = creativeJson.id;
      if (!metaCreativeId) {
        return {
          success: false,
          metaCampaignId,
          metaAdSetId,
          error: 'Meta no devolvió el ID del creativo',
        };
      }

      const adRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/ads`,
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({
            name: `${params.name.slice(0, 120)} — anuncio`,
            adset_id: metaAdSetId,
            creative: { creative_id: metaCreativeId },
            status: 'PAUSED',
          }),
        }
      );

      const adJson = (await adRes.json()) as {
        id?: string;
        error?: { message?: string };
      };
      if (!adRes.ok) {
        return {
          success: false,
          metaCampaignId,
          metaAdSetId,
          metaCreativeId,
          error: graphErrorMessage(adJson, 'No se pudo crear el anuncio en Meta'),
        };
      }

      const metaAdId = adJson.id;
      if (!metaAdId) {
        return {
          success: false,
          metaCampaignId,
          metaAdSetId,
          metaCreativeId,
          error: 'Meta no devolvió el ID del anuncio',
        };
      }

      const activateTargets: Array<{ id: string; label: string }> = [
        { id: metaAdId, label: 'anuncio' },
        { id: metaAdSetId, label: 'conjunto' },
        { id: metaCampaignId, label: 'campaña' },
      ];

      for (const { id, label } of activateTargets) {
        const activeRes = await fetchGraphWithRetry(
          `https://graph.facebook.com/${GRAPH_VERSION}/${id}`,
          {
            method: 'POST',
            headers: jsonHeaders,
            body: JSON.stringify({ status: 'ACTIVE' }),
          }
        );
        const activeJson = (await activeRes.json()) as { error?: { message?: string } };
        if (!activeRes.ok) {
          return {
            success: false,
            metaCampaignId,
            metaAdSetId,
            metaCreativeId,
            metaAdId,
            error: graphErrorMessage(
              activeJson,
              `El anuncio se creó pero no se pudo activar el ${label} en Meta. Revisa permisos, método de pago y políticas en Ads Manager.`
            ),
          };
        }
      }

      return {
        success: true,
        metaCampaignId,
        metaAdSetId,
        metaCreativeId,
        metaAdId,
      };
    } catch (e) {
      console.error('[MetaMarketingPublisher]', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error desconocido al crear anuncios en Meta',
      };
    }
  }

  /**
   * @deprecated Usar createAndLaunchPaidCampaign
   */
  async createDraftCampaignAndAdSet(
    tenantId: string,
    params: CreateDraftPaidMetaParams
  ): Promise<MetaPaidAdsResult> {
    const linkUrl = await this.resolveTenantLandingUrl(tenantId);
    return this.createAndLaunchPaidCampaign(tenantId, {
      ...params,
      message: params.name,
      linkUrl,
      platforms: ['facebook'],
    });
  }
}
