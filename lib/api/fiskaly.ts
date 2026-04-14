import { api } from "./client";

// Types

export interface TssSetupRequest {
  admin_pin?: string;
  restaurant_name?: string;
  restaurant_address?: string;
  restaurant_zip?: string;
  restaurant_city?: string;
  restaurant_tax_number?: string;
}

export interface TssSetupResponse {
  tss_id: string;
  client_id: string;
  client_serial_number: string;
  tss_serial_number: string;
  state: string;
}

export interface TssStatus {
  configured: boolean;
  state: string | null;
  tss_id?: string;
  client_id?: string;
  client_serial_number?: string;
  tss_serial_number?: string;
  created_at?: string | null;
}

export interface FiskalyTransaction {
  id: string;
  order_id: string;
  tx_id?: string;
  tx_number: number | null;
  tx_state: string | null;
  receipt_type: string | null;
  time_start?: number | null;
  time_end?: number | null;
  signature_value: string | null;
  signature_algorithm?: string | null;
  signature_counter?: number | null;
  qr_code_data: string | null;
  tss_serial_number: string | null;
  client_serial_number?: string | null;
  error: string | null;
  receipt_id?: string | null;
  receipt_public_url?: string | null;
  receipt_pdf_url?: string | null;
  created_at: string | null;
}

// API Functions

export async function setupTss(data?: TssSetupRequest): Promise<TssSetupResponse> {
  return api.post<TssSetupResponse>("/fiskaly/tss/setup", data ?? {});
}

export async function getTssStatus(): Promise<TssStatus> {
  return api.get<TssStatus>("/fiskaly/tss/status");
}

export async function disableTss(): Promise<{ status: string; tss_id: string }> {
  return api.post<{ status: string; tss_id: string }>("/fiskaly/tss/disable");
}

export async function listTransactions(
  limit: number = 50,
  offset: number = 0
): Promise<FiskalyTransaction[]> {
  return api.get<FiskalyTransaction[]>(
    `/fiskaly/transactions?limit=${limit}&offset=${offset}`
  );
}

export async function getTransactionForOrder(
  orderId: string
): Promise<FiskalyTransaction> {
  return api.get<FiskalyTransaction>(`/fiskaly/transactions/${orderId}`);
}

export async function retryTransaction(
  orderId: string
): Promise<{ status: string; tx_number: number; qr_code_data: string }> {
  return api.post<{ status: string; tx_number: number; qr_code_data: string }>(
    `/fiskaly/transactions/${orderId}/retry`
  );
}

// Exports

export interface ExportTriggerRequest {
  start_date?: string;
  end_date?: string;
}

export interface ExportTriggerResponse {
  export_id: string;
  tss_id: string;
  state: string;
  time_request: number | null;
}

export interface ExportStatus {
  export_id: string;
  state: "PENDING" | "WORKING" | "COMPLETED" | "ERROR" | "CANCELLED";
  time_start: number | null;
  time_end: number | null;
  time_expiration: number | null;
  estimated_time_of_completion: number | null;
}

export interface ExportListItem {
  export_id: string;
  state: string;
  time_request: number | null;
  time_end: number | null;
  time_expiration: number | null;
}

export async function triggerExport(
  data?: ExportTriggerRequest
): Promise<ExportTriggerResponse> {
  return api.post<ExportTriggerResponse>("/fiskaly/exports/trigger", data ?? {});
}

export async function getExportStatus(
  exportId: string
): Promise<ExportStatus> {
  return api.get<ExportStatus>(`/fiskaly/exports/${exportId}/status`);
}

export async function listExports(): Promise<ExportListItem[]> {
  return api.get<ExportListItem[]>("/fiskaly/exports");
}

export function getExportDownloadUrl(exportId: string): string {
  return `/fiskaly/exports/${exportId}/download`;
}

// eReceipt

