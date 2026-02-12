"use client";

import { useEffect, useState } from "react";
import { format, addMinutes } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiError } from "@/lib/api/client";
import { blocksApi, Block } from "@/lib/api/blocks";
import { reservationsApi } from "@/lib/api/reservations";
import { confirmAction } from "@/lib/utils";
import { blockAssignmentsApi, BlockAssignment } from "@/lib/api/block-assignments";
import { Save, Trash2, X } from "lucide-react";
import type { Table } from "@/lib/api/tables";

interface BlockTableDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: number;
  tables?: Table[];
  block?: Block | null;
  blocks?: Block[];
  blockAssignments?: BlockAssignment[];
  selectedDate: Date;
  onBlockCreated: () => void;
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
}

export function BlockTableDialog({
  open,
  onOpenChange,
  restaurantId,
  tables = [],
  block = null,
  blocks = [],
  blockAssignments = [],
  selectedDate,
  onBlockCreated,
  onNotify,
}: BlockTableDialogProps) {
  const [blockDate, setBlockDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const assignedTables = block
    ? tables.filter((item) =>
        blockAssignments.some(
          (assignment) => assignment.block_id === block.id && assignment.table_id === item.id
        )
      )
    : [];

  useEffect(() => {
    if (!open) return;
    if (block) {
      const start = new Date(block.start_at);
      const end = new Date(block.end_at);
      setBlockDate(format(start, "yyyy-MM-dd"));
      setStartTime(format(start, "HH:mm"));
      setEndTime(format(end, "HH:mm"));
      setReason(block.reason || "");
      return;
    }
    const now = new Date();
    setBlockDate(format(selectedDate, "yyyy-MM-dd"));
    setStartTime(format(now, "HH:mm"));
    setEndTime(format(addMinutes(now, 120), "HH:mm"));
    setReason("");
    setError("");
  }, [open, selectedDate, block]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const startDate = new Date(blockDate);
      const [startHours, startMinutes] = startTime.split(":").map(Number);
      startDate.setHours(startHours, startMinutes, 0, 0);

      const endDate = new Date(blockDate);
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      endDate.setHours(endHours, endMinutes, 0, 0);

      if (endDate <= startDate) {
        endDate.setDate(endDate.getDate() + 1);
      }

      const tableIds = block
        ? blockAssignments
            .filter((assignment) => assignment.block_id === block.id)
            .map((assignment) => assignment.table_id)
        : tables.map((item) => item.id);

      const queryStart = new Date(startDate);
      queryStart.setDate(queryStart.getDate() - 1);
      const queryEnd = new Date(endDate);
      queryEnd.setDate(queryEnd.getDate() + 1);

      const conflictingTables: string[] = [];
      for (const tableId of tableIds) {
        if (!tableId || tableId <= 0) continue;
        const reservations = await reservationsApi.list(restaurantId, {
          from: queryStart.toISOString(),
          to: queryEnd.toISOString(),
          table_id: tableId,
        });
        const hasOverlap = reservations.some((reservation) => {
          if (reservation.table_id !== tableId) return false;
          const isActive =
            reservation.status !== "canceled" &&
            reservation.status !== "completed" &&
            reservation.status !== "no_show";
          if (!isActive) return false;
          const resStart = new Date(reservation.start_at);
          const resEnd = new Date(reservation.end_at);
          return startDate < resEnd && endDate > resStart;
        });
        if (hasOverlap) {
          const table = tables.find((item) => item.id === tableId);
          conflictingTables.push(table?.number ?? `#${tableId}`);
        }
      }

      if (conflictingTables.length > 0) {
        const message = `Blockierung nicht möglich. Reservierung überschneidet sich bei: ${conflictingTables.join(", ")}.`;
        setError(message);
        onNotify?.(message, "error");
        return;
      }

      if (block) {
        const targetBlocks = [block];
        await Promise.all(
          targetBlocks.map((item) =>
            blocksApi.update(restaurantId, item.id, {
              table_id: item.table_id,
              start_at: startDate.toISOString(),
              end_at: endDate.toISOString(),
              reason: reason || null,
            })
          )
        );
        onNotify?.(
          targetBlocks.length > 1 ? "Blockierungen aktualisiert." : "Blockierung aktualisiert.",
          "success"
        );
      } else {
        const validTables = tables.filter((item) => item.id > 0);
        if (validTables.length === 0) {
          setError("Bitte wähle mindestens einen Standard-Tisch aus.");
          return;
        }
        const createdBlock = await blocksApi.create(restaurantId, {
          table_id: null,
          start_at: startDate.toISOString(),
          end_at: endDate.toISOString(),
          reason: reason || null,
        });
        await Promise.all(
          validTables.map((item) =>
            blockAssignmentsApi.create(restaurantId, {
              block_id: createdBlock.id,
              table_id: item.id,
            })
          )
        );

        const label =
          validTables.length === 1
            ? `Tisch ${validTables[0].number} wurde blockiert.`
            : `${validTables.length} Tische wurden blockiert.`;
        onNotify?.(label, "success");
      }
      onBlockCreated();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || "Fehler beim Blockieren des Tisches");
      } else {
        setError("Fehler beim Blockieren des Tisches");
      }
      onNotify?.("Fehler beim Blockieren des Tisches", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!block) return;
    if (!confirmAction("Blockierung wirklich entfernen?")) {
      return;
    }
    setError("");
    setDeleting(true);
    try {
      await blocksApi.delete(restaurantId, block.id);
      onNotify?.("Blockierung entfernt.", "success");
      onBlockCreated();
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Fehler beim Entfernen der Blockierung");
      }
      onNotify?.("Fehler beim Entfernen der Blockierung", "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{block ? "Blockierung bearbeiten" : "Tisch blockieren"}</DialogTitle>
          <DialogDescription>
            {block
              ? assignedTables.length > 0
                ? `Passe den Zeitraum für ${
                    assignedTables.length === 1
                      ? assignedTables[0].number
                      : `${assignedTables.length} Tische`
                  } an.`
                : "Passe den Zeitraum für diese Block-Vorlage an."
              : `Blockiere ${tables.length === 1 ? tables[0].number : `${tables.length} Tische`} für einen Zeitraum, damit dort keine Reservierungen möglich sind.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6">
            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-700 rounded-md">
                {error}
              </div>
            )}
            {(block ? assignedTables.length > 0 : tables.length > 0) && (
              <div className="text-xs text-muted-foreground">
                {block
                  ? `Zugewiesene Tische: ${assignedTables.map((item) => item.number).join(", ")}`
                  : `Ausgewählte Tische: ${tables.map((item) => item.number).join(", ")}`}
              </div>
            )}
            <div>
              <label htmlFor="block-reason" className="block text-sm font-medium mb-1.5 md:mb-2 text-foreground">
                Name (optional)
              </label>
              <Input
                id="block-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="z.B. Wartung, Event"
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label htmlFor="block-date" className="block text-sm font-medium mb-1.5 md:mb-2 text-foreground">
                  Datum *
                </label>
                <Input
                  id="block-date"
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="block-start" className="block text-sm font-medium mb-1.5 md:mb-2 text-foreground">
                  Startzeit *
                </label>
                <Input
                  id="block-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="block-end" className="block text-sm font-medium mb-1.5 md:mb-2 text-foreground">
                  Endzeit *
                </label>
                <Input
                  id="block-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            {block && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || deleting}
                className="mr-auto shadow-none hover:shadow-[0_12px_32px_rgba(239,68,68,0.45)]"
              >
                <Trash2 className={`w-4 h-4 mr-2 ${deleting ? "animate-spin" : ""}`} />
                Block entfernen
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              <X className="w-4 h-4 mr-2" />
              Abbrechen
            </Button>
            <Button type="submit" disabled={loading || deleting || !blockDate || !startTime || !endTime}>
              <Save className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {loading ? (block ? "Wird gespeichert..." : "Wird blockiert...") : block ? "Speichern" : "Blockieren"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
