import { getApiBaseUrl, API_PREFIX, buildApiUrl } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ============================================
// GLOBALER TOKEN REFRESH SINGLETON
// Verhindert Race Conditions bei parallelen Requests
// ============================================

let refreshPromise: Promise<string | null> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 2000; // 2 Sekunden Cooldown zwischen Refreshes
const API_DEBUG_ENABLED = process.env.NEXT_PUBLIC_API_DEBUG === "true";

function debugLog(...args: unknown[]): void {
  if (API_DEBUG_ENABLED) {
    console.debug(...args);
  }
}

const ORDERS_SERVICE_ENDPOINT_PATTERN =
  /^\/(orders|kitchen|waitlist|order-statistics|invoices|sumup|fiskaly)(\/|$)/;
const AI_SERVICE_ENDPOINT_PATTERN = /^\/ai(\/|$)/;

function resolveBaseUrlForEndpoint(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const isOrdersServiceEndpoint =
    ORDERS_SERVICE_ENDPOINT_PATTERN.test(endpoint) ||
    endpoint.startsWith("/webhooks/sumup");
  const isAiServiceEndpoint = AI_SERVICE_ENDPOINT_PATTERN.test(endpoint);

  if (isAiServiceEndpoint) {
    const explicitAiBaseUrl = process.env.NEXT_PUBLIC_AI_API_BASE_URL;
    if (explicitAiBaseUrl) {
      return explicitAiBaseUrl;
    }

    // Lokales Direkt-Setup ohne nginx: core auf 8000, ai auf 8002
    try {
      const parsed = new URL(baseUrl);
      const isLocalhost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      if (isLocalhost && parsed.port === "8000") {
        return `${parsed.protocol}//${parsed.hostname}:8002`;
      }
    } catch {
      // Fallback: nutze default baseUrl
    }

    return baseUrl;
  }

  if (!isOrdersServiceEndpoint) {
    return baseUrl;
  }

  const explicitOrdersBaseUrl = process.env.NEXT_PUBLIC_ORDERS_API_BASE_URL;
  if (explicitOrdersBaseUrl) {
    return explicitOrdersBaseUrl;
  }

  // Lokales Direkt-Setup ohne nginx: core auf 8000, orders auf 8001
  try {
    const parsed = new URL(baseUrl);
    const isLocalhost =
      parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
    if (isLocalhost && parsed.port === "8000") {
      return `${parsed.protocol}//${parsed.hostname}:8001`;
    }
  } catch {
    // Fallback: nutze default baseUrl
  }

  return baseUrl;
}

export function getApiUrlForEndpoint(endpoint: string): string {
  const baseUrl = resolveBaseUrlForEndpoint(endpoint);
  return buildApiUrl(baseUrl, API_PREFIX, endpoint);
}

/**
 * Globale Token-Refresh-Funktion mit Singleton-Pattern.
 * Verhindert Race Conditions bei parallelen API-Calls.
 * 
 * WICHTIG: Diese Funktion wird von allen Stellen verwendet, die Token refreshen müssen.
 * Niemals direkt den /auth/refresh Endpoint aufrufen!
 */
