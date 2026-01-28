/**
 * API Konfiguration
 *
 * Dynamische URL-Generierung basierend auf der Frontend-Domain:
 * - localhost → localhost:8001 (Entwicklung)
 * - gpilot.app → api.gpilot.app (Prod)
 * - kunde.gpilot.app → api-kunde.gpilot.app (Kunde/Prod)
 * - staging.gpilot.app → api-staging.gpilot.app (Staging)
 * - demo.gpilot.app → api-demo.gpilot.app (Demo)
 *
 * Struktur:
 * - getApiBaseUrl(): Funktion zur dynamischen URL-Generierung (zur Laufzeit)
 * - API_PREFIX: API-Versions-Präfix (z.B. 'v1')
 * - buildApiUrl(): Helper zur korrekten URL-Konstruktion
 */

/**
 * Generiert die API-Base-URL basierend auf der aktuellen Frontend-Domain.
 *
 * Schema:
 * - localhost → http://localhost:8001
 * - gpilot.app → https://api.gpilot.app (Prod ohne Subdomain)
 * - {subdomain}.gpilot.app → https://api-{subdomain}.gpilot.app
 *
 * Kann durch NEXT_PUBLIC_API_BASE_URL Environment-Variable überschrieben werden.
 */
export function getApiBaseUrl(): string {
  // Environment-Variable hat Vorrang (für manuelle Konfiguration)
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL;
  if (envBaseUrl) {
    console.log(`[API Config] Using env variable: ${envBaseUrl}`);
    return envBaseUrl;
  }

  // Server-Side Rendering: Fallback auf localhost
  if (typeof window === 'undefined') {
    console.log('[API Config] SSR detected (window undefined), returning localhost');
    return 'http://localhost:8001';
  }

  const hostname = window.location.hostname;
  console.log(`[API Config] Client-side hostname: ${hostname}`);

  // Localhost Entwicklung
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('[API Config] Localhost detected');
    return 'http://localhost:8001';
  }

  // Prod ohne Subdomain: gpilot.app → api.gpilot.app
  if (hostname === 'gpilot.app') {
    console.log('[API Config] Production domain detected');
    return 'https://api.gpilot.app';
  }

  // Dynamische URL-Generierung für gpilot.app Subdomains
  // Schema: {subdomain}.gpilot.app → api-{subdomain}.gpilot.app
  const gpilotMatch = hostname.match(/^([^.]+)\.gpilot\.app$/);
  if (gpilotMatch) {
    const subdomain = gpilotMatch[1];
    const apiUrl = `https://api-${subdomain}.gpilot.app`;
    console.log(`[API Config] Subdomain detected: ${subdomain} → ${apiUrl}`);
    return apiUrl;
  }

  // Fallback für unbekannte Domains
  console.warn(`[API Config] Unbekannte Domain: ${hostname}, verwende localhost als Fallback`);
  return 'http://localhost:8001';
}

// API_PREFIX: API-Versions-Präfix (z.B. 'v1')
export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || process.env.API_PREFIX || "v1";

// API_BASE_URL: Basis-URL (für Rückwärtskompatibilität, wird beim Module-Load evaluiert)
// HINWEIS: Für dynamische URL-Generierung zur Laufzeit getApiBaseUrl() verwenden!
export const API_BASE_URL = getApiBaseUrl();

// API_URL: Vollständige API-URL (API_BASE_URL + API_PREFIX)
// HINWEIS: Für dynamische URL-Generierung zur Laufzeit buildApiUrl(getApiBaseUrl(), API_PREFIX, endpoint) verwenden!
const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, '');
const cleanPrefix = API_PREFIX ? API_PREFIX.replace(/^\/+|\/+$/g, '') : '';
export const API_URL = cleanPrefix
  ? `${cleanBaseUrl}/${cleanPrefix}`
  : cleanBaseUrl;

