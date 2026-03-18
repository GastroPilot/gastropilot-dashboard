import { adminApi } from "./client";
import { getApiBaseUrl, API_PREFIX, buildApiUrl } from "./config";

export interface AdminUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  tenant_id: string | null;
}

interface StaffTokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    tenant_id: string | null;
    email: string | null;
  };
}

export const adminAuthApi = {
  login: async (data: {
    email: string;
    password: string;
  }): Promise<AdminUser> => {
    const baseUrl = getApiBaseUrl();
    const url = buildApiUrl(baseUrl, API_PREFIX, "/auth/login");

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: data.email, password: data.password }),
      credentials: "include",
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: "Login fehlgeschlagen" }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Login fehlgeschlagen");
    }

    const result: StaffTokenResponse = await response.json();

    if (result.user.role !== "platform_admin") {
      throw new Error("Kein Admin-Zugang");
    }

    if (typeof window !== "undefined") {
      localStorage.setItem("admin_access_token", result.access_token);
    }

    return {
      id: result.user.id,
      first_name: result.user.first_name,
      last_name: result.user.last_name,
      email: result.user.email || data.email,
      role: result.user.role,
      tenant_id: result.user.tenant_id,
    };
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("admin_access_token");
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    return !!localStorage.getItem("admin_access_token");
  },

  getMe: async (): Promise<AdminUser> => {
    return adminApi.get<AdminUser>("/auth/me");
  },
};
