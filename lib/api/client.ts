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

// Singleton für Refresh-Request, um mehrere gleichzeitige Requests zu vermeiden
let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const refreshTokenValue = typeof window !== "undefined"
        ? localStorage.getItem("refresh_token")
        : null;

      if (!refreshTokenValue) {
        return null;
      }

      const refreshUrl = buildApiUrl(getApiBaseUrl(), API_PREFIX, "/auth/refresh");
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
        credentials: 'include', // Wichtig für CORS mit credentials
      });

      if (!response.ok) {
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
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retryOnAuthError: boolean = true
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = buildApiUrl(baseUrl, API_PREFIX, endpoint);
  console.log(`[API Client] Request to: ${url} (baseUrl: ${baseUrl})`);

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
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      console.log(`🔑 Sending request to ${endpoint} with token: ${token.substring(0, 20)}...`);
    }
  } else if (typeof window !== "undefined") {
    console.warn("⚠️ Kein Token gefunden für Request:", endpoint);
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