/**
 * Helper-Funktion zur korrekten URL-Konstruktion ohne doppelte Slashes
 * 
 * WICHTIG: Behält trailing slashes bei, wenn sie explizit im Endpoint vorhanden sind.
 * Dies ist notwendig, da FastAPI-Router mit @router.get("/") oder @router.post("/")
 * trailing slashes erwarten, um Backend-Redirects (die CORS-Header verlieren) zu vermeiden.
 * 
 * Beispiele:
 * - "/restaurants/" → "https://api.gastropilot.org/app/{ENVIRONMENT}/v1/restaurants/"
 * - "/restaurants/?from=2024-01-01" → "https://api.gastropilot.org/app/{ENVIRONMENT}/v1/restaurants/?from=2024-01-01"
 * - "/restaurants/1" → "https://api.gastropilot.org/app/{ENVIRONMENT}/v1/restaurants/1"
 * - "/users/me/settings/" → "https://api.gastropilot.org/app/{ENVIRONMENT}/v1/users/me/settings/"
 * 
 * @param baseUrl Die Basis-URL (z.B. 'http://localhost:8001' oder 'https://api.gastropilot.org/app/{ENVIRONMENT}')
 *                Trailing slashes werden automatisch entfernt
 * @param prefix Der API-Präfix (z.B. 'v1')
 *               Leading/trailing slashes werden automatisch entfernt
 * @param endpoint Der Endpoint-Pfad (z.B. '/restaurants/' oder '/users/me/settings/')
 *                 Kann Query-Parameter enthalten (z.B. '/restaurants/?from=2024-01-01')
 *                 Trailing slashes werden BEIBEHALTEN, wenn explizit vorhanden
 * @returns Die vollständige URL mit korrekter Slash-Behandlung und Query-Parametern
 */
export function buildApiUrl(baseUrl: string, prefix: string, endpoint: string): string {
  // Entferne trailing slashes von baseUrl für konsistente Basis
  const cleanBase = baseUrl.replace(/\/+$/, '');
  
  // Entferne leading/trailing slashes von prefix
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, '') : '';
  
  // Trenne Query-Parameter vom Endpoint-Pfad (falls vorhanden)
  // endpoint.split('?') teilt z.B. '/restaurants/?from=2024' in ['/restaurants/', 'from=2024']
  const [pathPart, queryPart] = endpoint.split('?');
  
  // WICHTIG: Prüfe ob Endpoint-Pfad explizit mit trailing slash endet
  // Bedingung: pathPart.endsWith('/') && pathPart.length > 1
  // - endsWith('/'): Pfad endet mit Slash
  // - length > 1: Nicht nur ein einzelner "/" (Edge-Case)
  const hasTrailingSlash = pathPart.endsWith('/') && pathPart.length > 1;
  
  // Entferne leading slashes vom Pfad-Teil für saubere Konstruktion
  let cleanPath = pathPart.replace(/^\/+/, '');
  
  // Entferne trailing slash temporär (wird später wieder hinzugefügt, wenn ursprünglich vorhanden)
  if (hasTrailingSlash) {
    cleanPath = cleanPath.replace(/\/+$/, '');
  }
  
  // Konstruiere URL aus Teilen (vermeidet doppelte Slashes)
  const parts: string[] = [cleanBase];
  if (cleanPrefix) parts.push(cleanPrefix);
  if (cleanPath) parts.push(cleanPath);
  
  let url = parts.join('/');
  
  // Füge trailing slash wieder hinzu, wenn ursprünglich im Endpoint vorhanden
  // Dies ist kritisch, um Backend-Redirects zu vermeiden!
  if (hasTrailingSlash) {
    url += '/';
  }
  
  // Füge Query-Parameter wieder hinzu, falls vorhanden
  // Query-Parameter kommen IMMER nach dem trailing slash (falls vorhanden)
  if (queryPart) {
    url += `?${queryPart}`;
  }
  
  return url;
}
