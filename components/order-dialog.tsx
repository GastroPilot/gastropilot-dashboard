"use client";

import { useState, useEffect, useCallback } from "react";
import { ordersApi, Order, OrderCreate, OrderUpdate, OrderWithItems, OrderItem, OrderItemCreate } from "@/lib/api/orders";
import { Table } from "@/lib/api/tables";
import { Reservation } from "@/lib/api/reservations";
import { menuApi, MenuItem, MenuCategory } from "@/lib/api/menu";
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
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import {
  ShoppingCart,
  Table as TableIcon,
  Plus,
  Trash2,
  Save,
  X,
  Euro,
  Users,
  FileText,
  Search,
} from "lucide-react";
import { confirmAction } from "@/lib/utils";
import { AITableSuggestion } from "@/components/ai-table-suggestion";
import { DropdownSelector } from "@/components/area-selector";

interface OrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  order?: OrderWithItems | null;
  table?: Table | null;
  availableTables?: Table[];
  reservations?: Reservation[];
  onOrderCreated: () => void;
  onOrderUpdated?: () => void;
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
}

export function OrderDialog({
  open,
  onOpenChange,
  restaurantId,
  order,
  table,
  availableTables = [],
  reservations = [],
  onOrderCreated,
  onOrderUpdated,
  onNotify,
}: OrderDialogProps) {
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [partySize, setPartySize] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");
  const [status, setStatus] = useState<string>("open");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<OrderItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [showMenuSelection, setShowMenuSelection] = useState(false);
  const [showManualTableSelect, setShowManualTableSelect] = useState(false);

  const loadMenuData = useCallback(async () => {
    try {
      const [itemsData, categoriesData] = await Promise.all([
        menuApi.listItems(restaurantId, { available_only: true }),
        menuApi.listCategories(restaurantId),
      ]);
      setMenuItems(itemsData);
      setMenuCategories(categoriesData);
    } catch (err) {
      console.error("Fehler beim Laden des Menüs:", err);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (open) {
      if (order) {
        setSelectedTableId(order.table_id);
        setSelectedReservationId(order.reservation_id);
        setPartySize(order.party_size);
        setNotes(order.notes || "");
        setSpecialRequests(order.special_requests || "");
        setStatus(order.status);
        setPaymentMethod(order.payment_method || "");
        setItems(order.items || []);
      } else {
        setSelectedTableId(table?.id || null);
        setSelectedReservationId(reservations[0]?.id ?? null);
        setPartySize(table ? Math.min(table.capacity, 4) : null);
        setNotes("");
        setSpecialRequests("");
        setStatus("open");
        setPaymentMethod("");
        setItems([]);
        // Zeige AI-Vorschläge wenn kein Tisch vorausgewählt ist
        setShowManualTableSelect(!!table?.id);
      }
      setError("");
      loadMenuData();
    } else {
      setError("");
    }
  }, [open, order, table, reservations, restaurantId, loadMenuData]);

  useEffect(() => {
    if (!open || order || !selectedReservationId) return;
    const reservation = reservations.find((entry) => entry.id === selectedReservationId);
    if (!reservation) return;

    if (reservation.table_id) {
      setSelectedTableId(reservation.table_id);
      const selectedTable = availableTables.find((entry) => entry.id === reservation.table_id);
      if (selectedTable) {
        setPartySize(Math.min(reservation.party_size, selectedTable.capacity));
      } else {
        setPartySize(reservation.party_size);
      }
      return;
    }

    setSelectedTableId(null);
    setPartySize(reservation.party_size);
  }, [availableTables, open, order, reservations, selectedReservationId]);

  const filteredMenuItems = menuItems.filter((item) => {
    if (selectedCategoryId && item.category_id !== selectedCategoryId) return false;
    if (menuSearchQuery) {
      const query = menuSearchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        (item.description && item.description.toLowerCase().includes(query))
      );
    }
    return true;
  });

  const handleAddMenuItem = (menuItem: MenuItem) => {
    const newItem: OrderItem = {
      id: `temp-${Date.now()}`, // Temporary ID
      order_id: order?.id || "0",
      item_name: menuItem.name,
      item_description: menuItem.description,
      category: menuCategories.find((c) => c.id === menuItem.category_id)?.name || null,
      quantity: 1,
      unit_price: menuItem.price,
      total_price: menuItem.price,
      tax_rate: menuItem.tax_rate ?? 0.19,
      status: "pending",
      notes: null,
      sort_order: items.length,
      created_at_utc: new Date().toISOString(),
      updated_at_utc: new Date().toISOString(),
    };
    setItems([...items, newItem]);
    setShowMenuSelection(false);
    setMenuSearchQuery("");
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    return subtotal;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!order && items.length === 0) {
      const message = "Bitte füge mindestens einen Artikel hinzu.";
      setError(message);
      onNotify?.(message, "error");
      return;
    }
    if (!order && !selectedReservationId) {
      const message = "Bitte wähle eine Reservierung aus.";
      setError(message);
      onNotify?.(message, "error");
      return;
    }
    setLoading(true);

    try {
      if (order) {
        // Update existing order
        const updateData: OrderUpdate = {
          party_size: partySize || undefined,
          notes: notes || undefined,
          special_requests: specialRequests || undefined,
          status: status as any,
          payment_method: paymentMethod || undefined,
        };
        if (!order.reservation_id) {
          updateData.table_id = selectedTableId;
        }

        await ordersApi.update(restaurantId, order.id, updateData);
        onNotify?.("Bestellung erfolgreich aktualisiert", "success");
        onOrderUpdated?.();
      } else {
        // Create new order
        const createData: OrderCreate = {
          reservation_id: selectedReservationId || undefined,
          table_id: selectedTableId,
          party_size: partySize || undefined,
          notes: notes || undefined,
          special_requests: specialRequests || undefined,
          items: items.map((item) => ({
            item_name: item.item_name,
            item_description: item.item_description || undefined,
            category: item.category || undefined,
            quantity: item.quantity,
            unit_price: item.unit_price,
            notes: item.notes || undefined,
          })),
        };

        const createdOrder = await ordersApi.create(restaurantId, createData);
        try {
          const sendResult = await ordersApi.sendPendingItems(restaurantId, createdOrder.id);
          if (sendResult.items_sent > 0) {
            const ticketLabel = sendResult.kitchen_ticket_no
              ? ` (Ticket #${sendResult.kitchen_ticket_no})`
              : "";
            onNotify?.(`Bestellung erfolgreich erstellt und an die Küche gesendet${ticketLabel}`, "success");
          } else {
            onNotify?.("Bestellung erfolgreich erstellt", "success");
          }
        } catch (sendErr) {
          console.error(
            "Bestellung erstellt, aber automatisches Senden an die Küche fehlgeschlagen:",
            sendErr,
          );
          onNotify?.(
            "Bestellung wurde erstellt, konnte aber nicht automatisch an die Küche gesendet werden.",
            "error",
          );
        }
        onOrderCreated();
      }

      onOpenChange(false);
    } catch (err) {
      console.error("Fehler beim Speichern der Bestellung:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleRemoveItem = (index: number) => {
    if (items[index].id && !String(items[index].id).startsWith('temp-')) {
      // Real item from backend
      const confirmed = confirmAction("Möchten Sie diese Position wirklich löschen?");
      if (!confirmed) return;
    }
    setItems(items.filter((_, i) => i !== index));
  };


  const handleDeleteOrder = async () => {
    if (!order) return;

    const confirmed = confirmAction("Möchten Sie diese Bestellung wirklich löschen?");
    if (!confirmed) return;

    setLoading(true);
    try {
      await ordersApi.delete(restaurantId, order.id);
      onNotify?.("Bestellung erfolgreich gelöscht", "success");
      onOrderUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Fehler beim Löschen der Bestellung:", err);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
      }
    } finally {
      setLoading(false);
    }
  };

  const subtotal = calculateSubtotal();
  const tax = subtotal * (0.19 / 1.19);
  const total = calculateTotal();
  const reservationOptions = [...reservations]
    .sort((a, b) => parseISO(a.start_at).getTime() - parseISO(b.start_at).getTime())
    .map((reservation) => {
      const guestLabel = reservation.guest_name || "Gast";
      const timeLabel = `${format(parseISO(reservation.start_at), "HH:mm", { locale: de })}-${format(parseISO(reservation.end_at), "HH:mm", { locale: de })}`;
      const tableLabel = reservation.table_id
        ? availableTables.find((tableOption) => tableOption.id === reservation.table_id)?.number || "Tisch"
        : "Ohne Tisch";
      return {
        id: reservation.id,
        label: `${guestLabel} · ${timeLabel} · ${tableLabel}`,
      };
    });
  const selectedReservation =
    reservations.find((reservation) => reservation.id === selectedReservationId) || null;
  const tableManagedByReservation = Boolean(order?.reservation_id) || (!order && Boolean(selectedReservation));
  const tableOptions = [
    { id: "__none__", label: "Kein Tisch" },
    ...[...availableTables]
      .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
      .map((tableOption) => ({
        id: tableOption.id,
        label: `${tableOption.number} · ${tableOption.capacity} Pers.`,
      })),
  ];
  const statusOptions = [
    { id: "open", label: "Offen" },
    { id: "sent_to_kitchen", label: "An Küche gesendet" },
    { id: "in_preparation", label: "In Zubereitung" },
    { id: "ready", label: "Fertig" },
    { id: "served", label: "Serviert" },
    { id: "paid", label: "Bezahlt" },
    { id: "canceled", label: "Storniert" },
  ];
  const paymentMethodOptions = [
    { id: "__none__", label: "Nicht ausgewählt" },
    { id: "cash", label: "Bar" },
    { id: "card", label: "Karte" },
    { id: "sumup_card", label: "SumUp Terminal" },
    { id: "split", label: "Geteilt" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {order ? "Bestellung bearbeiten" : "Neue Bestellung"}
          </DialogTitle>
          <DialogDescription>
            {order
              ? `Bearbeite Bestellung ${order.order_number || `#${order.id}`}`
              : "Erstelle eine neue Bestellung"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-600 text-red-300 rounded-md mx-6 flex items-start justify-between gap-3">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setError("")}
                className="text-red-200 hover:text-foreground"
              >
                ×
              </button>
            </div>
          )}

          <div className="space-y-4 px-4 md:px-6">
            {/* KI-Tischvorschläge - nur bei neuen Bestellungen ohne vorausgewählten Tisch */}
            {!order && !table && reservationOptions.length === 0 && (
              <AITableSuggestion
                restaurantId={restaurantId}
                selectedTableId={selectedTableId}
                onSelectTable={(tableId) => {
                  setSelectedTableId(tableId);
                  const selectedTable = availableTables.find((t) => t.id === tableId);
                  if (selectedTable) {
                    setPartySize((prev) =>
                      prev ? Math.min(prev, selectedTable.capacity) : Math.min(selectedTable.capacity, 4)
                    );
                  }
                }}
                onManualSelect={() => setShowManualTableSelect(true)}
                disabled={loading}
              />
            )}

            {/* Grundinformationen */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!order && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Reservierung *
                  </label>
                  <DropdownSelector
                    options={reservationOptions}
                    selectedId={selectedReservationId}
                    onSelect={setSelectedReservationId}
                    placeholder={
                      reservationOptions.length > 0
                        ? "Reservierung auswählen"
                        : "Keine aktive Reservierung verfügbar"
                    }
                    disabled={loading || reservationOptions.length === 0}
                    triggerClassName="w-full rounded-lg border border-input bg-card text-foreground px-3 py-2 text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                    menuClassName="max-h-[60vh] overflow-auto backdrop-blur-sm"
                    zIndexClassName="z-[110]"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <TableIcon className="w-4 h-4 inline mr-1" />
                  Tisch
                </label>
                <DropdownSelector
                  options={tableOptions}
                  selectedId={selectedTableId ?? "__none__"}
                  onSelect={(value) => {
                    if (tableManagedByReservation) {
                      return;
                    }
                    if (value === "__none__") {
                      setSelectedTableId(null);
                      return;
                    }
                    setSelectedTableId(value);
                    const selectedTable = availableTables.find((tableOption) => tableOption.id === value);
                    if (selectedTable) {
                      setPartySize((prev) =>
                        prev ? Math.min(prev, selectedTable.capacity) : Math.min(selectedTable.capacity, 4),
                      );
                    }
                  }}
                  placeholder="Kein Tisch"
                  disabled={loading || tableManagedByReservation}
                  triggerClassName="w-full rounded-lg border border-input bg-card text-foreground px-3 py-2 text-sm flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-ring touch-manipulation min-h-[40px] disabled:opacity-60 disabled:cursor-not-allowed"
                  menuClassName="max-h-[60vh] overflow-auto backdrop-blur-sm"
                  zIndexClassName="z-[110]"
                />
                {tableManagedByReservation ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tischzuordnung wird aus der Reservierung übernommen.
                  </p>
                ) : null}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  <Users className="w-4 h-4 inline mr-1" />
                  Personenanzahl
                </label>
                <Input
                  type="number"
                  min="1"
                  value={partySize || ""}
                  onChange={(e) =>
                    setPartySize(e.target.value ? parseInt(e.target.value) : null)
                  }
                  placeholder="z.B. 4"
                  className="bg-card border-input text-foreground"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Status und Zahlungsmethode */}
            {order && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Status
                  </label>
                  <DropdownSelector
                    options={statusOptions}
                    selectedId={status}
                    onSelect={setStatus}
                    placeholder="Status auswählen"
                    disabled={loading}
                    triggerClassName="w-full px-3 py-2 bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring inline-flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    menuWidthClassName="w-full"
                    zIndexClassName="z-[120]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Zahlungsmethode
                  </label>
                  <DropdownSelector
                    options={paymentMethodOptions}
                    selectedId={paymentMethod || "__none__"}
                    onSelect={(value) => setPaymentMethod(value === "__none__" ? "" : value)}
                    placeholder="Nicht ausgewählt"
                    disabled={loading}
                    triggerClassName="w-full px-3 py-2 bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring inline-flex items-center justify-between gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    menuWidthClassName="w-full"
                    zIndexClassName="z-[120]"
                  />
                </div>
              </div>
            )}

            {/* Bestellpositionen */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-muted-foreground">
                  <ShoppingCart className="w-4 h-4 inline mr-1" />
                  Bestellpositionen
                </label>
                {!order && (
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={() => setShowMenuSelection(!showMenuSelection)}
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {showMenuSelection ? "Auswahl schließen" : "Artikel hinzufügen"}
                  </Button>
                )}
              </div>

              {/* Menü-Auswahl */}
              {!order && showMenuSelection && (
                <div className="mb-4 p-4 bg-card/50 border border-border rounded-md">
                  <div className="mb-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Artikel suchen..."
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        className="pl-10 bg-card border-input text-foreground"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(null)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedCategoryId === null
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                      >
                        Alle
                      </button>
                      {menuCategories
                        .filter((c) => c.is_active)
                        .map((category) => (
                          <button
                            key={category.id}
                            type="button"
                            onClick={() => setSelectedCategoryId(category.id)}
                            className={`px-3 py-1 rounded text-sm ${
                              selectedCategoryId === category.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                          >
                            {category.name}
                          </button>
                        ))}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {filteredMenuItems.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        {menuSearchQuery
                          ? "Keine Artikel gefunden"
                          : "Keine verfügbaren Artikel"}
                      </div>
                    ) : (
                      filteredMenuItems.map((menuItem) => (
                        <button
                          key={menuItem.id}
                          type="button"
                          onClick={() => handleAddMenuItem(menuItem)}
                          className="w-full text-left p-3 bg-muted hover:bg-accent rounded-md border border-input hover:border-primary transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="font-medium text-foreground">{menuItem.name}</div>
                              {menuItem.description && (
                                <div className="text-sm text-muted-foreground mt-1">
                                  {menuItem.description}
                                </div>
                              )}
                            </div>
                            <div className="ml-4 text-right">
                              <div className="font-semibold text-foreground">
                                {formatCurrency(menuItem.price)}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1">
                                <Plus className="w-3 h-3 inline" /> Hinzufügen
                              </div>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Bestellte Positionen */}
              {items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-border rounded-md">
                  Noch keine Positionen vorhanden
                  {!order && !showMenuSelection && (
                    <div className="mt-2 text-sm">
                      Klicken Sie auf "Artikel hinzufügen" um Artikel aus dem Menü auszuwählen
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 border border-border rounded-md p-4">
                  {items.map((item, index) => (
                    <div
                      key={item.id || index}
                      className="bg-muted/50 rounded-md p-3"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
                        <div className="md:col-span-9">
                          <div className="font-medium text-foreground">{item.item_name}</div>
                          {item.item_description && (
                            <div className="text-sm text-muted-foreground">{item.item_description}</div>
                          )}
                        </div>
                        <div className="md:col-span-2 flex items-center justify-center">
                          <span className="text-foreground font-medium">
                            {formatCurrency(item.total_price)}
                          </span>
                        </div>
                        {!order && (
                          <div className="md:col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveItem(index)}
                              disabled={loading}
                              className="w-full ml-2 shadow-none"
                              title="Position entfernen"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Zusammenfassung */}
              {items.length > 0 && (
                <div className="mt-4 p-4 bg-card/50 border border-border rounded-md">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Zwischensumme:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>MwSt. (inkl.):</span>
                      <span>{formatCurrency(tax)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-foreground border-t border-border pt-2 mt-2">
                      <span>Gesamt:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notizen */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                <FileText className="w-4 h-4 inline mr-1" />
                Notizen
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2}
                placeholder="z.B. Allergien, Wünsche, Hinweise"
                disabled={loading}
              />
            </div>

            {/* Besondere Wünsche */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-2">
                Besondere Wünsche
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                className="w-full px-3 py-2 bg-card border border-input rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={2}
                placeholder="z.B. extra Besteck, besondere Wünsche"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="px-4 md:px-6 pt-4">
            <div className="flex justify-between w-full">
              {order && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDeleteOrder}
                  disabled={loading}
                  className="bg-red-900/30 border-red-600 text-red-200 hover:bg-red-900/50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="gap-2"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Speichern..." : "Speichern"}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
