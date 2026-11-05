import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('authorization rejection is returned as actionable UI feedback', async ({ page }) => {
  await mockApi(page);
  await page.goto('/en/jobs');
  await page.getByRole('button', { name: /new scan/i }).click();
  await page.getByLabel('Engagement').selectOption('11111111-1111-4111-8111-111111111111');
  await page.getByLabel('Targets').fill('outside.example.net');
  await page.getByRole('button', { name: /submit for validation/i }).click();
  await expect(page.getByText('Job rejected', { exact: true })).toBeVisible();
  await expect(page.getByText('Target is outside the authorized scope', { exact: true })).toBeVisible();
});
