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
  checkout_id?: string | null;  // Checkout ID für weitere Verarbeitung
  client_transaction_id: string;
  reader_id?: string | null;  // Optional, da Zahlung ohne Reader-ID möglich ist
  amount: number;
  currency: string;
  status: string;
  message: string;
}

// API Functions

/**
 * Listet alle Reader (Terminals) für ein Restaurant.
 */
export async function listReaders(restaurantId: string): Promise<SumUpReader[]> {
  return api.get<SumUpReader[]>(`/restaurants/${restaurantId}/sumup/readers`);
}

/**
 * Holt einen einzelnen Reader.
 */
export async function getReader(restaurantId: string, readerId: string): Promise<SumUpReader> {
  return api.get<SumUpReader>(`/restaurants/${restaurantId}/sumup/readers/${readerId}`);
}

/**
 * Erstellt einen neuen Reader (paart ein Terminal).
 */
export async function createReader(
  restaurantId: string,
  pairingCode: string,
  name: string,
  metadata?: Record<string, any>
): Promise<SumUpReader> {
  return api.post<SumUpReader>(`/restaurants/${restaurantId}/sumup/readers`, {
    pairing_code: pairingCode,
    name,
    metadata,
  });
}

/**
 * Holt den Status eines Readers (Batterie, Verbindung, aktueller Zustand).
 */
export async function getReaderStatus(
  restaurantId: string,
  readerId: string
): Promise<SumUpReaderStatus> {
  return api.get<SumUpReaderStatus>(`/restaurants/${restaurantId}/sumup/readers/${readerId}/status`);
}

/**
 * Startet eine Zahlung für eine Bestellung über SumUp Terminal.
 */
export async function startPayment(
  restaurantId: string,
  orderId: string,
  paymentData: PaymentRequest
): Promise<PaymentResponse> {
  return api.post<PaymentResponse>(
    `/restaurants/${restaurantId}/sumup/orders/${orderId}/pay`,
    paymentData
  );
}

/**
 * Bricht eine laufende Zahlung am Terminal ab.
 */
export async function terminatePayment(
  restaurantId: string,
  readerId: string
): Promise<void> {
  return api.post<void>(`/restaurants/${restaurantId}/sumup/readers/${readerId}/terminate`);
}

/**
 * SumUp Payment Interface
 */
export interface SumUpPayment {
  id: string;
  order_id: string;
  restaurant_id: string;
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

/**
 * Ruft fehlgeschlagene SumUp-Zahlungen für ein Restaurant ab.
 */
export async function getFailedPayments(
  restaurantId: string,
  limit: number = 50
): Promise<SumUpPayment[]> {
  return api.get<SumUpPayment[]>(
    `/restaurants/${restaurantId}/sumup/payments/failed?limit=${limit}`
  );
}

/**
 * Ruft SumUp-Zahlungen für ein Restaurant ab (mit optionalem Status-Filter).
 */
export async function getPayments(
  restaurantId: string,
  status?: string,
  limit: number = 100
): Promise<SumUpPayment[]> {
  const params = new URLSearchParams();
  if (status) params.append("status", status);
  params.append("limit", limit.toString());
  return api.get<SumUpPayment[]>(
    `/restaurants/${restaurantId}/sumup/payments?${params.toString()}`
  );
}

/**
 * Ruft alle SumUp-Zahlungen für eine bestimmte Bestellung ab.
 */
export async function getOrderPayments(
  restaurantId: string,
  orderId: string
): Promise<SumUpPayment[]> {
  return api.get<SumUpPayment[]>(
    `/restaurants/${restaurantId}/sumup/orders/${orderId}/payments`
  );
}
