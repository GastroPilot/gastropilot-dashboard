import { adminApi } from "./client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}

export interface AdminGuest {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  language: string | null;
  notes: string | null;
  email_verified: boolean;
  has_password: boolean;
  allergen_profile?: unknown[];
  created_at: string | null;
  updated_at?: string | null;
}

export interface AdminReservation {
  id: string;
  tenant_id: string;
  restaurant_name: string;
  guest_name: string | null;
  guest_email: string | null;
  guest_phone: string | null;
  party_size: number;
  start_at: string | null;
  end_at: string | null;
  status: string;
  channel: string;
  special_requests: string | null;
  notes?: string | null;
  confirmation_code?: string | null;
  canceled_reason?: string | null;
  created_at: string | null;
}

export interface AdminReview {
  id: string;
  tenant_id: string;
  restaurant_name: string;
  guest_profile_id: string | null;
  guest_name: string | null;
  rating: number;
  title: string | null;
  text: string | null;
  is_visible: boolean;
  is_verified: boolean;
  staff_reply: string | null;
  staff_reply_at: string | null;
  created_at: string | null;
}

export interface AdminStats {
  total_guests: number;
  total_reservations: number;
  total_reviews: number;
  total_restaurants: number;
  reservations_by_status: Record<string, number>;
  recent_guests_30d: number;
  recent_reservations_30d: number;
}

// ─── API Functions ──────────────────────────────────────────────────────────

function buildQuery(params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length ? `?${parts.join("&")}` : "";
}

export const adminGuestsApi = {
  list: (params: { page?: number; per_page?: number; search?: string } = {}) =>
    adminApi.get<PaginatedResponse<AdminGuest>>(
      `/admin/guests${buildQuery(params)}`
    ),

  get: (id: string) => adminApi.get<AdminGuest>(`/admin/guests/${id}`),

  update: (
    id: string,
    data: {
      first_name?: string;
      last_name?: string;
      email?: string;
      phone?: string;
      language?: string;
      notes?: string;
      allergen_profile?: unknown[];
      email_verified?: boolean;
      password?: string;
    }
  ) => adminApi.patch<AdminGuest>(`/admin/guests/${id}`, data),

  delete: (id: string) =>
    adminApi.delete<{ deleted: boolean }>(`/admin/guests/${id}`),
};

export const adminReservationsApi = {
  list: (
    params: {
      page?: number;
      per_page?: number;
      status?: string;
      restaurant_id?: string;
    } = {}
  ) =>
    adminApi.get<PaginatedResponse<AdminReservation>>(
      `/admin/reservations${buildQuery(params)}`
    ),

  get: (id: string) =>
    adminApi.get<AdminReservation>(`/admin/reservations/${id}`),

  updateStatus: (
    id: string,
    data: { status: string; canceled_reason?: string }
  ) =>
    adminApi.patch<{ id: string; status: string }>(
      `/admin/reservations/${id}/status`,
      data
    ),
};

export const adminReviewsApi = {
  list: (
    params: {
      page?: number;
      per_page?: number;
      restaurant_id?: string;
      visible?: boolean;
    } = {}
  ) =>
    adminApi.get<PaginatedResponse<AdminReview>>(
      `/admin/reviews${buildQuery(params)}`
    ),

  toggleVisibility: (id: string, is_visible: boolean) =>
    adminApi.patch<{ id: string; is_visible: boolean }>(
      `/admin/reviews/${id}`,
      { is_visible }
    ),

  delete: (id: string) =>
    adminApi.delete<{ deleted: boolean }>(`/admin/reviews/${id}`),

  reply: (id: string, text: string) =>
    adminApi.post<{ id: string; staff_reply: string; staff_reply_at: string }>(
      `/admin/reviews/${id}/reply`,
      { text }
    ),
};

export const adminStatsApi = {
  get: () => adminApi.get<AdminStats>("/admin/stats"),
};
