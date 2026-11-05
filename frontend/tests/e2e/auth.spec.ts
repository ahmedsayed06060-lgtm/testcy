import { test, expect } from '@playwright/test';
import { mockApi, openPage } from './helpers';

test.beforeEach(async ({ page }) => { await mockApi(page); });

test('password and mandatory MFA flow reaches the API-backed dashboard', async ({ page }) => {
  await openPage(page, '/en/login');
  await page.getByLabel(/work email/i).fill('tester@example.com');
  await page.getByLabel(/^password/i).fill('E2e!TestingPassword123');
  await page.getByRole('button', { name: /sign in securely/i }).click();
  await page.getByPlaceholder('000000').fill('123456');
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByRole('heading', { name: 'Welcome, Test' })).toBeVisible();
});

test('locale switch applies document RTL and Arabic content', async ({ page }) => {
  await openPage(page, '/ar/dashboard');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'مرحباً، فريق الأمن' })).toBeVisible();
});

test('dark mode toggle updates the document theme', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await openPage(page, '/en/dashboard');
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await page.getByRole('button', { name: /toggle color theme/i }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
});
