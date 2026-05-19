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

function clearCrossAppTokens(): void {
  const storage = localStorage.getItem('authToken') || '';
  const cookie = readCookieToken();
  if (ADMIN_SESSION_RE.test(storage)) {
    localStorage.removeItem('authToken');
  }
  if (ADMIN_SESSION_RE.test(cookie)) {
    document.cookie = 'authToken=; path=/; max-age=0';
    document.cookie = 'authToken=; path=/seller; max-age=0';
    document.cookie = 'authToken=; path=/admin; max-age=0';
    document.cookie = 'authToken=; path=/dealer; max-age=0';
  }
}

/** Firebase JWT del vendedor; rechaza sessionId del panel admin. */
function pickSellerToken(...candidates: string[]): string {
  for (const t of candidates) {
    if (!t || ADMIN_SESSION_RE.test(t)) continue;
    if (t.length >= 200 && t.startsWith('eyJ')) return t;
  }
  return '';
}

export function resolveClientAuthToken(): string {
  if (typeof window === 'undefined') return '';

  clearCrossAppTokens();

  return pickSellerToken(
    localStorage.getItem('authToken') || '',
    readCookieToken()
  );
}

export function authHeaders(init?: HeadersInit): Headers {
  const headers = new Headers(init);
  const token = resolveClientAuthToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return headers;
}
