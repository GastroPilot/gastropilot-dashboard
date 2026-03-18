import { api, refreshToken } from "./client";

export interface LoginRequest {
  operator_number?: string;
  pin?: string;
  tenant_slug?: string;
  email?: string;
  password?: string;
}

export interface NFCLoginRequest {
  nfc_tag_id: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  tenant_id?: string | null;
  email?: string | null;
  operator_number: string | null;
  nfc_tag_id?: string | null;
  first_name: string;
  last_name: string;
  role: string;
  auth_method?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
}

export interface UserCreate {
  operator_number?: string;
  pin?: string;
  nfc_tag_id?: string | null;
  email?: string | null;
  password?: string | null;
  first_name: string;
  last_name: string;
  role: "platform_admin" | "owner" | "manager" | "staff" | "kitchen" | "guest";
}

export interface UserUpdate {
  operator_number?: string;
  pin?: string;
  nfc_tag_id?: string | null;
  email?: string | null;
  password?: string | null;
  first_name?: string;
  last_name?: string;
  role?: "platform_admin" | "owner" | "manager" | "staff" | "kitchen" | "guest";
  is_active?: boolean;
}

export const authApi = {
  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/login", data);
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      
      // Speichere Ablaufzeit des Tokens
      const expiresIn = response.expires_in || 3600; // Default: 1 Stunde
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem("access_token_expires_at", expiresAt.toString());
      
      const savedToken = localStorage.getItem("access_token");
      if (!savedToken) {
        console.error("⚠️ Token konnte nicht im localStorage gespeichert werden!");
      } else {
        console.log("✅ Token erfolgreich gespeichert");
      }
    }
    return response;
  },

  loginNFC: async (data: NFCLoginRequest): Promise<TokenResponse> => {
    const response = await api.post<TokenResponse>("/auth/login", data);
    if (typeof window !== "undefined") {
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      
      // Speichere Ablaufzeit des Tokens
      const expiresIn = response.expires_in || 3600; // Default: 1 Stunde
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem("access_token_expires_at", expiresAt.toString());
      
      const savedToken = localStorage.getItem("access_token");
      if (!savedToken) {
        console.error("⚠️ Token konnte nicht im localStorage gespeichert werden!");
      } else {
        console.log("✅ Token erfolgreich gespeichert (NFC-Login)");
      }
    }
    return response;
  },

  refresh: async (): Promise<TokenResponse | null> => {
    if (typeof window === "undefined") return null;
    
    // Verwende die zentrale refreshToken() Funktion aus client.ts
    // Diese hat ein Singleton-Pattern und verhindert Race Conditions
    const newAccessToken = await refreshToken();
    
    if (!newAccessToken) {
      return null;
    }
    
    // Erstelle ein TokenResponse-Objekt aus den gespeicherten Werten
    const storedRefreshToken = localStorage.getItem("refresh_token");
    const expiresAt = localStorage.getItem("access_token_expires_at");
    const expiresIn = expiresAt ? Math.floor((parseInt(expiresAt, 10) - Date.now()) / 1000) : 3600;
    
    return {
      access_token: newAccessToken,
      refresh_token: storedRefreshToken || "",
      token_type: "bearer",
      expires_in: expiresIn,
    };
  },

  getCurrentUser: async (): Promise<User> => {
    return api.get<User>("/auth/me");
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("access_token_expires_at");
      // Impersonation-Daten aufräumen
      localStorage.removeItem("admin_original_token");
      localStorage.removeItem("admin_original_expires_at");
      localStorage.removeItem("impersonating_tenant_id");
      localStorage.removeItem("impersonating_tenant_name");
    }
  },

  isAuthenticated: (): boolean => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem("access_token");
    if (!token) return false;
    
    // Prüfe ob Token abgelaufen ist
    const expiresAt = localStorage.getItem("access_token_expires_at");
    if (expiresAt) {
      const expiresAtMs = parseInt(expiresAt, 10);
      if (Date.now() >= expiresAtMs) {
        // Token ist abgelaufen, aber Refresh-Token könnte noch gültig sein
        return !!localStorage.getItem("refresh_token");
      }
    }
    
    return true;
  },

  isTokenExpired: (): boolean => {
    if (typeof window === "undefined") return true;
    const expiresAt = localStorage.getItem("access_token_expires_at");
    if (!expiresAt) return true;
    
    const expiresAtMs = parseInt(expiresAt, 10);
    // Betrachte Token als abgelaufen, wenn weniger als 30 Sekunden verbleiben
    return Date.now() >= expiresAtMs - 30000;
  },

  createOperator: async (data: UserCreate): Promise<User> => {
    return api.post<User>("/users/", data);
  },

  listOperators: async (): Promise<User[]> => {
    return api.get<User[]>("/users/");
  },

  updateOperator: async (operatorId: string, data: UserUpdate): Promise<User> => {
    return api.patch<User>(`/users/${operatorId}`, data);
  },

  deleteOperator: async (operatorId: string): Promise<void> => {
    return api.delete(`/users/${operatorId}`);
  },
};
