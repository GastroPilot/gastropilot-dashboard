import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { addDays, differenceInCalendarDays, endOfDay, format, startOfDay, subDays } from 'date-fns';
import { dashboardApi } from '@/lib/api/dashboard';

export type OverviewRangePreset = 'today' | '7d' | '30d' | 'custom';

const RANGE_DAYS: Record<Exclude<OverviewRangePreset, 'custom'>, number> = {
  today: 1,
  '7d': 7,
  '30d': 30,
};

const ORDER_ACTIVE_STATUSES = new Set(['open', 'sent_to_kitchen', 'in_preparation', 'ready', 'served']);
const KITCHEN_BACKLOG_STATUSES = new Set(['sent_to_kitchen', 'in_preparation', 'ready']);
const RESERVATION_CLOSED_STATUSES = new Set(['completed', 'canceled', 'cancelled', 'no_show']);

function normalizeStatus(status: string | null | undefined): string {
  if (!status) return 'unknown';
  return status === 'cancelled' ? 'canceled' : status;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

function roundTo(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error;
  return new Error(fallback);
}

function buildRevenueMap(
  entries: Array<{ date: string; revenue: number }> | undefined
): Map<string, number> {
  const map = new Map<string, number>();
  for (const entry of entries ?? []) {
    map.set(entry.date, Number(entry.revenue ?? 0));
  }
  return map;
}

function sumRevenueForDays(
  map: Map<string, number>,
  start: Date,
  end: Date,
): number {
  const days = Math.max(1, differenceInCalendarDays(end, start) + 1);
  let total = 0;
  for (let index = 0; index < days; index += 1) {
    const day = format(addDays(start, index), 'yyyy-MM-dd');
    total += Number(map.get(day) ?? 0);
  }
  return roundTo(total);
}

function resolveRangeWindow(
  selectedDate: Date,
  rangePreset: OverviewRangePreset,
  customFromDate?: Date,
  customToDate?: Date
): { from: Date; to: Date; fromStr: string; toStr: string; rangeDays: number } {
  let from: Date;
  let to: Date;

  if (rangePreset === 'custom') {
    from = customFromDate ? startOfDay(customFromDate) : startOfDay(subDays(selectedDate, 29));
    to = customToDate ? endOfDay(customToDate) : endOfDay(selectedDate);
  } else {
    const days = RANGE_DAYS[rangePreset];
    from = startOfDay(subDays(selectedDate, days - 1));
    to = endOfDay(selectedDate);
  }

  if (from > to) {
    const swappedFrom = startOfDay(to);
    const swappedTo = endOfDay(from);
    from = swappedFrom;
    to = swappedTo;
  }

  const rangeDays = Math.max(1, differenceInCalendarDays(to, from) + 1);

  return {
    from,
    to,
    fromStr: format(from, 'yyyy-MM-dd'),
    toStr: format(to, 'yyyy-MM-dd'),
    rangeDays,
  };
}

interface DashboardOverviewBaseKpis {
  revenueTotal: number;
  revenueToday: number;
  revenueLast7Days: number;
  revenueLast30Days: number;
  revenuePreviousRange: number;
  revenuePreviousDay: number;
  revenuePrevious7Days: number;
  revenuePrevious30Days: number;
  ordersTotal: number;
  ordersPreviousRange: number;
  ordersOpen: number;
  kitchenBacklog: number;
  avgOrderValue: number;
  reservationsToday: number;
  guestsToday: number;
  reservationsInRange: number;
  reservationsPreviousRange: number;
  guestsServedInRange: number;
  noShowRate: number;
  cancellationRate: number;
  occupiedTablesNow: number;
  freeTablesNow: number;
  tablesTotal: number;
  occupancyRateNow: number;
  blockedTablesNow: number;
  totalCapacity: number;
  guestsNow: number;
  capacityOccupancyRateNow: number;
}

export interface DashboardOverviewKpis extends DashboardOverviewBaseKpis {}

export interface DashboardOverviewData {
  range: {
    preset: OverviewRangePreset;
    selectedDay: string;
    from: string;
    to: string;
  };
  kpis: DashboardOverviewKpis;
  revenueByDay: Array<{ date: string; revenue: number }>;
  revenueByHour: Array<{ hour: string; revenue: number }>;
  revenueLast7ByDay: Array<{ date: string; revenue: number }>;
  revenueLast30ByDay: Array<{ date: string; revenue: number }>;
  ordersByDay: Array<{ date: string; count: number }>;
  ordersByHour: Array<{ hour: string; count: number }>;
  reservationsByDay: Array<{ date: string; count: number }>;
  reservationsByHour: Array<{ hour: string; count: number }>;
  ordersByStatus: Record<string, number>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ category: string; quantity: number; revenue: number }>;
  hourlyOrders: Array<{ hour: string; orderCount: number; revenue: number }>;
  lastUpdatedAt: string;
}

