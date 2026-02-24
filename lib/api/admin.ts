import { api } from "./client";

export interface Tenant {
  id: string;
  name: string;
  slug: string | null;
  created_at: string;
}

export interface ImpersonateResponse {
  impersonation_token: string;
  tenant_id: string;
  tenant_name: string;
}

export const adminApi = {
  listTenants: (): Promise<Tenant[]> =>
    api.get<Tenant[]>("/admin/tenants"),

  impersonateTenant: (tenantId: string): Promise<ImpersonateResponse> =>
    api.get<ImpersonateResponse>(`/admin/tenants/${tenantId}/impersonate`),
};

// ─── Impersonation-Helpers ────────────────────────────────────────────────────

const KEYS = {
  originalToken:     "admin_original_token",
  originalExpiresAt: "admin_original_expires_at",
  tenantId:          "impersonating_tenant_id",
  tenantName:        "impersonating_tenant_name",
} as const;

export const impersonation = {
  /** Wechselt in den Kontext eines Tenants. */
  start(token: string, tenantId: string, tenantName: string): void {
    if (typeof window === "undefined") return;
    // Originaltoken sichern
    localStorage.setItem(KEYS.originalToken, localStorage.getItem("access_token") ?? "");
    localStorage.setItem(KEYS.originalExpiresAt, localStorage.getItem("access_token_expires_at") ?? "");
    // Impersonation-Token aktivieren (1 h gültig, kein Refresh)
    localStorage.setItem("access_token", token);
    localStorage.setItem("access_token_expires_at", String(Date.now() + 3600_000));
    localStorage.removeItem("refresh_token");
    // Kontext merken
    localStorage.setItem(KEYS.tenantId, tenantId);
    localStorage.setItem(KEYS.tenantName, tenantName);
  },

  /** Beendet die Impersonation und stellt den Admin-Token wieder her. */
  stop(): void {
    if (typeof window === "undefined") return;
    const original = localStorage.getItem(KEYS.originalToken);
    const expiresAt = localStorage.getItem(KEYS.originalExpiresAt);
    if (original) {
      localStorage.setItem("access_token", original);
      if (expiresAt) localStorage.setItem("access_token_expires_at", expiresAt);
    }
    localStorage.removeItem(KEYS.originalToken);
    localStorage.removeItem(KEYS.originalExpiresAt);
    localStorage.removeItem(KEYS.tenantId);
    localStorage.removeItem(KEYS.tenantName);
  },

  isActive(): boolean {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem(KEYS.tenantId);
  },

  getTenantName(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEYS.tenantName);
  },

  getTenantId(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(KEYS.tenantId);
  },
};
