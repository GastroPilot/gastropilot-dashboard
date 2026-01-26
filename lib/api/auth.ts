import { api } from "./client";

export interface LoginRequest {
  operator_number: string;
  pin: string;
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
  id: number;
  operator_number: string;
  nfc_tag_id?: string | null;
  first_name: string;
  last_name: string;
  role: string;
  is_active: boolean;
  created_at_utc: string;
  updated_at_utc: string;
  last_login_at_utc?: string | null;
}

export interface UserCreate {
  operator_number: string;
  pin: string;
  nfc_tag_id?: string | null;
  first_name: string;
  last_name: string;
  role: "servecta" | "restaurantinhaber" | "schichtleiter" | "mitarbeiter";
}

export interface UserUpdate {
  operator_number?: string;
  pin?: string;
  nfc_tag_id?: string | null;
  first_name?: string;
  last_name?: string;
  role?: "servecta" | "restaurantinhaber" | "schichtleiter" | "mitarbeiter";
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
    const response = await api.post<TokenResponse>("/auth/login-nfc", data);
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
    
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      console.warn("⚠️ Kein Refresh-Token gefunden");
      return null;
    }

    try {
      const response = await api.post<TokenResponse>("/auth/refresh", {
        refresh_token: refreshToken,
      });
      
      // Speichere neue Tokens
      localStorage.setItem("access_token", response.access_token);
      localStorage.setItem("refresh_token", response.refresh_token);
      
      // Speichere neue Ablaufzeit
      const expiresIn = response.expires_in || 3600;
      const expiresAt = Date.now() + expiresIn * 1000;
      localStorage.setItem("access_token_expires_at", expiresAt.toString());
      
      console.log("✅ Token erfolgreich erneuert");
      return response;
    } catch (error) {
      console.error("❌ Token-Refresh fehlgeschlagen:", error);
      // Bei Fehler: Tokens löschen und zum Login weiterleiten
      authApi.logout();
      return null;
    }
  },

  getCurrentUser: async (): Promise<User> => {
    return api.get<User>("/auth/me");
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("access_token_expires_at");
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
    return api.post<User>("/auth/create-operator", data);
  },

  listOperators: async (): Promise<User[]> => {
    return api.get<User[]>("/auth/operators");
  },

  updateOperator: async (operatorId: number, data: UserUpdate): Promise<User> => {
    return api.patch<User>(`/auth/operators/${operatorId}`, data);
  },

  deleteOperator: async (operatorId: number): Promise<void> => {
    return api.delete(`/auth/operators/${operatorId}`);
  },
};