export interface DashboardOverviewOperationalData {
  kpis: Pick<
    DashboardOverviewBaseKpis,
    | 'ordersOpen'
    | 'kitchenBacklog'
    | 'reservationsToday'
    | 'guestsToday'
    | 'noShowRate'
    | 'cancellationRate'
    | 'occupiedTablesNow'
    | 'freeTablesNow'
    | 'tablesTotal'
    | 'occupancyRateNow'
    | 'blockedTablesNow'
    | 'totalCapacity'
    | 'guestsNow'
    | 'capacityOccupancyRateNow'
  >;
  lastUpdatedAt: string;
}

export interface DashboardOverviewAnalyticsData {
  range: {
    preset: OverviewRangePreset;
    selectedDay: string;
    from: string;
    to: string;
  };
  kpis: Pick<
    DashboardOverviewBaseKpis,
    | 'revenueTotal'
    | 'revenueToday'
    | 'revenueLast7Days'
    | 'revenueLast30Days'
    | 'revenuePreviousRange'
    | 'revenuePreviousDay'
    | 'revenuePrevious7Days'
    | 'revenuePrevious30Days'
    | 'ordersTotal'
    | 'ordersPreviousRange'
    | 'avgOrderValue'
    | 'reservationsInRange'
    | 'reservationsPreviousRange'
    | 'guestsServedInRange'
  >;
  revenueByDay: Array<{ date: string; revenue: number }>;
  revenueByHour: Array<{ hour: string; revenue: number }>;
  revenueLast7ByDay: Array<{ date: string; revenue: number }>;
  revenueLast30ByDay: Array<{ date: string; revenue: number }>;
  ordersByDay: Array<{ date: string; count: number }>;
  ordersByHour: Array<{ hour: string; count: number }>;
  reservationsByDay: Array<{ date: string; count: number }>;
  reservationsByHour: Array<{ hour: string; count: number }>;
  ordersByStatus: Record<string, number>;
  topItems: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ category: string; quantity: number; revenue: number }>;
  hourlyOrders: Array<{ hour: string; orderCount: number; revenue: number }>;
  lastUpdatedAt: string;
}

interface UseDashboardOverviewDataOptions {
  restaurantId?: string;
  selectedDate?: Date;
  rangePreset?: OverviewRangePreset;
  customFromDate?: Date;
  customToDate?: Date;
  enabled?: boolean;
}

export interface DashboardOverviewQueryResult {
  data: DashboardOverviewData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  operations: {
    data: DashboardOverviewOperationalData | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    lastUpdatedAt: string | null;
  };
  analytics: {
    data: DashboardOverviewAnalyticsData | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
    refetch: () => Promise<void>;
    lastUpdatedAt: string | null;
  };
}

