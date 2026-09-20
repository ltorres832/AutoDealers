import { test, expect, type Page } from '@playwright/test';
import { URLS } from '../helpers/env';
import { loadAllCreds } from '../helpers/all-creds';
import { dismissBlockingModals, loginPortal } from '../helpers/login';
import { getFirebaseIdToken, injectAuthToken } from '../helpers/firebase-auth';

const PUBLIC_PAGES = [
  '/',
  '/register',
  '/login',
  '/precios',
  '/advertise',
  '/dealers',
  '/plataforma',
  '/contacto',
  '/caracteristicas',
  '/sobre-nosotros',
  '/faq',
  '/privacidad',
  '/terminos',
  '/publicar-gratis',
  '/demo-dealer',
  '/demo-vendedor',
];

const ADMIN_PAGES = [
  '/admin/global',
  '/admin/kpis',
  '/admin/public-analytics',
  '/admin/reports',
  '/admin/stripe',
  '/admin/users',
  '/admin/tenants',
  '/admin/memberships',
  '/admin/custom-memberships',
  '/admin/subscriptions',
  '/admin/newsletter',
  '/admin/contact-inquiries',
  '/admin/all-leads',
  '/admin/tasks',
  '/admin/workflows',
  '/admin/all-vehicles',
  '/admin/dealers',
  '/admin/sellers',
  '/admin/all-campaigns',
  '/admin/all-promotions',
  '/admin/banners',
  '/admin/reviews',
  '/admin/testimonials',
  '/admin/referrals',
  '/admin/advertisers',
  '/admin/sponsored-content',
  '/admin/advertiser-pricing',
  '/admin/landing-config',
  '/admin/quick-listings',
  '/admin/settings',
  '/admin/settings/general',
  '/admin/settings/branding',
  '/admin/settings/site-info',
  '/admin/settings/integrations',
  '/admin/policies',
  '/admin/logs',
];

const SELLER_PAGES = [
  '/dashboard',
  '/leads',
  '/leads/kanban',
  '/catalog-interest',
  '/tasks',
  '/workflows',
  '/inventory',
  '/documents',
  '/messages',
  '/internal-chat',
  '/public-chat',
  '/appointments',
  '/campaigns',
  '/social-posts',
  '/promotions',
  '/banners',
  '/referrals',
  '/reviews',
  '/customer-files',
  '/fi',
  '/deals',
  '/sales-statistics',
  '/reports',
  '/users',
  '/policies',
  '/settings',
  '/settings/membership',
  '/settings/membership/payment',
  '/settings/membership/payment-methods',
  '/settings/profile',
  '/settings/integrations',
  '/settings/website',
];

const ADVERTISER_PAGES = [
  '/dashboard',
  '/dashboard/ads',
  '/dashboard/ads/create',
  '/dashboard/metrics',
  '/dashboard/billing',
  '/dashboard/payments',
  '/dashboard/policies',
  '/dashboard/profile',
];

type FailBag = { page: string; kind: string; detail: string };

async function visitAndProbe(
  page: Page,
  origin: string,
  path: string,
  failures: FailBag[],
  reauth: () => Promise<void>
): Promise<void> {
  const api5xx: string[] = [];
  const pageErrors: string[] = [];
  const onResponse = (res: import('@playwright/test').Response) => {
    if (!res.url().includes('/api/')) return;
    if (res.url().includes('/api/auth/firebase-client-token')) return;
    if (res.status() >= 500) api5xx.push(`${res.status()} ${res.url()}`);
  };
  const onPageError = (err: Error) => {
    const msg = err.message || String(err);
    if (/Cannot find module 'node:crypto'|Minified React error #310|ChunkLoadError|Hydration|is not a function/i.test(msg)) {
      pageErrors.push(msg.slice(0, 200));
    }
  };
  page.on('response', onResponse);
  page.on('pageerror', onPageError);
  try {
    let res: import('@playwright/test').Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
        break;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (attempt < 3 && /ERR_ABORTED|interrupted|Timeout/i.test(msg)) {
          await page.waitForTimeout(700 * attempt);
          continue;
        }
        failures.push({ page: path, kind: 'nav', detail: msg.slice(0, 180) });
        return;
      }
    }
    await page.waitForTimeout(1200);
    await dismissBlockingModals(page);
    if (/\/login\/?$/.test(new URL(page.url()).pathname) && path !== '/login') {
      await reauth();
      await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(800);
      await dismissBlockingModals(page);
    }
    if (/\/login\/?$/.test(new URL(page.url()).pathname) && path !== '/login') {
      failures.push({ page: path, kind: 'session', detail: 'redirigió a /login' });
      return;
    }
    if ((res?.status() ?? 0) >= 500) failures.push({ page: path, kind: 'http', detail: `shell ${res?.status()}` });
    if (await page.getByText(/Algo salió mal/i).isVisible().catch(() => false)) {
      failures.push({ page: path, kind: 'error-boundary', detail: 'Algo salió mal' });
    }
    for (const msg of api5xx) failures.push({ page: path, kind: 'api-5xx', detail: msg });
    for (const msg of pageErrors) failures.push({ page: path, kind: 'pageerror', detail: msg });
  } finally {
    page.off('response', onResponse);
    page.off('pageerror', onPageError);
  }
}

