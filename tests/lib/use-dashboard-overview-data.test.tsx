import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "@/lib/api/dashboard";
import { orderStatisticsApi } from "@/lib/api/order-statistics";
import { reservationsApi } from "@/lib/api/reservations";
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

vi.mock("@/lib/api/reservations", () => ({
  reservationsApi: {
    list: vi.fn(),
  },
}));

const mockedDashboardApi = vi.mocked(dashboardApi);
const mockedOrderStatisticsApi = vi.mocked(orderStatisticsApi);
const mockedReservationsApi = vi.mocked(reservationsApi);

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

  mockedDashboardApi.getInsightsData.mockImplementation(async (_restaurantId, options) => {
    const day = options?.fromDate ? options.fromDate.toISOString().slice(0, 10) : null;
    const dayTo = options?.toDate ? options.toDate.toISOString().slice(0, 10) : null;

    if (day && dayTo && day === dayTo) {
      const dailyMap: Record<string, { orders_count: number; reservations_count: number }> = {
        "2026-04-07": { orders_count: 0, reservations_count: 1 },
        "2026-04-08": { orders_count: 1, reservations_count: 0 },
        "2026-04-09": { orders_count: 2, reservations_count: 2 },
      };
      const daily = dailyMap[day] ?? { orders_count: 0, reservations_count: 0 };
      return {
        total_revenue: 0,
        orders_count: daily.orders_count,
        avg_order_value: 0,
        reservations_count: daily.reservations_count,
        guests_served: 0,
        popular_items: [],
        revenue_by_day: [],
        orders_by_status: {},
      };
    }

    return {
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
    };
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
      daily_revenue: {
        "2026-04-03": 45,
        "2026-04-04": 56,
        "2026-04-05": 62,
        "2026-04-06": 74,
        "2026-04-07": 81,
        "2026-04-08": 90,
        "2026-04-09": 92,
      },
    })
    .mockResolvedValueOnce({
      total_revenue: 1400,
      total_orders: 52,
      average_order_value: 26.92,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {
        "2026-03-11": 20,
        "2026-03-18": 35,
        "2026-03-25": 41,
        "2026-04-02": 52,
        "2026-04-09": 67,
      },
    })
    .mockResolvedValueOnce({
      total_revenue: 280,
      total_orders: 10,
      average_order_value: 28,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {
        "2026-03-25": 35,
        "2026-03-26": 40,
        "2026-03-27": 28,
        "2026-03-28": 30,
        "2026-03-29": 42,
        "2026-03-30": 50,
        "2026-03-31": 25,
        "2026-04-01": 30,
      },
    })
    .mockResolvedValueOnce({
      total_revenue: 160,
      total_orders: 5,
      average_order_value: 32,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: { "2026-04-08": 160 },
    })
    .mockResolvedValueOnce({
      total_revenue: 430,
      total_orders: 16,
      average_order_value: 26.88,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {
        "2026-03-27": 58,
        "2026-03-28": 62,
        "2026-03-29": 66,
        "2026-03-30": 60,
        "2026-03-31": 61,
        "2026-04-01": 63,
        "2026-04-02": 60,
      },
    })
    .mockResolvedValueOnce({
      total_revenue: 1320,
      total_orders: 48,
      average_order_value: 27.5,
      total_tips: 0,
      total_discounts: 0,
      daily_revenue: {
        "2026-02-10": 18,
        "2026-02-17": 27,
        "2026-02-24": 31,
        "2026-03-03": 44,
        "2026-03-10": 53,
      },
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

  mockedReservationsApi.list.mockResolvedValue([
    { id: "res-range-1", start_at: "2026-04-07T18:00:00Z" },
    { id: "res-range-2", start_at: "2026-04-09T19:00:00Z" },
    { id: "res-range-3", start_at: "2026-04-09T20:00:00Z" },
  ] as any);
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
    expect(result.current.data?.kpis.guestsNow).toBe(2);
    expect(result.current.data?.kpis.capacityOccupancyRateNow).toBeCloseTo(33.33, 2);
    expect(result.current.data?.kpis.revenueTotal).toBe(320);
    expect(result.current.data?.kpis.revenueToday).toBe(200);
    expect(result.current.data?.kpis.ordersTotal).toBe(12);
    expect(result.current.data?.kpis.ordersPreviousRange).toBe(12);
    expect(result.current.data?.kpis.reservationsPreviousRange).toBe(7);
    expect(result.current.data?.range.from).toBe("2026-04-02");
    expect(result.current.data?.range.to).toBe("2026-04-09");
    expect(result.current.data?.revenueLast7ByDay).toHaveLength(7);
    expect(result.current.data?.revenueLast7ByDay.at(-1)?.date).toBe("2026-04-09");
    expect(result.current.data?.revenueLast30ByDay).toHaveLength(30);
    expect(result.current.data?.revenueLast30ByDay.at(-1)?.date).toBe("2026-04-09");
    expect(result.current.data?.ordersByDay.find((entry) => entry.date === "2026-04-09")?.count).toBe(2);
    expect(result.current.data?.reservationsByDay.find((entry) => entry.date === "2026-04-09")?.count).toBe(2);

    expect(result.current.operations.lastUpdatedAt).toBeTruthy();
    expect(result.current.analytics.lastUpdatedAt).toBeTruthy();
    expect(mockedOrderStatisticsApi.getRevenue).toHaveBeenCalledTimes(8);
    expect(mockedReservationsApi.list).toHaveBeenCalledTimes(1);
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

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(9));

    rerender({
      ...props,
      selectedDate: new Date("2026-04-10T11:00:00Z"),
    });

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(18));
  });
});
