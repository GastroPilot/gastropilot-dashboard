/**
 * API Konfiguration für das Guest Portal
 *
 * Dynamische URL-Generierung basierend auf der Frontend-Domain:
 * - localhost -> localhost:80 (Entwicklung)
 * - guest.gpilot.app -> api.gpilot.app (Prod)
 * - {env}-portal.gpilot.app -> {env}-api.gpilot.app (Demo/Staging/Test)
 */

function computeApiUrlFromHostname(hostname: string): string {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:80';
  }

  if (hostname === 'gpilot.app' || hostname === 'guest.gpilot.app') {
    return 'https://api.gpilot.app';
  }

  // {env}-portal.gpilot.app -> {env}-api.gpilot.app (z.B. staging-portal → staging-api)
  const envPortalMatch = hostname.match(/^([^-]+)-portal\.gpilot\.app$/);
  if (envPortalMatch) {
    return `https://${envPortalMatch[1]}-api.gpilot.app`;
  }

  return 'http://localhost:80';
}

let _clientApiUrlCache: string | null = null;

/**
 * Generiert die API-Base-URL basierend auf der aktuellen Domain.
 * Kann durch NEXT_PUBLIC_API_BASE_URL Environment-Variable ueberschrieben werden.
 */
export function getApiBaseUrl(): string {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (envBaseUrl) {
    return envBaseUrl;
  }

  if (typeof window === 'undefined') {
    // SSR: Verwende interne URL oder Platzhalter
    return process.env.API_INTERNAL_URL || '';
  }

  if (_clientApiUrlCache === null) {
    const hostname = window.location.hostname;
    _clientApiUrlCache = computeApiUrlFromHostname(hostname);
  }

  return _clientApiUrlCache;
}

export const API_PREFIX = process.env.NEXT_PUBLIC_API_PREFIX || "v1";

/**
 * Helper zur korrekten URL-Konstruktion ohne doppelte Slashes.
 * Behält trailing slashes bei, wenn sie im Endpoint vorhanden sind.
 */
export function buildApiUrl(baseUrl: string, prefix: string, endpoint: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPrefix = prefix ? prefix.replace(/^\/+|\/+$/g, '') : '';

  const [pathPart, queryPart] = endpoint.split('?');
  const hasTrailingSlash = pathPart.endsWith('/') && pathPart.length > 1;

  let cleanPath = pathPart.replace(/^\/+/, '');
  if (hasTrailingSlash) {
    cleanPath = cleanPath.replace(/\/+$/, '');
  }

  const parts: string[] = [cleanBase];
  if (cleanPrefix) parts.push(cleanPrefix);
  if (cleanPath) parts.push(cleanPath);

  let url = parts.join('/');

  if (hasTrailingSlash) {
    url += '/';
  }

  if (queryPart) {
    url += `?${queryPart}`;
  }

  return url;
}