export async function refreshToken(): Promise<string | null> {
  // Wenn bereits ein Refresh läuft, warte auf das Ergebnis
  if (refreshPromise) {
    debugLog("[API] Refresh bereits in Arbeit, warte auf Ergebnis");
    return refreshPromise;
  }

  // Cooldown: Wenn kürzlich ein Refresh stattfand, nicht nochmal refreshen
  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    debugLog("[API] Refresh Cooldown aktiv, ueberspringe");
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    return token;
  }

  refreshPromise = (async () => {
    try {
      const refreshTokenValue = typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

      if (!refreshTokenValue) {
        debugLog("[API] Kein Refresh-Token gefunden");
        return null;
      }

      debugLog("[API] Starte Token-Refresh");
      const refreshUrl = buildApiUrl(getApiBaseUrl(), API_PREFIX, "/auth/refresh");
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
        credentials: 'include',
      });

      if (!response.ok) {
        console.error("❌ Refresh fehlgeschlagen:", response.status);
        // Refresh fehlgeschlagen, Tokens löschen
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("access_token_expires_at");
        }
        return null;
      }

      const data = await response.json();
      
      if (typeof window !== "undefined") {
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        
        const expiresIn = data.expires_in || 3600;
        const expiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem("access_token_expires_at", expiresAt.toString());
      }

      lastRefreshTime = Date.now();
      debugLog("[API] Token erfolgreich erneuert");
      return data.access_token;
    } catch (error) {
      console.error("❌ Token-Refresh fehlgeschlagen:", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("access_token_expires_at");
      }
      return null;
    } finally {
      // Wichtig: Promise erst nach kurzer Verzögerung zurücksetzen,
      // um Race Conditions bei fast gleichzeitigen Requests zu vermeiden
      setTimeout(() => {
        refreshPromise = null;
      }, 100);
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnAuthError: boolean = true
): Promise<T> {
  const baseUrl = resolveBaseUrlForEndpoint(endpoint);
  const url = buildApiUrl(baseUrl, API_PREFIX, endpoint);
  debugLog(`[API Client] Request to: ${url} (baseUrl: ${baseUrl})`);

  // Prüfe ob Token abgelaufen ist und erneuere es proaktiv
  let token = typeof window !== "undefined" 
    ? localStorage.getItem("access_token") 
    : null;

  const expiresAt = typeof window !== "undefined"
    ? localStorage.getItem("access_token_expires_at")
    : null;

  // Erneuere Token wenn es in weniger als 30 Sekunden abläuft
  if (token && expiresAt) {
    const expiresAtMs = parseInt(expiresAt, 10);
    if (Date.now() >= expiresAtMs - 30000) {
      const refreshedToken = await refreshToken();
      if (refreshedToken) {
        token = refreshedToken;
      }
    }
  }

  const headers = new Headers(options.headers || undefined);
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
    debugLog(`[API] Authorization header gesetzt fuer Endpoint ${endpoint}`);
  } else if (typeof window !== "undefined") {
    debugLog(`[API] Kein Token gefunden fuer Request: ${endpoint}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Wichtig für CORS mit credentials
  });

  // Bei 401/403: Versuche Token zu refreshen und Request zu wiederholen
  if (!response.ok && (response.status === 401 || response.status === 403) && retryOnAuthError) {
    const refreshedToken = await refreshToken();
    
    if (refreshedToken) {
      // Request mit neuem Token wiederholen
      const retryHeaders = new Headers(options.headers || undefined);
      if (!retryHeaders.has("Content-Type")) {
        retryHeaders.set("Content-Type", "application/json");
      }
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);
      
      const retryResponse = await fetch(url, {
        ...options,
        headers: retryHeaders,
        credentials: 'include', // Wichtig für CORS mit credentials
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => ({ 
          detail: retryResponse.status === 401 ? "Not authenticated" : 
                  retryResponse.status === 403 ? "Forbidden" : 
                  retryResponse.statusText 
        }));
        
        // Format validation errors (422) from FastAPI
        let errorMessage = "An error occurred";
        if (errorData.detail) {
          if (Array.isArray(errorData.detail)) {
            errorMessage = errorData.detail
              .map((err: any) => {
                const field = err.loc?.slice(1).join(".") || "field";
                return `${field}: ${err.msg}`;
              })
              .join(", ");
          } else if (typeof errorData.detail === "string") {
            errorMessage = errorData.detail;
          } else {
            errorMessage = JSON.stringify(errorData.detail);
          }
        } else if (errorData.message) {
          errorMessage = errorData.message;
        }
        
        throw new ApiError(
          retryResponse.status,
          errorMessage,
          errorData
        );
      }

      if (retryResponse.status === 204) {
        return null as T;
      }

      return retryResponse.json();
    } else {
      // Refresh fehlgeschlagen, werfe Fehler
      const errorData = await response.json().catch(() => ({ 
        detail: response.status === 401 ? "Not authenticated" : 
                response.status === 403 ? "Forbidden" : 
                response.statusText 
      }));
      
      // Format validation errors (422) from FastAPI
      let errorMessage = "An error occurred";
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail
            .map((err: any) => {
              const field = err.loc?.slice(1).join(".") || "field";
              return `${field}: ${err.msg}`;
            })
            .join(", ");
        } else if (typeof errorData.detail === "string") {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
      
      throw new ApiError(
        response.status,
        errorMessage,
        errorData
      );
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ 
      detail: response.status === 401 ? "Not authenticated" : 
              response.status === 403 ? "Forbidden" : 
              response.statusText 
    }));
    
    // Format validation errors (422) from FastAPI
    let errorMessage = "An error occurred";
    if (errorData.detail) {
      if (Array.isArray(errorData.detail)) {
        // FastAPI validation errors are arrays
        errorMessage = errorData.detail
          .map((err: any) => {
            const field = err.loc?.slice(1).join(".") || "field";
            return `${field}: ${err.msg}`;
          })
          .join(", ");
      } else if (typeof errorData.detail === "string") {
        errorMessage = errorData.detail;
      } else {
        errorMessage = JSON.stringify(errorData.detail);
      }
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }
    
    throw new ApiError(
      response.status,
      errorMessage,
      errorData
    );
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json();
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: "GET" }),
  post: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),
  put: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    }),
  patch: <T>(endpoint: string, data?: any) =>
    request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    }),
  delete: <T>(endpoint: string) => request<T>(endpoint, { method: "DELETE" }),
};
