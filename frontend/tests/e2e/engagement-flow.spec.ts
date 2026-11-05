import { test, expect } from '@playwright/test';
import { mockApi, openPage } from './helpers';

test('create a draft engagement through the real form contract', async ({ page }) => {
  await mockApi(page);
  await openPage(page, '/en/engagements');
  await page.getByRole('button', { name: /new engagement/i }).click();
  await page.getByLabel(/engagement name/i).fill('Authorized E2E Draft');
  await page.getByLabel(/client organization id/i).fill('22222222-2222-4222-8222-222222222222');
  await page.getByLabel(/start date/i).fill('2026-11-06');
  await page.getByLabel(/end date/i).fill('2026-11-30');
  await page.getByLabel(/rules of engagement/i).fill('Only approved non-destructive validation within the testing window.');
  await page.getByLabel(/emergency contact name/i).fill('Security Lead');
  await page.getByLabel(/emergency contact phone/i).fill('+123456789');
  await page.getByRole('button', { name: 'Create engagement', exact: true }).click();
  await expect(page.getByText('Engagement created', { exact: true })).toBeVisible();
  await expect(page.getByText('Authorized E2E Draft', { exact: true }).first()).toBeVisible();
});
