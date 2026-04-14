import { api } from "./client";

export type TerminalProvider = "sumup" | "manual";

export interface PaymentTerminal {
  id: string;
  provider: TerminalProvider;
  name: string;
  provider_terminal_id: string | null;
  is_active: boolean;
  is_default: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string | null;
  live_status: {
    status?: "ONLINE" | "OFFLINE";
    battery_level?: number;
    firmware_version?: string;
    state?: string;
    last_activity?: string;
  } | null;
}

export interface TerminalPayment {
  id: string;
  order_id: string;
  terminal_id: string | null;
  provider: TerminalProvider;
  amount: number;
  currency: string;
  status:
    | "pending"
    | "processing"
    | "awaiting_confirmation"
    | "successful"
    | "failed"
    | "canceled";
  provider_data: Record<string, unknown> | null;
  error: string | null;
  initiated_at: string | null;
  completed_at: string | null;
}

export interface TerminalCreateRequest {
  provider: TerminalProvider;
  name: string;
  pairing_code?: string;
  metadata?: Record<string, unknown>;
  is_default?: boolean;
}

export interface PaymentInitRequest {
  terminal_id: string;
  amount: number;
  currency?: string;
  description?: string;
  tip_rates?: number[];
  tip_timeout?: number;
}

export interface PaymentInitResponse {
  payment_id: string;
  terminal_id: string;
  provider: TerminalProvider;
  status: string;
  amount: number;
  currency: string;
  provider_data: Record<string, unknown> | null;
}

export const terminalsApi = {
  list: () => api.get<PaymentTerminal[]>("/terminals"),

  create: (data: TerminalCreateRequest) =>
    api.post<PaymentTerminal>("/terminals", data),

  update: (id: string, data: { name?: string; is_active?: boolean; is_default?: boolean; metadata?: Record<string, unknown> }) =>
    api.put<{ status: string; id: string }>(`/terminals/${id}`, data),

  delete: (id: string) =>
    api.delete<{ status: string }>(`/terminals/${id}`),

  initiatePayment: (orderId: string, data: PaymentInitRequest) =>
    api.post<PaymentInitResponse>(`/terminals/orders/${orderId}/pay`, data),

  confirmPayment: (paymentId: string) =>
    api.post<{ payment_id: string; status: string }>(`/terminals/payments/${paymentId}/confirm`),

  cancelPayment: (paymentId: string) =>
    api.post<{ payment_id: string; status: string }>(`/terminals/payments/${paymentId}/cancel`),

  listOrderPayments: (orderId: string) =>
    api.get<TerminalPayment[]>(`/terminals/orders/${orderId}/payments`),

  listPayments: (status?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (limit) params.set("limit", String(limit));
    const qs = params.toString();
    return api.get<TerminalPayment[]>(`/terminals/payments${qs ? `?${qs}` : ""}`);
  },
};

export const PROVIDER_LABELS: Record<TerminalProvider, string> = {
  sumup: "SumUp",
  manual: "Manuelles Terminal",
};
