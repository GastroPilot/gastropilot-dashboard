import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('shows login page when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('login form is visible', async ({ page }) => {
    await page.goto('/login');

    // Check for login form elements
    await expect(page.getByPlaceholder(/bedienernummer/i)).toBeVisible();
    await expect(page.getByPlaceholder(/pin/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /anmelden|login/i })).toBeVisible();
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/bedienernummer/i).fill('9999');
    await page.getByPlaceholder(/pin/i).fill('wrong');
    await page.getByRole('button', { name: /anmelden|login/i }).click();

    // Should show error message
    await expect(page.getByText(/ungültig|invalid|fehler/i)).toBeVisible({ timeout: 5000 });
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/bedienernummer/i).fill('1234');
    await page.getByPlaceholder(/pin/i).fill('123456');
    await page.getByRole('button', { name: /anmelden|login/i }).click();

    // Should redirect to dashboard after successful login
    await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  });
});

test.describe('Protected Routes', () => {
  test('cannot access dashboard without login', async ({ page }) => {
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('cannot access settings without login', async ({ page }) => {
    await page.goto('/dashboard/user-settings');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });
});
