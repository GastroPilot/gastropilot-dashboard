"use client";

import { useState, useEffect, useCallback } from "react";
import { aiApi, TableSuggestion } from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Sparkles, Check, AlertCircle, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AITableSuggestionProps {
  restaurantId: string;
  onSelectTable: (tableId: string) => void;
  onManualSelect: () => void;
  selectedTableId: string | null;
  disabled?: boolean;
  autoSelectThreshold?: number; // Confidence threshold for auto-select (default 0.9)
}

/**
 * Komponente für KI-gestützte Tischvorschläge.
 * 
 * Zeigt Top-3 Vorschläge mit Confidence-Balken an.
 * Bei hoher Confidence (>threshold) wird automatisch ausgewählt.
 */
export function AITableSuggestion({
  restaurantId,
  onSelectTable,
  onManualSelect,
  selectedTableId,
  disabled = false,
  autoSelectThreshold = 0.9,
}: AITableSuggestionProps) {
  const [suggestions, setSuggestions] = useState<TableSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [autoSelected, setAutoSelected] = useState(false);

  const fetchSuggestions = useCallback(async () => {
    if (!restaurantId || disabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await aiApi.suggestTable(restaurantId);
      
      setAiEnabled(response.ai_enabled);
      
      if (!response.ai_enabled) {
        setError(response.message || "KI-Service nicht verfügbar");
        setSuggestions([]);
        return;
      }

      setSuggestions(response.suggestions);

      // Auto-select wenn Confidence über Threshold
      if (
        response.suggestions.length > 0 &&
        response.suggestions[0].confidence >= autoSelectThreshold &&
        !selectedTableId
      ) {
        onSelectTable(response.suggestions[0].table_id);
        setAutoSelected(true);
      }
    } catch (err) {
      console.error("Fehler beim Laden der KI-Vorschläge:", err);
      setError("Fehler beim Laden der Vorschläge");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [restaurantId, disabled, autoSelectThreshold, selectedTableId, onSelectTable]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Confidence als Prozent formatieren
  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  // Confidence-Farbe basierend auf Wert
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-500";
    if (confidence >= 0.5) return "bg-yellow-500";
    return "bg-red-500";
  };

  // Wenn AI nicht aktiviert ist, nichts anzeigen
  if (!aiEnabled && !loading) {
    return null;
  }

  return (
    <div className="mb-4 rounded-lg border border-border bg-card/50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-accent transition-colors"
        disabled={disabled}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary-contrast" />
          <span className="text-sm font-medium text-foreground">
            KI-Vorschläge für Tischzuordnung
          </span>
          {autoSelected && (
            <span className="text-xs bg-green-900/50 text-green-400 px-2 py-0.5 rounded">
              Auto-ausgewählt
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-4 h-4 text-muted-foreground transition-transform",
            collapsed && "-rotate-90"
          )}
        />
      </button>

      {/* Content */}
      {!collapsed && (
        <div className="px-4 pb-4">
          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Analysiere Restaurant-Status...</span>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center gap-2 py-4 text-yellow-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Suggestions */}
          {!loading && !error && suggestions.length > 0 && (
            <div className="space-y-2">
              {suggestions.map((suggestion, index) => {
                const isSelected = selectedTableId === suggestion.table_id;
                const isTopSuggestion = index === 0;

                return (
                  <button
                    key={suggestion.table_id}
                    type="button"
                    onClick={() => {
                      onSelectTable(suggestion.table_id);
                      setAutoSelected(false);
                    }}
                    disabled={disabled}
                    className={cn(
                      "w-full text-left p-3 rounded-lg border transition-all",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-input bg-muted/50 hover:border-muted-foreground hover:bg-muted/80",
                      isTopSuggestion && !isSelected && "border-primary/50"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isTopSuggestion && (
                            <span className="text-primary-contrast text-xs">TOP</span>
                          )}
                          <span className="font-medium text-foreground">
                            Tisch {suggestion.table_number}
                          </span>
                          {suggestion.guest_name && (
                            <span className="text-muted-foreground">
                              - {suggestion.guest_name}
                            </span>
                          )}
                          {isSelected && (
                            <Check className="w-4 h-4 text-primary-contrast flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {suggestion.reason}
                        </p>
                      </div>

                      {/* Confidence Bar */}
                      <div className="flex-shrink-0 w-20">
                        <div className="text-right text-xs font-medium text-foreground mb-1">
                          {formatConfidence(suggestion.confidence)}
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              getConfidenceColor(suggestion.confidence)
                            )}
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* No Suggestions */}
          {!loading && !error && suggestions.length === 0 && (
            <div className="py-4 text-center text-muted-foreground text-sm">
              Keine Vorschläge verfügbar. Bitte Tisch manuell auswählen.
            </div>
          )}

          {/* Manual Select Button */}
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onManualSelect}
              disabled={disabled}
              className="w-full"
            >
              Manuell auswählen
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
