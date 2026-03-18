"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminReviewsApi } from "@/lib/api/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Trash2, Eye, EyeOff, ChevronLeft, ChevronRight, Star, BadgeCheck, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";

export default function AdminReviewsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [visibleFilter, setVisibleFilter] = useState<boolean | undefined>(undefined);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews", page, visibleFilter],
    queryFn: () =>
      adminReviewsApi.list({
        page,
        per_page: 50,
        visible: visibleFilter,
      }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_visible }: { id: string; is_visible: boolean }) =>
      adminReviewsApi.toggleVisibility(id, is_visible),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success(vars.is_visible ? "Bewertung sichtbar" : "Bewertung versteckt");
    },
    onError: () => toast.error("Fehler beim Ändern der Sichtbarkeit"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminReviewsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      toast.success("Bewertung gelöscht");
    },
    onError: () => toast.error("Fehler beim Löschen der Bewertung"),
  });

  const replyMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) =>
      adminReviewsApi.reply(id, text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      setReplyingId(null);
      setReplyText("");
      toast.success("Antwort gesendet");
    },
    onError: () => toast.error("Fehler beim Senden der Antwort"),
  });

  const totalPages = data ? Math.ceil(data.total / data.per_page) : 0;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Bewertungen</h1>

      <div className="mb-4 flex gap-2">
        <Button
          variant={visibleFilter === undefined ? "default" : "outline"}
          size="sm"
          onClick={() => { setVisibleFilter(undefined); setPage(1); }}
        >
          Alle
        </Button>
        <Button
          variant={visibleFilter === true ? "default" : "outline"}
          size="sm"
          onClick={() => { setVisibleFilter(true); setPage(1); }}
        >
          Sichtbar
        </Button>
        <Button
          variant={visibleFilter === false ? "default" : "outline"}
          size="sm"
          onClick={() => { setVisibleFilter(false); setPage(1); }}
        >
          Versteckt
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">Restaurant</th>
              <th className="px-4 py-3 text-left font-medium">Gast</th>
              <th className="px-4 py-3 text-left font-medium">Bewertung</th>
              <th className="px-4 py-3 text-left font-medium">Text</th>
              <th className="px-4 py-3 text-left font-medium">Sichtbar</th>
              <th className="px-4 py-3 text-left font-medium">Datum</th>
              <th className="px-4 py-3 text-right font-medium">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b">
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-5 w-12" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={MessageSquare}
                    title="Keine Bewertungen gefunden"
                    description="Es liegen noch keine Bewertungen vor."
                  />
                </td>
              </tr>
            ) : (
              data?.items.map((review) => (
                <tr key={review.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">
                    {review.restaurant_name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      {review.guest_name || "Anonym"}
                      {review.is_verified && (
                        <span title="Verifizierter Besuch"><BadgeCheck className="h-3.5 w-3.5 text-green-600" /></span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{review.rating}</span>
                    </div>
                  </td>
                  <td className="max-w-[250px] px-4 py-3 text-muted-foreground">
                    <div className="truncate">{review.title || review.text || "—"}</div>
                    {review.staff_reply && (
                      <div className="mt-1 truncate border-l-2 border-primary/30 pl-2 text-xs">
                        <span className="font-medium text-primary">Antwort:</span>{" "}
                        {review.staff_reply}
                      </div>
                    )}
                    {replyingId === review.id && (
                      <div className="mt-2 flex gap-1">
                        <Input
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Antwort schreiben..."
                          className="h-8 text-xs"
                        />
                        <Button
                          size="sm"
                          className="h-8 px-2"
                          disabled={!replyText.trim() || replyMutation.isPending}
                          onClick={() =>
                            replyMutation.mutate({ id: review.id, text: replyText })
                          }
                        >
                          <Send className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => { setReplyingId(null); setReplyText(""); }}
                        >
                          &times;
                        </Button>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={review.is_visible ? "default" : "secondary"}>
                      {review.is_visible ? "Ja" : "Nein"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {review.created_at
                      ? new Date(review.created_at).toLocaleDateString("de-DE")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingId(replyingId === review.id ? null : review.id);
                          setReplyText(review.staff_reply || "");
                        }}
                        title="Antworten"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleMutation.mutate({
                            id: review.id,
                            is_visible: !review.is_visible,
                          })
                        }
                        title={review.is_visible ? "Verstecken" : "Anzeigen"}
                      >
                        {review.is_visible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Bewertung wirklich löschen?")) {
                            deleteMutation.mutate(review.id);
                          }
                        }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            Seite {page} von {totalPages} ({data?.total} Bewertungen)
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
