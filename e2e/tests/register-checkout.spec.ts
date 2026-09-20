import { test, expect } from '@playwright/test';
import { URLS, uniqueTestEmail, uniqueSubdomain } from '../helpers/env';

test.describe('Public-web — registro y checkout Stripe', () => {
  test('registro seller → elegir plan → redirige a Stripe (sin pagar)', async ({ page }) => {
    const email = uniqueTestEmail('pw-seller');
    const subdomain = uniqueSubdomain('pw');

    await page.goto(`${URLS.public}/register?type=seller`);
    await expect(page.getByRole('heading', { name: /tu cuenta/i })).toBeVisible({ timeout: 30_000 });

    await page.getByPlaceholder(/juan pérez/i).fill('E2E Seller Test');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="tel"]').fill('7875550199');
    await page.getByPlaceholder('tu-marca').fill(subdomain);

    const passwordFields = page.locator('input[type="password"]');
    await passwordFields.nth(0).fill('Test123456!');
    await passwordFields.nth(1).fill('Test123456!');

    await page.locator('#terms').check();
    await page.getByRole('button', { name: /crear perfil profesional/i }).click();

    await page.waitForURL(/\/register\/membership/, { timeout: 60_000 });
    await expect(page.getByRole('heading', { name: /elige tu plan/i })).toBeVisible();

    const planCards = page.locator('h3').filter({ hasText: /vendedor|básico|professional|premium/i });
    await expect(planCards.first()).toBeVisible({ timeout: 30_000 });
    await planCards.first().click();

    await page.getByRole('button', { name: /registrar tarjeta y activar prueba/i }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 60_000 });
    expect(page.url()).toMatch(/checkout\.stripe\.com/);
  });

  test('página de registro carga y permite elegir perfil', async ({ page }) => {
    await page.goto(`${URLS.public}/register`);
    await expect(page.getByRole('heading', { name: /únete a la red/i })).toBeVisible();
    await expect(page.getByText(/concesionario/i).first()).toBeVisible();
    await expect(page.getByText(/^vendedor$/i).first()).toBeVisible();
  });
});
