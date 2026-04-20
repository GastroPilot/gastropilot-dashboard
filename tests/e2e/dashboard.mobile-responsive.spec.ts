import { expect, test, type Page } from "@playwright/test";

const MOBILE_PROJECTS = new Set(["Mobile Chrome", "Mobile Safari"]);
const REQUIRED_ENV_VARS = [
  "E2E_TENANT_SLUG",
  "E2E_OPERATOR_NUMBER",
  "E2E_PIN",
] as const;

const MOBILE_ROUTES = [
  "/dashboard",
  "/dashboard/reservations",
  "/dashboard/tischplan",
  "/dashboard/timeline",
  "/dashboard/order-history",
  "/dashboard/hilfecenter",
];

function missingEnvVars(): string[] {
  return REQUIRED_ENV_VARS.filter((name) => {
    const value = process.env[name];
    return !value || value.trim().length === 0;
  });
}

async function loginToDashboard(page: Page) {
  const tenantSlug = process.env.E2E_TENANT_SLUG!;
  const operatorNumber = process.env.E2E_OPERATOR_NUMBER!;
  const pin = process.env.E2E_PIN!;

  await page.goto(`/login?t=${encodeURIComponent(tenantSlug)}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle");

  await page.locator("#operatorNumber").fill(operatorNumber);
  await page.locator("#pin").fill(pin);
  await page.getByRole("button", { name: /anmelden/i }).click();

  await page.waitForURL(/\/dashboard(?:\/|$)/, { timeout: 20_000 });
}

async function assertNoHorizontalViewportOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    bodyWidth: document.body.scrollWidth,
    htmlWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.bodyWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  expect(dimensions.htmlWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test.describe("Dashboard Mobile Responsive (authenticated)", () => {
  test("core dashboard routes do not create horizontal overflow", async ({
    page,
  }, testInfo) => {
    test.skip(
      !MOBILE_PROJECTS.has(testInfo.project.name),
      "Diese Responsive-Checks laufen nur auf Mobile Chrome/Mobile Safari.",
    );

    const missing = missingEnvVars();
    test.skip(
      missing.length > 0,
      `Fehlende E2E-Umgebungsvariablen: ${missing.join(", ")}`,
    );

    await loginToDashboard(page);

    for (const route of MOBILE_ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle");

      await expect(page).not.toHaveURL(/\/login/);
      await assertNoHorizontalViewportOverflow(page);
    }
  });
});
