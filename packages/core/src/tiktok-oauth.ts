/**
 * TikTok Login Kit + Content Posting API (OAuth + publish helpers).
 * Docs: https://developers.tiktok.com/doc/content-posting-api-get-started
 */

export const TIKTOK_AUTH_URL = 'https://www.tiktok.com/v2/auth/authorize/';
export const TIKTOK_TOKEN_URL = 'https://open.tiktokapis.com/v2/oauth/token/';
export const TIKTOK_PUBLISH_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/video/init/';
export const TIKTOK_INBOX_INIT_URL =
  'https://open.tiktokapis.com/v2/post/publish/inbox/video/init/';
export const TIKTOK_PUBLISH_STATUS_URL =
  'https://open.tiktokapis.com/v2/post/publish/status/fetch/';

/** Scopes: direct post + inbox upload fallback. */
export const TIKTOK_OAUTH_SCOPES = [
  'user.info.basic',
  'video.publish',
  'video.upload',
].join(',');

export function buildTikTokOAuthDialogUrl(opts: {
  clientKey: string;
  redirectUri: string;
  state: string;
}): string {
  const params = new URLSearchParams({
    client_key: opts.clientKey,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: TIKTOK_OAUTH_SCOPES,
    state: opts.state,
  });
  return `${TIKTOK_AUTH_URL}?${params.toString()}`;
}

export type TikTokTokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_token?: string;
  refresh_expires_in?: number;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export async function exchangeTikTokCode(opts: {
  clientKey: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
}): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: opts.clientKey,
    client_secret: opts.clientSecret,
    code: opts.code,
    grant_type: 'authorization_code',
    redirect_uri: opts.redirectUri,
  });
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as TikTokTokenResponse;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'TikTok token exchange failed'
    );
  }
  return data;
}

export async function refreshTikTokToken(opts: {
  clientKey: string;
  clientSecret: string;
  refreshToken: string;
}): Promise<TikTokTokenResponse> {
  const body = new URLSearchParams({
    client_key: opts.clientKey,
    client_secret: opts.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: opts.refreshToken,
  });
  const res = await fetch(TIKTOK_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = (await res.json()) as TikTokTokenResponse;
  if (!res.ok || data.error || !data.access_token) {
    throw new Error(
      data.error_description || data.error || 'TikTok token refresh failed'
    );
  }
  return data;
}
