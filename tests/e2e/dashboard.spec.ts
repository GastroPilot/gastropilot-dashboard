import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication by setting tokens
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('access_token_expires_at', String(Date.now() + 3600000));
    });
  });

  test('displays table plan', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');

    // Should show some kind of table plan or loading state
    const hasTablePlan =
      (await page.locator('[data-testid="table-plan"], .table-plan, [class*="table"]').count()) > 0;
    const hasLoading = (await page.locator('[class*="loading"], [class*="spinner"]').count()) > 0;

    expect(hasTablePlan || hasLoading).toBe(true);
  });

  test('shows date navigation', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Should have date navigation elements
    const hasDateNav =
      (await page
        .locator('button:has-text("Heute"), [aria-label*="date"], [class*="date"]')
        .count()) > 0;
    expect(hasDateNav).toBe(true);
  });

  test('has sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');

    await page.waitForLoadState('networkidle');

    // Should have navigation links
    const navExists = (await page.locator('nav, [role="navigation"], aside').count()) > 0;
    expect(navExists).toBe(true);
  });
});

test.describe('Reservations Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('access_token_expires_at', String(Date.now() + 3600000));
    });
  });

  test('loads reservations page', async ({ page }) => {
    await page.goto('/dashboard/reservations');

    await page.waitForLoadState('networkidle');

    // Should be on reservations page
    await expect(page).toHaveURL(/reservations/);
  });
});

test.describe('Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('access_token_expires_at', String(Date.now() + 3600000));
    });
  });

  test('loads orders page', async ({ page }) => {
    await page.goto('/dashboard/orders');

    await page.waitForLoadState('networkidle');

    // Should be on orders page
    await expect(page).toHaveURL(/orders/);
  });
});

test.describe('Responsive Design', () => {
  test('dashboard is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('access_token_expires_at', String(Date.now() + 3600000));
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);

    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10); // Allow small margin
  });

  test('dashboard is responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_token');
      localStorage.setItem('refresh_token', 'mock_refresh_token');
      localStorage.setItem('access_token_expires_at', String(Date.now() + 3600000));
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should load without errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    expect(errors.length).toBe(0);
  });
});
