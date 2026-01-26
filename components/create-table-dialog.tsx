"use client";

import { useEffect, useState, useRef } from "react";
import { tablesApi, TableCreate } from "@/lib/api/tables";
import { Area } from "@/lib/api/areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Check, X, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";

interface CreateTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  onTableCreated: () => void;
  areas: Area[];
  selectedAreaId: number | null;
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
  const [areaId, setAreaId] = useState<number | null>(selectedAreaId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement | null>(null);

  // Fehlermeldung zurücksetzen, sobald der Dialog geöffnet/geschlossen wird
  useEffect(() => {
    setError("");
    setAreaId(selectedAreaId ?? null);
    setAreaMenuOpen(false);
  }, [open, selectedAreaId]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (areaMenuRef.current && !areaMenuRef.current.contains(event.target as Node)) {
        setAreaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
                <label htmlFor="number" className="block text-sm font-medium mb-1 text-gray-300">
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
                <label htmlFor="capacity" className="block text-sm font-medium mb-1 text-gray-300">
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
              <label className="block text-sm font-medium mb-1 text-gray-300">Area *</label>
              <div className="relative" ref={areaMenuRef}>
                <button
                  type="button"
                  onClick={() => setAreaMenuOpen((prev) => !prev)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-gray-600 bg-gray-800 text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner disabled:opacity-60"
                  disabled={!hasAreas}
                >
                  <span className="truncate">
                    {areaId ? areas.find((a) => a.id === areaId)?.name || "Area auswählen" : "Area auswählen"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${areaMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {areaMenuOpen && (
                  <div className="absolute z-20 mt-1 w-full rounded-lg border border-gray-700 bg-gray-900 shadow-xl max-h-60 overflow-auto">
                    {areas.map((area) => (
                      <button
                        key={area.id}
                        type="button"
                        onClick={() => {
                          setAreaId(area.id);
                          setAreaMenuOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm ${
                          areaId === area.id
                            ? "font-semibold text-white"
                            : "text-gray-200 hover:bg-gray-800/70"
                        }`}
                      >
                        {area.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {!hasAreas && (
                <p className="text-xs text-amber-300 mt-2">
                  Keine Area vorhanden. Bitte zuerst eine Area anlegen.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-gray-400">Notizen</p>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-600 bg-gray-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-gray-500"
                rows={2}
                placeholder="Optional: Besonderheiten oder Hinweise..."
              />
            </div>


            <div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs text-gray-400 mb-1">Rotation ({rotation}°)</p>
                  <input
                    type="range"
                    min="0"
                    max="359"
                    value={rotation}
                    onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                    className="w-full accent-blue-500"
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
              className="inline-flex items-center gap-3 px-3 py-2 rounded-md border border-gray-700 bg-gray-800 text-sm text-gray-100 cursor-pointer hover:border-blue-500"
            >
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="w-5 h-5 accent-blue-500"
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
