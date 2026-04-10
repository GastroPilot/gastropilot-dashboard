import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardLandingPage from "@/app/dashboard/page";
import { authApi } from "@/lib/api/auth";
import { impersonation } from "@/lib/api/admin";
import { restaurantsApi } from "@/lib/api/restaurants";
import { useDashboardOverviewData } from "@/lib/hooks/queries";

vi.mock("@/lib/api/auth", () => ({
  authApi: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock("@/lib/api/admin", () => ({
  impersonation: {
    isActive: vi.fn(),
  },
}));

vi.mock("@/lib/api/restaurants", () => ({
  restaurantsApi: {
    list: vi.fn(),
  },
}));

vi.mock("@/lib/hooks/queries", () => ({
  useDashboardOverviewData: vi.fn(),
}));

const mockedAuthApi = vi.mocked(authApi);
const mockedImpersonation = vi.mocked(impersonation);
const mockedRestaurantsApi = vi.mocked(restaurantsApi);
const mockedUseDashboardOverviewData = vi.mocked(useDashboardOverviewData);

function buildUser(role: string) {
  return {
    id: "user-1",
    role,
    operator_number: "1001",
    first_name: "Test",
    last_name: "User",
    is_active: true,
  };
}

function buildOverviewQuery(overrides?: Partial<Record<string, unknown>>) {
  return {
    data: {
      range: {
        preset: "30d",
        selectedDay: "2026-04-09",
        from: "2026-03-11",
        to: "2026-04-09",
      },
      kpis: {
        revenueTotal: 1200,
        revenueToday: 120,
        revenueLast7Days: 540,
        revenueLast30Days: 2200,
        ordersTotal: 42,
        ordersOpen: 4,
        kitchenBacklog: 2,
        avgOrderValue: 28.57,
        reservationsToday: 9,
        guestsToday: 22,
        reservationsInRange: 56,
        guestsServedInRange: 143,
        noShowRate: 3.2,
        cancellationRate: 5.1,
        occupiedTablesNow: 8,
        freeTablesNow: 6,
        tablesTotal: 14,
        occupancyRateNow: 57.1,
        blockedTablesNow: 1,
        totalCapacity: 64,
      },
      revenueByDay: [{ date: "2026-04-09", revenue: 120 }],
      ordersByStatus: { open: 3, paid: 39 },
      topItems: [{ name: "Pasta", quantity: 8, revenue: 112 }],
      topCategories: [{ category: "Hauptspeisen", quantity: 12, revenue: 180 }],
      hourlyOrders: [{ hour: "18", orderCount: 7, revenue: 210 }],
      lastUpdatedAt: "2026-04-09T10:00:00.000Z",
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
    operations: {
      data: {
        kpis: {
          ordersOpen: 4,
          kitchenBacklog: 2,
          reservationsToday: 9,
          guestsToday: 22,
          noShowRate: 3.2,
          cancellationRate: 5.1,
          occupiedTablesNow: 8,
          freeTablesNow: 6,
          tablesTotal: 14,
          occupancyRateNow: 57.1,
          blockedTablesNow: 1,
          totalCapacity: 64,
        },
        lastUpdatedAt: "2026-04-09T10:00:00.000Z",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      lastUpdatedAt: "2026-04-09T10:00:00.000Z",
    },
    analytics: {
      data: {
        range: {
          preset: "30d",
          selectedDay: "2026-04-09",
          from: "2026-03-11",
          to: "2026-04-09",
        },
        kpis: {
          revenueTotal: 1200,
          revenueToday: 120,
          revenueLast7Days: 540,
          revenueLast30Days: 2200,
          ordersTotal: 42,
          avgOrderValue: 28.57,
          reservationsInRange: 56,
          guestsServedInRange: 143,
        },
        revenueByDay: [{ date: "2026-04-09", revenue: 120 }],
        ordersByStatus: { open: 3, paid: 39 },
        topItems: [{ name: "Pasta", quantity: 8, revenue: 112 }],
        topCategories: [{ category: "Hauptspeisen", quantity: 12, revenue: 180 }],
        hourlyOrders: [{ hour: "18", orderCount: 7, revenue: 210 }],
        lastUpdatedAt: "2026-04-09T10:00:00.000Z",
      },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn().mockResolvedValue(undefined),
      lastUpdatedAt: "2026-04-09T10:00:00.000Z",
    },
    ...overrides,
  } as any;
}

describe("dashboard landing page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockedImpersonation.isActive.mockReturnValue(false);
    mockedUseDashboardOverviewData.mockReturnValue(buildOverviewQuery());
  });

  it("shows tenant-context hint for platform admin in grundstatus", async () => {
    mockedAuthApi.getCurrentUser.mockResolvedValue(buildUser("platform_admin") as any);
    mockedRestaurantsApi.list.mockResolvedValue([]);

    render(<DashboardLandingPage />);

    await waitFor(() => expect(screen.getByText("Kein Tenant-Kontext verfügbar")).toBeDefined());
    expect(screen.getByText(/Plattform-Admin-Grundstatus/i)).toBeDefined();
    expect(screen.getByRole("link", { name: /Zur Tenant-Verwaltung/i }).getAttribute("href")).toBe(
      "/dashboard/restaurants"
    );
  });

  it("shows create-restaurant CTA when tenant has no restaurant", async () => {
    mockedAuthApi.getCurrentUser.mockResolvedValue(buildUser("owner") as any);
    mockedRestaurantsApi.list.mockResolvedValue([]);

    render(<DashboardLandingPage />);

    await waitFor(() => expect(screen.getByText("Kein Tenant-Kontext verfügbar")).toBeDefined());
    expect(screen.getByRole("link", { name: /Restaurant anlegen/i }).getAttribute("href")).toBe(
      "/dashboard/restaurants/create"
    );
  });

  it("renders the dashboard overview with live widgets when context exists", async () => {
    mockedAuthApi.getCurrentUser.mockResolvedValue(buildUser("owner") as any);
    mockedRestaurantsApi.list.mockResolvedValue([{ id: "rest-1" }] as any);

    render(<DashboardLandingPage />);

    await waitFor(() => expect(screen.getByText("Dashboard-Übersicht")).toBeDefined());
    expect(screen.getByText(/Zuletzt aktualisiert:/i)).toBeDefined();
    expect(screen.queryByRole("link", { name: /Tischplan öffnen/i })).toBeNull();
    expect(screen.getByText("Umsatz Heute")).toBeDefined();
    expect(screen.getByText("Top Artikel")).toBeDefined();
  });

  it("shows recoverable error card when overview data failed completely", async () => {
    mockedAuthApi.getCurrentUser.mockResolvedValue(buildUser("owner") as any);
    mockedRestaurantsApi.list.mockResolvedValue([{ id: "rest-1" }] as any);
    const refetch = vi.fn().mockResolvedValue(undefined);
    mockedUseDashboardOverviewData.mockReturnValue(
      buildOverviewQuery({
        data: undefined,
        error: new Error("API nicht erreichbar"),
        refetch,
      })
    );

    render(<DashboardLandingPage />);

    await waitFor(() => expect(screen.getByText("Dashboard konnte nicht geladen werden")).toBeDefined());
    expect(screen.getByText("API nicht erreichbar")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Erneut versuchen/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
