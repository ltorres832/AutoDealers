import { DEALER_ACTIVE_TENANT_KEY } from './dealer-tenant-storage';

const ADMIN_SESSION_RE = /^[a-f0-9]{64}$/i;

function readCookieToken(): string {
  const match = document.cookie.split(';').find((c) => c.trim().startsWith('authToken='));
  if (!match) return '';
  const raw = match.split('=').slice(1).join('=').trim();
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

function pickFirebaseJwt(...candidates: string[]): string {
  for (const t of candidates) {
    if (!t || ADMIN_SESSION_RE.test(t)) continue;
    if (t.length >= 200 && t.startsWith('eyJ')) return t;
  }
  return '';
}

export function resolveClientAuthToken(): string {
  if (typeof window === 'undefined') return '';
  return pickFirebaseJwt(localStorage.getItem('authToken') || '', readCookieToken());
}

export function authHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = resolveClientAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (typeof window !== 'undefined') {
    try {
      const active = sessionStorage.getItem(DEALER_ACTIVE_TENANT_KEY)?.trim();
      if (active && !headers.has('X-Dealer-Tenant-Id')) {
        headers.set('X-Dealer-Tenant-Id', active);
      }
    } catch {
      // ignore
    }
  }
  return headers;
}
