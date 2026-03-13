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
  item_ids?: string[];
}

export interface OrderItem {
  id: string;
  order_id: string;
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
  id: string;
  restaurant_id: string;
  table_id: string | null;
  guest_id: string | null;
  reservation_id: string | null;
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
  created_by_user_id: string | null;
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
  table_id?: string | null;
  guest_id?: string | null;
  reservation_id?: string | null;
  party_size?: number | null;
  notes?: string | null;
  special_requests?: string | null;
  items?: OrderItemCreate[];
}

export interface OrderUpdate {
  table_id?: string | null;
  guest_id?: string | null;
  reservation_id?: string | null;
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
    _restaurantId: string,
    params?: {
      status?: OrderStatus;
      table_id?: string;
      guest_id?: string;
      reservation_id?: string;
      start_date?: string;
      end_date?: string;
    }
  ): Promise<Order[]> => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.table_id) queryParams.append("table_id", params.table_id);
    if (params?.guest_id) queryParams.append("guest_id", params.guest_id);
    if (params?.reservation_id)
      queryParams.append("reservation_id", params.reservation_id);
    if (params?.start_date) queryParams.append("start_date", params.start_date);
    if (params?.end_date) queryParams.append("end_date", params.end_date);

    const query = queryParams.toString();
    return api.get<Order[]>(`/orders/${query ? `?${query}` : ""}`);
  },

  get: async (_restaurantId: string, orderId: string): Promise<OrderWithItems> => {
    return api.get<OrderWithItems>(`/orders/${orderId}`);
  },

  create: async (_restaurantId: string, data: OrderCreate): Promise<Order> => {
    return api.post<Order>(`/orders/`, data);
  },

  update: async (
    _restaurantId: string,
    orderId: string,
    data: OrderUpdate
  ): Promise<Order> => {
    return api.patch<Order>(`/orders/${orderId}`, data);
  },

  delete: async (_restaurantId: string, orderId: string): Promise<void> => {
    await api.patch<Order>(`/orders/${orderId}`, { status: "canceled" });
  },

  // OrderItem endpoints
  addItem: async (
    _restaurantId: string,
    orderId: string,
    item: OrderItemCreate
  ): Promise<OrderItem> => {
    return api.post<OrderItem>(`/orders/${orderId}/items`, item);
  },

  updateItem: async (
    _restaurantId: string,
    orderId: string,
    itemId: string,
    item: OrderItemUpdate
  ): Promise<OrderItem> => {
    return api.patch<OrderItem>(`/orders/${orderId}/items/${itemId}`, item);
  },

  deleteItem: async (
    _restaurantId: string,
    orderId: string,
    itemId: string
  ): Promise<void> => {
    return api.delete(`/orders/${orderId}/items/${itemId}`);
  },
};

