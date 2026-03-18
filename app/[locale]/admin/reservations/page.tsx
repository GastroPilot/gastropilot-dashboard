"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminReservationsApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";

const STATUSES = ["", "pending", "confirmed", "seated", "completed", "canceled", "no_show"];
const STATUS_LABELS: Record<string, string> = {
  "": "Alle",
  pending: "Ausstehend",
  confirmed: "Bestätigt",
  seated: "Platziert",
  completed: "Abgeschlossen",
  canceled: "Storniert",
  no_show: "No-Show",
};

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  seated: "default",
  completed: "secondary",
  canceled: "destructive",
  no_show: "destructive",
};

export default function AdminReservationsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reservations", page, statusFilter],
    queryFn: () =>
      adminReservationsApi.list({
        page,
        per_page: 50,
        status: statusFilter || undefined,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, canceled_reason }: { id: string; status: string; canceled_reason?: string }) =>
      adminReservationsApi.updateStatus(id, { status, canceled_reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reservations"] });
      toast.success("Status aktualisiert");
    },
    onError: () => toast.error("Fehler beim Ändern des Status"),
  });

  const handleStatusChange = (id: string, newStatus: string) => {
    let canceled_reason: string | undefined;
    if (newStatus === "canceled") {
      canceled_reason = prompt("Stornierungsgrund (optional):") || undefined;
    }
    statusMutation.mutate({ id, status: newStatus, canceled_reason });
  };

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Reservierungen</h1>

      {/* Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setStatusFilter(s);
              setPage(1);
            }}
          >
            {STATUS_LABELS[s]}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Restaurant</th>
              <th className="px-4 py-3 text-left font-medium">Gast</th>
              <th className="px-4 py-3 text-left font-medium">Personen</th>
              <th className="px-4 py-3 text-left font-medium">Datum</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-8" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-24 ml-auto" /></td>
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={6}>
                  <EmptyState
                    icon={CalendarDays}
                    title="Keine Reservierungen gefunden"
                    description="Es liegen keine Reservierungen mit den aktuellen Filtern vor."
                  />
                </td>
              </tr>
            ) : (
              data?.items.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {r.restaurant_name}
                  </td>
                  <td className="px-4 py-3">
                    <div>{r.guest_name || "—"}</div>
                    {r.guest_email && (
                      <div className="text-xs text-muted-foreground">
                        {r.guest_email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">{r.party_size}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.start_at
                      ? new Date(r.start_at).toLocaleString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_COLORS[r.status] || "secondary"}>
                      {STATUS_LABELS[r.status] || r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <select
                      className="rounded border bg-background px-2 py-1 text-xs"
                      value={r.status}
                      onChange={(e) => handleStatusChange(r.id, e.target.value)}
                      disabled={statusMutation.isPending}
                    >
                      {STATUSES.filter((s) => s !== "").map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Seite {page} von {totalPages} ({data?.total} Reservierungen)
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