export interface ReceiptCreateRequest {
  order_id: string;
  restaurant_name: string;
  restaurant_address?: string;
  restaurant_tax_number?: string;
}

export interface ReceiptResponse {
  receipt_id: string;
  public_url: string;
  pdf_url: string;
  status: "created" | "already_exists";
}

export async function createReceipt(
  data: ReceiptCreateRequest
): Promise<ReceiptResponse> {
  return api.post<ReceiptResponse>("/fiskaly/receipts/create", data);
}

// Daily Closing (Tagesabschluss / DSFinV-K)

export interface DailyClosingRequest {
  business_date: string; // YYYY-MM-DD
}

export interface DailyClosing {
  closing_id: string;
  business_date: string;
  state: string;
  total_amount: number | null;
  total_cash: number | null;
  total_non_cash: number | null;
  transaction_count: number | null;
  error: string | null;
  is_automatic: boolean;
  dsfinvk_export_id: string | null;
  dsfinvk_export_state: string | null;
  created_at: string | null;
  updated_at?: string | null;
}

export async function createDailyClosing(
  data: DailyClosingRequest
): Promise<DailyClosing> {
  return api.post<DailyClosing>("/fiskaly/daily-closing", data);
}

export async function listDailyClosings(
  limit: number = 50,
  offset: number = 0
): Promise<DailyClosing[]> {
  return api.get<DailyClosing[]>(
    `/fiskaly/daily-closings?limit=${limit}&offset=${offset}`
  );
}

export async function getDailyClosing(
  closingId: string
): Promise<DailyClosing> {
  return api.get<DailyClosing>(`/fiskaly/daily-closings/${closingId}`);
}

export async function deleteDailyClosing(
  closingId: string
): Promise<{ status: string; closing_id: string }> {
  return api.delete<{ status: string; closing_id: string }>(
    `/fiskaly/daily-closings/${closingId}`
  );
}

// DSFinV-K Export

export interface DsfinvkExportRequest {
  business_date_start?: string;
  business_date_end?: string;
  closing_id?: string;
  format?: "ZIP" | "TAR";
}

export interface DsfinvkExportResponse {
  export_id: string;
  state: string;
}

export interface DsfinvkExportStatus {
  export_id: string;
  state: "PENDING" | "WORKING" | "COMPLETED" | "ERROR" | "CANCELLED";
  time_creation: number | null;
  time_update: number | null;
}

export interface DsfinvkExportListItem {
  export_id: string;
  state: string;
  time_creation: number | null;
  time_update: number | null;
}

export async function triggerDsfinvkExport(
  data?: DsfinvkExportRequest
): Promise<DsfinvkExportResponse> {
  return api.post<DsfinvkExportResponse>(
    "/fiskaly/dsfinvk-exports/trigger",
    data ?? {}
  );
}

export async function getDsfinvkExportStatus(
  exportId: string
): Promise<DsfinvkExportStatus> {
  return api.get<DsfinvkExportStatus>(
    `/fiskaly/dsfinvk-exports/${exportId}/status`
  );
}

export async function listDsfinvkExports(): Promise<DsfinvkExportListItem[]> {
  return api.get<DsfinvkExportListItem[]>("/fiskaly/dsfinvk-exports");
}

export function getDsfinvkExportDownloadUrl(exportId: string): string {
  return `/fiskaly/dsfinvk-exports/${exportId}/download`;
}

export function getDailyClosingPdfUrl(closingId: string): string {
  return `/fiskaly/daily-closings/${closingId}/pdf`;
}

// Daily Closing Warnings

export interface DailyClosingWarning {
  type: string;
  severity: string;
  business_date: string;
  closing_id: string;
  state: string;
  total_amount: number | null;
  message: string;
}

export async function getDailyClosingWarnings(): Promise<{
  warnings: DailyClosingWarning[];
}> {
  return api.get<{ warnings: DailyClosingWarning[] }>(
    "/fiskaly/daily-closing-warnings"
  );
}
