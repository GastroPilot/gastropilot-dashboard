"use client";

import { useState, useEffect } from "react";
import { tableDayConfigsApi } from "@/lib/api/table-day-configs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { format } from "date-fns";

interface CreateTempTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  selectedDate: Date;
  onTableCreated: () => void;
  initialPosition?: { x: number; y: number };
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
}

export function CreateTempTableDialog({
  open,
  onOpenChange,
  restaurantId,
  selectedDate,
  onTableCreated,
  initialPosition,
  onNotify,
}: CreateTempTableDialogProps) {
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setNumber("");
      setCapacity(4);
      setNotes("");
      setError("");
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      
      const positionX = initialPosition?.x ?? 50;
      const positionY = initialPosition?.y ?? 50;
      
      await tableDayConfigsApi.createOrUpdate(restaurantId, {
        table_id: null,
        date: dateStr,
        is_temporary: true,
        is_hidden: false,
        number,
        capacity,
        shape: "rectangle",
        position_x: positionX,
        position_y: positionY,
        width: 120,
        height: 120,
        is_active: true,
        color: null,
        notes: notes || null,
        is_joinable: false,
        join_group_id: null,
      });

      onTableCreated();
      onNotify?.(`Tisch ${number} wurde für diesen Tag erstellt.`, "success");
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Fehler beim Erstellen des Tisches");
      } else {
        setError("Fehler beim Erstellen des Tisches");
      }
      onNotify?.("Fehler beim Erstellen des temporären Tisches", "error");
      console.error("Fehler beim Erstellen des temporären Tisches:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Tisch für diesen Tag hinzufügen</DialogTitle>
          <DialogDescription>
            Dieser Tisch wird nur für den {format(selectedDate, "dd.MM.yyyy")} existieren.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6">
            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-md">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="temp-number" className="text-sm font-medium text-foreground">
                  Tischnummer <span className="text-red-400">*</span>
                </label>
                <Input
                  id="temp-number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="z.B. T1, T2, 12"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="temp-capacity" className="text-sm font-medium text-foreground">
                  Kapazität <span className="text-red-400">*</span>
                </label>
                <Input
                  id="temp-capacity"
                  type="number"
                  min="1"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="temp-notes" className="text-sm font-medium text-foreground">Notizen</label>
              <textarea
                id="temp-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading}
                className="w-full h-20 px-3 py-2 rounded-md border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                placeholder="Optionale Notizen..."
              />
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !number || !capacity}>
              {loading ? "Wird erstellt..." : "Tisch erstellen"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
