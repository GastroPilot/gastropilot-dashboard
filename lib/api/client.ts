import { getApiBaseUrl, API_PREFIX, buildApiUrl } from './config';

export class ApiError extends Error {
  constructor(
    public status: number,
    public override message: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Token-Refresh Singleton (Guest only)
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshTime = 0;
const REFRESH_COOLDOWN = 2000;

export async function refreshToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  const now = Date.now();
  if (now - lastRefreshTime < REFRESH_COOLDOWN) {
    const token = typeof window !== "undefined" ? localStorage.getItem("guest_access_token") : null;
    return token;
  }

  refreshPromise = (async () => {
    try {
      const refreshTokenValue = typeof window !== "undefined"
        ? localStorage.getItem("guest_refresh_token")
        : null;

      if (!refreshTokenValue) {
        return null;
      }

      const refreshUrl = buildApiUrl(getApiBaseUrl(), API_PREFIX, "/public/auth/refresh");
      const response = await fetch(refreshUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
        credentials: 'include',
      });

      if (!response.ok) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("guest_access_token");
          localStorage.removeItem("guest_refresh_token");
          localStorage.removeItem("guest_token_expires_at");
        }
        return null;
      }

      const data = await response.json();

      if (typeof window !== "undefined") {
        localStorage.setItem("guest_access_token", data.access_token);
        localStorage.setItem("guest_refresh_token", data.refresh_token);
        const expiresIn = data.expires_in || 3600;
        const expiresAt = Date.now() + expiresIn * 1000;
        localStorage.setItem("guest_token_expires_at", expiresAt.toString());
      }

      lastRefreshTime = Date.now();
      return data.access_token as string;
    } catch {
      if (typeof window !== "undefined") {
        localStorage.removeItem("guest_access_token");
        localStorage.removeItem("guest_refresh_token");
        localStorage.removeItem("guest_token_expires_at");
      }
      return null;
    } finally {
      setTimeout(() => {
        refreshPromise = null;
      }, 100);
    }
  })();

  return refreshPromise;
}

function parseErrorMessage(errorData: Record<string, unknown>): string {
  if (errorData.detail) {
    if (Array.isArray(errorData.detail)) {
      return errorData.detail
        .map((err: { loc?: string[]; msg?: string }) => {
          const field = err.loc?.slice(1).join(".") || "field";
          return `${field}: ${err.msg}`;
        })
        .join(", ");
    } else if (typeof errorData.detail === "string") {
      return errorData.detail;
    } else {
      return JSON.stringify(errorData.detail);
    }
  } else if (typeof errorData.message === "string") {
    return errorData.message;
  }
  return "Ein Fehler ist aufgetreten";
}

type RequestFn = <T>(
  endpoint: string,
  options?: RequestInit,
  retryOnAuthError?: boolean
) => Promise<T>;

function makeRequestFn(
  tokenKey: string,
  expiresKey: string | null,
  refreshFn: (() => Promise<string | null>) | null
): RequestFn {
  return async function request<T>(
    endpoint: string,
    options: RequestInit = {},
    retryOnAuthError: boolean = true
  ): Promise<T> {
    const baseUrl = getApiBaseUrl();
    const url = buildApiUrl(baseUrl, API_PREFIX, endpoint);

    let token = typeof window !== "undefined"
      ? localStorage.getItem(tokenKey)
      : null;

    // Proaktiv Token erneuern wenn bald abläuft (nur bei Guest)
    if (token && expiresKey && refreshFn) {
      const expiresAt = typeof window !== "undefined"
        ? localStorage.getItem(expiresKey)
        : null;
      if (expiresAt) {
        const expiresAtMs = parseInt(expiresAt, 10);
        if (Date.now() >= expiresAtMs - 30000) {
          const refreshedToken = await refreshFn();
          if (refreshedToken) {
            token = refreshedToken;
          }
        }
      }
    }

    const headers = new Headers(options.headers || undefined);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    // Bei 401: Token refreshen und erneut versuchen (nur Guest)
    if (!response.ok && response.status === 401 && retryOnAuthError && refreshFn) {
      const refreshedToken = await refreshFn();

      if (refreshedToken) {
        const retryHeaders = new Headers(options.headers || undefined);
        if (!retryHeaders.has("Content-Type")) {
          retryHeaders.set("Content-Type", "application/json");
        }
        retryHeaders.set("Authorization", `Bearer ${refreshedToken}`);

        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        });

        if (!retryResponse.ok) {
          const errorData = await retryResponse.json().catch(() => ({ detail: retryResponse.statusText }));
          throw new ApiError(retryResponse.status, parseErrorMessage(errorData), errorData);
        }

        if (retryResponse.status === 204) return null as T;
        return retryResponse.json();
      } else {
        const errorData = await response.json().catch(() => ({ detail: "Nicht authentifiziert" }));
        throw new ApiError(response.status, parseErrorMessage(errorData), errorData);
      }
    }

    // Admin: bei 401 Token löschen
    if (!response.ok && response.status === 401 && !refreshFn) {
      if (typeof window !== "undefined") {
        localStorage.removeItem(tokenKey);
      }
      const errorData = await response.json().catch(() => ({ detail: "Nicht authentifiziert" }));
      throw new ApiError(response.status, parseErrorMessage(errorData), errorData);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      throw new ApiError(response.status, parseErrorMessage(errorData), errorData);
    }

    if (response.status === 204) return null as T;
    return response.json();
  };
}

const guestRequest = makeRequestFn(
  "guest_access_token",
  "guest_token_expires_at",
  refreshToken
);

const adminRequest = makeRequestFn(
  "admin_access_token",
  null,
  null
);

function makeApiObject(requestFn: RequestFn) {
  return {
    get: <T>(endpoint: string) => requestFn<T>(endpoint, { method: "GET" }),
    post: <T>(endpoint: string, data?: unknown) =>
      requestFn<T>(endpoint, {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      }),
    put: <T>(endpoint: string, data?: unknown) =>
      requestFn<T>(endpoint, {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      }),
    patch: <T>(endpoint: string, data?: unknown) =>
      requestFn<T>(endpoint, {
        method: "PATCH",
        body: data ? JSON.stringify(data) : undefined,
      }),
    delete: <T>(endpoint: string) => requestFn<T>(endpoint, { method: "DELETE" }),
  };
}

/**
 * Fetch fuer Server Components (kein Token, kein localStorage).
 * Verwendet die interne API-URL fuer SSR.
 */
export async function serverFetch<T>(endpoint: string): Promise<T> {
  const baseUrl = process.env.SSR_API_BASE_URL || process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:80';
  const prefix = process.env.NEXT_PUBLIC_API_PREFIX || 'v1';
  const url = buildApiUrl(baseUrl, prefix, endpoint);

  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new ApiError(response.status, `Server fetch failed: ${response.statusText}`);
  }

  if (response.status === 204) return null as T;
  return response.json();
}

/** Guest API client (with token refresh) */
export const api = makeApiObject(guestRequest);

/** Admin API client (no token refresh, 401 = token clear + throw) */
export const adminApi = makeApiObject(adminRequest);
