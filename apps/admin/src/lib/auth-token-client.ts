/** Token de sesión admin (hex 64 chars) — ignora JWT de seller/dealer en localStorage. */
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

function pickAdminToken(...candidates: string[]): string {
  for (const t of candidates) {
    if (t && ADMIN_SESSION_RE.test(t)) return t;
  }
  return '';
}

export function resolveClientAuthToken(): string {
  if (typeof window === 'undefined') return '';

  const fromStorage = localStorage.getItem('authToken') || '';
  const fromCookie = readCookieToken();
  const token = pickAdminToken(fromStorage, fromCookie);

  // Quitar JWT de otra app que bloquea el panel admin
  if (!token && (fromStorage || fromCookie)) {
    localStorage.removeItem('authToken');
    document.cookie = 'authToken=; path=/; max-age=0';
  }

  return token;
}

export function authHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = resolveClientAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
