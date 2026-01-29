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
 * Response from the kitchen batch endpoint
 */
export interface KitchenData {
  orders: Order[];
  order_items: Array<{
    id: number;
    order_id: number;
    menu_item_id: number | null;
    item_name: string;
    item_description: string | null;
    category: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    tax_rate: number;
    status: string;
    notes: string | null;
    sort_order: number;
  }>;
  tables: Table[];
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
  revenue_by_day: Array<{
    date: string;
    revenue: number;
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
  async getDashboardData(restaurantId: number, date?: Date): Promise<DashboardData> {
    const dateStr = date ? date.toISOString().split('T')[0] : undefined;
    const params = dateStr ? `?date=${dateStr}` : '';
    return api.get<DashboardData>(`/dashboard/batch/${restaurantId}/${params}`);
  },
  
  /**
   * Fetch kitchen view data in a single request.
   */
  async getKitchenData(restaurantId: number): Promise<KitchenData> {
    return api.get<KitchenData>(`/dashboard/kitchen/${restaurantId}/`);
  },
  
  /**
   * Fetch insights/analytics data in a single request.
   */
  async getInsightsData(
    restaurantId: number,
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
      `/dashboard/insights/${restaurantId}/${queryString ? `?${queryString}` : ''}`
    );
  },
};
