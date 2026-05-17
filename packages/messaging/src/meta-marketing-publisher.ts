/**
 * Creación mínima en Meta Marketing API (campaña + ad set en PAUSED).
 * Requiere integración Facebook activa con accessToken y adAccountId (act_…).
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
  if (typeof c === 'number' && (c === 4 || c === 17 || c === 32 || c === 613 || c === 80001 || c === 80003)) return true;
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

export function normalizeAdAccountId(raw: string | undefined | null): string | null {
  if (raw == null || String(raw).trim() === '') return null;
  const s = String(raw).trim();
  if (s.startsWith('act_')) return s;
  const digits = s.replace(/^act_/i, '');
  if (/^\d+$/.test(digits)) return `act_${digits}`;
  return s;
}

export interface CreateDraftPaidMetaParams {
  name: string;
  /** Presupuesto diario en unidades mayores de moneda; se convierte a centavos (mínimo 1.00). */
  dailyBudgetMajorUnits: number;
  /** Países ISO 3166-1 alpha-2, p. ej. ['MX'] */
  countries?: string[];
}

export interface MetaDraftAdsResult {
  success: boolean;
  metaCampaignId?: string;
  metaAdSetId?: string;
  error?: string;
}

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

    return { accessToken, adAccountId: normalized, pageId };
  }

  /**
   * Crea en Meta una campaña y un ad set, ambos en PAUSED (revisar y activar en Ads Manager).
   */
  async createDraftCampaignAndAdSet(
    tenantId: string,
    params: CreateDraftPaidMetaParams
  ): Promise<MetaDraftAdsResult> {
    try {
      const ctx = await this.getFacebookAdsIntegration(tenantId);
      if (!ctx) {
        return {
          success: false,
          error:
            'Falta integración de Facebook activa con página, token e ID de cuenta publicitaria (act_…). Reconecta Facebook (permisos de anuncios) o configura adAccountId en credenciales.',
        };
      }

      const actId = ctx.adAccountId;
      const authHeader = { Authorization: `Bearer ${ctx.accessToken}` };

      const campaignRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/campaigns`,
        {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
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
          error: campaignJson.error?.message || 'No se pudo crear la campaña en Meta',
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

      const adSetRes = await fetchGraphWithRetry(
        `https://graph.facebook.com/${GRAPH_VERSION}/${actId}/adsets`,
        {
          method: 'POST',
          headers: { ...authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `${params.name.slice(0, 120)} — set`,
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
            adSetJson.error?.message ||
            'La campaña se creó en Meta pero falló el conjunto de anuncios. Revísalo en Ads Manager.',
        };
      }

      const metaAdSetId = adSetJson.id;
      return {
        success: true,
        metaCampaignId,
        metaAdSetId: metaAdSetId || undefined,
      };
    } catch (e) {
      console.error('[MetaMarketingPublisher]', e);
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Error desconocido al crear anuncios en Meta',
      };
    }
  }
}
