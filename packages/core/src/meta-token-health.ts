/**
 * Auditoría de token Meta: scopes concedidos, páginas y cuenta publicitaria.
 */

import {
  META_REQUIRED_SCOPES_INSTAGRAM,
  META_REQUIRED_SCOPES_ORGANIC,
  META_REQUIRED_SCOPES_PAID_ADS,
} from './meta-oauth-scopes';

const GRAPH_VERSION = 'v18.0';

export interface MetaTokenHealth {
  checkedAt: string;
  tokenValid: boolean;
  expiresAt?: number;
  grantedScopes: string[];
  missingScopes: string[];
  missingForOrganic: string[];
  missingForPaidAds: string[];
  missingForInstagram: string[];
  pagesOk: boolean;
  pageTokenOk: boolean;
  adAccountsOk: boolean;
  adAccountId?: string;
  adAccountName?: string;
  pageId?: string;
  pageName?: string;
  warnings: string[];
  readyForOrganic: boolean;
  readyForPaidAds: boolean;
  readyForInstagram: boolean;
}

function scopeGranted(granted: string[], required: string): boolean {
  const set = new Set(granted.map((s) => s.toLowerCase()));
  return set.has(required.toLowerCase());
}

function missingFrom(granted: string[], required: readonly string[]): string[] {
  return required.filter((s) => !scopeGranted(granted, s));
}

function parseGrantedScopes(debugData: {
  scopes?: string[];
  granular_scopes?: Array<{ scope?: string }>;
}): string[] {
  if (Array.isArray(debugData.scopes) && debugData.scopes.length > 0) {
    return debugData.scopes.map((s) => String(s));
  }
  if (Array.isArray(debugData.granular_scopes)) {
    return debugData.granular_scopes
      .map((g) => (g.scope != null ? String(g.scope) : ''))
      .filter(Boolean);
  }
  return [];
}

/** Convierte token de corta duración en token de usuario de larga duración (~60 días). */
export async function exchangeForLongLivedUserToken(
  appId: string,
  appSecret: string,
  shortLivedToken: string
): Promise<{ token: string; expiresIn?: number; error?: string }> {
  try {
    const url =
      `https://graph.facebook.com/${GRAPH_VERSION}/oauth/access_token?` +
      `grant_type=fb_exchange_token&` +
      `client_id=${encodeURIComponent(appId)}&` +
      `client_secret=${encodeURIComponent(appSecret)}&` +
      `fb_exchange_token=${encodeURIComponent(shortLivedToken)}`;
    const res = await fetch(url, { method: 'GET' });
    const json = (await res.json()) as {
      access_token?: string;
      expires_in?: number;
      error?: { message?: string };
    };
    if (!res.ok || !json.access_token) {
      return {
        token: shortLivedToken,
        error: json.error?.message || 'No se pudo obtener token de larga duración',
      };
    }
    return { token: json.access_token, expiresIn: json.expires_in };
  } catch (e) {
    return {
      token: shortLivedToken,
      error: e instanceof Error ? e.message : 'Error al renovar token',
    };
  }
}

