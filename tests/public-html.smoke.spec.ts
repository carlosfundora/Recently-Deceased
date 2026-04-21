import { expect, test } from '@playwright/test';

test.describe('standalone public_html ghost meter', () => {
  test('renders key controls and toggles diagnostics', async ({ page }) => {
    await page.goto('/index.html');

    await expect(page).toHaveTitle(/Ghost Meter/i);
    await expect(page.getByRole('button', { name: /Engage System/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Recalibrate/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Export Session/i })).toBeVisible();
    await expect(page.locator('#meterCanvas')).toBeVisible();

    const diagnosticsPanel = page.locator('#diagnosticsPanel');
    await expect(diagnosticsPanel).toBeVisible();
    await page.getByRole('button', { name: /Hide Diagnostics/i }).click();
    await expect(diagnosticsPanel).toHaveClass(/is-collapsed/);
    await page.getByRole('button', { name: /Show Diagnostics/i }).click();
    await expect(diagnosticsPanel).not.toHaveClass(/is-collapsed/);
  });

  test('switches modes and updates document state', async ({ page }) => {
    await page.goto('/index.html');

    await page.getByRole('tab', { name: 'Spectral' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'spectral');

    await page.getByRole('tab', { name: 'RF' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'rf');

    await page.getByRole('tab', { name: 'Dashboard' }).click();
    await expect(page.locator('body')).toHaveAttribute('data-mode', 'dashboard');
  });

  test('exposes manifest and linked stylesheets', async ({ page, request }) => {
    await page.goto('/index.html');

    const hrefs = await page.locator('link[rel="stylesheet"]').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    expect(hrefs).toContain('./styles.css');
    expect(hrefs).toContain('./advanced.css');
    expect(hrefs).toContain('./modes/dashboard.css');
    expect(hrefs).toContain('./modes/spectral.css');
    expect(hrefs).toContain('./modes/visual.css');
    expect(hrefs).toContain('./modes/rf.css');

    const manifestResponse = await request.get('/manifest.webmanifest');
    expect(manifestResponse.ok()).toBeTruthy();
    const manifest = await manifestResponse.json();
    expect(Array.isArray(manifest.icons)).toBeTruthy();
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
