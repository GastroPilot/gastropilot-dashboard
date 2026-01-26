/**
 * API Konfiguration
 * Lädt die Konfiguration aus Environment-Variablen entsprechend env.example
 * 
 * Struktur:
 * - API_BASE_URL: Basis-URL ohne Pfad (z.B. 'http://localhost:8001')
 * - API_PREFIX: API-Versions-Präfix (z.B. 'v1')
 * - API_URL: Vollständige API-URL (API_BASE_URL + API_PREFIX)
 */

// API_BASE_URL: Basis-URL (kann Pfad enthalten, z.B. 'http://localhost:8001' oder 'https://api.gastropilot.org/app/test')
// Trailing slashes werden in buildApiUrl entfernt
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || process.env.API_BASE_URL || "http://localhost:8001";

// API_PREFIX: API-Versions-Präfix (z.B. 'v1')
export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || process.env.API_PREFIX || "v1";

// API_URL: Vollständige API-URL (API_BASE_URL + API_PREFIX)
// Wird intern durch buildApiUrl verwendet, hier nur für Rückwärtskompatibilität
// Entferne trailing slash von API_BASE_URL falls vorhanden
const cleanBaseUrl = API_BASE_URL.replace(/\/+$/, '');
// Entferne leading/trailing slashes von API_PREFIX
const cleanPrefix = API_PREFIX ? API_PREFIX.replace(/^\/+|\/+$/g, '') : '';
// Konstruiere ohne trailing slash am Ende (vermeidet Backend-Redirects)
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
