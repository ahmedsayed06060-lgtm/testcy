import { test, expect } from '@playwright/test';

test('password and mandatory MFA flow reaches the dashboard', async ({ page }) => {
  await page.goto('/en/login');
  await page.getByRole('button', { name: /sign in securely/i }).click();
  await page.getByPlaceholder('000000').fill('123456');
  await page.getByRole('button', { name: /verify & sign in/i }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByRole('heading', { name: /good morning/i })).toBeVisible();
});

test('locale switch applies document RTL', async ({ page }) => {
  await page.goto('/ar/dashboard');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: /صباح الخير/ })).toBeVisible();
});
