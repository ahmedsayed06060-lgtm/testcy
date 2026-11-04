import { test, expect } from '@playwright/test';

test('create a draft engagement and open its scope', async ({ page }) => {
  await page.goto('/en/engagements');
  await page.getByRole('button', { name: /new engagement/i }).click();
  await page.getByLabel(/engagement name/i).fill('Authorized E2E Assessment');
  await page.getByLabel('Client').selectOption('acme');
  await page.getByLabel(/rules of engagement/i).fill('Only approved non-destructive validation within the testing window.');
  await page.getByLabel(/emergency contact/i).fill('Security Lead · +123456789');
  await page.getByRole('button', { name: /create draft engagement/i }).click();
  await expect(page.getByText('Engagement created')).toBeVisible();
  await expect(page.getByText('Authorized E2E Assessment')).toBeVisible();
});