export const dashboardOverviewKeys = {
  all: ['dashboard-overview'] as const,
  operations: (restaurantId: string, selectedDay: string) =>
    [...dashboardOverviewKeys.all, 'operations', restaurantId, selectedDay] as const,
  analytics: (
    restaurantId: string,
    selectedDay: string,
    from: string,
    to: string,
    preset: OverviewRangePreset
  ) => [...dashboardOverviewKeys.all, 'analytics', restaurantId, selectedDay, from, to, preset] as const,
};

export function useDashboardOverviewData({
  restaurantId,
  selectedDate = new Date(),
  rangePreset = '30d',
  customFromDate,
  customToDate,
  enabled = true,
}: UseDashboardOverviewDataOptions): DashboardOverviewQueryResult {
  const selectedDay = format(selectedDate, 'yyyy-MM-dd');

  const resolvedRange = useMemo(
    () => resolveRangeWindow(selectedDate, rangePreset, customFromDate, customToDate),
    [selectedDate, rangePreset, customFromDate, customToDate]
  );

  const operationsQuery = useQuery({
    queryKey: dashboardOverviewKeys.operations(restaurantId ?? 'unknown', selectedDay),
    enabled: Boolean(restaurantId) && enabled,
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      return 15 * 1000;
    },
    queryFn: async (): Promise<DashboardOverviewOperationalData> => {
      if (!restaurantId) {
        throw new Error('restaurantId is required');
      }

      const batch = await dashboardApi.getDashboardData(restaurantId, selectedDate);
      const reservations = batch.reservations ?? [];
      const tables = batch.tables ?? [];
      const blocks = batch.blocks ?? [];
      const blockAssignments = batch.block_assignments ?? [];
      const orders = batch.orders ?? [];

      const now = new Date();
      const referenceNow = new Date(selectedDate);
      referenceNow.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());

      const tableIds = new Set(
        tables
          .filter((table) => !String(table.id).startsWith('temp-'))
          .map((table) => String(table.id))
      );

      const totalCapacity = tables
        .filter((table) => !String(table.id).startsWith('temp-') && (table.is_active ?? true))
        .reduce((sum, table) => sum + (table.capacity ?? 0), 0);

      const activeReservationTableIds = new Set<string>();
      let guestsNow = 0;
      for (const reservation of reservations) {
        const status = normalizeStatus((reservation as { status?: string }).status ?? null);
        if (RESERVATION_CLOSED_STATUSES.has(status)) continue;

        const start = new Date((reservation as { start_at: string }).start_at);
        const end = new Date((reservation as { end_at: string }).end_at);

        if (
          start <= referenceNow &&
          end >= referenceNow &&
          reservation.table_id &&
          tableIds.has(String(reservation.table_id))
        ) {
          activeReservationTableIds.add(String(reservation.table_id));
          guestsNow += Number((reservation as { party_size?: number }).party_size ?? 0);
        }
      }

      const activeOrderTableIds = new Set<string>();
      let kitchenBacklog = 0;
      let openOrders = 0;

      for (const order of orders) {
        const status = normalizeStatus((order as { status?: string }).status ?? null);
        if (ORDER_ACTIVE_STATUSES.has(status)) {
          openOrders += 1;
          if (order.table_id && tableIds.has(String(order.table_id))) {
            activeOrderTableIds.add(String(order.table_id));
          }
        }

        if (KITCHEN_BACKLOG_STATUSES.has(status)) {
          kitchenBacklog += 1;
        }
      }

      const occupiedTableIds = new Set([...activeReservationTableIds, ...activeOrderTableIds]);
      const occupiedTablesNow = occupiedTableIds.size;
      const tablesTotal = tableIds.size;
      const freeTablesNow = Math.max(0, tablesTotal - occupiedTablesNow);
      const occupancyRateNow = tablesTotal > 0 ? clampPercent((occupiedTablesNow / tablesTotal) * 100) : 0;
      const capacityOccupancyRateNow =
        totalCapacity > 0 ? clampPercent((guestsNow / totalCapacity) * 100) : 0;

      const activeBlocks = new Set<string>();
      const blockMap = new Map(blocks.map((block) => [String(block.id), block]));
      for (const assignment of blockAssignments) {
        if (!assignment.table_id || !tableIds.has(String(assignment.table_id))) continue;

        const block = blockMap.get(String(assignment.block_id));
        if (!block) continue;

        const blockStart = new Date((block as { start_at: string }).start_at);
        const blockEnd = new Date((block as { end_at: string }).end_at);
        if (blockStart <= referenceNow && blockEnd >= referenceNow) {
          activeBlocks.add(String(assignment.table_id));
        }
      }

      const reservationsToday = reservations.length;
      const guestsToday = reservations.reduce((sum, reservation) => sum + (reservation.party_size ?? 0), 0);
      const canceledReservations = reservations.filter((reservation) => {
        const status = normalizeStatus((reservation as { status?: string }).status ?? null);
        return status === 'canceled';
      }).length;
      const noShowReservations = reservations.filter((reservation) => {
        const status = normalizeStatus((reservation as { status?: string }).status ?? null);
        return status === 'no_show';
      }).length;

      const cancellationRate = reservationsToday > 0 ? clampPercent((canceledReservations / reservationsToday) * 100) : 0;
      const noShowRate = reservationsToday > 0 ? clampPercent((noShowReservations / reservationsToday) * 100) : 0;

      return {
        kpis: {
          ordersOpen: openOrders,
          kitchenBacklog,
          reservationsToday,
          guestsToday,
          noShowRate: roundTo(noShowRate),
          cancellationRate: roundTo(cancellationRate),
          occupiedTablesNow,
          freeTablesNow,
          tablesTotal,
          occupancyRateNow: roundTo(occupancyRateNow),
          blockedTablesNow: activeBlocks.size,
          totalCapacity,
          guestsNow,
          capacityOccupancyRateNow: roundTo(capacityOccupancyRateNow),
        },
        lastUpdatedAt: new Date().toISOString(),
      };
    },
  });

  const analyticsQuery = useQuery({
    queryKey: dashboardOverviewKeys.analytics(
      restaurantId ?? 'unknown',
      selectedDay,
      resolvedRange.fromStr,
      resolvedRange.toStr,
      rangePreset
    ),
    enabled: Boolean(restaurantId) && enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: () => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      return 60 * 1000;
    },
    queryFn: async (): Promise<DashboardOverviewAnalyticsData> => {
      if (!restaurantId) {
        throw new Error('restaurantId is required');
      }

      const todayStart = startOfDay(selectedDate);
      const todayEnd = endOfDay(selectedDate);
      const sevenDaysStart = startOfDay(subDays(selectedDate, 6));
      const thirtyDaysStart = startOfDay(subDays(selectedDate, 29));
      const previousRangeEnd = endOfDay(subDays(startOfDay(resolvedRange.from), 1));
      const previousRangeStart = startOfDay(subDays(previousRangeEnd, resolvedRange.rangeDays - 1));
      const previousDayStart = startOfDay(subDays(selectedDate, 1));
      const previousDayEnd = endOfDay(subDays(selectedDate, 1));
      const previousSevenDaysStart = startOfDay(subDays(selectedDate, 13));
      const previousSevenDaysEnd = endOfDay(subDays(selectedDate, 7));
      const previousThirtyDaysStart = startOfDay(subDays(selectedDate, 59));
      const previousThirtyDaysEnd = endOfDay(subDays(selectedDate, 30));
      const rangeDays = Array.from({ length: resolvedRange.rangeDays }, (_, index) =>
        format(addDays(resolvedRange.from, index), 'yyyy-MM-dd')
      );
      const allHours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0'));

      const [insights, previousRangeInsights, kpiInsights] = await Promise.all([
        dashboardApi.getInsightsData(restaurantId, {
          fromDate: resolvedRange.from,
          toDate: resolvedRange.to,
        }),
        dashboardApi.getInsightsData(restaurantId, {
          fromDate: previousRangeStart,
          toDate: previousRangeEnd,
        }),
        dashboardApi.getInsightsData(restaurantId, {
          fromDate: previousThirtyDaysStart,
          toDate: todayEnd,
        }),
      ]);

      const rangeRevenueMap = buildRevenueMap(insights.revenue_by_day);
      const kpiRevenueMap = buildRevenueMap(kpiInsights.revenue_by_day);
      const revenueByDay = rangeDays.map((day) => ({
        date: day,
        revenue: Number(rangeRevenueMap.get(day) ?? 0),
      }));
      const hourlyStatsByHour = new Map<string, { order_count?: number; revenue?: number }>();
      for (const [hourRaw, values] of Object.entries(insights.hourly_statistics ?? {})) {
        const normalizedHour = String(hourRaw).padStart(2, '0');
        hourlyStatsByHour.set(normalizedHour, values);
      }
      const revenueByHour = allHours.map((hour) => ({
        hour,
        revenue: Number(hourlyStatsByHour.get(hour)?.revenue ?? 0),
      }));
      const revenueLast7ByDay = Array.from({ length: 7 }, (_, index) => {
        const day = format(addDays(sevenDaysStart, index), 'yyyy-MM-dd');
        return {
          date: day,
          revenue: Number(kpiRevenueMap.get(day) ?? 0),
        };
      });
      const revenueLast30ByDay = Array.from({ length: 30 }, (_, index) => {
        const day = format(addDays(thirtyDaysStart, index), 'yyyy-MM-dd');
        return {
          date: day,
          revenue: Number(kpiRevenueMap.get(day) ?? 0),
        };
      });

      const ordersByDayMap = new Map(
        (insights.orders_by_day ?? []).map((entry) => [entry.date, Number(entry.count ?? 0)])
      );
      const ordersByDay = rangeDays.map((day) => ({
        date: day,
        count: Number(ordersByDayMap.get(day) ?? 0),
      }));
      const ordersByHour = allHours.map((hour) => ({
        hour,
        count: Number(hourlyStatsByHour.get(hour)?.order_count ?? 0),
      }));

      const reservationsByDayMap = new Map(
        (insights.reservations_by_day ?? []).map((entry) => [entry.date, Number(entry.count ?? 0)])
      );
      const reservationsByHourMap = new Map(
        (insights.reservations_by_hour ?? []).map((entry) => [
          String(entry.hour).padStart(2, '0'),
          Number(entry.count ?? 0),
        ])
      );
      const reservationsByDay = rangeDays.map((day) => ({
        date: day,
        count: reservationsByDayMap.get(day) ?? 0,
      }));
      const reservationsByHour = allHours.map((hour) => ({
        hour,
        count: reservationsByHourMap.get(hour) ?? 0,
      }));

      const ordersByStatus = Object.entries(insights.orders_by_status ?? {}).reduce<Record<string, number>>((acc, [status, count]) => {
        const key = normalizeStatus(status);
        acc[key] = (acc[key] ?? 0) + Number(count ?? 0);
        return acc;
      }, {});

      const topCategories = Object.entries(insights.category_statistics ?? {})
        .map(([category, values]) => ({
          category,
          quantity: Number(values.quantity ?? 0),
          revenue: Number(values.revenue ?? 0),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      const hourlyOrders = allHours
        .map((hour) => ({
          hour,
          orderCount: Number(hourlyStatsByHour.get(hour)?.order_count ?? 0),
          revenue: Number(hourlyStatsByHour.get(hour)?.revenue ?? 0),
        }))
        .sort((a, b) => Number(a.hour) - Number(b.hour));

      return {
        range: {
          preset: rangePreset,
          selectedDay,
          from: resolvedRange.fromStr,
          to: resolvedRange.toStr,
        },
        kpis: {
          revenueTotal: roundTo(Number(insights.total_revenue ?? 0)),
          revenueToday: sumRevenueForDays(kpiRevenueMap, todayStart, todayEnd),
          revenueLast7Days: sumRevenueForDays(kpiRevenueMap, sevenDaysStart, todayEnd),
          revenueLast30Days: sumRevenueForDays(kpiRevenueMap, thirtyDaysStart, todayEnd),
          revenuePreviousRange: roundTo(Number(previousRangeInsights.total_revenue ?? 0)),
          revenuePreviousDay: sumRevenueForDays(kpiRevenueMap, previousDayStart, previousDayEnd),
          revenuePrevious7Days: sumRevenueForDays(
            kpiRevenueMap,
            previousSevenDaysStart,
            previousSevenDaysEnd
          ),
          revenuePrevious30Days: sumRevenueForDays(
            kpiRevenueMap,
            previousThirtyDaysStart,
            previousThirtyDaysEnd
          ),
          ordersTotal: Number(insights.orders_count ?? 0),
          ordersPreviousRange: Number(previousRangeInsights.orders_count ?? 0),
          avgOrderValue: roundTo(Number(insights.avg_order_value ?? 0)),
          reservationsInRange: Number(insights.reservations_count ?? 0),
          reservationsPreviousRange: Number(previousRangeInsights.reservations_count ?? 0),
          guestsServedInRange: Number(insights.guests_served ?? 0),
        },
        revenueByDay,
        revenueByHour,
        revenueLast7ByDay,
        revenueLast30ByDay,
        ordersByDay,
        ordersByHour,
        reservationsByDay,
        reservationsByHour,
        ordersByStatus,
        topItems: (insights.popular_items ?? []).slice(0, 5).map((item) => ({
          name: item.name,
          quantity: Number(item.quantity ?? 0),
          revenue: Number(item.revenue ?? 0),
        })),
        topCategories,
        hourlyOrders,
        lastUpdatedAt: new Date().toISOString(),
      };
    },
  });

  const combinedData = useMemo<DashboardOverviewData | undefined>(() => {
    if (!operationsQuery.data && !analyticsQuery.data) return undefined;

    const analytics = analyticsQuery.data;
    const operations = operationsQuery.data;

    const analyticsKpis = analytics?.kpis;
    const operationalKpis = operations?.kpis;

    const lastUpdatedAt = (() => {
      const candidates = [operations?.lastUpdatedAt, analytics?.lastUpdatedAt]
        .filter(Boolean)
        .map((value) => new Date(value as string).getTime())
        .filter((value) => Number.isFinite(value));

      if (candidates.length === 0) return new Date().toISOString();
      return new Date(Math.max(...candidates)).toISOString();
    })();

    return {
      range: analytics?.range ?? {
        preset: rangePreset,
        selectedDay,
        from: resolvedRange.fromStr,
        to: resolvedRange.toStr,
      },
      kpis: {
        revenueTotal: analyticsKpis?.revenueTotal ?? 0,
        revenueToday: analyticsKpis?.revenueToday ?? 0,
        revenueLast7Days: analyticsKpis?.revenueLast7Days ?? 0,
        revenueLast30Days: analyticsKpis?.revenueLast30Days ?? 0,
        revenuePreviousRange: analyticsKpis?.revenuePreviousRange ?? 0,
        revenuePreviousDay: analyticsKpis?.revenuePreviousDay ?? 0,
        revenuePrevious7Days: analyticsKpis?.revenuePrevious7Days ?? 0,
        revenuePrevious30Days: analyticsKpis?.revenuePrevious30Days ?? 0,
        ordersTotal: analyticsKpis?.ordersTotal ?? 0,
        ordersPreviousRange: analyticsKpis?.ordersPreviousRange ?? 0,
        ordersOpen: operationalKpis?.ordersOpen ?? 0,
        kitchenBacklog: operationalKpis?.kitchenBacklog ?? 0,
        avgOrderValue: analyticsKpis?.avgOrderValue ?? 0,
        reservationsToday: operationalKpis?.reservationsToday ?? 0,
        guestsToday: operationalKpis?.guestsToday ?? 0,
        reservationsInRange: analyticsKpis?.reservationsInRange ?? 0,
        reservationsPreviousRange: analyticsKpis?.reservationsPreviousRange ?? 0,
        guestsServedInRange: analyticsKpis?.guestsServedInRange ?? 0,
        noShowRate: operationalKpis?.noShowRate ?? 0,
        cancellationRate: operationalKpis?.cancellationRate ?? 0,
        occupiedTablesNow: operationalKpis?.occupiedTablesNow ?? 0,
        freeTablesNow: operationalKpis?.freeTablesNow ?? 0,
        tablesTotal: operationalKpis?.tablesTotal ?? 0,
        occupancyRateNow: operationalKpis?.occupancyRateNow ?? 0,
        blockedTablesNow: operationalKpis?.blockedTablesNow ?? 0,
        totalCapacity: operationalKpis?.totalCapacity ?? 0,
        guestsNow: operationalKpis?.guestsNow ?? 0,
        capacityOccupancyRateNow: operationalKpis?.capacityOccupancyRateNow ?? 0,
      },
      revenueByDay: analytics?.revenueByDay ?? [],
      revenueByHour: analytics?.revenueByHour ?? [],
      revenueLast7ByDay: analytics?.revenueLast7ByDay ?? [],
      revenueLast30ByDay: analytics?.revenueLast30ByDay ?? [],
      ordersByDay: analytics?.ordersByDay ?? [],
      ordersByHour: analytics?.ordersByHour ?? [],
      reservationsByDay: analytics?.reservationsByDay ?? [],
      reservationsByHour: analytics?.reservationsByHour ?? [],
      ordersByStatus: analytics?.ordersByStatus ?? {},
      topItems: analytics?.topItems ?? [],
      topCategories: analytics?.topCategories ?? [],
      hourlyOrders: analytics?.hourlyOrders ?? [],
      lastUpdatedAt,
    };
  }, [
    analyticsQuery.data,
    operationsQuery.data,
    rangePreset,
    resolvedRange.fromStr,
    resolvedRange.toStr,
    selectedDay,
  ]);

  const refetchAll = async () => {
    await Promise.allSettled([operationsQuery.refetch(), analyticsQuery.refetch()]);
  };

  const operationsError = operationsQuery.error ? toError(operationsQuery.error, 'Operational data failed to load') : null;
  const analyticsError = analyticsQuery.error ? toError(analyticsQuery.error, 'Analytics data failed to load') : null;

  const noDataAvailable = !combinedData;
  const initialLoading = noDataAvailable && (operationsQuery.isLoading || analyticsQuery.isLoading);
  const combinedError = noDataAvailable ? operationsError ?? analyticsError : null;

  return {
    data: combinedData,
    isLoading: initialLoading,
    isFetching: operationsQuery.isFetching || analyticsQuery.isFetching,
    error: combinedError,
    refetch: refetchAll,
    operations: {
      data: operationsQuery.data,
      isLoading: operationsQuery.isLoading,
      isFetching: operationsQuery.isFetching,
      error: operationsError,
      refetch: async () => {
        await operationsQuery.refetch();
      },
      lastUpdatedAt: operationsQuery.data?.lastUpdatedAt ?? null,
    },
    analytics: {
      data: analyticsQuery.data,
      isLoading: analyticsQuery.isLoading,
      isFetching: analyticsQuery.isFetching,
      error: analyticsError,
      refetch: async () => {
        await analyticsQuery.refetch();
      },
      lastUpdatedAt: analyticsQuery.data?.lastUpdatedAt ?? null,
    },
  };
}
