import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "@/lib/api/dashboard";
import { orderStatisticsApi } from "@/lib/api/order-statistics";
import { useDashboardOverviewData } from "@/lib/hooks/queries/use-dashboard-overview-data";

vi.mock("@/lib/api/dashboard", () => ({
  dashboardApi: {
    getDashboardData: vi.fn(),
    getInsightsData: vi.fn(),
  },
}));

vi.mock("@/lib/api/order-statistics", () => ({
  orderStatisticsApi: {
    getRevenue: vi.fn(),
    getTopItems: vi.fn(),
    getCategoryStatistics: vi.fn(),
    getHourlyStatistics: vi.fn(),
  },
}));

const mockedDashboardApi = vi.mocked(dashboardApi);
const mockedOrderStatisticsApi = vi.mocked(orderStatisticsApi);

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function setupSuccessfulApiMocks() {
  mockedDashboardApi.getDashboardData.mockResolvedValue({
    restaurant: null,
    areas: [],
    tables: [
      { id: "t-1", capacity: 4, is_active: true },
      { id: "t-2", capacity: 2, is_active: true },
    ],
    obstacles: [],
    reservations: [
      {
        id: "res-1",
        status: "confirmed",
        table_id: "t-1",
        party_size: 2,
        start_at: "2026-04-09T08:00:00Z",
        end_at: "2026-04-09T22:00:00Z",
      },
      {
        id: "res-2",
        status: "canceled",
        table_id: "t-2",
        party_size: 3,
        start_at: "2026-04-09T18:00:00Z",
        end_at: "2026-04-09T20:00:00Z",
      },
    ],
    blocks: [
      {
        id: "block-1",
        start_at: "2026-04-09T07:00:00Z",
        end_at: "2026-04-09T23:00:00Z",
      },
    ],
    block_assignments: [
      {
        id: "assignment-1",
        block_id: "block-1",
        table_id: "t-2",
      },
    ],
    orders: [
      { id: "ord-1", status: "open", table_id: "t-1" },
      { id: "ord-2", status: "in_preparation", table_id: "t-1" },
      { id: "ord-3", status: "paid", table_id: "t-2" },
    ],
    table_day_configs: [],
    reservation_table_day_configs: [],
  } as any);

  mockedDashboardApi.getInsightsData.mockResolvedValue({
    total_revenue: 0,
    orders_count: 12,
    avg_order_value: 20,
    reservations_count: 7,
    guests_served: 18,
    popular_items: [],
    revenue_by_day: [],
    orders_by_status: {
      open: 3,
      in_preparation: 2,
      paid: 7,
    },
  });

  mockedOrderStatisticsApi.getRevenue
    .mockResolvedValueOnce({
      total_revenue: 320,
      total_orders: 12,
      average_order_value: 26.67,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {
        "2026-04-08": 120,
        "2026-04-09": 200,
      },
    })
    .mockResolvedValueOnce({
      total_revenue: 200,
      total_orders: 4,
      average_order_value: 50,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: { "2026-04-09": 200 },
    })
    .mockResolvedValueOnce({
      total_revenue: 500,
      total_orders: 18,
      average_order_value: 27.78,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {},
    })
    .mockResolvedValueOnce({
      total_revenue: 1400,
      total_orders: 52,
      average_order_value: 26.92,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {},
    });

  mockedOrderStatisticsApi.getTopItems.mockResolvedValue([
    { item_name: "Pasta", quantity_sold: 10, revenue: 150 },
  ]);
  mockedOrderStatisticsApi.getCategoryStatistics.mockResolvedValue({
    Hauptspeisen: { quantity: 10, revenue: 150 },
  });
  mockedOrderStatisticsApi.getHourlyStatistics.mockResolvedValue({
    "12": { order_count: 3, revenue: 90 },
    "18": { order_count: 5, revenue: 180 },
  });
}

describe("useDashboardOverviewData", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupSuccessfulApiMocks();
  });

  it("combines operational and analytics KPIs from real API payloads", async () => {
    const { result } = renderHook(
      () =>
        useDashboardOverviewData({
          restaurantId: "rest-1",
          selectedDate: new Date("2026-04-09T11:00:00Z"),
          rangePreset: "custom",
          customFromDate: new Date("2026-04-02T12:00:00Z"),
          customToDate: new Date("2026-04-09T12:00:00Z"),
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());

    expect(result.current.data?.kpis.ordersOpen).toBe(2);
    expect(result.current.data?.kpis.kitchenBacklog).toBe(1);
    expect(result.current.data?.kpis.occupiedTablesNow).toBe(1);
    expect(result.current.data?.kpis.blockedTablesNow).toBe(1);
    expect(result.current.data?.kpis.revenueTotal).toBe(320);
    expect(result.current.data?.kpis.revenueToday).toBe(200);
    expect(result.current.data?.kpis.ordersTotal).toBe(12);
    expect(result.current.data?.range.from).toBe("2026-04-02");
    expect(result.current.data?.range.to).toBe("2026-04-09");

    expect(result.current.operations.lastUpdatedAt).toBeTruthy();
    expect(result.current.analytics.lastUpdatedAt).toBeTruthy();
    expect(mockedOrderStatisticsApi.getRevenue).toHaveBeenCalledTimes(4);
  });

  it("normalizes custom ranges when from-date is after to-date", async () => {
    renderHook(
      () =>
        useDashboardOverviewData({
          restaurantId: "rest-1",
          selectedDate: new Date("2026-04-09T11:00:00Z"),
          rangePreset: "custom",
          customFromDate: new Date("2026-04-10T12:00:00Z"),
          customToDate: new Date("2026-04-05T12:00:00Z"),
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockedOrderStatisticsApi.getRevenue).toHaveBeenCalled());

    const firstRangeCall = mockedOrderStatisticsApi.getRevenue.mock.calls[0]?.[1];
    expect(firstRangeCall).toMatchObject({
      start_date: "2026-04-05T00:00:00Z",
      end_date: "2026-04-10T23:59:59Z",
    });
  });

  it("refetches analytics when selected day changes in custom range mode", async () => {
    const props = {
      restaurantId: "rest-1",
      rangePreset: "custom" as const,
      customFromDate: new Date("2026-04-01T12:00:00Z"),
      customToDate: new Date("2026-04-07T12:00:00Z"),
      selectedDate: new Date("2026-04-09T11:00:00Z"),
    };

    const { rerender } = renderHook((nextProps: typeof props) => useDashboardOverviewData(nextProps), {
      initialProps: props,
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(1));

    rerender({
      ...props,
      selectedDate: new Date("2026-04-10T11:00:00Z"),
    });

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(2));
  });
});
