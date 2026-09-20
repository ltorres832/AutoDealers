const FIREBASE_API_KEYS = [
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  process.env.FIREBASE_WEB_API_KEY,
  'AIzaSyC68yc67kmfrNEgxz8zGzmCCjsOUT7u4y0',
  'AIzaSyDlPCtTMCZy4WXvhhyPOI9fac0LjN1jo44',
].filter(Boolean) as string[];

const REFERER = process.env.E2E_DEALER_URL || 'https://dealer.autodealers-online.com';

export async function getFirebaseIdToken(
  email: string,
  password: string,
  origin = REFERER
): Promise<string> {
  let last = 'Firebase sign-in failed';
  for (const key of FIREBASE_API_KEYS) {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Referer: `${origin}/`,
          Origin: origin,
        },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    const data = await res.json();
    if (res.ok && data.idToken) return data.idToken as string;
    last = data.error?.message || `HTTP ${res.status}`;
  }
  throw new Error(last);
}

export async function injectAuthToken(
  page: import('@playwright/test').Page,
  token: string
): Promise<void> {
  const href = page.url();
  if (href.startsWith('http')) {
    const url = new URL(href);
    await page.context().addCookies([
      {
        name: 'authToken',
        value: token,
        domain: url.hostname,
        path: '/',
        secure: url.protocol === 'https:',
        sameSite: 'Lax',
      },
    ]);
  }
  await page.evaluate((jwt) => {
    const isSecure = window.location.protocol === 'https:';
    const cookieValue = encodeURIComponent(jwt);
    document.cookie = `authToken=${cookieValue}; path=/; max-age=86400; SameSite=Lax${
      isSecure ? '; Secure' : ''
    }`;
    localStorage.setItem('authToken', jwt);
  }, token);
}
