import { useEffect, useState, useRef } from "react";
import { obstaclesApi, Obstacle, ObstacleCreate, ObstacleUpdate } from "@/lib/api/obstacles";
import { Area } from "@/lib/api/areas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api/client";
import { ChevronDown, Check, Trash2, X, Save } from "lucide-react";
import { confirmAction } from "@/lib/utils";

const PRESET_COLORS = ["#ef4444", "#f97316", "#22c55e", "#3b82f6", "#8b5cf6"];
const TYPE_OPTIONS = [
  { value: "door", label: "Tür" },
  { value: "stairs", label: "Treppe" },
  { value: "kitchen", label: "Küche" },
  { value: "bar", label: "Bar" },
  { value: "wall", label: "Wand" },
  { value: "other", label: "Sonstiges" },
];

interface CreateObstacleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  onSaved: () => void;
  obstacle?: Obstacle | null;
  onDeleted?: () => void;
  areas: Area[];
  selectedAreaId: number | null;
}

export function CreateObstacleDialog({
  open,
  onOpenChange,
  restaurantId,
  onSaved,
  obstacle = null,
  onDeleted,
  areas,
  selectedAreaId,
}: CreateObstacleDialogProps) {
  const [type, setType] = useState("door");
  const [name, setName] = useState("");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(40);
  const [rotation, setRotation] = useState(0);
  const [blocking, setBlocking] = useState(true);
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [areaId, setAreaId] = useState<number | null>(selectedAreaId ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [areaMenuOpen, setAreaMenuOpen] = useState(false);
  const areaMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setError("");
      if (obstacle) {
        setType(obstacle.type || "door");
        setName(obstacle.name || "");
        setX(obstacle.x);
        setY(obstacle.y);
        setWidth(obstacle.width);
        setHeight(obstacle.height);
        setRotation(obstacle.rotation || 0);
        setBlocking(obstacle.blocking);
        setColor(obstacle.color || "");
        setNotes(obstacle.notes || "");
        setAreaId(obstacle.area_id ?? selectedAreaId ?? null);
      } else {
        setType("door");
        setName("");
        setX(50);
        setY(50);
        setWidth(100);
        setHeight(40);
        setRotation(0);
        setBlocking(true);
        setColor("");
        setNotes("");
        setAreaId(selectedAreaId ?? null);
      }
    } else {
      setError("");
    }
  }, [open, obstacle, selectedAreaId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (areaMenuRef.current && !areaMenuRef.current.contains(event.target as Node)) {
        setAreaMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
      const payload: ObstacleCreate | ObstacleUpdate = {
        type,
        name: name || null,
        x,
        y,
        width,
        height,
        rotation,
        blocking,
        color: color || null,
        notes: notes || null,
        area_id: areaId,
      };
      if (obstacle) {
        await obstaclesApi.update(restaurantId, obstacle.id, payload as ObstacleUpdate);
      } else {
        await obstaclesApi.create(restaurantId, payload as ObstacleCreate);
      }
      onSaved();
      onOpenChange(false);
      setName("");
      setNotes("");
      setColor("");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Erstellen des Hindernisses");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!obstacle) return;
    const confirmed = confirmAction("Hindernis wirklich löschen?");
    if (!confirmed) return;
    setLoading(true);
    try {
      await obstaclesApi.delete(restaurantId, obstacle.id);
      onDeleted?.();
      onSaved();
      onOpenChange(false);
    } catch (err) {
      setError("Fehler beim Löschen des Hindernisses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{obstacle ? "Hindernis bearbeiten" : "Hindernis hinzufügen"}</DialogTitle>
          <DialogDescription>Füge Türen, Treppen, Küchenbereiche o. Ä. hinzu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
      {error && (
        <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md flex items-start justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setError("")}
            className="text-red-200 hover:text-white"
            aria-label="Fehlermeldung schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
          <div className="space-y-4 px-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Typ *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="z. B. Küchentür"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Area *</label>
              <div className="relative" ref={areaMenuRef}>
                <button
                  type="button"
                  onClick={() => setAreaMenuOpen((prev) => !prev)}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-card text-foreground px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-inner"
                  disabled={areas.length === 0}
                >
                  <span className="truncate">
                    {areaId ? areas.find((a) => a.id === areaId)?.name || "Area auswählen" : "Area auswählen"}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${areaMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {areaMenuOpen && (
                  <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-xl max-h-60 overflow-auto">
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
                            ? "font-semibold text-foreground dark:text-white"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        {area.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {areas.length === 0 && (
                <p className="text-xs text-amber-300 mt-2">
                  Keine Area vorhanden. Bitte zuerst eine Area anlegen.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Breite</label>
                <Input type="number" value={width} onChange={(e) => setWidth(parseInt(e.target.value) || 0)} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-muted-foreground">Höhe</label>
                <Input type="number" value={height} onChange={(e) => setHeight(parseInt(e.target.value) || 0)} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">
                Rotation ({rotation ?? 0}°)
              </label>
              <input
                type="range"
                min="0"
                max="359"
                value={rotation ?? 0}
                onChange={(e) => setRotation(parseInt(e.target.value) || 0)}
                className="w-full accent-[#F95100]"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Farbe (optional)</p>
              <div className="flex flex-wrap items-center gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`h-9 w-9 rounded-full border-2 transition-shadow ${
                      color === preset ? "border-white shadow-lg shadow-black/30" : "border-white/40"
                    }`}
                    style={{ backgroundColor: preset }}
                    aria-label={`Farbe ${preset}`}
                  />
                ))}
                <input
                  type="color"
                  value={color || "#9ca3af"}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-9 w-14 bg-card border border-input rounded cursor-pointer"
                  aria-label="Eigene Farbe wählen"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColor("")}
                  className="text-muted-foreground"
                >
                  Keine Farbe
                </Button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-muted-foreground">Notizen</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-input bg-card text-foreground rounded-md focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
                rows={2}
                placeholder="Beschreibung oder Hinweise..."
              />
            </div>
          </div>
          <DialogFooter>
            {obstacle && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
                className="mr-auto shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)] gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Löschen
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="gap-2">
              <X className="w-4 h-4" />
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Save className="w-4 h-4 animate-spin" />
                  <span>Wird gespeichert...</span>
                </>
              ) : obstacle ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Speichern</span>
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



