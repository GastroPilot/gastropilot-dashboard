"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ordersApi, OrderStatus, OrderWithItems, OrderItemCreate, SplitPayment } from "@/lib/api/orders";
import { tablesApi, Table } from "@/lib/api/tables";
import { menuApi, MenuItem, MenuCategory } from "@/lib/api/menu";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { startPayment, listReaders, getOrderPayments, type SumUpReader, type SumUpPayment } from "@/lib/api/sumup";
import { terminalsApi, PROVIDER_LABELS, type PaymentTerminal, type TerminalPayment } from "@/lib/api/terminals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { ShoppingCart, Table as TableIcon, Plus, Trash2, Euro, Users, FileText, X, CheckCircle, Clock, Search, Download, Check, ChevronDown, CreditCard, Banknote, Nfc, Loader2, AlertTriangle, XCircle, Printer, Receipt } from "lucide-react";
import { confirmAction } from "@/lib/utils";
import { getApiUrlForEndpoint } from "@/lib/api/client";
import { createReceipt, getTransactionForOrder } from "@/lib/api/fiskaly";

type StatusMeta = { Icon: typeof Clock; tone: string; label: string };

const STATUS_META: Record<OrderStatus, StatusMeta> = {
  open: {
    Icon: Clock,
    tone: "bg-blue-900/40 border-blue-600 text-blue-100",
    label: "Offen",
  },
  sent_to_kitchen: {
    Icon: ShoppingCart,
    tone: "bg-indigo-900/40 border-indigo-600 text-indigo-100",
    label: "An Küche gesendet",
  },
  in_preparation: {
    Icon: Clock,
    tone: "bg-yellow-900/40 border-yellow-600 text-yellow-100",
    label: "In Zubereitung",
  },
  ready: {
    Icon: CheckCircle,
    tone: "bg-emerald-900/40 border-emerald-600 text-emerald-100",
    label: "Fertig",
  },
  served: {
    Icon: CheckCircle,
    tone: "bg-green-900/40 border-green-600 text-green-100",
    label: "Serviert",
  },
  paid: {
    Icon: Euro,
    tone: "bg-amber-900/30 border-amber-600 text-amber-100",
    label: "Bezahlt",
  },
  canceled: {
    Icon: X,
    tone: "bg-red-900/30 border-red-600 text-red-100",
    label: "Storniert",
  },
};
interface OrderDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  orderId: string | null;
  onOrderUpdated?: () => void;
  onNotify?: (message: string, variant?: "info" | "success" | "error") => void;
  readOnly?: boolean;
}

