import { test, expect } from '@playwright/test';

// Note: Dashboard tests require a running backend with valid authentication.
// Without valid credentials, the app redirects to login.
// These tests verify the redirect behavior works correctly.

test.describe('Dashboard Access', () => {
  test.beforeEach(async ({ page }) => {
    // Clear tokens to ensure redirect to login
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      localStorage.clear();
    });
  });
  
  test('redirects to login when accessing dashboard without auth', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    
    // Should redirect to login
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
  
  test('redirects to login when accessing reservations without auth', async ({ page }) => {
    await page.goto('/dashboard/reservations', { waitUntil: 'domcontentloaded' });
    
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
  
  test('redirects to login when accessing orders without auth', async ({ page }) => {
    await page.goto('/dashboard/orders', { waitUntil: 'domcontentloaded' });
    
    await page.waitForURL(/login/, { timeout: 10000 });
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Login Page UI', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Check main elements exist
    await expect(page.locator('#operatorNumber')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#pin')).toBeVisible();
    await expect(page.getByRole('button', { name: /anmelden/i })).toBeVisible();
    
    // Check NFC login link exists
    await expect(page.locator('a[href="/login-nfc"]')).toBeVisible();
  });
  
  test('shows branding/title', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Should show either restaurant name or default "GastroPilot"
    const heading = page.locator('h1');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Responsive Design', () => {
  test('login page is responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Login form should be visible
    await expect(page.locator('#operatorNumber')).toBeVisible({ timeout: 10000 });
    
    // Page should not have horizontal scroll
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = await page.evaluate(() => window.innerWidth);
    
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 10);
  });
  
  test('login page is responsive on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Login form should be visible
    await expect(page.locator('#operatorNumber')).toBeVisible({ timeout: 10000 });
    
    // No JS errors should occur
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    
    // Wait a bit for any potential errors
    await page.waitForTimeout(1000);
    
    expect(errors.length).toBe(0);
  });
});

test.describe('Form Validation', () => {
  test('shows error for short operator number', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    // Fill with only 3 digits
    await page.locator('#operatorNumber').fill('123');
    await page.locator('#pin').fill('123456');
    await page.getByRole('button', { name: /anmelden/i }).click();
    
    // Should show validation error
    const errorText = page.locator('text=/4 ziffern|4 digits/i');
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });
  
  test('shows error for short PIN', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    
    await page.locator('#operatorNumber').fill('1234');
    await page.locator('#pin').fill('12345'); // Only 5 digits
    await page.getByRole('button', { name: /anmelden/i }).click();
    
    // Should show validation error
    const errorText = page.locator('text=/6.*8|pin.*ziffern/i');
    await expect(errorText.first()).toBeVisible({ timeout: 5000 });
  });
});
