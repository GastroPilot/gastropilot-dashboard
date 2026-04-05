"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { guestsApi, Guest, GuestCreate, GuestUpdate } from "@/lib/api/guests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingOverlay } from "@/components/loading-overlay";
import { confirmAction } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Search,
  Mail,
  Phone,
  Star,
  Calendar,
  StickyNote,
  X,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  Clock,
} from "lucide-react";

const PAGE_SIZE = 25;

export default function GuestsCrmPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

  // Form States
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  const addToast = useCallback(
    (message: string, variant: "info" | "error" | "success" = "info") => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 5000);
    },
    []
  );

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const restaurantsData = await restaurantsApi.list();

      if (restaurantsData.length === 0) {
        addToast("Kein Restaurant gefunden", "error");
        return;
      }

      const selectedRestaurant = restaurantsData[0];
      setRestaurant(selectedRestaurant);

      const guestsData = await guestsApi.list(selectedRestaurant.id);
      setGuests(guestsData);
    } catch (err) {
      console.error("Error loading guests:", err);
      addToast("Fehler beim Laden der Gäste", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredGuests = useMemo(() => {
    if (!searchQuery.trim()) return guests;
    const q = searchQuery.toLowerCase();
    return guests.filter(
      (g) =>
        g.first_name?.toLowerCase().includes(q) ||
        g.last_name?.toLowerCase().includes(q) ||
        g.email?.toLowerCase().includes(q) ||
        g.phone?.includes(q)
    );
  }, [guests, searchQuery]);

  const paginatedGuests = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredGuests.slice(start, start + PAGE_SIZE);
  }, [filteredGuests, page]);

  const totalPages = Math.ceil(filteredGuests.length / PAGE_SIZE);

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setNotes("");
    setEditingGuest(null);
    setError("");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (guest: Guest) => {
    setFirstName(guest.first_name);
    setLastName(guest.last_name);
    setEmail(guest.email || "");
    setPhone(guest.phone || "");
    setNotes(guest.notes || "");
    setEditingGuest(guest);
    setDialogOpen(true);
  };

  const openDetailDialog = (guest: Guest) => {
    setSelectedGuest(guest);
    setDetailDialogOpen(true);
  };

  const handleSave = async () => {
    if (!restaurant) return;

    if (!firstName.trim() || !lastName.trim()) {
      setError("Vor- und Nachname sind erforderlich");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (editingGuest) {
        const updateData: GuestUpdate = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        };
        await guestsApi.update(restaurant.id, editingGuest.id, updateData);
        addToast("Gast aktualisiert", "success");
      } else {
        const createData: GuestCreate = {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          notes: notes.trim() || null,
        };
        await guestsApi.create(restaurant.id, createData);
        addToast("Gast erstellt", "success");
      }

      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Fehler beim Speichern");
      addToast(err?.message || "Fehler beim Speichern", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (guest: Guest) => {
    if (!restaurant) return;

    const confirmed = confirmAction(
      `Möchten Sie den Gast "${guest.first_name} ${guest.last_name}" wirklich löschen?`
    );

    if (!confirmed) return;

    try {
      await guestsApi.delete(restaurant.id, guest.id);
      addToast("Gast gelöscht", "success");
      if (detailDialogOpen) setDetailDialogOpen(false);
      await loadData();
    } catch (err: any) {
      addToast(err?.message || "Fehler beim Löschen", "error");
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return "-";
    }
  };

  if (isLoading) return <LoadingOverlay />;

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-right ${
                toast.variant === "error"
                  ? "bg-red-500 text-white"
                  : toast.variant === "success"
                    ? "bg-green-500 text-white"
                    : "bg-card text-foreground border border-border"
              }`}
            >
              {toast.message}
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((t) => t.id !== toast.id))
                }
                className="ml-2 opacity-70 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-md">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  Gäste / CRM
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Gästedatenbank verwalten, Stammgäste erkennen und
                  Präferenzen pflegen
                </p>
              </div>
            </div>
            <Button
              onClick={openCreateDialog}
              className="bg-[#F95100] hover:bg-[#E04800] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Neuer Gast
            </Button>
          </div>

          {/* Search & Stats Bar */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Gast suchen (Name, E-Mail, Telefon)..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            <div className="hidden md:flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{guests.length} Gäste gesamt</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredGuests.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {searchQuery
                ? "Keine Gäste gefunden"
                : "Noch keine Gäste vorhanden"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {searchQuery
                ? "Versuchen Sie einen anderen Suchbegriff."
                : "Erstellen Sie Ihren ersten Gast-Eintrag."}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Gast erstellen
              </Button>
            )}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Guest Table */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">
                      Name
                    </th>
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 hidden md:table-cell">
                      Kontakt
                    </th>
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 hidden lg:table-cell">
                      Notizen
                    </th>
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 hidden sm:table-cell">
                      Erstellt
                    </th>
                    <th className="text-right text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGuests.map((guest) => (
                    <tr
                      key={guest.id}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors cursor-pointer"
                      onClick={() => openDetailDialog(guest)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {(guest.first_name?.[0] || "?").toUpperCase()}
                            {(guest.last_name?.[0] || "").toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              {guest.first_name} {guest.last_name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                          {guest.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[200px]">
                                {guest.email}
                              </span>
                            </div>
                          )}
                          {guest.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5" />
                              <span>{guest.phone}</span>
                            </div>
                          )}
                          {!guest.email && !guest.phone && (
                            <span className="text-muted-foreground/50">
                              Kein Kontakt
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {guest.notes ? (
                          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                            <StickyNote className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                            <span className="truncate max-w-[250px]">
                              {guest.notes}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(guest.created_at_utc)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(guest)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(guest)}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  {filteredGuests.length} Gäste
                  {searchQuery && ` (gefiltert aus ${guests.length})`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Seite {page + 1} von {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage((p) => Math.min(totalPages - 1, p + 1))
                    }
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle>
              {editingGuest ? "Gast bearbeiten" : "Neuen Gast anlegen"}
            </DialogTitle>
            <DialogDescription>
              {editingGuest
                ? "Aktualisieren Sie die Gast-Informationen."
                : "Erfassen Sie einen neuen Gast in der Datenbank."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 px-1">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-3 py-2 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Vorname *
                </label>
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Max"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Nachname *
                </label>
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Mustermann"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                E-Mail
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Telefon
              </label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+49 123 4567890"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">
                Notizen
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Allergien, Präferenzen, Stammtisch-Wünsche..."
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
              className="bg-[#F95100] hover:bg-[#E04800] text-white"
            >
              {loading
                ? "Speichern..."
                : editingGuest
                  ? "Aktualisieren"
                  : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          {selectedGuest && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xl font-bold">
                    {(selectedGuest.first_name?.[0] || "?").toUpperCase()}
                    {(selectedGuest.last_name?.[0] || "").toUpperCase()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">
                      {selectedGuest.first_name} {selectedGuest.last_name}
                    </DialogTitle>
                    <DialogDescription>
                      Gast seit {formatDate(selectedGuest.created_at_utc)}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 pt-2">
                {/* Contact Info */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Kontaktdaten
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">E-Mail</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedGuest.email || "Nicht angegeben"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <Phone className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">Telefon</p>
                        <p className="text-sm font-medium text-foreground">
                          {selectedGuest.phone || "Nicht angegeben"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedGuest.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Notizen & Präferenzen
                    </h3>
                    <div className="p-3 bg-background rounded-lg border border-border">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {selectedGuest.notes}
                      </p>
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Verlauf
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <Calendar className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Erstellt am
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(selectedGuest.created_at_utc)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-background rounded-lg border border-border">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">
                          Aktualisiert am
                        </p>
                        <p className="text-sm font-medium text-foreground">
                          {formatDate(selectedGuest.updated_at_utc)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-4">
                <Button
                  variant="outline"
                  className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                  onClick={() => handleDelete(selectedGuest)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setDetailDialogOpen(false);
                    openEditDialog(selectedGuest);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Bearbeiten
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
