import { api } from "./client";

/**
 * Tischvorschlag von der KI mit Confidence-Score.
 */
export interface TableSuggestion {
  table_id: number;
  table_number: string;
  confidence: number; // 0.0 - 1.0
  reason: string;
  guest_name: string | null;
  reservation_id: number | null;
}

/**
 * Request für Tischvorschläge.
 */
export interface SuggestTableRequest {
  context_hint?: string; // z.B. Gästename oder Tischnummer
}

/**
 * Response mit Tischvorschlägen.
 */
export interface SuggestTableResponse {
  suggestions: TableSuggestion[];
  ai_enabled: boolean;
  message: string | null;
}

/**
 * AI Status Response.
 */
export interface AIStatusResponse {
  ai_enabled: boolean;
  features: {
    table_suggestions: boolean;
  };
}

/**
 * API-Client für AI-Funktionen.
 */
export const aiApi = {
  /**
   * Fragt KI-Vorschläge für Tischzuordnung an.
   * 
   * @param restaurantId - ID des Restaurants
   * @param request - Optional mit context_hint (z.B. Gästename)
   * @returns Top-3 Tischvorschläge mit Confidence-Score
   */
  suggestTable: async (
    restaurantId: number,
    request?: SuggestTableRequest
  ): Promise<SuggestTableResponse> => {
    return api.post<SuggestTableResponse>(
      `/restaurants/${restaurantId}/ai/suggest-table`,
      request || {}
    );
  },

  /**
   * Prüft ob AI-Features verfügbar sind.
   * 
   * @param restaurantId - ID des Restaurants
   * @returns AI Status mit verfügbaren Features
   */
  getStatus: async (restaurantId: number): Promise<AIStatusResponse> => {
    return api.get<AIStatusResponse>(`/restaurants/${restaurantId}/ai/status`);
  },
};