test.describe.configure({ mode: 'default' });

test('public-web — páginas de marketing', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const failures: FailBag[] = [];
  for (const path of PUBLIC_PAGES) {
    await visitAndProbe(page, URLS.public, path, failures, async () => undefined);
  }
  if (failures.length) {
    expect(failures, failures.map((f) => `[${f.kind}] ${f.page}: ${f.detail}`).join('\n')).toEqual([]);
  }
});

test('admin — todas las pantallas del menú', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const creds = loadAllCreds();
  await page.goto(`${URLS.admin}/login`);
  await injectAuthToken(page, creds.admin.sessionId);
  await page.goto(`${URLS.admin}/admin/global`, { waitUntil: 'domcontentloaded' });
  const failures: FailBag[] = [];
  for (const path of ADMIN_PAGES) {
    await visitAndProbe(page, URLS.admin, path, failures, async () => {
      await injectAuthToken(page, creds.admin.sessionId);
    });
  }
  if (failures.length) {
    expect(failures, failures.map((f) => `[${f.kind}] ${f.page}: ${f.detail}`).join('\n')).toEqual([]);
  }
});

test('seller — todas las pantallas del menú', async ({ page }) => {
  test.setTimeout(15 * 60_000);
  const creds = loadAllCreds();
  let token = await getFirebaseIdToken(creds.seller.email, creds.seller.password, URLS.seller);
  await page.goto(`${URLS.seller}/login`);
  await injectAuthToken(page, token);
  await page.goto(`${URLS.seller}/dashboard`, { waitUntil: 'domcontentloaded' });
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
    await loginPortal(page, {
      loginUrl: `${URLS.seller}/login`,
      email: creds.seller.email,
      password: creds.seller.password,
      allowedPath: /\/(dashboard|settings\/membership)/,
      firebaseFallback: true,
      afterLoginUrl: `${URLS.seller}/dashboard`,
    });
  }
  const failures: FailBag[] = [];
  for (const path of SELLER_PAGES) {
    await visitAndProbe(page, URLS.seller, path, failures, async () => {
      try {
        token = await getFirebaseIdToken(creds.seller.email, creds.seller.password, URLS.seller);
      } catch {
        /* keep */
      }
      await injectAuthToken(page, token);
    });
  }
  if (failures.length) {
    expect(failures, failures.map((f) => `[${f.kind}] ${f.page}: ${f.detail}`).join('\n')).toEqual([]);
  }
});

test('advertiser — dashboard y billing', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const creds = loadAllCreds();
  await page.goto(`${URLS.advertiser}/login`);
  await injectAuthToken(page, creds.advertiser.sessionToken);
  await page.goto(`${URLS.advertiser}/dashboard`, { waitUntil: 'domcontentloaded' });
  const failures: FailBag[] = [];
  for (const path of ADVERTISER_PAGES) {
    await visitAndProbe(page, URLS.advertiser, path, failures, async () => {
      await injectAuthToken(page, creds.advertiser.sessionToken);
    });
  }
  if (failures.length) {
    expect(failures, failures.map((f) => `[${f.kind}] ${f.page}: ${f.detail}`).join('\n')).toEqual([]);
  }
});
