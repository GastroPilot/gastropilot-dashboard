import { api } from "./client";

/**
 * Tischvorschlag von der KI mit Confidence-Score.
 */
export interface TableSuggestion {
  table_id: string;
  table_number: string;
  confidence: number; // 0.0 - 1.0
  reason: string;
  guest_name: string | null;
  reservation_id: string | null;
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
 * PeakPredict Prognose.
 */
export interface HourlyPrediction {
  hour: number;
  predicted_covers: number;
  confidence: number;
  label: "low" | "medium" | "high" | "peak";
}

export interface PeakPredictionResponse {
  date: string;
  predictions: HourlyPrediction[];
  recommended_staff: number;
}

/**
 * API-Client für AI-Funktionen.
 */
export const aiApi = {
  suggestTable: async (
    _restaurantId: string,
    request?: SuggestTableRequest
  ): Promise<SuggestTableResponse> => {
    return api.post<SuggestTableResponse>("/ai/seating/suggest", request || {});
  },

  getStatus: async (_restaurantId: string): Promise<AIStatusResponse> => {
    return api.get<AIStatusResponse>("/ai/health");
  },

  getPeakPredictions: async (
    date: string,
    totalCapacity: number
  ): Promise<PeakPredictionResponse> => {
    return api.get<PeakPredictionResponse>(
      `/ai/peak-predict?date=${date}&total_capacity=${totalCapacity}`
    );
  },
};
