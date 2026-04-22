import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardApi } from "@/lib/api/dashboard";
import { useDashboardOverviewData } from "@/lib/hooks/queries/use-dashboard-overview-data";

vi.mock("@/lib/api/dashboard", () => ({
  dashboardApi: {
    getDashboardData: vi.fn(),
    getInsightsData: vi.fn(),
  },
}));

const mockedDashboardApi = vi.mocked(dashboardApi);

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
        start_at: "2026-04-08T00:00:00Z",
        end_at: "2026-04-10T23:59:59Z",
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
        start_at: "2026-04-08T00:00:00Z",
        end_at: "2026-04-10T23:59:59Z",
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
    const from = options?.fromDate ? options.fromDate.toISOString().slice(0, 10) : "";
    const to = options?.toDate ? options.toDate.toISOString().slice(0, 10) : "";

    if (from === "2026-04-02" && to === "2026-04-09") {
      return {
        total_revenue: 320,
        orders_count: 12,
        avg_order_value: 26.67,
        reservations_count: 7,
        guests_served: 18,
        popular_items: [{ name: "Pasta", quantity: 10, revenue: 150 }],
        category_statistics: {
          Hauptspeisen: { quantity: 10, revenue: 150 },
        },
        hourly_statistics: {
          "12": { order_count: 3, revenue: 90 },
          "18": { order_count: 5, revenue: 180 },
        },
        revenue_by_day: [
          { date: "2026-04-08", revenue: 120 },
          { date: "2026-04-09", revenue: 200 },
        ],
        orders_by_day: [
          { date: "2026-04-08", count: 1 },
          { date: "2026-04-09", count: 2 },
        ],
        reservations_by_day: [
          { date: "2026-04-07", count: 1 },
          { date: "2026-04-09", count: 2 },
        ],
        reservations_by_hour: [
          { hour: "18", count: 1 },
          { hour: "19", count: 1 },
          { hour: "20", count: 1 },
        ],
        orders_by_status: {
          open: 3,
          in_preparation: 2,
          paid: 7,
        },
      };
    }

    if (from === "2026-03-25" && to === "2026-04-01") {
      return {
        total_revenue: 280,
        orders_count: 12,
        avg_order_value: 28,
        reservations_count: 7,
        guests_served: 0,
        popular_items: [],
        category_statistics: {},
        hourly_statistics: {},
        revenue_by_day: [],
        orders_by_day: [],
        reservations_by_day: [],
        reservations_by_hour: [],
        orders_by_status: {},
      };
    }

    return {
      total_revenue: 1400,
      orders_count: 52,
      avg_order_value: 26.92,
      reservations_count: 18,
      guests_served: 42,
      popular_items: [],
      category_statistics: {},
      hourly_statistics: {},
      revenue_by_day: [
        { date: "2026-03-11", revenue: 20 },
        { date: "2026-03-18", revenue: 35 },
        { date: "2026-03-25", revenue: 35 },
        { date: "2026-03-26", revenue: 40 },
        { date: "2026-03-27", revenue: 58 },
        { date: "2026-03-28", revenue: 62 },
        { date: "2026-03-29", revenue: 66 },
        { date: "2026-03-30", revenue: 60 },
        { date: "2026-03-31", revenue: 61 },
        { date: "2026-04-01", revenue: 63 },
        { date: "2026-04-02", revenue: 60 },
        { date: "2026-04-03", revenue: 45 },
        { date: "2026-04-04", revenue: 56 },
        { date: "2026-04-05", revenue: 62 },
        { date: "2026-04-06", revenue: 74 },
        { date: "2026-04-07", revenue: 81 },
        { date: "2026-04-08", revenue: 120 },
        { date: "2026-04-09", revenue: 200 },
      ],
      orders_by_day: [],
      reservations_by_day: [],
      reservations_by_hour: [],
      orders_by_status: {},
    };
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
    expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(3);
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

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalled());

    const firstRangeCall = mockedDashboardApi.getInsightsData.mock.calls[0]?.[1];
    expect(firstRangeCall?.fromDate?.toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(firstRangeCall?.toDate?.toISOString().slice(0, 10)).toBe("2026-04-10");
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

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(3));

    rerender({
      ...props,
      selectedDate: new Date("2026-04-10T11:00:00Z"),
    });

    await waitFor(() => expect(mockedDashboardApi.getInsightsData).toHaveBeenCalledTimes(6));
  });
});
