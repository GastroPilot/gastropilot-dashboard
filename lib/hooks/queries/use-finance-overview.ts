import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { restaurantsApi, type Restaurant } from "@/lib/api/restaurants";
import { orderStatisticsApi, type RevenueStatistics } from "@/lib/api/order-statistics";
import { ordersApi, type Order } from "@/lib/api/orders";
import { getFailedPayments, type SumUpPayment } from "@/lib/api/sumup";
import { getTssStatus, type TssStatus } from "@/lib/api/fiskaly";
import { classifyPaymentMethod } from "@/lib/finance/payment-methods";

export interface UseFinanceOverviewParams {
  fromIso: string;
  toIso: string;
  enabled?: boolean;
}

export interface FinanceOverviewKpis {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  totalTips: number;
  totalDiscounts: number;
  paidOrders: number;
  unpaidOrders: number;
  outstandingAmount: number;
  cashRevenue: number;
  cardRevenue: number;
  otherRevenue: number;
  failedPayments: number;
  tseConfigured: boolean;
  tseState: string | null;
}

interface FinanceOverviewQueryResult {
  restaurant: Restaurant | null;
  revenue: RevenueStatistics | null;
  orders: Order[];
  failedPayments: SumUpPayment[];
  tssStatus: TssStatus | null;
  kpis: FinanceOverviewKpis;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFinanceOverview({
  fromIso,
  toIso,
  enabled = true,
}: UseFinanceOverviewParams): FinanceOverviewQueryResult {
  const restaurantQuery = useQuery({
    queryKey: ["finance", "restaurant"],
    enabled,
    queryFn: async (): Promise<Restaurant | null> => {
      const restaurants = await restaurantsApi.list();
      return restaurants.length > 0 ? restaurants[0] : null;
    },
    staleTime: 60 * 1000,
  });

  const restaurant = restaurantQuery.data ?? null;
  const restaurantId = restaurant?.id ?? null;

  const revenueQuery = useQuery({
    queryKey: ["finance", "revenue", restaurantId, fromIso, toIso],
    enabled: Boolean(restaurantId) && enabled,
    queryFn: async (): Promise<RevenueStatistics> => {
      return orderStatisticsApi.getRevenue(restaurantId!, {
        start_date: fromIso,
        end_date: toIso,
      });
    },
  });

  const ordersQuery = useQuery({
    queryKey: ["finance", "orders", restaurantId, fromIso, toIso],
    enabled: Boolean(restaurantId) && enabled,
    queryFn: async (): Promise<Order[]> => {
      return ordersApi.list(restaurantId!, {
        start_date: fromIso,
        end_date: toIso,
      });
    },
  });

  const failedPaymentsQuery = useQuery({
    queryKey: ["finance", "sumup", "failed", restaurantId],
    enabled: Boolean(restaurantId) && enabled,
    queryFn: async (): Promise<SumUpPayment[]> => {
      try {
        return await getFailedPayments(restaurantId!);
      } catch {
        return [];
      }
    },
    staleTime: 30 * 1000,
  });

  const tssStatusQuery = useQuery({
    queryKey: ["finance", "tss", restaurantId],
    enabled: Boolean(restaurantId) && enabled,
    queryFn: async (): Promise<TssStatus | null> => {
      try {
        return await getTssStatus();
      } catch {
        return null;
      }
    },
    staleTime: 30 * 1000,
  });

  const kpis = useMemo<FinanceOverviewKpis>(() => {
    const revenue = revenueQuery.data;
    const orders = ordersQuery.data ?? [];
    const failedPayments = failedPaymentsQuery.data ?? [];
    const tssStatus = tssStatusQuery.data;

    const paidOrders = orders.filter((order) => order.payment_status === "paid");
    const unpaidOrders = orders.filter((order) => order.payment_status !== "paid");

    const paymentBuckets = paidOrders.reduce(
      (acc, order) => {
        const bucket = classifyPaymentMethod(order.payment_method);
        const amount = Number(order.total) || 0;
        acc[bucket] += amount;
        return acc;
      },
      { cash: 0, card: 0, other: 0 }
    );

    const outstandingAmount = unpaidOrders.reduce(
      (sum, order) => sum + (Number(order.total) || 0),
      0
    );

    return {
      totalRevenue: Number(revenue?.total_revenue ?? 0),
      totalOrders: Number(revenue?.total_orders ?? 0),
      avgOrderValue: Number(revenue?.average_order_value ?? 0),
      totalTips: Number(revenue?.total_tips ?? 0),
      totalDiscounts: Number(revenue?.total_discounts ?? 0),
      paidOrders: paidOrders.length,
      unpaidOrders: unpaidOrders.length,
      outstandingAmount,
      cashRevenue: paymentBuckets.cash,
      cardRevenue: paymentBuckets.card,
      otherRevenue: paymentBuckets.other,
      failedPayments: failedPayments.length,
      tseConfigured: Boolean(tssStatus?.configured),
      tseState: tssStatus?.state ?? null,
    };
  }, [failedPaymentsQuery.data, ordersQuery.data, revenueQuery.data, tssStatusQuery.data]);

  const error =
    (restaurantQuery.error as Error | null) ||
    (revenueQuery.error as Error | null) ||
    (ordersQuery.error as Error | null) ||
    null;

  const isLoading =
    restaurantQuery.isLoading ||
    revenueQuery.isLoading ||
    ordersQuery.isLoading ||
    failedPaymentsQuery.isLoading ||
    tssStatusQuery.isLoading;

  const isFetching =
    restaurantQuery.isFetching ||
    revenueQuery.isFetching ||
    ordersQuery.isFetching ||
    failedPaymentsQuery.isFetching ||
    tssStatusQuery.isFetching;

  const refetch = async () => {
    await Promise.all([
      restaurantQuery.refetch(),
      revenueQuery.refetch(),
      ordersQuery.refetch(),
      failedPaymentsQuery.refetch(),
      tssStatusQuery.refetch(),
    ]);
  };

  return {
    restaurant,
    revenue: revenueQuery.data ?? null,
    orders: ordersQuery.data ?? [],
    failedPayments: failedPaymentsQuery.data ?? [],
    tssStatus: tssStatusQuery.data ?? null,
    kpis,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
