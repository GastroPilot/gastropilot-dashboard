/**
 * API Konfiguration
 *
 * Dynamische URL-Generierung basierend auf der Frontend-Domain:
 * - localhost → localhost:8001 (Entwicklung)
 * - gpilot.app → api.gpilot.app (Prod)
 * - kunde.gpilot.app → api-kunde.gpilot.app (Kunde/Prod)
 * - stage.gpilot.app → stage-api.gpilot.app (Staging-Setup)
 * - staging.gpilot.app → api-staging.gpilot.app (Staging)
 * - demo.gpilot.app → api-demo.gpilot.app (Demo)
 *
 * Struktur:
 * - getApiBaseUrl(): Funktion zur dynamischen URL-Generierung (zur Laufzeit)
 * - API_PREFIX: API-Versions-Präfix (z.B. 'v1')
 * - buildApiUrl(): Helper zur korrekten URL-Konstruktion
 */

/**
 * Berechnet die API-URL basierend auf dem Hostnamen (reine Logik, kein window-Zugriff).
 * Diese Funktion kann sowohl Server- als auch Client-seitig verwendet werden.
 */
function computeApiUrlFromHostname(hostname: string): string {
  // Localhost Entwicklung
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:80';
  }

  // Prod ohne Subdomain: gpilot.app → api.gpilot.app
  if (hostname === 'gpilot.app') {
    return 'https://api.gpilot.app';
  }

  // Demo: demo.gpilot.app → demo-api.gpilot.app (Demo-Setup)
  if (hostname === 'demo.gpilot.app' || hostname === 'www.demo.gpilot.app') {
    return 'https://demo-api.gpilot.app';
  }

  // Staging: stage.gpilot.app → stage-api.gpilot.app (Konvention Staging-Setup)
  if (hostname === 'stage.gpilot.app' || hostname === 'www.stage.gpilot.app') {
    return 'https://stage-api.gpilot.app';
  }

    // Test: test.gpilot.app → test-api.gpilot.app (Test-Setup)
  if (hostname === 'test.gpilot.app' || hostname === 'www.test.gpilot.app') {
    return 'https://test-api.gpilot.app';
  }

  // Local-Staging: stage.servecta.local → stage-api.servecta.local
  if (hostname === 'stage.servecta.local' || hostname === 'www.stage.servecta.local') {
    return 'http://stage-api.servecta.local';
  }

  // Dynamische URL-Generierung für gpilot.app Subdomains
  // Schema: {subdomain}.gpilot.app → {subdomain}-api.gpilot.app
  const gpilotMatch = hostname.match(/^([^.]+)\.gpilot\.app$/);
  if (gpilotMatch) {
    const subdomain = gpilotMatch[1];
    return `https://${subdomain}-api.gpilot.app`;
  }

  // Fallback für unbekannte Domains
  return 'http://localhost:8001';
}

// Cache für Client-seitige API-URL (verhindert mehrfache Berechnungen und Logs)
let _clientApiUrlCache: string | null = null;

/**
 * Generiert die API-Base-URL basierend auf der aktuellen Frontend-Domain.
 *
 * Schema:
 * - localhost → http://localhost:8001
 * - gpilot.app → https://api.gpilot.app (Prod ohne Subdomain)
 * - {subdomain}.gpilot.app → https://api-{subdomain}.gpilot.app
 *
 * Kann durch NEXT_PUBLIC_API_BASE_URL Environment-Variable überschrieben werden.
 * 
 * WICHTIG: Diese Funktion sollte nur in Client Components ("use client") verwendet werden!
 * Für konsistente Hydration wird bei SSR ein Platzhalter verwendet.
 */
export function getApiBaseUrl(): string {
  // Environment-Variable hat Vorrang (für manuelle Konfiguration)
  // NEXT_PUBLIC_ Variablen sind sowohl Server- als auch Client-seitig verfügbar
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }

  // Server-Side Rendering: Verwende einen Platzhalter für konsistente Hydration
  // API-Calls werden sowieso nur Client-seitig gemacht (React Query in "use client" Components)
  if (typeof window === 'undefined') {
    // Für SSR: Der Platzhalter wird nie wirklich verwendet, da API-Calls nur Client-seitig erfolgen
    return '';
  }

  // Client-seitig: Berechne und cache die URL
  if (_clientApiUrlCache === null) {
    const hostname = window.location.hostname;
    _clientApiUrlCache = computeApiUrlFromHostname(hostname);
    console.log(`[API Config] Client: ${hostname} → ${_clientApiUrlCache}`);
  }
  
  return _clientApiUrlCache;
}

// API_PREFIX: API-Versions-Präfix (z.B. 'v1')
export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "v1";

// DEPRECATED: Diese Konstanten werden beim Module-Load evaluiert und können
// Hydration-Probleme verursachen. Verwende stattdessen getApiBaseUrl() zur Laufzeit!
// Sie bleiben nur für Rückwärtskompatibilität erhalten.

// Getter für API_BASE_URL - wird lazy evaluiert
let _cachedApiBaseUrl: string | null = null;
export function getStaticApiBaseUrl(): string {
  if (_cachedApiBaseUrl === null) {
    _cachedApiBaseUrl = getApiBaseUrl();
  }
  return _cachedApiBaseUrl;
}

// Für Rückwärtskompatibilität: API_BASE_URL als Getter
// WARNUNG: Nicht in Komponenten verwenden, die hydratiert werden!
export const API_BASE_URL = '';  // Leer für SSR-Konsistenz

// API_URL: Vollständige API-URL 
// WARNUNG: Nicht in Komponenten verwenden, die hydratiert werden!
export const API_URL = '';  // Leer für SSR-Konsistenz

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
