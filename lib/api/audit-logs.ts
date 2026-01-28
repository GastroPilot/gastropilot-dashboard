import { api } from './client';

export interface AuditLog {
  id: number;
  restaurant_id: number;
  user_id?: number | null;
  entity_type: string;
  entity_id?: number | null;
  action: string;
  description?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
  created_at_utc: string;
}

export interface AuditLogFilters {
  entity_type?: string;
  entity_id?: number;
  action?: string;
  limit?: number;
  offset?: number;
  user_id?: number;
}

export interface AuditLogListResponse {
  results: AuditLog[];
  total: number;
  limit: number;
  offset: number;
  hasTotal: boolean;
}

type AuditLogListApiResponse =
  | AuditLog[]
  | {
      results?: AuditLog[];
      items?: AuditLog[];
      data?: AuditLog[];
      total?: number;
      total_count?: number;
      count?: number;
      limit?: number;
      page_size?: number;
      offset?: number;
      page?: number;
    };

const normalizeAuditLogResponse = (
  data: AuditLogListApiResponse,
  params: AuditLogFilters
): AuditLogListResponse => {
  const fallbackLimit = params.limit ?? 25;
  const fallbackOffset = params.offset ?? 0;

  if (Array.isArray(data)) {
    const inferredTotal = data.length + fallbackOffset;
    return {
      results: data,
      total: inferredTotal,
      limit: fallbackLimit,
      offset: fallbackOffset,
      hasTotal: false,
    };
  }

  const results = data.results ?? data.items ?? data.data ?? [];
  const limit = (data.limit ?? data.page_size ?? fallbackLimit) || 25;
  const offset =
    typeof data.offset === 'number'
      ? data.offset
      : data.page && limit
        ? (data.page - 1) * limit
        : fallbackOffset;
  const hasTotal =
    data.total !== undefined || data.total_count !== undefined || data.count !== undefined;
  const total =
    data.total ?? data.total_count ?? data.count ?? Math.max(results.length + offset, 0);

  return {
    results,
    total,
    limit,
    offset,
    hasTotal,
  };
};

export const auditLogsApi = {
  list: async (
    restaurantId: number,
    params: AuditLogFilters = {}
  ): Promise<AuditLogListResponse> => {
    const query = new URLSearchParams();
    if (params.entity_type) query.append('entity_type', params.entity_type);
    if (typeof params.entity_id === 'number')
      query.append('entity_id', params.entity_id.toString());
    if (params.action) query.append('action', params.action);
    if (typeof params.user_id === 'number') query.append('user_id', params.user_id.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.offset) query.append('offset', params.offset.toString());

    const queryString = query.toString();
    const url = queryString
      ? `/restaurants/${restaurantId}/audit-logs/?${queryString}`
      : `/restaurants/${restaurantId}/audit-logs/`;
    const response = await api.get<AuditLogListApiResponse>(url);
    return normalizeAuditLogResponse(response, params);
  },
};
