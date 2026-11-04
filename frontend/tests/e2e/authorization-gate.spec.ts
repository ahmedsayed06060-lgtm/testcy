import { test, expect } from '@playwright/test';

test('blocked engagement cannot dispatch a job', async ({ page }) => {
  await page.goto('/en/jobs');
  await page.getByRole('button', { name: /new scan/i }).click();
  await page.getByLabel('Engagement').selectOption('eng-helix-mobile');
  await expect(page.getByText('Execution blocked')).toBeVisible();
  await expect(page.getByRole('button', { name: /submit for validation/i })).toBeDisabled();
});
