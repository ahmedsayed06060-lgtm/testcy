import { test, expect } from '@playwright/test';
import { mockApi } from './helpers';

test('report wizard queues an Arabic remediation document', async ({ page }) => {
  await mockApi(page);
  await page.goto('/en/reports');
  await page.getByRole('button', { name: /generate report/i }).click();
  await page.getByLabel('Report type').selectOption('remediation_plan');
  await page.getByRole('button', { name: /continue/i }).click();
  await page.getByLabel('Language and direction').selectOption('ar');
  await page.getByRole('button', { name: /continue/i }).click();
  await expect(page.getByText('Arabic · RTL', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /generate pdf/i }).click();
  await expect(page.getByText('Report queued successfully', { exact: true })).toBeVisible();
});

test('protected report download uses its signed URL', async ({ page }) => {
  await mockApi(page);
  await page.route('https://downloads.test/**', (route) => route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.7\nE2E' }));
  await page.goto('/en/reports');
  const popupPromise = page.waitForEvent('popup');
  await page.getByRole('button', { name: /download/i }).click();
  const popup = await popupPromise;
  await popup.waitForURL('https://downloads.test/report.pdf');
  await expect(popup).toHaveURL('https://downloads.test/report.pdf');
});