export async function auditMetaUserAccess(input: {
  appId: string;
  appSecret: string;
  userAccessToken: string;
  pageAccessToken?: string;
  pageId?: string;
  adAccountId?: string;
}): Promise<MetaTokenHealth> {
  const warnings: string[] = [];
  const checkedAt = new Date().toISOString();
  let grantedScopes: string[] = [];
  let tokenValid = false;
  let expiresAt: number | undefined;

  const appToken = `${input.appId}|${input.appSecret}`;
  try {
    const debugRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?` +
        `input_token=${encodeURIComponent(input.userAccessToken)}&` +
        `access_token=${encodeURIComponent(appToken)}`
    );
    const debugJson = (await debugRes.json()) as {
      data?: {
        is_valid?: boolean;
        expires_at?: number;
        scopes?: string[];
        granular_scopes?: Array<{ scope?: string }>;
      };
      error?: { message?: string };
    };
    if (debugRes.ok && debugJson.data) {
      tokenValid = debugJson.data.is_valid === true;
      expiresAt = debugJson.data.expires_at;
      grantedScopes = parseGrantedScopes(debugJson.data);
    } else {
      warnings.push(
        debugJson.error?.message || 'No se pudo verificar el token con debug_token'
      );
    }
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Error en debug_token');
  }

  const missingForOrganic = missingFrom(grantedScopes, META_REQUIRED_SCOPES_ORGANIC);
  const missingForPaidAds = missingFrom(grantedScopes, META_REQUIRED_SCOPES_PAID_ADS);
  const missingForInstagram = missingFrom(grantedScopes, META_REQUIRED_SCOPES_INSTAGRAM);
  const missingScopes = [
    ...new Set([...missingForOrganic, ...missingForPaidAds, ...missingForInstagram]),
  ];

  let pagesOk = false;
  let pageTokenOk = false;
  let pageId = input.pageId;
  let pageName: string | undefined;

  try {
    const pagesRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/accounts?` +
        `fields=id,name,access_token&access_token=${encodeURIComponent(input.userAccessToken)}`
    );
    const pagesJson = (await pagesRes.json()) as {
      data?: Array<{ id?: string; name?: string; access_token?: string }>;
      error?: { message?: string };
    };
    if (pagesRes.ok && Array.isArray(pagesJson.data) && pagesJson.data.length > 0) {
      pagesOk = true;
      const match =
        pageId != null
          ? pagesJson.data.find((p) => String(p.id) === String(pageId))
          : pagesJson.data[0];
      const page = match ?? pagesJson.data[0];
      pageId = page?.id != null ? String(page.id) : pageId;
      pageName = page?.name != null ? String(page.name) : undefined;
      const pt =
        input.pageAccessToken?.trim() ||
        (typeof page?.access_token === 'string' ? page.access_token.trim() : '');
      if (pt && pageId) {
        const probe = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${pageId}?` +
            `fields=id,name&access_token=${encodeURIComponent(pt)}`
        );
        pageTokenOk = probe.ok;
        if (!probe.ok) {
          warnings.push('El token de página no pudo leer la página; vuelve a conectar Meta.');
        }
      }
    } else if (pagesJson.error?.message) {
      warnings.push(`Páginas: ${pagesJson.error.message}`);
    }
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Error al listar páginas');
  }

  let adAccountsOk = false;
  let adAccountId = input.adAccountId;
  let adAccountName: string | undefined;

  try {
    const adsRes = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/me/adaccounts?` +
        `fields=id,account_id,name&limit=5&access_token=${encodeURIComponent(input.userAccessToken)}`
    );
    const adsJson = (await adsRes.json()) as {
      data?: Array<{ id?: string; name?: string }>;
      error?: { message?: string };
    };
    if (adsRes.ok && Array.isArray(adsJson.data) && adsJson.data.length > 0) {
      adAccountsOk = true;
      const first = adsJson.data[0];
      if (!adAccountId && first?.id) adAccountId = String(first.id);
      adAccountName = first?.name != null ? String(first.name) : undefined;
    } else if (adsJson.error?.message) {
      warnings.push(`Cuentas publicitarias: ${adsJson.error.message}`);
    } else if (missingForPaidAds.length === 0) {
      warnings.push(
        'No hay cuentas publicitarias visibles. Verifica Business Manager y que seas admin de la cuenta ads.'
      );
    }
  } catch (e) {
    warnings.push(e instanceof Error ? e.message : 'Error al listar cuentas publicitarias');
  }

  const readyForOrganic =
    tokenValid && pagesOk && pageTokenOk && missingForOrganic.length === 0;
  const readyForPaidAds =
    tokenValid && adAccountsOk && missingForPaidAds.length === 0 && !!adAccountId;
  const readyForInstagram = tokenValid && missingForInstagram.length === 0;

  if (missingScopes.length > 0) {
    warnings.push(
      `Faltan permisos en el token: ${missingScopes.join(', ')}. Usa «Actualizar permisos de Facebook».`
    );
  }

  return {
    checkedAt,
    tokenValid,
    expiresAt,
    grantedScopes,
    missingScopes,
    missingForOrganic,
    missingForPaidAds,
    missingForInstagram,
    pagesOk,
    pageTokenOk,
    adAccountsOk,
    adAccountId,
    adAccountName,
    pageId,
    pageName,
    warnings,
    readyForOrganic,
    readyForPaidAds,
    readyForInstagram,
  };
}

/** Token de larga duración + auditoría de permisos (usar tras el intercambio OAuth). */
export async function finalizeMetaUserAccessToken(input: {
  appId: string;
  appSecret: string;
  shortLivedToken: string;
  pageAccessToken?: string;
  pageId?: string;
  adAccountId?: string;
}): Promise<{ accessToken: string; tokenHealth: MetaTokenHealth }> {
  const exchanged = await exchangeForLongLivedUserToken(
    input.appId,
    input.appSecret,
    input.shortLivedToken
  );
  const tokenHealth = await auditMetaUserAccess({
    appId: input.appId,
    appSecret: input.appSecret,
    userAccessToken: exchanged.token,
    pageAccessToken: input.pageAccessToken,
    pageId: input.pageId,
    adAccountId: input.adAccountId,
  });
  if (exchanged.error) {
    tokenHealth.warnings.push(`Token de larga duración: ${exchanged.error}`);
  }
  return { accessToken: exchanged.token, tokenHealth };
}
