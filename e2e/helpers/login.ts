import { expect, type Page } from '@playwright/test';
import { getFirebaseIdToken, injectAuthToken } from './firebase-auth';

/** Cierra modales comunes post-login (políticas, onboarding). */
export async function dismissBlockingModals(page: Page): Promise<void> {
  const acceptAll = page.getByRole('button', { name: /aceptar todas/i });
  if (await acceptAll.isVisible({ timeout: 4_000 }).catch(() => false)) {
    await acceptAll.click();
  }
}

export async function fillStandardLogin(page: Page, email: string, password: string): Promise<void> {
  const emailField = page.locator('input[type="email"], input#email').first();
  const passwordField = page.locator('input[type="password"], input#password').first();

  await emailField.waitFor({ state: 'visible' });
  await emailField.fill(email);
  await passwordField.fill(password);
}

export async function submitLogin(page: Page): Promise<void> {
  await page.getByRole('button', { name: /iniciar sesión/i }).first().click();
}

export async function expectAuthenticatedPath(page: Page, allowedPath: RegExp): Promise<void> {
  await expect
    .poll(
      async () => {
        const path = new URL(page.url()).pathname;
        return allowedPath.test(path) ? 'ok' : path;
      },
      { timeout: 90_000, message: `Esperando ruta autenticada ${allowedPath}` }
    )
    .toBe('ok');
}

type PortalLoginOptions = {
  loginUrl: string;
  email: string;
  password: string;
  allowedPath: RegExp;
  /** Si el formulario no deja JWT válido (customToken caído en servidor), inyectar Firebase idToken. */
  firebaseFallback?: boolean;
  afterLoginUrl?: string;
};

export async function loginPortal(page: Page, opts: PortalLoginOptions): Promise<void> {
  await page.goto(opts.loginUrl);
  await fillStandardLogin(page, opts.email, opts.password);
  await submitLogin(page);

  const leftLogin = await page
    .waitForURL((url) => !/\/login\/?$/.test(url.pathname), { timeout: 25_000 })
    .then(() => true)
    .catch(() => false);

  if (!leftLogin && opts.firebaseFallback) {
    const origin = new URL(opts.loginUrl).origin;
    const idToken = await getFirebaseIdToken(opts.email, opts.password, origin);
    await injectAuthToken(page, idToken);
    await page.goto(opts.afterLoginUrl || opts.loginUrl.replace(/\/login\/?$/, '/dashboard'));
  }

  await expectAuthenticatedPath(page, opts.allowedPath);
}
