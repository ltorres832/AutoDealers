import { test, expect, type Page } from '@playwright/test';
import { URLS } from '../helpers/env';
import { loadDealerCreds } from '../helpers/dealer-creds';
import { dismissBlockingModals, loginPortal } from '../helpers/login';
import { getFirebaseIdToken, injectAuthToken } from '../helpers/firebase-auth';

/** Rutas estáticas del dealer (sin [id] dinámicos). */
const DEALER_PAGES = [
  '/dashboard',
  '/leads',
  '/catalog-interest',
  '/leads/kanban',
  '/tasks',
  '/workflows',
  '/inventory',
  '/inventory/bulk',
  '/inventory/network',
  '/documents',
  '/messages',
  '/internal-chat',
  '/public-chat',
  '/announcements',
  '/appointments',
  '/campaigns',
  '/social-posts',
  '/promotions',
  '/banners',
  '/referrals',
  '/reviews',
  '/reminders',
  '/customer-files',
  '/contracts',
  '/fi',
  '/fi/metrics',
  '/fi/workflows',
  '/deals',
  '/service',
  '/parts',
  '/finance',
  '/hr',
  '/sales-statistics',
  '/reports',
  '/users',
  '/users/admin-users',
  '/users/multi-identity',
  '/dealers',
  '/sellers',
  '/sellers/activity',
  '/policies',
  '/settings',
  '/settings/ai',
  '/settings/branding',
  '/settings/compensation',
  '/settings/corporate-emails',
  '/settings/crm-lead-routing',
  '/settings/crm-sla',
  '/settings/document-branding',
  '/settings/featured',
  '/settings/fi-manager',
  '/settings/integrations',
  '/settings/integrations/api',
  '/settings/integrations/apps',
  '/settings/membership',
  '/settings/membership/payment',
  '/settings/membership/payment-methods',
  '/settings/migration',
  '/settings/notifications',
  '/settings/payments',
  '/settings/policies',
  '/settings/profile',
  '/settings/seller-public-page',
  '/settings/support',
  '/settings/templates',
  '/settings/trust-gallery',
  '/settings/voice-agent',
  '/settings/website',
];

const TAB_PAGES: Record<string, string[]> = {
  '/parts': ['Catálogo', 'Suplidores', 'Órdenes de compra'],
  '/finance': ['Facturas AR', 'Caja', 'Estado de cuenta', 'Export GL'],
  '/hr': ['Expedientes', 'Asistencia', 'Vacaciones', 'Hiring', 'Nómina'],
};

type FailBag = { page: string; kind: string; detail: string };

async function visitAndProbe(page: Page, path: string, failures: FailBag[], reauth: () => Promise<void>): Promise<void> {
  const api5xx: string[] = [];
  const pageErrors: string[] = [];

  const onResponse = (res: import('@playwright/test').Response) => {
    const url = res.url();
    if (!url.includes('/api/')) return;
    if (res.status() >= 500) api5xx.push(`${res.status()} ${url}`);
  };
  const onPageError = (err: Error) => {
    const msg = err.message || String(err);
    if (/Cannot find module 'node:crypto'|Minified React error #310/i.test(msg)) {
      pageErrors.push(msg.slice(0, 200));
    } else if (/ChunkLoadError|Hydration|is not a function|Unexpected token/i.test(msg)) {
      pageErrors.push(msg.slice(0, 200));
    }
  };

  page.on('response', onResponse);
  page.on('pageerror', onPageError);

  try {
    let res: import('@playwright/test').Response | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        res = await page.goto(`${URLS.dealer}${path}`, {
          waitUntil: 'domcontentloaded',
          timeout: 60_000,
        });
        break;
      } catch (e: any) {
        const msg = String(e?.message || e);
        if (attempt < 3 && /ERR_ABORTED|interrupted|Timeout/i.test(msg)) {
          await page.waitForTimeout(800 * attempt);
          continue;
        }
        failures.push({ page: path, kind: 'nav', detail: msg.slice(0, 180) });
        return;
      }
    }
    await page.waitForTimeout(1500);
    await dismissBlockingModals(page);

    if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
      await reauth();
      await page.goto(`${URLS.dealer}${path}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      await page.waitForTimeout(1200);
      await dismissBlockingModals(page);
    }

    if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
      failures.push({ page: path, kind: 'session', detail: 'redirigió a /login' });
      return;
    }

    const status = res?.status() ?? 0;
    if (status >= 500) failures.push({ page: path, kind: 'http', detail: `shell ${status}` });

    const crashed = await page.getByText(/Algo salió mal/i).isVisible().catch(() => false);
    if (crashed) failures.push({ page: path, kind: 'error-boundary', detail: 'Algo salió mal' });

    for (const msg of api5xx) failures.push({ page: path, kind: 'api-5xx', detail: msg });
    for (const msg of pageErrors) failures.push({ page: path, kind: 'pageerror', detail: msg });

    const tabs = TAB_PAGES[path];
    if (tabs) {
      for (const label of tabs) {
        const btn = page.getByRole('button', { name: new RegExp(label, 'i') }).first();
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await page.waitForTimeout(800);
          const tabCrash = await page.getByText(/Algo salió mal/i).isVisible().catch(() => false);
          if (tabCrash) failures.push({ page: path, kind: 'tab-crash', detail: label });
        } else {
          failures.push({ page: path, kind: 'tab-missing', detail: label });
        }
      }
    }
  } finally {
    page.off('response', onResponse);
    page.off('pageerror', onPageError);
  }
}

test.describe.configure({ mode: 'serial' });

test('dealer full UI smoke — todas las pantallas y tabs', async ({ page }) => {
  test.setTimeout(20 * 60_000);

  const dealer = loadDealerCreds();
  let cachedToken = await getFirebaseIdToken(dealer.email, dealer.password);

  async function ensureAuth() {
    await injectAuthToken(page, cachedToken);
  }

  async function reauth() {
    try {
      cachedToken = await getFirebaseIdToken(dealer.email, dealer.password);
    } catch {
      /* keep old */
    }
    await page.goto(`${URLS.dealer}/login`);
    await injectAuthToken(page, cachedToken);
    await page.goto(`${URLS.dealer}/dashboard`, { waitUntil: 'domcontentloaded' });
    await dismissBlockingModals(page);
    if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
      await loginPortal(page, {
        loginUrl: `${URLS.dealer}/login`,
        email: dealer.email,
        password: dealer.password,
        allowedPath: /\/(dashboard|settings\/membership)/,
        firebaseFallback: true,
        afterLoginUrl: `${URLS.dealer}/dashboard`,
      });
      await dismissBlockingModals(page);
    }
  }

  await page.goto(`${URLS.dealer}/login`);
  await ensureAuth();
  await page.goto(`${URLS.dealer}/dashboard`, { waitUntil: 'domcontentloaded' });
  await dismissBlockingModals(page);
  if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
    await reauth();
  }

  const failures: FailBag[] = [];

  for (const path of DEALER_PAGES) {
    await visitAndProbe(page, path, failures, async () => {
      await ensureAuth();
      if (/\/login\/?$/.test(new URL(page.url()).pathname)) {
        await reauth();
      }
    });
  }

  if (failures.length) {
    const summary = failures.map((f) => `  [${f.kind}] ${f.page}: ${f.detail}`).join('\n');
    expect(failures, `Fallos UI dealer:\n${summary}`).toEqual([]);
  }
});
