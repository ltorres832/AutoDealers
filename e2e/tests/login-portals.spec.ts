import { test, expect } from '@playwright/test';
import { URLS, TEST_USERS } from '../helpers/env';
import { dismissBlockingModals, loginPortal } from '../helpers/login';

test.describe.configure({ mode: 'serial' });

test.describe('Login — portales de producción', () => {
  test('admin entra al panel global', async ({ page }) => {
    await loginPortal(page, {
      loginUrl: `${URLS.admin}/login`,
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
      allowedPath: /\/admin\/global/,
    });
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
  });

  test('seller entra al dashboard o onboarding de membresía', async ({ page }) => {
    await loginPortal(page, {
      loginUrl: `${URLS.seller}/login`,
      email: TEST_USERS.seller.email,
      password: TEST_USERS.seller.password,
      allowedPath: /\/(dashboard|settings\/membership)/,
      firebaseFallback: true,
      afterLoginUrl: `${URLS.seller}/dashboard`,
    });
    await dismissBlockingModals(page);
    await expect(page.getByRole('heading', { name: /mi dashboard|membresía|activa tu cuenta/i }).first()).toBeVisible();
  });

  test('dealer entra al dashboard', async ({ page }) => {
    await loginPortal(page, {
      loginUrl: `${URLS.dealer}/login`,
      email: TEST_USERS.dealer.email,
      password: TEST_USERS.dealer.password,
      allowedPath: /\/dashboard/,
      firebaseFallback: true,
      afterLoginUrl: `${URLS.dealer}/dashboard`,
    });
    await dismissBlockingModals(page);
    await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
  });

  test('advertiser entra al dashboard', async ({ page }) => {
    await loginPortal(page, {
      loginUrl: `${URLS.advertiser}/login`,
      email: TEST_USERS.advertiser.email,
      password: TEST_USERS.advertiser.password,
      allowedPath: /\/dashboard/,
    });
    await expect(page.getByRole('heading', { name: /dashboard|anunciante|camp/i }).first()).toBeVisible();
  });
});
