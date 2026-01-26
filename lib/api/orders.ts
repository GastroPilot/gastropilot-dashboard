import { api } from "./client";

export type OrderStatus =
  | "open"
  | "sent_to_kitchen"
  | "in_preparation"
  | "ready"
  | "served"
  | "paid"
  | "canceled";

export type PaymentStatus = "unpaid" | "partial" | "paid";

export interface SplitPayment {
  method: string;
  amount: number;
  tip_amount?: number;
  is_paid?: boolean;
  item_ids?: number[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  item_name: string;
  item_description: string | null;
  category: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  tax_rate: number;
  status: string;
  notes: string | null;
  sort_order: number | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface Order {
  id: number;
  restaurant_id: number;
  table_id: number | null;
  guest_id: number | null;
  reservation_id: number | null;
  order_number: string | null;
  status: OrderStatus;
  party_size: number | null;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  discount_percentage: number | null;
  tip_amount: number;
  total: number;
  payment_method: string | null;
  payment_status: PaymentStatus;
  split_payments: SplitPayment[] | null;
  notes: string | null;
  special_requests: string | null;
  opened_at: string;
  closed_at: string | null;
  paid_at: string | null;
  created_by_user_id: number | null;
  created_at_utc: string;
  updated_at_utc: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface OrderItemCreate {
  item_name: string;
  item_description?: string | null;
  category?: string | null;
  quantity: number;
  unit_price: number;
  notes?: string | null;
  sort_order?: number;
}

export interface OrderItemUpdate {
  item_name?: string;
  item_description?: string | null;
  category?: string | null;
  quantity?: number;
  unit_price?: number;
  status?: string;
  notes?: string | null;
  sort_order?: number;
}

export interface OrderCreate {
  table_id?: number | null;
  guest_id?: number | null;
  reservation_id?: number | null;
  party_size?: number | null;
  notes?: string | null;
  special_requests?: string | null;
  items?: OrderItemCreate[];
}

export interface OrderUpdate {
  table_id?: number | null;
  guest_id?: number | null;
  reservation_id?: number | null;
  status?: OrderStatus;
  party_size?: number | null;
  subtotal?: number;
  tax_amount?: number;
  discount_amount?: number;
  discount_percentage?: number | null;
  tip_amount?: number;
  total?: number;
  payment_method?: string | null;
  payment_status?: PaymentStatus;
  split_payments?: SplitPayment[] | null;
  notes?: string | null;
  special_requests?: string | null;
  closed_at?: string | null;
  paid_at?: string | null;
}

export const ordersApi = {
  list: async (
    restaurantId: number,
    params?: {
      status?: OrderStatus;
      table_id?: number;
      guest_id?: number;
      reservation_id?: number;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status_filter", params.status);
    if (params?.table_id) queryParams.append("table_id", params.table_id.toString());
    if (params?.guest_id) queryParams.append("guest_id", params.guest_id.toString());
    if (params?.reservation_id)
      queryParams.append("reservation_id", params.reservation_id.toString());
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const query = queryParams.toString();
    // Backend-Route ist @router.get("/"), daher trailing slash erforderlich
    return api.get<Order[]>(
      `/restaurants/${restaurantId}/orders/${query ? `?${query}` : ""}`
    );
  },

  get: async (restaurantId: number, orderId: number): Promise<OrderWithItems> => {
    return api.get<OrderWithItems>(
      `/restaurants/${restaurantId}/orders/${orderId}`
    );
  },

  create: async (restaurantId: number, data: OrderCreate): Promise<Order> => {
    // Backend-Route ist @router.post("/"), daher trailing slash erforderlich
    return api.post<Order>(`/restaurants/${restaurantId}/orders/`, data);
  },

  update: async (
    restaurantId: number,
    orderId: number,
    data: OrderUpdate
  ): Promise<Order> => {
    return api.patch<Order>(
      `/restaurants/${restaurantId}/orders/${orderId}`,
      data
    );
  },

  delete: async (restaurantId: number, orderId: number): Promise<void> => {
    return api.delete(`/restaurants/${restaurantId}/orders/${orderId}`);
  },

  // OrderItem endpoints
  addItem: async (
    restaurantId: number,
    orderId: number,
    item: OrderItemCreate
  ): Promise<OrderItem> => {
    return api.post<OrderItem>(
      `/restaurants/${restaurantId}/orders/${orderId}/items`,
      item
    );
  },

  updateItem: async (
    restaurantId: number,
    orderId: number,
    itemId: number,
    item: OrderItemUpdate
  ): Promise<OrderItem> => {
    return api.patch<OrderItem>(
      `/restaurants/${restaurantId}/orders/${orderId}/items/${itemId}`,
      item
    );
  },

  deleteItem: async (
    restaurantId: number,
    orderId: number,
    itemId: number
  ): Promise<void> => {
    return api.delete(
      `/restaurants/${restaurantId}/orders/${orderId}/items/${itemId}`
    );
  },
};