export function OrderDetailDialog({
  open,
  onOpenChange,
  restaurantId,
  orderId,
  onOrderUpdated,
  onNotify,
  readOnly = false,
}: OrderDetailDialogProps) {
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [menuSearchQuery, setMenuSearchQuery] = useState("");
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountPercentage, setDiscountPercentage] = useState<number | null>(null);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [splitPayments, setSplitPayments] = useState<Array<{ method: string; amount: number }>>([]);
  const [splitAssignments, setSplitAssignments] = useState<string[][]>([]);
  const [splitTips, setSplitTips] = useState<number[]>([]);
  const [splitPaid, setSplitPaid] = useState<boolean[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [paymentDetailsDirty, setPaymentDetailsDirty] = useState(false);
  const [splitDetailsDirty, setSplitDetailsDirty] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [splitMethodMenuIndex, setSplitMethodMenuIndex] = useState<number | null>(null);
  const splitMethodMenuRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [paymentView, setPaymentView] = useState<"split" | "total">("total");
  // Terminal / Payment State
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [availableTerminals, setAvailableTerminals] = useState<PaymentTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string | null>(null);
  const [isStartingTerminalPayment, setIsStartingTerminalPayment] = useState(false);
  const [terminalPayments, setTerminalPayments] = useState<TerminalPayment[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);
  const terminalPaymentsRef = useRef<TerminalPayment[]>([]);
  const canMutate = !readOnly;

  useEffect(() => {
    terminalPaymentsRef.current = terminalPayments;
  }, [terminalPayments]);

  useEffect(() => {
    if (open && orderId) {
      loadOrder();
      loadMenuData();
      loadRestaurant();
    } else {
      setOrder(null);
      setTable(null);
      setRestaurant(null);
      setTerminalPayments([]);
      setAvailableTerminals([]);
      setShouldPollPayments(false);
      setPaymentDetailsDirty(false);
      setSplitDetailsDirty(false);
      setStatusMenuOpen(false);
      setSplitMethodMenuIndex(null);
    }
  }, [open, orderId, restaurantId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load terminal payments when dialog opens
  useEffect(() => {
    if (open && orderId && (order?.status === "served" || order?.status === "paid")) {
      loadTerminalPayments();
    }
  }, [open, orderId, order?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling for terminal payments — only after a payment is initiated
  const [shouldPollPayments, setShouldPollPayments] = useState(false);

  useEffect(() => {
    if (!shouldPollPayments || !open || !orderId) return;

    let intervalId: NodeJS.Timeout | null = null;
    let active = true;

    const poll = async () => {
      if (!active) return;
      try {
        setIsLoadingPayments(true);
        const payments = await terminalsApi.listOrderPayments(orderId);
        const prev = terminalPaymentsRef.current;
        setTerminalPayments(payments);
        terminalPaymentsRef.current = payments;

        const hasNew = payments.some((p) => p.status === "successful") &&
          !prev.some((p) => p.status === "successful");
        if (hasNew) await loadOrder();

        const stillActive = payments.some(
          (p) => p.status === "processing" || p.status === "pending"
        );
        if (!stillActive) {
          active = false;
          setShouldPollPayments(false);
          if (intervalId) clearInterval(intervalId);
        }
      } catch {
        // silently retry
      } finally {
        setIsLoadingPayments(false);
      }
    };

    poll();
    intervalId = setInterval(() => { if (active) poll(); }, 2000);
    return () => { active = false; if (intervalId) clearInterval(intervalId); };
  }, [shouldPollPayments, open, orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!statusMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!statusMenuRef.current || statusMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [statusMenuOpen]);

  useEffect(() => {
    if (splitMethodMenuIndex === null) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const current = splitMethodMenuRefs.current[splitMethodMenuIndex];
      if (current && current.contains(target)) return;
      setSplitMethodMenuIndex(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [splitMethodMenuIndex]);

  useEffect(() => {
    if (order) {
      setDiscountAmount(order.discount_amount || 0);
      setDiscountPercentage(order.discount_percentage || null);
      setTipAmount(order.tip_amount || 0);
      setPaymentMethod(order.payment_method || "cash");
      const initialSplits = order.split_payments || [];
      setPaymentView(initialSplits.length > 0 ? "split" : "total");
      setSplitPayments(initialSplits.map((split) => ({ method: split.method, amount: split.amount })));
      setSplitAssignments(initialSplits.map((split) => split.item_ids ?? []));
      setSplitTips(initialSplits.map((split) => split.tip_amount ?? 0));
      setSplitPaid(initialSplits.map((split) => split.is_paid ?? false));
      setPaymentDetailsDirty(false);
      setSplitDetailsDirty(false);
    }
  }, [order]);

  const resetSplits = () => {
    setSplitPayments([]);
    setSplitAssignments([]);
    setSplitTips([]);
    setSplitPaid([]);
    setSplitDetailsDirty(true);
  };

  const hasSplitData = () =>
    splitAssignments.some((list) => list.length > 0) ||
    splitTips.some((value) => value > 0) ||
    splitPaid.some(Boolean);

  useEffect(() => {
    if (!canMutate || !order || order.status !== "served" || (!paymentDetailsDirty && !splitDetailsDirty) || loading) return;
    const timeoutId = window.setTimeout(() => {
      handleSavePaymentDetails();
    }, 600);
    return () => window.clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canMutate,
    order,
    paymentDetailsDirty,
    splitDetailsDirty,
    discountAmount,
    discountPercentage,
    tipAmount,
    paymentMethod,
    splitPayments,
    splitAssignments,
    splitTips,
    splitPaid,
    loading,
  ]);

  const loadMenuData = async () => {
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
  };

  const loadRestaurant = async () => {
    try {
      const data = await restaurantsApi.get(restaurantId);
      setRestaurant(data);
      console.log("Restaurant geladen:", { sumup_enabled: data.sumup_enabled });
      // Lade SumUp Reader wenn aktiviert
      // DEAKTIVIERT FÜR ENTWICKLUNGSZWECKE: Reader-Verwaltung ausgeschaltet, nur Zahlungsverlauf wird getestet
      // if (data.sumup_enabled) {
      //   setIsLoadingReaders(true);
      //   try {
      //     const readers = await listReaders(restaurantId);
      //     console.log("SumUp Reader geladen:", readers);
      //     setSumupReaders(readers.filter((r) => r.status === "paired"));
      //     // Setze Standard-Reader falls vorhanden
      //     if (data.sumup_default_reader_id) {
      //       setSelectedReaderId(data.sumup_default_reader_id);
      //     } else if (readers.length > 0) {
      //       setSelectedReaderId(readers[0].id);
      //     }
      //   } catch (err: any) {
      //     console.error("Fehler beim Laden der SumUp Reader:", err);
      //     // Nicht kritisch - nur warnen, aber nicht die gesamte Komponente blockieren
      //     // Zeige eine Warnung, wenn es ein Konfigurationsproblem ist
      //     if (err?.status === 500 || err?.message?.includes("nicht konfiguriert")) {
      //       onNotify?.("SumUp ist nicht vollständig konfiguriert. Bitte kontaktieren Sie den Administrator.", "error");
      //     }
      //   } finally {
      //     setIsLoadingReaders(false);
      //   }
      // } else {
      //   console.log("SumUp ist für dieses Restaurant nicht aktiviert");
      // }
      
      // Load available terminals
      try {
        const terms = await terminalsApi.list();
        const active = terms.filter((t) => t.is_active);
        setAvailableTerminals(active);
        const def = active.find((t) => t.is_default);
        setSelectedTerminalId(def?.id ?? active[0]?.id ?? null);
      } catch {
        // terminals not configured
      }
    } catch (err) {
      console.error("Fehler beim Laden des Restaurants:", err);
    }
  };

  const loadTerminalPayments = async () => {
    if (!orderId || (order?.status !== "served" && order?.status !== "paid")) return;
    try {
      setIsLoadingPayments(true);
      const payments = await terminalsApi.listOrderPayments(orderId);
      setTerminalPayments(payments);
    } catch {
      // silently fail
    } finally {
      setIsLoadingPayments(false);
    }
  };

  const handleStartTerminalPayment = async () => {
    if (readOnly || !order || !selectedTerminalId) return;

    if (order.status !== "served" && order.status !== "paid") {
      onNotify?.("Zahlung ist erst verfügbar, wenn der Status auf 'Serviert' steht.", "error");
      return;
    }

    setIsStartingTerminalPayment(true);
    setError("");

    try {
      const baseTotal = Math.max(0, computedFinancials.subtotal - (discountAmount || 0));
      const amount = baseTotal + (tipAmount || 0);
      if (amount <= 0) {
        onNotify?.("Betrag muss größer als 0 sein.", "error");
        return;
      }

      const resp = await terminalsApi.initiatePayment(order.id, {
        terminal_id: selectedTerminalId,
        amount,
        currency: "EUR",
        description: `Bestellung ${order.order_number || order.id}`,
      });

      if (resp.status === "awaiting_confirmation") {
        onNotify?.("Bitte Zahlung am Terminal durchführen und dann hier bestätigen.", "info");
      } else {
        onNotify?.("Zahlung wurde am Terminal gestartet. Bitte warten...", "success");
        setShouldPollPayments(true);
      }

      setTimeout(async () => {
        await loadOrder();
        await loadTerminalPayments();
        onOrderUpdated?.();
      }, 1500);
    } catch (err: any) {
      const msg = err?.message || "Zahlung konnte nicht gestartet werden.";
      setError(msg);
      onNotify?.(msg, "error");
    } finally {
      setIsStartingTerminalPayment(false);
    }
  };

  const handleConfirmTerminalPayment = async (paymentId: string) => {
    try {
      await terminalsApi.confirmPayment(paymentId);
      onNotify?.("Zahlung bestätigt.", "success");
      await loadOrder();
      await loadTerminalPayments();
      onOrderUpdated?.();
    } catch (err: any) {
      onNotify?.(err?.message || "Bestätigung fehlgeschlagen.", "error");
    }
  };

  const handleCancelTerminalPayment = async (paymentId: string) => {
    try {
      await terminalsApi.cancelPayment(paymentId);
      onNotify?.("Zahlung abgebrochen.", "info");
      await loadTerminalPayments();
    } catch (err: any) {
      onNotify?.(err?.message || "Abbruch fehlgeschlagen.", "error");
    }
  };

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

  const loadOrder = async () => {
    if (!orderId) return;

    setLoading(true);
    setError("");
    try {
      const orderData = await ordersApi.get(restaurantId, orderId);
      setOrder(orderData);

      if (orderData.table_id) {
        try {
          const tableData = await tablesApi.get(restaurantId, orderData.table_id);
          setTable(tableData);
        } catch {
          // Table might not exist, ignore
        }
      }
    } catch (err) {
      console.error("Fehler beim Laden der Bestellung:", err);
      setError("Fehler beim Laden der Bestellung");
      onNotify?.("Fehler beim Laden der Bestellung", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (readOnly) return;
    if (!order) return;
    if (!confirmAction("Bestellung wirklich löschen?")) return;
    setDeleting(true);
    setError("");
    try {
      await ordersApi.delete(restaurantId, order.id);
      onNotify?.("Bestellung gelöscht.", "success");
      onOrderUpdated?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Fehler beim Löschen der Bestellung:", err);
      setError("Fehler beim Löschen der Bestellung.");
      onNotify?.("Fehler beim Löschen der Bestellung.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (readOnly) return;
    if (!order) return;

    setLoading(true);
    try {
      await ordersApi.update(restaurantId, order.id, { status: newStatus as any });
      const statusLabel = STATUS_META[newStatus as OrderStatus]?.label ?? newStatus;
      onNotify?.(`Status auf "${statusLabel}" geändert`, "success");
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error("Fehler beim Aktualisieren des Status:", err);
      onNotify?.("Fehler beim Aktualisieren des Status", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSavePaymentDetails = async () => {
    if (readOnly) return;
    if (!order) return;

    const currentDiscountAmount = discountAmount;
    const currentDiscountPercentage = discountPercentage;
    const currentTipAmount = tipAmount;
    const currentSplitDirty = splitDetailsDirty;

    setLoading(true);
    try {
      await ordersApi.update(restaurantId, order.id, {
        discount_amount: currentDiscountAmount,
        discount_percentage: currentDiscountPercentage,
        tip_amount: currentTipAmount,
        payment_method: paymentMethod === "terminal" ? null : paymentMethod || null,
        split_payments: computedSplitPayments.length > 0 ? buildSplitPayload() : null,
      });
      onNotify?.("Zahlungsdetails gespeichert", "success");
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error("Fehler beim Speichern der Zahlungsdetails:", err);
      onNotify?.("Fehler beim Speichern", "error");
    } finally {
      setLoading(false);
      if (
        currentDiscountAmount === discountAmount &&
        currentDiscountPercentage === discountPercentage &&
        currentTipAmount === tipAmount &&
        currentSplitDirty === splitDetailsDirty
      ) {
        setPaymentDetailsDirty(false);
        setSplitDetailsDirty(false);
      }
    }
  };

  const handleMarkAsPaid = async () => {
    if (readOnly) return;
    if (!order) return;

    // Check if we have split payments (either in state or in order)
    const hasSplitPayments =
      computedSplitPayments.length > 0 ||
      (order.split_payments && order.split_payments.length > 0);

    // Validate split payments if they exist
    if (hasSplitPayments && computedSplitPayments.length > 0) {
      const totalSplit = computedSplitPayments.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(totalSplit - computedFinancials.total) > 0.01) {
        onNotify?.(
          "Split-Payments stimmen nicht mit dem Gesamtbetrag überein (Trinkgeld wird separat gezählt).",
          "error",
        );
        return;
      }
    }

    const confirmed = confirmAction("Bestellung als bezahlt markieren?");
    if (!confirmed) return;

    setLoading(true);
    try {
      // Determine split payments to send
      let splitPaymentsToSend = null;
      if (hasSplitPayments) {
        if (computedSplitPayments.length > 0) {
          // Use current split payments from state
          splitPaymentsToSend = buildSplitPayload();
        } else if (order.split_payments && order.split_payments.length > 0) {
          // Keep existing split payments from order
          splitPaymentsToSend = order.split_payments;
        }
      }

      await ordersApi.update(restaurantId, order.id, {
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        discount_amount: discountAmount,
        discount_percentage: discountPercentage,
        tip_amount: tipAmount,
        payment_method: paymentMethod === "terminal" ? null : paymentMethod || order.payment_method || null,
        split_payments: splitPaymentsToSend,
      });
      onNotify?.("Bestellung als bezahlt markiert", "success");
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error("Fehler beim Markieren als bezahlt:", err);
      onNotify?.("Fehler beim Markieren als bezahlt", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (readOnly) return;
    if (!order) return;

    const confirmed = confirmAction("Möchten Sie diese Position wirklich löschen?");
    if (!confirmed) return;

    setLoading(true);
    try {
      await ordersApi.deleteItem(restaurantId, order.id, itemId);
      onNotify?.("Position gelöscht", "success");
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error("Fehler beim Löschen der Position:", err);
      onNotify?.("Fehler beim Löschen der Position", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddMenuItem = async (menuItem: MenuItem) => {
    if (readOnly) return;
    if (!order) return;

    const itemData: OrderItemCreate = {
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      item_description: menuItem.description || undefined,
      category: menuCategories.find((c) => c.id === menuItem.category_id)?.name || undefined,
      quantity: 1,
      unit_price: menuItem.price,
      tax_rate: menuItem.tax_rate ?? 0.19,
    };

    setLoading(true);
    try {
      await ordersApi.addItem(restaurantId, order.id, itemData);
      onNotify?.("Position hinzugefügt", "success");
      setIsAddingItem(false);
      setMenuSearchQuery("");
      setSelectedCategoryId(null);
      await loadOrder();
      onOrderUpdated?.();
    } catch (err) {
      console.error("Fehler beim Hinzufügen der Position:", err);
      onNotify?.("Fehler beim Hinzufügen der Position", "error");
    } finally {
      setLoading(false);
    }
  };

  const getItemTotalSum = () => {
    if (!order) return 0;
    return order.items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const buildComputedSplitPayments = () => {
    if (!order) return [];
    const itemTotalSum = getItemTotalSum();
    return splitPayments.map((payment, index) => {
      const assignedIds = splitAssignments[index] ?? [];
      const assignedTotal = order.items
        .filter((item) => assignedIds.includes(item.id))
        .reduce((sum, item) => sum + item.total_price, 0);
      const amount =
        itemTotalSum > 0
          ? Number(((assignedTotal / itemTotalSum) * computedFinancials.total).toFixed(2))
          : 0;
      return { ...payment, amount };
    });
  };

  const handleAddSplitPayment = () => {
    if (readOnly) return;
    setSplitPayments((prev) => [...prev, { method: "cash", amount: 0 }]);
    setSplitAssignments((prev) => [...prev, []]);
    setSplitTips((prev) => [...prev, 0]);
    setSplitPaid((prev) => {
      const next = [...prev];
      if (next.length === 1 && !next[0]) {
        next[0] = true;
      }
      next.push(false);
      return next;
    });
    setSplitDetailsDirty(true);
  };

  const handleRemoveSplitPayment = (index: number) => {
    if (readOnly) return;
    if (!confirmAction("Split-Zahlung wirklich entfernen?")) return;
    setSplitPayments((prev) => prev.filter((_, i) => i !== index));
    setSplitAssignments((prev) => prev.filter((_, i) => i !== index));
    setSplitTips((prev) => prev.filter((_, i) => i !== index));
    setSplitPaid((prev) => {
      const next = prev.filter((_, i) => i !== index);
      if (next.length === 1) {
        return [false];
      }
      return next;
    });
    setSplitDetailsDirty(true);
  };

  const updateSplitPayment = (index: number, field: "method", value: string) => {
    if (readOnly) return;
    const updated = [...splitPayments];
    updated[index] = { ...updated[index], [field]: value };
    setSplitPayments(updated);
    setSplitDetailsDirty(true);
  };

  const updateSplitTip = (index: number, value: number) => {
    if (readOnly) return;
    setSplitTips((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
    setSplitDetailsDirty(true);
  };

  const toggleSplitPaid = (index: number) => {
    if (readOnly) return;
    setSplitPaid((prev) => {
      const updated = [...prev];
      updated[index] = !updated[index];
      return updated;
    });
    setSplitDetailsDirty(true);
  };

  const toggleSplitItem = (paymentIndex: number, itemId: string) => {
    if (readOnly) return;
    setSplitAssignments((prev) => {
      const next = prev.map((list) => list.filter((id) => id !== itemId));
      const alreadyAssigned = (prev[paymentIndex] || []).includes(itemId);
      if (!alreadyAssigned) {
        next[paymentIndex] = [...(next[paymentIndex] || []), itemId];
      }
      return next;
    });
    setSplitDetailsDirty(true);
  };

  const isPaymentLocked = order?.payment_status === "paid";
  const hasSplitAssignments = splitAssignments.some((assignment) => assignment.length > 0);
  const computedSplitPayments = hasSplitAssignments ? buildComputedSplitPayments() : splitPayments;
  const totalSplitAmount = computedSplitPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const splitTotals = computedSplitPayments.map((payment, index) => {
    const tip = splitTips[index] || 0;
    const total = payment.amount + tip;
    return { ...payment, tip, total };
  });
  const totalSplitTip = splitTotals.reduce((sum, entry) => sum + entry.tip, 0);
  const totalSplitWithExtras = splitTotals.reduce((sum, entry) => sum + entry.total, 0);
  const computedFinancials = useMemo(() => {
    if (!order) {
      return {
        subtotal: 0,
        discountAmount: 0,
        tipAmount: 0,
        taxAmount: 0,
        total: 0,
      };
    }

    const toNumber = (value: unknown) =>
      typeof value === "number" && Number.isFinite(value) ? value : 0;

    const itemSubtotal = order.items.reduce((sum, item) => sum + toNumber(item.total_price), 0);
    const subtotalRaw = toNumber(order.subtotal);
    const subtotal = subtotalRaw > 0 || itemSubtotal === 0 ? subtotalRaw : itemSubtotal;

    const discountRaw = toNumber(order.discount_amount);
    const discountAmount = Math.min(Math.max(discountRaw, 0), Math.max(subtotal, 0));
    const tipAmount = toNumber(order.tip_amount);

    const taxRaw = toNumber(order.tax_amount);
    const rawTaxFromItems = order.items.reduce((sum, item) => {
      const totalPrice = toNumber(item.total_price);
      const taxRate = toNumber(item.tax_rate);
      if (totalPrice <= 0 || taxRate < 0) return sum;
      return sum + totalPrice * (taxRate / (1 + taxRate));
    }, 0);
    const discountRatio = itemSubtotal > 0 ? discountAmount / itemSubtotal : 0;
    const taxFromItems = Number(Math.max(0, rawTaxFromItems * (1 - discountRatio)).toFixed(2));
    const taxAmount = taxRaw > 0 || subtotal === 0 ? taxRaw : taxFromItems;

    const totalRaw = toNumber(order.total);
    const computedTotal = Number(Math.max(0, subtotal - discountAmount + tipAmount).toFixed(2));
    const total = totalRaw > 0 || subtotal === 0 ? totalRaw : computedTotal;

    return {
      subtotal,
      discountAmount,
      tipAmount,
      taxAmount,
      total,
    };
  }, [order]);
  const allSplitsPaid = splitPaid.length > 0 && splitPaid.every(Boolean);
  const canMarkPaid = paymentView === "split" ? allSplitsPaid : true;

  const buildSplitPayload = (): SplitPayment[] =>
    computedSplitPayments.map((payment, index) => ({
      method: payment.method,
      amount: payment.amount,
      tip_amount: splitTips[index] || 0,
      is_paid: splitPaid[index] || false,
      item_ids: splitAssignments[index] || [],
    }));

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  const _downloadPdf = async (endpoint: string, filename: string, label: string) => {
    if (!order) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        onNotify?.("Nicht angemeldet", "error");
        return;
      }

      const pdfUrl = getApiUrlForEndpoint(endpoint);
      const response = await fetch(pdfUrl, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          onNotify?.("Nicht angemeldet oder keine Berechtigung", "error");
          return;
        }
        const errorText = await response.text().catch(() => "Unbekannter Fehler");
        onNotify?.(`Fehler: ${response.status} ${errorText}`, "error");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onNotify?.(`${label} heruntergeladen`, "success");
    } catch {
      onNotify?.(`Fehler beim Download: ${label}`, "error");
    }
  };

  const handleDownloadInvoice = () =>
    _downloadPdf(
      `/invoices/${order?.id}/pdf`,
      `rechnung_${order?.order_number || order?.id}.pdf`,
      "Rechnung"
    );

  const handleDownloadKassenbeleg = () =>
    _downloadPdf(
      `/receipts/${order?.id}/kassenbeleg`,
      `kassenbeleg_${order?.order_number || order?.id}.pdf`,
      "Kassenbeleg"
    );

  const handleDownloadBewirtungsbeleg = () =>
    _downloadPdf(
      `/receipts/${order?.id}/bewirtungsbeleg`,
      `bewirtungsbeleg_${order?.order_number || order?.id}.pdf`,
      "Bewirtungsbeleg"
    );

  const [showBewirtungsForm, setShowBewirtungsForm] = useState(false);
  const [bewirtungsData, setBewirtungsData] = useState({
    anlass: "",
    teilnehmer: "",
    empfaenger_name: "",
    empfaenger_firma: "",
    empfaenger_strasse: "",
    empfaenger_plz: "",
    empfaenger_ort: "",
  });

  const handleDownloadBewirtungsrechnung = async () => {
    if (!order) return;
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (!token) {
        onNotify?.("Nicht angemeldet", "error");
        return;
      }

      const pdfUrl = getApiUrlForEndpoint(`/receipts/${order.id}/bewirtungsrechnung`);
      const response = await fetch(pdfUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(bewirtungsData),
      });

      if (!response.ok) {
        onNotify?.("Fehler beim Download der Bewirtungsrechnung", "error");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bewirtungsrechnung_${order.order_number || order.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onNotify?.("Bewirtungsrechnung heruntergeladen", "success");
      setShowBewirtungsForm(false);
    } catch {
      onNotify?.("Fehler beim Download der Bewirtungsrechnung", "error");
    }
  };

  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleCreateReceipt = async () => {
    if (!order || !restaurant) return;
    setReceiptLoading(true);
    try {
      const resp = await createReceipt({
        order_id: order.id,
        restaurant_name: restaurant.name || "",
        restaurant_address: restaurant.address || "",
        restaurant_tax_number: "",
      });
      if (resp.public_url) {
        window.open(resp.public_url, "_blank");
      }
      onNotify?.(resp.status === "already_exists" ? "eReceipt bereits vorhanden" : "eReceipt erstellt", "success");
    } catch (err: any) {
      onNotify?.(err?.message || "eReceipt-Erstellung fehlgeschlagen", "error");
    } finally {
      setReceiptLoading(false);
    }
  };

  if (!order && !loading) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>
                Bestellung {order?.order_number || (order ? `#${order.id}` : "")}
              </DialogTitle>
              <DialogDescription>
                Bestelldetails und Abrechnung
              </DialogDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                onClick={handleDownloadKassenbeleg}
                variant="outline"
                className="bg-muted border-input text-foreground hover:bg-accent min-h-[32px] gap-1.5 text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                Kassenbeleg
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadBewirtungsbeleg}
                variant="outline"
                className="bg-muted border-input text-foreground hover:bg-accent min-h-[32px] gap-1.5 text-xs"
              >
                <Receipt className="w-3.5 h-3.5" />
                Bewirtungsbeleg
              </Button>
              <Button
                size="sm"
                onClick={() => setShowBewirtungsForm(!showBewirtungsForm)}
                variant="outline"
                className={`bg-muted border-input text-foreground hover:bg-accent min-h-[32px] gap-1.5 text-xs ${showBewirtungsForm ? "ring-1 ring-primary" : ""}`}
              >
                <FileText className="w-3.5 h-3.5" />
                Bewirtungsrechnung
              </Button>
              {order?.payment_status === "paid" && (
                <Button
                  size="sm"
                  onClick={handleCreateReceipt}
                  disabled={receiptLoading}
                  variant="outline"
                  className="bg-muted border-input text-foreground hover:bg-accent min-h-[32px] gap-1.5 text-xs"
                >
                  {receiptLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileText className="w-3.5 h-3.5" />
                  )}
                  eReceipt
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        {showBewirtungsForm && (
          <div className="mx-4 md:mx-6 rounded-lg border border-primary/30 bg-card/80 p-4 space-y-3">
            <p className="text-sm font-medium">Bewirtungsrechnung erstellen</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Anlass der Bewirtung</label>
                <Input
                  value={bewirtungsData.anlass}
                  onChange={(e) => setBewirtungsData({ ...bewirtungsData, anlass: e.target.value })}
                  placeholder="z.B. Geschäftsessen, Projektbesprechung"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Bewirtete Personen</label>
                <Input
                  value={bewirtungsData.teilnehmer}
                  onChange={(e) => setBewirtungsData({ ...bewirtungsData, teilnehmer: e.target.value })}
                  placeholder="Namen der Teilnehmer"
                  className="mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground font-medium pt-1">Rechnungsempfänger</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Firma</label>
                <Input
                  value={bewirtungsData.empfaenger_firma}
                  onChange={(e) => setBewirtungsData({ ...bewirtungsData, empfaenger_firma: e.target.value })}
                  placeholder="Firmenname"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input
                  value={bewirtungsData.empfaenger_name}
                  onChange={(e) => setBewirtungsData({ ...bewirtungsData, empfaenger_name: e.target.value })}
                  placeholder="Vor- und Nachname"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Straße</label>
                <Input
                  value={bewirtungsData.empfaenger_strasse}
                  onChange={(e) => setBewirtungsData({ ...bewirtungsData, empfaenger_strasse: e.target.value })}
                  placeholder="Straße und Hausnummer"
                  className="mt-1"
                />
              </div>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">PLZ</label>
                  <Input
                    value={bewirtungsData.empfaenger_plz}
                    onChange={(e) => setBewirtungsData({ ...bewirtungsData, empfaenger_plz: e.target.value })}
                    placeholder="PLZ"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Ort</label>
                  <Input
                    value={bewirtungsData.empfaenger_ort}
                    onChange={(e) => setBewirtungsData({ ...bewirtungsData, empfaenger_ort: e.target.value })}
                    placeholder="Ort"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" onClick={() => setShowBewirtungsForm(false)}>
                Abbrechen
              </Button>
              <Button size="sm" onClick={handleDownloadBewirtungsrechnung} className="gap-1.5">
                <Download className="w-3.5 h-3.5" />
                PDF erstellen
              </Button>
            </div>
          </div>
        )}

        {loading && !order ? (
          <div className="py-8 text-center text-muted-foreground">Lade Bestellung...</div>
        ) : error ? (
          <div className="py-8 text-center text-red-400">{error}</div>
        ) : order ? (
          <div className="space-y-6 px-4 md:px-6">
            {/* Grundinformationen */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1.6fr] gap-4">
              <div className="bg-card/50 rounded-md p-3">
                <div className="text-sm text-muted-foreground mb-1">Tisch</div>
                <div className="flex items-center gap-2 text-foreground">
                  <TableIcon className="w-4 h-4" />
                  {table ? `${table.number}` : order.table_id ? `#${order.table_id}` : "Kein Tisch"}
                </div>
              </div>
              {order.party_size && (
                <div className="bg-card/50 rounded-md p-3">
                  <div className="text-sm text-muted-foreground mb-1">Personen</div>
                  <div className="flex items-center gap-2 text-foreground">
                    <Users className="w-4 h-4" />
                    {order.party_size}
                  </div>
                </div>
              )}
              <div className="bg-card/50 rounded-md p-3">
                <div className="text-sm text-muted-foreground mb-1">Status</div>
                <div className="relative w-full flex" ref={statusMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!canMutate) return;
                      setStatusMenuOpen((prev) => !prev);
                    }}
                    disabled={loading || !canMutate}
                    className="w-full rounded-md border border-border bg-card text-foreground px-3 py-1 text-sm shadow-inner flex items-center justify-between gap-3 hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[32px] touch-manipulation"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${
                          STATUS_META[order.status]?.tone ?? "border-white/10 bg-black/10"
                        }`}
                      >
                        {(() => {
                          const meta = STATUS_META[order.status];
                          const StatusIcon = meta?.Icon ?? Clock;
                          return <StatusIcon className="w-3.5 h-3.5 text-foreground dark:text-current" />;
                        })()}
                      </span>
                      <span className="truncate">{STATUS_META[order.status]?.label ?? order.status}</span>
                    </div>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${
                        statusMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {canMutate && statusMenuOpen && (
                    <div className="absolute right-0 mt-1 w-60 rounded-lg border border-border bg-background shadow-xl z-[50] max-h-[70vh] overflow-auto">
                      {Object.entries(STATUS_META).map(([value, meta]) => {
                        const Icon = meta.Icon;
                        const active = order.status === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => {
                              setStatusMenuOpen(false);
                              handleUpdateStatus(value);
                            }}
                            className={`w-full px-3 py-3 text-sm flex items-center justify-between transition-colors ${
                              active
                                ? "font-semibold text-foreground dark:text-white border-l-2 border-primary bg-card/80"
                                : "text-foreground hover:bg-accent"
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-md border ${meta.tone}`}>
                                <Icon className={`w-4 h-4 ${active ? "text-foreground dark:text-current" : ""}`} />
                              </span>
                              {meta.label}
                            </span>
                            {active && <Check className="w-4 h-4 text-primary" />}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bestellpositionen */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Bestellpositionen
                </h3>
                {canMutate && order.status !== "paid" && order.status !== "canceled" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setIsAddingItem(!isAddingItem)}
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {isAddingItem ? "Abbrechen" : "Hinzufügen"}
                  </Button>
                )}
              </div>

              {/* Menü-Auswahl */}
              {canMutate && isAddingItem && order.status !== "paid" && order.status !== "canceled" && (
                <div className="mb-4 p-4 bg-card/50 border border-border rounded-md">
                  <div className="mb-3">
                    <div className="relative mb-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Artikel suchen..."
                        value={menuSearchQuery}
                        onChange={(e) => setMenuSearchQuery(e.target.value)}
                        className="pl-10 bg-muted border-input text-foreground"
                        disabled={loading}
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setSelectedCategoryId(null)}
                        className={`px-3 py-1 rounded text-sm ${
                          selectedCategoryId === null
                            ? "bg-primary text-white"
                            : "bg-muted text-muted-foreground hover:bg-accent"
                        }`}
                        disabled={loading}
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
                                ? "bg-primary text-white"
                                : "bg-muted text-muted-foreground hover:bg-accent"
                            }`}
                            disabled={loading}
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
                          disabled={loading}
                          className="w-full text-left p-3 bg-muted hover:bg-accent rounded-md border border-input hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              {order.items.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-border rounded-md">
                  Keine Positionen vorhanden
                </div>
              ) : (
                <div className="space-y-2 border border-border rounded-md p-4">
                  {order.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-card/50 rounded-md p-3 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{item.item_name}</div>
                        {item.item_description && (
                          <div className="text-sm text-muted-foreground">{item.item_description}</div>
                        )}
                        <div className="text-sm text-muted-foreground mt-1">
                          {item.quantity} × {formatCurrency(item.unit_price)} = {formatCurrency(item.total_price)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-foreground font-medium">
                          {formatCurrency(item.total_price)}
                        </span>
                        {canMutate && order.status !== "paid" && order.status !== "canceled" && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteItem(item.id)}
                            disabled={loading}
                            className="shadow-none"
                            title="Position löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rabatt/Trinkgeld Bearbeitung */}
            {order.status === "served" && (
              <div className="bg-card/50 border border-border rounded-md p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground">Rabatt & Trinkgeld</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Rabatt (€)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={discountAmount || ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const nextAmount = raw === "" ? 0 : Number.parseFloat(raw) || 0;
                          setDiscountAmount(nextAmount);
                          setPaymentDetailsDirty(true);
                          if (!order || computedFinancials.subtotal <= 0) {
                            setDiscountPercentage(null);
                            return;
                          }
                          const nextPercent = (nextAmount / computedFinancials.subtotal) * 100;
                          setDiscountPercentage(Number(nextPercent.toFixed(2)));
                        }}
                        className="bg-muted border-input text-foreground"
                        placeholder="0.00"
                        disabled={isPaymentLocked || !canMutate}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Rabatt (%)</label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={discountPercentage || ""}
                        onChange={(e) => {
                          const raw = e.target.value;
                          if (raw === "") {
                            setDiscountPercentage(null);
                            setDiscountAmount(0);
                            setPaymentDetailsDirty(true);
                            return;
                          }
                          const nextPercent = Number.parseFloat(raw) || 0;
                          setDiscountPercentage(nextPercent);
                          setPaymentDetailsDirty(true);
                          if (!order || computedFinancials.subtotal <= 0) {
                            setDiscountAmount(0);
                            return;
                          }
                          const nextAmount = (computedFinancials.subtotal * nextPercent) / 100;
                          setDiscountAmount(Number(nextAmount.toFixed(2)));
                        }}
                        className="bg-muted border-input text-foreground"
                        placeholder="0"
                        disabled={isPaymentLocked || !canMutate}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Trinkgeld (€)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tipAmount || ""}
                        onChange={(e) => {
                          setTipAmount(parseFloat(e.target.value) || 0);
                          setPaymentDetailsDirty(true);
                        }}
                        className="bg-muted border-input text-foreground"
                        placeholder="0.00"
                        disabled={isPaymentLocked || paymentView === "split" || !canMutate}
                      />
                  </div>
                </div>
              </div>
            )}

            {/* Zusammenfassung */}
            <div className="bg-card/50 border border-border rounded-md p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-foreground">Zusammenfassung</h3>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Zwischensumme:</span>
                  <span>{formatCurrency(computedFinancials.subtotal)}</span>
                </div>
                {computedFinancials.discountAmount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-red-400">
                      Rabatt
                      {order.discount_percentage ? ` (${order.discount_percentage}%)` : ""}:
                    </span>
                    <span className="text-red-400">-{formatCurrency(computedFinancials.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-primary">MwSt. (inkl.):</span>
                  <span className="text-foreground">{formatCurrency(computedFinancials.taxAmount)}</span>
                </div>
                {(paymentView === "split" ? totalSplitTip : tipAmount) > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span className="text-green-400">Trinkgeld:</span>
                    <span className="text-green-400">
                      +{formatCurrency(paymentView === "split" ? totalSplitTip : tipAmount)}
                    </span>
                  </div>
                )}
                <div className="space-y-1 border-t border-border pt-2 mt-2">
                  <div className="flex justify-between text-lg font-bold text-foreground">
                    <span>Gesamt inkl. Trinkgeld:</span>
                    <span>
                      {formatCurrency(computedFinancials.total - (tipAmount || 0) + totalSplitTip)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Gesamt exkl. Trinkgeld:</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(computedFinancials.total - (tipAmount || 0))}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
                  <span>Zahlungsstatus:</span>
                  <span
                    className={
                      order.payment_status === "paid"
                        ? "text-green-400"
                        : order.payment_status === "partial"
                        ? "text-yellow-400"
                        : "text-red-400"
                    }
                  >
                    {order.payment_status === "paid"
                      ? "Bezahlt"
                      : order.payment_status === "partial"
                      ? "Teilweise bezahlt"
                      : "Offen"}
                  </span>
                </div>
                
                {/* Kartenzahlungen */}
                {terminalPayments.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="text-xs text-muted-foreground mb-2">Kartenzahlungen</div>
                    <div className="space-y-2">
                      {terminalPayments.map((payment) => {
                        const isFailed = payment.status === "failed" || payment.status === "canceled";
                        const isProcessing = payment.status === "processing" || payment.status === "pending";
                        const isAwaiting = payment.status === "awaiting_confirmation";

                        if (!isFailed && !isProcessing && !isAwaiting) return null;

                        return (
                          <div
                            key={payment.id}
                            className={`p-2 rounded-md border ${
                              isFailed
                                ? "bg-red-900/20 border-red-500/50"
                                : isAwaiting
                                ? "bg-amber-900/20 border-amber-500/50"
                                : isProcessing
                                ? "bg-yellow-900/20 border-yellow-500/50"
                                : "bg-card/50 border-input"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  {isFailed ? (
                                    <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                  ) : isAwaiting ? (
                                    <CreditCard className="w-4 h-4 text-amber-400 flex-shrink-0" />
                                  ) : (
                                    <Loader2 className="w-4 h-4 text-yellow-400 animate-spin flex-shrink-0" />
                                  )}
                                  <span className={`text-xs font-medium ${
                                    isFailed ? "text-red-300" : isAwaiting ? "text-amber-300" : "text-yellow-300"
                                  }`}>
                                    {isFailed ? "Fehlgeschlagen" : isAwaiting ? "Warte auf Bestätigung" : "In Bearbeitung"}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {PROVIDER_LABELS[payment.provider] || payment.provider}
                                  </span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {payment.initiated_at ? format(new Date(payment.initiated_at), "dd.MM.yyyy HH:mm", { locale: de }) : "-"}
                                </div>
                              </div>
                              <div className="text-right space-y-1">
                                <div className="text-sm font-semibold text-foreground">
                                  {new Intl.NumberFormat("de-DE", { style: "currency", currency: payment.currency || "EUR" }).format(payment.amount)}
                                </div>
                                {isAwaiting && (
                                  <div className="flex gap-1">
                                    <Button size="sm" className="h-6 text-[10px] px-2 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleConfirmTerminalPayment(payment.id)}>
                                      Bestätigen
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-300" onClick={() => handleCancelTerminalPayment(payment.id)}>
                                      Abbrechen
                                    </Button>
                                  </div>
                                )}
                                {isProcessing && (
                                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-red-300" onClick={() => handleCancelTerminalPayment(payment.id)}>
                                    Abbrechen
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Zahlungsdetails */}
                {order.status === "served" && (
                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Zahlung</span>
                      <div className="inline-flex items-center rounded-lg border border-border/70 bg-card/90 p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isPaymentLocked && paymentView !== "total") {
                              if (hasSplitData() && !confirmAction("Split-Daten gehen verloren. Wechseln?")) {
                                return;
                              }
                              resetSplits();
                            }
                            setPaymentView("total");
                          }}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border min-h-[30px] ${
                            paymentView === "total"
                              ? "bg-primary text-white border-primary/80 shadow-inner"
                              : "text-foreground border-transparent hover:bg-accent"
                          }`}
                        >
                          <Euro className="w-4 h-4" />
                          Gesamtrechnung
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPaymentView("split");
                            if (!isPaymentLocked && splitPayments.length === 0) {
                              handleAddSplitPayment();
                            }
                            if (!isPaymentLocked && tipAmount !== 0) {
                              setTipAmount(0);
                              setPaymentDetailsDirty(true);
                            }
                          }}
                          disabled={order.items.length <= 1}
                          className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border min-h-[30px] ${
                            paymentView === "split"
                              ? "bg-primary text-white border-primary/80 shadow-inner"
                              : "text-foreground border-transparent hover:bg-accent"
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          <Users className="w-4 h-4" />
                          Split
                        </button>
                      </div>
                    </div>

                    {paymentView === "total" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Zahlungsart:</span>
                          <div className="inline-flex items-center rounded-lg border border-border/70 bg-card/90 p-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (isPaymentLocked) return;
                                setPaymentMethod("cash");
                                setPaymentDetailsDirty(true);
                              }}
                              disabled={isPaymentLocked || !canMutate}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border min-h-[30px] ${
                                paymentMethod === "cash"
                                  ? "bg-primary text-white border-primary/80 shadow-inner"
                                  : "text-foreground border-transparent hover:bg-accent"
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              <Banknote className="w-4 h-4" />
                              Bar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isPaymentLocked) return;
                                setPaymentMethod("card");
                                setPaymentDetailsDirty(true);
                              }}
                              disabled={isPaymentLocked || !canMutate}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border min-h-[30px] ${
                                paymentMethod === "card"
                                  ? "bg-primary text-white border-primary/80 shadow-inner"
                                  : "text-foreground border-transparent hover:bg-accent"
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                            >
                              <CreditCard className="w-4 h-4" />
                              Karte
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isPaymentLocked) return;
                                if (availableTerminals.length === 0) {
                                  onNotify?.("Keine Kartenterminals eingerichtet. Bitte unter Finanzen > Kartenlesegeräte einrichten.", "error");
                                  return;
                                }
                                setPaymentMethod("terminal");
                                setPaymentDetailsDirty(true);
                              }}
                              disabled={isPaymentLocked || availableTerminals.length === 0 || !canMutate}
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-md text-sm border min-h-[30px] ${
                                paymentMethod === "terminal"
                                  ? "bg-primary text-white border-primary/80 shadow-inner"
                                  : availableTerminals.length > 0
                                  ? "text-foreground border-transparent hover:bg-accent"
                                  : "text-muted-foreground border-transparent opacity-50 cursor-not-allowed"
                              } disabled:opacity-60 disabled:cursor-not-allowed`}
                              title={availableTerminals.length === 0 ? "Keine Kartenterminals eingerichtet" : ""}
                            >
                              <Nfc className="w-4 h-4" />
                              Kartenterminal
                            </button>
                          </div>
                        </div>
                        
                        {paymentMethod === "terminal" && availableTerminals.length > 0 && (
                          <div className="space-y-3 p-3 bg-background/50 border border-input rounded-md">
                            {availableTerminals.length > 1 && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1.5">Terminal auswählen</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {availableTerminals.map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => setSelectedTerminalId(t.id)}
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
                                        selectedTerminalId === t.id
                                          ? "bg-primary text-white border-primary"
                                          : "text-foreground border-input hover:bg-accent"
                                      }`}
                                    >
                                      <CreditCard className="w-3 h-3" />
                                      {t.name}
                                      <span className="text-[10px] opacity-70">{PROVIDER_LABELS[t.provider]}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            <Button
                              onClick={handleStartTerminalPayment}
                              disabled={!canMutate || isStartingTerminalPayment || isPaymentLocked || !selectedTerminalId || (order?.status !== "served" && order?.status !== "paid")}
                              className="w-full bg-primary hover:bg-primary/90 text-white"
                            >
                              {isStartingTerminalPayment ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  Zahlung wird gestartet...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="w-4 h-4 mr-2" />
                                  Zahlung starten
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {paymentView === "split" && (
                      <div className="space-y-3 p-3 bg-background/50 border border-input rounded-md mb-3">
                        {/* Split Payment */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="text-xs text-muted-foreground">Split Payment</label>
                              <Button
                                size="sm"
                                variant="outline"
                              onClick={handleAddSplitPayment}
                                disabled={!canMutate || isPaymentLocked || (splitPaid.length > 0 && splitPaid.every(Boolean))}
                                className="bg-primary border-primary text-white hover:bg-primary text-xs shadow-none hover:shadow-[0_10px_24px_rgba(59,130,246,0.35)] disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Hinzufügen
                              </Button>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                              <span>Gesamt (Splits):</span>
                              <span className="text-foreground">{formatCurrency(totalSplitWithExtras)}</span>
                            </div>
                            {splitPayments.length > 0 && (
                              <div className="space-y-3">
                                {splitPayments.map((payment, index) => {
                                  const assignedIds = splitAssignments[index] ?? [];
                                  const hasSelection = assignedIds.length > 0;
                                  const computedAmount = computedSplitPayments[index]?.amount ?? 0;
                                  const tip = splitTips[index] || 0;
                                  const splitTotal = computedAmount + tip;
                                  const isPaid = splitPaid[index] === true;
                                  const paidItemIds = new Set(
                                    splitAssignments
                                      .filter((_, paidIndex) => splitPaid[paidIndex])
                                      .flat(),
                                  );
                                  const assignedItems = order.items.filter((item) =>
                                    assignedIds.includes(item.id),
                                  );
                                  const assignedSubtotal = assignedItems.reduce(
                                    (sum, item) => sum + item.total_price,
                                    0,
                                  );
                                  const assignedTaxRaw = assignedItems.reduce((sum, item) => {
                                    const rate = item.tax_rate || 0;
                                    return sum + item.total_price * (rate / (1 + rate));
                                  }, 0);
                                  const taxShare =
                                    assignedSubtotal > 0
                                      ? assignedTaxRaw * (computedAmount / assignedSubtotal)
                                      : 0;
                                  const discountShare =
                                    computedFinancials.discountAmount > 0 && computedFinancials.total > 0
                                      ? (computedFinancials.discountAmount * computedAmount) /
                                        computedFinancials.total
                                      : 0;
                                  return (
                                    <div
                                      key={index}
                                      className={`rounded-md border p-3 space-y-2 ${
                                        isPaid
                                          ? "border-emerald-600/60 bg-emerald-900/10 text-muted-foreground"
                                          : "border-amber-600/40 bg-amber-900/10 text-foreground"
                                      }`}
                                    >
                                      <div className="space-y-2">
                                        <div className="flex gap-2 items-center justify-end">
                                          <span
                                            className={`text-[11px] px-2 py-1 rounded-full border ${
                                              isPaid
                                                ? "border-emerald-600/60 bg-emerald-900/40 text-emerald-200"
                                                : "border-amber-600/60 bg-amber-900/40 text-amber-200"
                                            }`}
                                          >
                                            {isPaid ? "Bezahlt" : "Offen"}
                                          </span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => toggleSplitPaid(index)}
                                            disabled={!canMutate || isPaymentLocked || !hasSelection}
                                            className={`shadow-none ${
                                              isPaid
                                                ? "bg-emerald-900/30 border-emerald-600 text-emerald-200 hover:bg-emerald-900/50 hover:border-emerald-500"
                                                : "bg-amber-900/30 border-amber-600 text-amber-200 hover:bg-amber-900/50 hover:border-amber-500"
                                            } disabled:opacity-60 disabled:cursor-not-allowed`}
                                          >
                                            {isPaid ? "Als offen" : "Als bezahlt"}
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRemoveSplitPayment(index)}
                                            disabled={!canMutate || isPaymentLocked}
                                            className="bg-red-900/30 border-red-600 text-red-200 shadow-none hover:bg-red-900/50 hover:border-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                                            title="Split entfernen"
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                        <div className="space-y-1">
                                          {order.items.map((item) => {
                                            const active = assignedIds.includes(item.id);
                                            const alreadyPaid = paidItemIds.has(item.id) && !active;
                                            const locked = isPaymentLocked || isPaid || alreadyPaid;
                                            return (
                                              <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => {
                                                  if (locked) return;
                                                  toggleSplitItem(index, item.id);
                                                }}
                                                className={`w-full px-3 py-2 rounded text-sm min-h-[40px] flex items-center justify-between gap-2 transition-colors ${
                                                  active
                                                    ? "bg-muted/80 text-foreground"
                                                    : locked
                                                    ? "bg-emerald-900/20 text-emerald-200 border border-emerald-700/40 cursor-not-allowed"
                                                    : "bg-background/40 text-muted-foreground hover:bg-accent/70"
                                                }`}
                                              >
                                                <span className="truncate">
                                                  {item.quantity}× {item.item_name}
                                                </span>
                                                <span className="text-muted-foreground">
                                                  {formatCurrency(item.total_price)}
                                                </span>
                                                <span
                                                  className={`text-[11px] px-2 py-1 rounded-full border ${
                                                    alreadyPaid
                                                      ? "border-emerald-600/60 bg-emerald-900/40 text-emerald-200"
                                                      : "border-transparent bg-transparent text-transparent"
                                                  }`}
                                                >
                                                  Bezahlt
                                                </span>
                                                {active && (
                                                  <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                                )}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                          <div
                                            className="relative flex-1"
                                            ref={(el) => {
                                              splitMethodMenuRefs.current[index] = el;
                                            }}
                                          >
                                            <div className="text-[11px] text-muted-foreground mb-1">Zahlungsart</div>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (!canMutate) return;
                                                setSplitMethodMenuIndex((prev) => (prev === index ? null : index));
                                              }}
                                            disabled={!canMutate || isPaymentLocked || !hasSelection || isPaid}
                                            className="w-full flex items-center justify-between gap-2 px-2 py-1 bg-muted border border-input rounded text-foreground text-sm hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[32px] disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                              <span className="flex items-center gap-2">
                                                {payment.method === "card" ? (
                                                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                ) : (
                                                  <Banknote className="w-4 h-4 text-muted-foreground" />
                                                )}
                                                <span>{payment.method === "card" ? "Karte" : "Bar"}</span>
                                              </span>
                                              <ChevronDown
                                                className={`w-4 h-4 text-muted-foreground transition-transform ${
                                                  splitMethodMenuIndex === index ? "rotate-180" : ""
                                                }`}
                                              />
                                            </button>
                                            {hasSelection && splitMethodMenuIndex === index && (
                                              <div className="absolute left-0 mt-1 w-full rounded-md border border-border bg-background shadow-xl z-[50] overflow-hidden">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    updateSplitPayment(index, "method", "cash");
                                                    setSplitMethodMenuIndex(null);
                                                  }}
                                                  className={`w-full px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                                                    payment.method === "cash"
                                                      ? "font-semibold text-white border-l-2 border-primary bg-card/80"
                                                      : "text-foreground hover:bg-accent"
                                                  }`}
                                                >
                                                  <span className="flex items-center gap-2">
                                                    <Banknote className="w-4 h-4 text-muted-foreground" />
                                                    Bar
                                                  </span>
                                                  {payment.method === "cash" && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                  )}
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    updateSplitPayment(index, "method", "card");
                                                    setSplitMethodMenuIndex(null);
                                                  }}
                                                  className={`w-full px-3 py-2 text-sm flex items-center justify-between transition-colors ${
                                                    payment.method === "card"
                                                      ? "font-semibold text-white border-l-2 border-primary bg-card/80"
                                                      : "text-foreground hover:bg-accent"
                                                  }`}
                                                >
                                                  <span className="flex items-center gap-2">
                                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                    Karte
                                                  </span>
                                                  {payment.method === "card" && (
                                                    <Check className="w-4 h-4 text-primary" />
                                                  )}
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      <div>
                                        <label className="block text-[11px] text-muted-foreground mb-1">Trinkgeld (€)</label>
                                        <Input
                                          type="number"
                                            min="0"
                                            step="0.01"
                                            value={tip || ""}
                                            onChange={(e) =>
                                              updateSplitTip(index, Number.parseFloat(e.target.value) || 0)
                                            }
                                            className="bg-muted border-input text-foreground h-8 text-sm"
                                            placeholder="0.00"
                                          disabled={!canMutate || isPaymentLocked || !hasSelection || isPaid}
                                          />
                                        </div>
                                        {hasSelection ? (
                                          <>
                                            <div className="space-y-1 text-xs text-muted-foreground">
                                            <div className="flex justify-between">
                                              <span>Preis:</span>
                                              <span className="text-foreground">{formatCurrency(computedAmount)}</span>
                                            </div>
                                            {discountShare > 0 && (
                                              <div className="flex justify-between">
                                                <span className="text-red-400">Rabatt (anteilig):</span>
                                                <span className="text-red-300">
                                                  -{formatCurrency(discountShare)}
                                                </span>
                                              </div>
                                            )}
                                            <div className="flex justify-between">
                                              <span className="text-primary">MwSt. (inkl.):</span>
                                              <span className="text-foreground">{formatCurrency(taxShare)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-green-400">Trinkgeld:</span>
                                              <span className="text-green-300">+{formatCurrency(tip)}</span>
                                            </div>
                                            </div>
                                            <div className="flex justify-between text-sm font-semibold text-foreground border-t border-border pt-2">
                                              <span>Summe:</span>
                                              <span>{formatCurrency(splitTotal)}</span>
                                            </div>
                                          </>
                                        ) : (
                                          <div className="text-xs text-muted-foreground italic">
                                            Bitte zuerst Positionen auswahlen.
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                      </div>
                    )}

                    {paymentView === "total" && (paymentMethod || order.payment_method) && !splitPayments.length && (
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Zahlungsmethode:</span>
                        <span className="text-muted-foreground">
                          {(paymentMethod || order.payment_method) === "cash"
                            ? "Bar"
                            : (paymentMethod || order.payment_method) === "card"
                            ? "Karte"
                            : (paymentMethod || order.payment_method) === "terminal"
                            ? "Kartenterminal"
                            : (paymentMethod || order.payment_method) === "sumup_card"
                            ? "SumUp Terminal"
                            : (paymentMethod || order.payment_method)?.includes("_card")
                            ? "Kartenterminal"
                            : (paymentMethod || order.payment_method)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Notizen */}
            {(order.notes || order.special_requests) && (
              <div>
                {order.notes && (
                  <div className="mb-3">
                    <h4 className="text-sm font-medium text-muted-foreground mb-1 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Notizen
                    </h4>
                    <div className="text-muted-foreground text-sm bg-card/50 rounded-md p-3">
                      {order.notes}
                    </div>
                  </div>
                )}
                {order.special_requests && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-1">
                      Besondere Wünsche
                    </h4>
                    <div className="text-muted-foreground text-sm bg-card/50 rounded-md p-3">
                      {order.special_requests}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 py-2 border-t border-border">
              {canMutate && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleDeleteOrder}
                  disabled={loading || deleting}
                  className="shadow-none"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Löschen
                </Button>
              )}
              <div className="ml-auto flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="gap-2"
                >
                  <X className="w-4 h-4" />
                  Schließen
                </Button>
                {canMutate && order.status !== "paid" && order.status !== "canceled" && (
                  <>
                    {order.status === "open" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus("sent_to_kitchen")}
                        disabled={loading}
                        className="bg-violet-600 text-white border border-violet-600 shadow-none hover:bg-violet-600 hover:border-violet-600 hover:shadow-[0_12px_32px_rgba(139,92,246,0.35)]"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        An Küche senden
                      </Button>
                    )}
                    {order.status === "sent_to_kitchen" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus("in_preparation")}
                        disabled={loading}
                        className="bg-yellow-600 text-white border border-yellow-600 shadow-none hover:bg-yellow-600 hover:border-yellow-600 hover:shadow-[0_12px_32px_rgba(234,179,8,0.35)]"
                      >
                        <Clock className="w-4 h-4 mr-2" />
                        In Zubereitung
                      </Button>
                    )}
                    {order.status === "in_preparation" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus("ready")}
                        disabled={loading}
                        className="bg-emerald-600 text-white border border-emerald-600 shadow-none hover:bg-emerald-600 hover:border-emerald-600 hover:shadow-[0_12px_32px_rgba(16,185,129,0.35)]"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Als fertig markieren
                      </Button>
                    )}
                    {order.status === "ready" && (
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus("served")}
                        disabled={loading}
                        className="bg-green-600 text-white border border-green-600 shadow-none hover:bg-green-600 hover:border-green-600 hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)]"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Als serviert markieren
                      </Button>
                    )}
                    {order.status === "served" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleMarkAsPaid}
                        disabled={loading || !canMarkPaid}
                        className="bg-green-600 text-white border border-green-600 shadow-none hover:bg-green-600 hover:border-green-600 hover:shadow-[0_12px_32px_rgba(34,197,94,0.35)]"
                      >
                        <Euro className="w-4 h-4 mr-2" />
                        Als bezahlt markieren
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Zeitstempel */}
            <div className="text-xs text-muted-foreground border-t border-border pt-3">
              {order.paid_at ? (
                <div className="mb-1">
                  Eröffnet: {format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", { locale: de })} - Bezahlt:{" "}
                  {format(parseISO(order.paid_at), "dd.MM.yyyy HH:mm", { locale: de })}
                </div>
              ) : (
                <div className="mb-1">
                  Eröffnet: {format(parseISO(order.opened_at), "dd.MM.yyyy HH:mm", { locale: de })}
                </div>
              )}
              {order.closed_at && (
                <div>Geschlossen: {format(parseISO(order.closed_at), "dd.MM.yyyy HH:mm", { locale: de })}</div>
              )}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
