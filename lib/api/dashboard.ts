/**
 * Dashboard batch API endpoints for optimized data loading.
 */
import { api } from './client';
import type { Restaurant } from './restaurants';
import type { Table } from './tables';
import type { Area } from './areas';
import type { Obstacle } from './obstacles';
import type { Reservation } from './reservations';
import type { Block } from './blocks';
import type { BlockAssignment } from './block-assignments';
import type { Order } from './orders';
import type { TableDayConfig } from './table-day-configs';
import type { ReservationTableDayConfig } from './reservation-table-day-configs';

/**
 * Response from the dashboard batch endpoint
 */
export interface DashboardData {
  restaurant: Restaurant | null;
  areas: Area[];
  tables: Table[];
  obstacles: Obstacle[];
  reservations: Reservation[];
  blocks: Block[];
  block_assignments: BlockAssignment[];
  orders: Order[];
  table_day_configs: TableDayConfig[];
  reservation_table_day_configs: ReservationTableDayConfig[];
}

/**
 * Response from the insights batch endpoint
 */
export interface InsightsData {
  total_revenue: number;
  orders_count: number;
  avg_order_value: number;
  reservations_count: number;
  guests_served: number;
  popular_items: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  category_statistics: Record<
    string,
    {
      quantity: number;
      revenue: number;
    }
  >;
  hourly_statistics: Record<
    string,
    {
      order_count: number;
      revenue: number;
    }
  >;
  revenue_by_day: Array<{
    date: string;
    revenue: number;
  }>;
  orders_by_day: Array<{
    date: string;
    count: number;
  }>;
  reservations_by_day: Array<{
    date: string;
    count: number;
  }>;
  reservations_by_hour: Array<{
    hour: string;
    count: number;
  }>;
  orders_by_status: Record<string, number>;
}

/**
 * Dashboard API client
 */
export const dashboardApi = {
  /**
   * Fetch all dashboard data in a single request.
   * This replaces 10+ individual API calls.
   */
  async getDashboardData(restaurantId: string, date?: Date): Promise<DashboardData> {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    const params = dateStr ? `?date=${dateStr}` : '';
    return api.get<DashboardData>(`/dashboard/batch/${restaurantId}${params}`);
  },
  
  /**
   * Fetch insights/analytics data in a single request.
   */
  async getInsightsData(
    restaurantId: string,
    options?: { fromDate?: Date; toDate?: Date }
  ): Promise<InsightsData> {
    const params = new URLSearchParams();
    if (options?.fromDate) {
      params.set('from_date', options.fromDate.toISOString().split('T')[0]);
    }
    if (options?.toDate) {
      params.set('to_date', options.toDate.toISOString().split('T')[0]);
    }
    const queryString = params.toString();
    return api.get<InsightsData>(
      `/dashboard/insights/${restaurantId}${queryString ? `?${queryString}` : ''}`
    );
  },
};
