/**
 * Permisos OAuth Meta (Facebook / Instagram / Ads).
 * Deben coincidir con los solicitados en la app de Meta for Developers.
 */

/** Publicación orgánica, mensajes y lectura de página. */
export const META_FACEBOOK_ORGANIC_SCOPES = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_messaging',
] as const;

/** Cuentas publicitarias y campañas de pago (Marketing API). */
export const META_FACEBOOK_ADS_SCOPES = ['business_management', 'ads_read', 'ads_management'] as const;

/** Instagram Business vinculado a la página. */
export const META_INSTAGRAM_OAUTH_SCOPES = [
  'instagram_basic',
  'instagram_content_publish',
  'instagram_manage_messages',
] as const;

/** Todos los permisos Facebook en un solo string OAuth. */
export const META_FACEBOOK_OAUTH_SCOPES = [
  ...META_FACEBOOK_ORGANIC_SCOPES,
  ...META_FACEBOOK_ADS_SCOPES,
].join(',');

export const META_INSTAGRAM_OAUTH_SCOPES_STRING = META_INSTAGRAM_OAUTH_SCOPES.join(',');

export const META_PAGES_GRAPH_FIELDS =
  'id,name,access_token,instagram_business_account{id,username}';

/** Permisos mínimos por capacidad (para auditoría tras OAuth). */
export const META_REQUIRED_SCOPES_ORGANIC: readonly string[] = [
  'pages_show_list',
  'pages_manage_posts',
  'pages_read_engagement',
];

export const META_REQUIRED_SCOPES_PAID_ADS: readonly string[] = [
  'ads_management',
  'ads_read',
  'business_management',
  'pages_show_list',
];

export const META_REQUIRED_SCOPES_INSTAGRAM: readonly string[] = [
  'instagram_basic',
  'instagram_content_publish',
];

export const META_RECOMMENDED_SCOPES_MESSAGING: readonly string[] = [
  'pages_messaging',
  'instagram_manage_messages',
];

/**
 * Scopes OAuth según el flujo. Siempre incluye Facebook + Ads + Instagram
 * en un solo consentimiento para evitar reconexiones parciales.
 */
export function resolveMetaOAuthScopes(type: 'meta' | 'facebook' | 'instagram'): string {
  void type;
  return `${META_FACEBOOK_OAUTH_SCOPES},${META_INSTAGRAM_OAUTH_SCOPES_STRING}`;
}

export function buildMetaOAuthDialogUrl(params: {
  appId: string;
  redirectUri: string;
  state: string;
  type?: 'meta' | 'facebook' | 'instagram';
  /** Fuerza pantalla de permisos (reconectar / actualizar). */
  reauthorize?: boolean;
}): string {
  const scope = resolveMetaOAuthScopes(params.type ?? 'meta');
  const q = new URLSearchParams({
    client_id: params.appId,
    redirect_uri: params.redirectUri,
    scope,
    response_type: 'code',
    state: params.state,
  });
  if (params.reauthorize) {
    q.set('auth_type', 'rerequest');
  }
  return `https://www.facebook.com/v18.0/dialog/oauth?${q.toString()}`;
}
