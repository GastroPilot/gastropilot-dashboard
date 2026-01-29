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
    
    // Check for login form elements using IDs (more reliable)
    await expect(page.locator('#operatorNumber')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#pin')).toBeVisible();
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible();
  });
  
  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Fill form using IDs
    await page.locator('#operatorNumber').fill('9999');
    await page.locator('#pin').fill('999999');
    await page.getByRole('button', { name: /anmelden/i }).click();
    
    // Should show error message (either in error div or toast)
    const errorLocator = page.locator('text=/ungültig|invalid|fehler|error/i');
    await expect(errorLocator.first()).toBeVisible({ timeout: 10000 });
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
