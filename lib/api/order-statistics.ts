import { api } from "./client";

export interface RevenueStatistics {
  total_revenue: number;
  total_orders: number;
  average_order_value: number;
  total_tips: number;
  total_discounts: number;
  daily_revenue: Record<string, number>;
}

export interface TopItem {
  item_name: string;
  quantity_sold: number;
  revenue: number;
}

export interface CategoryStatistics {
  [category: string]: {
    quantity: number;
    revenue: number;
  };
}

export interface HourlyStatistics {
  [hour: string]: {
    order_count: number;
    revenue: number;
  };
}

export const orderStatisticsApi = {
  getRevenue: async (
    _restaurantId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<RevenueStatistics> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const query = queryParams.toString();
    return api.get<RevenueStatistics>(
      `/order-statistics/revenue${query ? `?${query}` : ""}`
    );
  },

  getTopItems: async (
    _restaurantId: string,
    params?: { start_date?: string; end_date?: string; limit?: number }
  ): Promise<TopItem[]> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);
    if (params?.limit) queryParams.append("limit", params.limit.toString());

    const query = queryParams.toString();
    return api.get<TopItem[]>(
      `/order-statistics/top-items${query ? `?${query}` : ""}`
    );
  },

  getCategoryStatistics: async (
    _restaurantId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<CategoryStatistics> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const query = queryParams.toString();
    return api.get<CategoryStatistics>(
      `/order-statistics/category-statistics${query ? `?${query}` : ""}`
    );
  },

  getHourlyStatistics: async (
    _restaurantId: string,
    params?: { start_date?: string; end_date?: string }
  ): Promise<HourlyStatistics> => {
    const queryParams = new URLSearchParams();
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const query = queryParams.toString();
    return api.get<HourlyStatistics>(
      `/order-statistics/hourly-statistics${query ? `?${query}` : ""}`
    );
  },
};
