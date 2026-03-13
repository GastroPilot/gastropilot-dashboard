import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
    });
  });
  
  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
  
  test('login form is visible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
    
    // New flow starts with tenant slug entry
    await expect(page.locator('#tenantSlug')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /weiter zum login/i })).toBeVisible();
  });
  
  test('requires tenant slug before continuing', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Try to continue without tenant slug (browser required validation)
    await page.getByRole('button', { name: /weiter zum login/i }).click();
    
    const validationMessage = await page
      .locator('#tenantSlug')
      .evaluate((el) => (el as HTMLInputElement).validationMessage);
    expect(validationMessage.length).toBeGreaterThan(0);
  });
  
  // Skip login redirect test - requires real backend with valid credentials
  test.skip('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.locator('#operatorNumber').fill('1234');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: /anmelden/i }).click();
    
    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});

test.describe('Protected Routes', () => {
  test('cannot access dashboard without login', async ({ page }) => {
    // Clear storage first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
  
  test('cannot access settings without login', async ({ page }) => {
    // Clear storage first
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => localStorage.clear());
    
    await page.goto('/dashboard/user-settings', { waitUntil: 'domcontentloaded' });
    
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});
