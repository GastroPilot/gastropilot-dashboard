import { api } from "./client";

// Types

export interface SumUpReader {
  id: string;
  name: string;
  status: "unknown" | "processing" | "paired" | "expired";
  device: {
    identifier: string;
    model: "solo" | "virtual-solo";
  };
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface SumUpReaderStatus {
  battery_level?: number;
  battery_temperature?: number;
  connection_type?: string;
  firmware_version?: string;
  last_activity?: string;
  state?: "IDLE" | "SELECTING_TIP" | "WAITING_FOR_CARD" | "WAITING_FOR_PIN" | "WAITING_FOR_SIGNATURE" | "UPDATING_FIRMWARE";
  status: "ONLINE" | "OFFLINE";
}

export interface PaymentRequest {
  reader_id?: string;
  amount: number;
  currency?: string;
  description?: string;
  tip_rates?: number[];
  tip_timeout?: number;
}

export interface PaymentResponse {
  payment_id: string;
  checkout_id?: string | null;
  client_transaction_id: string;
  reader_id?: string | null;
  amount: number;
  currency: string;
  status: string;
  message: string;
}

// API Functions

export async function listReaders(_restaurantId: string): Promise<SumUpReader[]> {
  return api.get<SumUpReader[]>("/sumup/readers");
}

export async function getReader(_restaurantId: string, readerId: string): Promise<SumUpReader> {
  return api.get<SumUpReader>(`/sumup/readers/${readerId}`);
}

export async function createReader(
  _restaurantId: string,
  pairingCode: string,
  name: string,
  metadata?: Record<string, any>
): Promise<SumUpReader> {
  return api.post<SumUpReader>("/sumup/readers", {
    pairing_code: pairingCode,
    name,
    metadata,
  });
}

export async function getReaderStatus(
  _restaurantId: string,
  readerId: string
): Promise<SumUpReaderStatus> {
  return api.get<SumUpReaderStatus>(`/sumup/readers/${readerId}/status`);
}

export async function startPayment(
  _restaurantId: string,
  orderId: string,
  paymentData: PaymentRequest
): Promise<PaymentResponse> {
  return api.post<PaymentResponse>(`/sumup/orders/${orderId}/pay`, paymentData);
}

export async function terminatePayment(
  _restaurantId: string,
  readerId: string
): Promise<void> {
  return api.post<void>(`/sumup/readers/${readerId}/terminate`);
}

export interface SumUpPayment {
  id: string;
  order_id: string;
  restaurant_id: string;
  reader_id?: string | null;
  checkout_id?: string | null;
  client_transaction_id?: string | null;
  transaction_code?: string | null;
  transaction_id?: string | null;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "successful" | "failed" | "canceled";
  initiated_at: string;
  completed_at?: string | null;
  created_at_utc: string;
  order?: {
    id: string;
    order_number?: string | null;
    total: number;
    status: string;
  } | null;
}

export async function getFailedPayments(
  _restaurantId: string,
  limit: number = 50
): Promise<SumUpPayment[]> {
  return api.get<SumUpPayment[]>(`/sumup/payments?status=failed&limit=${limit}`);
}

export async function getPayments(
  _restaurantId: string,
  status?: string,
  limit: number = 100
): Promise<SumUpPayment[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("limit", limit.toString());
  return api.get<SumUpPayment[]>(`/sumup/payments?${params.toString()}`);
}

export async function getOrderPayments(
  _restaurantId: string,
  orderId: string
): Promise<SumUpPayment[]> {
  return api.get<SumUpPayment[]>(`/sumup/orders/${orderId}/payments`);
}
