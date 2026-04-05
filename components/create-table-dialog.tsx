"use client";

import { useEffect, useState } from "react";
import { tablesApi, TableCreate } from "@/lib/api/tables";
import { Area } from "@/lib/api/areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { AreaSelector } from "@/components/area-selector";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  onTableCreated: () => void;
  areas: Area[];
  selectedAreaId: string | null;
}

export function CreateTableDialog({
  open,
  onOpenChange,
  restaurantId,
  onTableCreated,
  areas,
  selectedAreaId,
}: CreateTableDialogProps) {
  const [number, setNumber] = useState("");
  const [capacity, setCapacity] = useState(4);
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [areaId, setAreaId] = useState<string | null>(selectedAreaId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fehlermeldung zurücksetzen, sobald der Dialog geöffnet/geschlossen wird
  useEffect(() => {
    setError("");
    setAreaId(selectedAreaId ?? null);
  }, [open, selectedAreaId]);

  const resetForm = () => {
    setNumber("");
    setCapacity(4);
    setNotes("");
    setIsActive(true);
    setRotation(0);
    setAreaId(selectedAreaId ?? null);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!areaId) {
      setError("Bitte zuerst eine Area auswählen.");
      setLoading(false);
      return;
    }

    try {
      const data: TableCreate = {
        number,
        capacity,
        is_active: isActive,
        position_x: 50,
        position_y: 50,
        width: 120,
        height: 120,
        rotation,
        notes: notes || null,
        area_id: areaId,
      };

      await tablesApi.create(restaurantId, data);
      onTableCreated();
      resetForm();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Erstellen des Tisches");
      }
    } finally {
      setLoading(false);
    }
  };

  const hasAreas = areas.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          resetForm();
        }
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Neuen Tisch erstellen</DialogTitle>
          <DialogDescription>
            Erstelle einen neuen Tisch für dein Restaurant.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md flex items-start justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-200 hover:text-white ml-2"
                aria-label="Fehlermeldung schließen"
              >
                ×
              </button>
            </div>
          )}
          <div className="space-y-4 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="number" className="block text-sm font-medium mb-1 text-muted-foreground">
                  Tischnummer *
                </label>
                <Input
                  id="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="z.B. T1, Tisch 1, 1"
                  required
                />
              </div>
              <div>
                <label htmlFor="capacity" className="block text-sm font-medium mb-1 text-muted-foreground">
                  Kapazität (Personen) *
                </label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  max="20"
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Area *</label>
              <AreaSelector
                areas={areas}
                selectedAreaId={areaId}
                onSelect={setAreaId}
                minWidthClassName="w-full"
              />
              {!hasAreas && (
                <p className="text-xs text-amber-300 mt-2">
                  Keine Area vorhanden. Bitte zuerst eine Area anlegen.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Notizen</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                rows={2}
                placeholder="Optional: Besonderheiten oder Hinweise..."
              />
            </div>


            <div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Rotation ({rotation}°)</p>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                    className="w-full accent-[#F95100]"
                  />
                </div>
                <div className="w-20">
                  <label className="sr-only" htmlFor="rotation-input">Rotation</label>
                  <Input
                    id="rotation-input"
                    type="number"
                    min={0}
                    max={359}
                    step={1}
                    value={rotation}
                    onChange={(e) => setRotation(Math.min(359, Math.max(0, parseInt(e.target.value) || 0)))}
                  />
                </div>
              </div>
            </div>

            <label
              htmlFor="isActive"
              className="inline-flex items-center gap-3 px-3 py-2 rounded-md border border-border bg-card text-sm text-foreground cursor-pointer hover:border-primary"
            >
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-[#F95100]"
              />
              <span className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-green-400" : "bg-gray-500"}`}
                />
                {isActive ? "Tisch aktiv" : "Tisch inaktiv"}
              </span>
            </label>
          </div>
          <div className="pb-2" aria-hidden="true" />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={loading}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || !hasAreas} className="gap-2">
              {loading ? (
                <>
                  <Save className="w-4 h-4 animate-spin" />
                  <span>Wird erstellt...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Erstellen</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
