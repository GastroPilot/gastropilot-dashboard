"use client";

import { useEffect, useState, useCallback } from "react";
import { aiApi, type HourlyPrediction, type PeakPredictionResponse } from "@/lib/api/ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { BrainCircuit, Users, ChevronLeft, ChevronRight } from "lucide-react";

const LABEL_COLORS: Record<string, string> = {
  low: "bg-green-500",
  medium: "bg-yellow-500",
  high: "bg-orange-500",
  peak: "bg-red-500",
};

const LABEL_TEXT_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  peak: "text-red-400",
};

function formatHour(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

export default function AIInsightsPage() {
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<PeakPredictionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const totalCapacity = 60; // Default capacity

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await aiApi.getPeakPredictions(date, totalCapacity);
      setData(result);
    } catch (err) {
      console.error("Fehler beim Laden der Prognosen:", err);
      setError("Prognosen konnten nicht geladen werden");
    } finally {
      setIsLoading(false);
    }
  }, [date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().split("T")[0]);
  };

  const maxCovers = data
    ? Math.max(...data.predictions.map((p) => p.predicted_covers), 1)
    : 1;

  const dayName = new Date(date).toLocaleDateString("de-DE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-cyan-500 via-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <BrainCircuit className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">KI-Prognosen</h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                PeakPredict - Auslastungsprognose pro Stunde
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Date Picker */}
      <div className="shrink-0 px-4 py-3 border-b border-border bg-card/50 flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => shiftDate(-1)}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto bg-card border-border"
        />
        <Button variant="outline" size="sm" onClick={() => shiftDate(1)}>
          <ChevronRight className="w-4 h-4" />
        </Button>
        <span className="text-sm font-medium text-muted-foreground">{dayName}</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {isLoading ? (
          <LoadingOverlay />
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" className="mt-4" onClick={loadData}>
              Erneut versuchen
            </Button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Erwartete Gaeste gesamt</p>
                <p className="text-2xl font-bold text-foreground">
                  {data.predictions.reduce((s, p) => s + p.predicted_covers, 0)}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4">
                <p className="text-sm text-muted-foreground">Spitzenstunde</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatHour(
                    data.predictions.reduce((max, p) =>
                      p.predicted_covers > max.predicted_covers ? p : max
                    ).hour
                  )}
                </p>
              </div>
              <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Empfohlenes Personal</p>
                  <p className="text-2xl font-bold text-foreground">
                    {data.recommended_staff} Personen
                  </p>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-card border border-border rounded-lg p-4">
              <h2 className="text-lg font-semibold mb-4">Stundenprognose</h2>
              <div className="flex items-end gap-1 h-64">
                {data.predictions.map((p) => {
                  const heightPercent = (p.predicted_covers / maxCovers) * 100;
                  return (
                    <div
                      key={p.hour}
                      className="flex-1 flex flex-col items-center justify-end gap-1 h-full"
                    >
                      {/* Confidence */}
                      <span className="text-[10px] text-muted-foreground">
                        {Math.round(p.confidence * 100)}%
                      </span>
                      {/* Covers */}
                      <span className="text-xs font-bold text-foreground">
                        {p.predicted_covers}
                      </span>
                      {/* Bar */}
                      <div
                        className={`w-full rounded-t-sm transition-all ${LABEL_COLORS[p.label]}`}
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      />
                      {/* Hour Label */}
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {p.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 flex-wrap">
              {(["low", "medium", "high", "peak"] as const).map((label) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-sm ${LABEL_COLORS[label]}`} />
                  <span className={`text-xs font-medium ${LABEL_TEXT_COLORS[label]}`}>
                    {label === "low"
                      ? "Niedrig"
                      : label === "medium"
                      ? "Mittel"
                      : label === "high"
                      ? "Hoch"
                      : "Spitze"}
                  </span>
                </div>
              ))}
            </div>

            {/* Detail Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Uhrzeit</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Gaeste</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Auslastung</th>
                    <th className="text-left px-4 py-2 font-medium text-muted-foreground">Konfidenz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.predictions
                    .filter((p) => p.predicted_covers > 0)
                    .map((p) => (
                      <tr key={p.hour}>
                        <td className="px-4 py-2 text-foreground font-medium">
                          {formatHour(p.hour)}
                        </td>
                        <td className="px-4 py-2 text-foreground">{p.predicted_covers}</td>
                        <td className="px-4 py-2">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${LABEL_COLORS[p.label]}/20 ${LABEL_TEXT_COLORS[p.label]}`}
                          >
                            {p.label === "low"
                              ? "Niedrig"
                              : p.label === "medium"
                              ? "Mittel"
                              : p.label === "high"
                              ? "Hoch"
                              : "Spitze"}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {Math.round(p.confidence * 100)}%
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
