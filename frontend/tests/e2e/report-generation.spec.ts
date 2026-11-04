import { test, expect } from '@playwright/test';

test('report wizard configures an Arabic remediation document', async ({ page }) => {
  await page.goto('/en/reports');
  await page.getByRole('button', { name: /generate report/i }).click();
  await page.getByRole('button', { name: /remediation plan prioritized/i }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByRole('button', { name: /Arabic العربية/i }).click();
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText('Arabic · RTL')).toBeVisible();
  await page.getByRole('button', { name: /generate pdf/i }).click();
  await expect(page.getByText('Report queued successfully')).toBeVisible();
});
