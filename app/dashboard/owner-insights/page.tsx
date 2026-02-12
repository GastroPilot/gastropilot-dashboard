"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, differenceInMinutes, differenceInHours, differenceInDays, subDays, startOfDay, endOfDay, addMinutes } from "date-fns";
import { de } from "date-fns/locale";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { reservationsApi, Reservation, ReservationStatus } from "@/lib/api/reservations";
import { tablesApi, Table } from "@/lib/api/tables";
import { guestsApi, Guest } from "@/lib/api/guests";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertTriangle, BarChart3, Calendar, Clock3, Download, Filter, RefreshCcw, TrendingUp, Users, ArrowUpRight, ArrowDownRight, ChevronDown, ShieldCheck, CheckCircle, XCircle, AlertCircle, EyeOff } from "lucide-react";

type RangePreset = "today" | "7d" | "30d" | "90d" | "custom";

const numberFormatter = new Intl.NumberFormat("de-DE");
const percentFormatter = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 });
const STATUS_OPTIONS: { value: ReservationStatus | "all"; label: string; Icon: any; tone: string }[] = [
  { value: "all", label: "Alle", Icon: EyeOff, tone: "text-gray-300" },
  { value: "pending", label: "Ausstehend", Icon: Clock3, tone: "text-blue-300" },
  { value: "confirmed", label: "Bestätigt", Icon: ShieldCheck, tone: "text-indigo-300" },
  { value: "seated", label: "Platziert", Icon: Users, tone: "text-emerald-300" },
  { value: "completed", label: "Abgeschlossen", Icon: CheckCircle, tone: "text-amber-300" },
  { value: "canceled", label: "Storniert", Icon: XCircle, tone: "text-red-300" },
  { value: "no_show", label: "No-Show", Icon: AlertCircle, tone: "text-orange-300" },
];

function Sparkline({ values, colorClass = "text-blue-400" }: { values: number[]; colorClass?: string }) {
  if (!values.length) return <div className="h-12 text-xs text-muted-foreground">Keine Daten</div>;
  const maxValue = Math.max(...values, 1);
  const step = values.length > 1 ? 100 / (values.length - 1) : 100;
  const points = values
    .map((v, idx) => `${(idx * step).toFixed(2)},${(40 - (v / maxValue) * 40).toFixed(2)}`)
    .join(" ");

  return (
    <svg viewBox="0 0 100 40" className="w-full h-12" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className={colorClass}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function OwnerInsightsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [prevReservations, setPrevReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rangePreset, setRangePreset] = useState<RangePreset>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [refreshing, setRefreshing] = useState(false);
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const rangeMenuRef = useRef<HTMLDivElement | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [detail, setDetail] = useState<{ title: string; rows: { label: string; value: string }[] } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const range = useMemo(() => {
    const today = new Date();
    let from = startOfDay(today);
    let to = endOfDay(today);
    if (rangePreset === "7d") from = startOfDay(subDays(today, 6));
    if (rangePreset === "30d") from = startOfDay(subDays(today, 29));
    if (rangePreset === "90d") from = startOfDay(subDays(today, 89));
    if (rangePreset === "custom") {
      from = customFrom ? startOfDay(parseISO(customFrom)) : from;
      to = customTo ? endOfDay(parseISO(customTo)) : to;
    }
    return { from, to };
  }, [rangePreset, customFrom, customTo]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setError(null);
      setLoading(true);
      setRefreshing(true);
      try {
        let currentRestaurant = restaurant;
        if (!currentRestaurant) {
          const restaurants = await restaurantsApi.list();
          if (!restaurants.length) throw new Error("Kein Restaurant gefunden.");
          currentRestaurant = restaurants[0];
          if (active) setRestaurant(currentRestaurant);
        }
        if (!currentRestaurant) return;

        const fromParam = format(range.from, "yyyy-MM-dd");
        const toParam = format(range.to, "yyyy-MM-dd");
        const days = Math.max(1, differenceInDays(range.to, range.from) + 1);
        const prevFrom = startOfDay(subDays(range.from, days));
        const prevTo = endOfDay(subDays(range.to, days));
        const prevFromParam = format(prevFrom, "yyyy-MM-dd");
        const prevToParam = format(prevTo, "yyyy-MM-dd");

        const [reservationData, prevReservationData, tableData, guestData] = await Promise.all([
          reservationsApi.list(currentRestaurant.id, { from: fromParam, to: toParam }),
          reservationsApi.list(currentRestaurant.id, { from: prevFromParam, to: prevToParam }),
          tablesApi.list(currentRestaurant.id),
          guestsApi.list(currentRestaurant.id).catch(() => []),
        ]);

        if (!active) return;
        setReservations(reservationData);
        setPrevReservations(prevReservationData);
        setTables(tableData);
        setGuests(Array.isArray(guestData) ? guestData : []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Fehler beim Laden der Daten");
      } finally {
        if (active) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [rangePreset, customFrom, customTo, restaurant, range.from, range.to, reloadTick]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        (rangeMenuRef.current && rangeMenuRef.current.contains(target)) ||
        (statusMenuRef.current && statusMenuRef.current.contains(target))
      ) {
        return;
      }
      setRangeMenuOpen(false);
      setStatusMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredReservations = useMemo(() => {
    return reservations.filter((reservation) => {
      if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
      const start = parseISO(reservation.start_at);
      return start >= range.from && start <= range.to;
    });
  }, [reservations, statusFilter, range.from, range.to]);

  const prevRange = useMemo(() => {
    const days = Math.max(1, differenceInDays(range.to, range.from) + 1);
    return {
      from: startOfDay(subDays(range.from, days)),
      to: endOfDay(subDays(range.to, days)),
    };
  }, [range.from, range.to]);

  const prevFilteredReservations = useMemo(() => {
    return prevReservations.filter((reservation) => {
      if (statusFilter !== "all" && reservation.status !== statusFilter) return false;
      return true;
    });
  }, [prevReservations, statusFilter]);

  const computeKpis = useCallback((list: Reservation[], windowRange: { from: Date; to: Date }) => {
    const total = list.length;
    const covers = list.reduce((sum, r) => sum + r.party_size, 0);
    const confirmed = list.filter((r) => ["confirmed", "seated", "completed"].includes(r.status) && r.table_id !== null).length;
    const canceled = list.filter((r) => r.status === "canceled").length;
    const noShow = list.filter((r) => r.status === "no_show").length;
    const withTable = list.filter((r) => r.table_id !== null).length;
    const durations = list.filter((r) => r.end_at).map((r) => differenceInMinutes(parseISO(r.end_at), parseISO(r.start_at)));
    const lead = list.filter((r) => r.created_at_utc).map((r) => differenceInHours(parseISO(r.start_at), parseISO(r.created_at_utc)));
    const avgDuration = durations.length ? durations.reduce((s, v) => s + v, 0) / durations.length : 0;
    const avgLead = lead.length ? lead.reduce((s, v) => s + v, 0) / lead.length : 0;
    const activeTables = tables.filter((t) => t.is_active).length;
    const capacity = tables.reduce((s, t) => s + (t.capacity || 0), 0);

    const minutesRange = Math.max(1, differenceInMinutes(windowRange.to, windowRange.from));
    const seatMinutes = list.reduce((sum, r) => {
      const start = parseISO(r.start_at);
      const end = r.end_at ? parseISO(r.end_at) : addMinutes(start, 90);
      const duration = Math.max(0, differenceInMinutes(end, start));
      return sum + duration * r.party_size;
    }, 0);
    const capacityMinutes = capacity * minutesRange || 1;
    const utilizationRate = capacity ? Math.min(100, (seatMinutes / capacityMinutes) * 100) : 0;

    const bucketMs = 30 * 60 * 1000;
    const bucketMap = new Map<number, number>();
    list.forEach((r) => {
      const start = parseISO(r.start_at).getTime();
      const end = (r.end_at ? parseISO(r.end_at) : addMinutes(parseISO(r.start_at), 90)).getTime();
      for (let t = start; t < end; t += bucketMs) {
        bucketMap.set(t, (bucketMap.get(t) || 0) + r.party_size);
      }
    });
    const bucketValues = Array.from(bucketMap.values());
    const peakSeats = bucketValues.length ? Math.max(...bucketValues) : 0;
    const avgSeats = bucketValues.length ? bucketValues.reduce((s, v) => s + v, 0) / bucketValues.length : 0;
    const peakRate = capacity ? Math.min(100, (peakSeats / capacity) * 100) : 0;
    const avgRate = capacity ? Math.min(100, (avgSeats / capacity) * 100) : 0;

    return {
      total,
      covers,
      confirmationRate: total ? (confirmed / total) * 100 : 0,
      cancellationRate: total ? (canceled / total) * 100 : 0,
      noShowRate: total ? (noShow / total) * 100 : 0,
      tableAssignmentRate: total ? (withTable / total) * 100 : 0,
      avgParty: total ? covers / total : 0,
      avgDuration,
      avgLead,
      activeTables,
      capacity,
      utilizationRate,
      peakRate,
      avgRate,
    };
  }, [tables]);

  const kpis = useMemo(() => computeKpis(filteredReservations, range), [filteredReservations, range, computeKpis]);
  const prevKpis = useMemo(() => computeKpis(prevFilteredReservations, prevRange), [prevFilteredReservations, prevRange, computeKpis]);

  const renderDelta = (value: number, isPercent = false) => {
    if (!isFinite(value) || value === 0) return <span className="text-xs text-muted-foreground">±0</span>;
    const positive = value > 0;
    const Icon = positive ? ArrowUpRight : ArrowDownRight;
    const formatted = Math.abs(value).toFixed(isPercent ? 1 : 2);
    return (
      <span className={`inline-flex items-center gap-1 text-xs ${positive ? "text-emerald-400" : "text-amber-400"}`}>
        <Icon className="h-3 w-3" />
        {formatted}
        {isPercent ? "%" : ""}
      </span>
    );
  };

  const dailySeries = useMemo(() => {
    const map = new Map<string, { date: string; count: number; covers: number }>();
    filteredReservations.forEach((res) => {
      const key = format(parseISO(res.start_at), "yyyy-MM-dd");
      const entry = map.get(key) || { date: key, count: 0, covers: 0 };
      entry.count += 1;
      entry.covers += res.party_size;
      map.set(key, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredReservations]);

  const statusBreakdown = useMemo(() => {
    const base = { pending: 0, confirmed: 0, seated: 0, completed: 0, canceled: 0, no_show: 0 } as Record<
      ReservationStatus,
      number
    >;
    filteredReservations.forEach((r) => {
      base[r.status] += 1;
    });
    return base;
  }, [filteredReservations]);

  const channelBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    filteredReservations.forEach((r) => {
      const key = r.channel || "Unbekannt";
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [filteredReservations]);

  const latestReservations = useMemo(() => {
    return [...filteredReservations]
      .sort((a, b) => parseISO(b.start_at).getTime() - parseISO(a.start_at).getTime())
      .slice(0, 6);
  }, [filteredReservations]);

  const timeBuckets = useMemo(
    () =>
      [
        { label: "Früh (bis 12 Uhr)", value: filteredReservations.filter((r) => parseISO(r.start_at).getHours() < 12).length },
        {
          label: "Mittag (12-17 Uhr)",
          value: filteredReservations.filter((r) => {
            const h = parseISO(r.start_at).getHours();
            return h >= 12 && h < 17;
          }).length,
        },
        {
          label: "Abend (17-21 Uhr)",
          value: filteredReservations.filter((r) => {
            const h = parseISO(r.start_at).getHours();
            return h >= 17 && h < 21;
          }).length,
        },
        { label: "Spät (ab 21 Uhr)", value: filteredReservations.filter((r) => parseISO(r.start_at).getHours() >= 21).length },
      ] as const,
    [filteredReservations]
  );

  const slotBreakdown = useMemo(() => {
    const capacity = tables.reduce((s, t) => s + (t.capacity || 0), 0) || 1;
    const bucketMs = 30 * 60 * 1000;
    const bucketMap = new Map<number, number>();
    filteredReservations.forEach((r) => {
      const start = parseISO(r.start_at).getTime();
      const end = (r.end_at ? parseISO(r.end_at) : addMinutes(parseISO(r.start_at), 90)).getTime();
      for (let t = start; t < end; t += bucketMs) {
        bucketMap.set(t, (bucketMap.get(t) || 0) + r.party_size);
      }
    });
    return Array.from(bucketMap.entries())
      .map(([ts, seats]) => ({
        ts,
        seats,
        rate: Math.min(100, (seats / capacity) * 100),
        label: format(ts, "dd.MM HH:mm", { locale: de }),
      }))
      .sort((a, b) => b.seats - a.seats)
      .slice(0, 6);
  }, [filteredReservations, tables]);

  const handleExportCSV = () => {
    if (typeof window === "undefined") return;
    const now = new Date();
    const restaurantName = restaurant?.name || "Unbekanntes Restaurant";
    const dateRange = `${format(range.from, "dd.MM.yyyy", { locale: de })} - ${format(range.to, "dd.MM.yyyy", { locale: de })}`;

    const base = [
      ["Restaurant", restaurantName],
      ["Zeitraum", dateRange],
      ["Export-Datum", format(now, "dd.MM.yyyy HH:mm", { locale: de })],
      ["Kennzahl", "Wert"],
      ["Reservierungen", kpis.total.toString()],
      ["Gäste (Covers)", kpis.covers.toString()],
      ["Bestätigungsquote", `${kpis.confirmationRate.toFixed(1)}%`],
      ["Storno-Quote", `${kpis.cancellationRate.toFixed(1)}%`],
      ["No-Show-Quote", `${kpis.noShowRate.toFixed(1)}%`],
      ["Avg Partygroesse", kpis.avgParty.toFixed(2)],
      ["Avg Aufenthaltsdauer (Minuten)", kpis.avgDuration.toFixed(1)],
      ["Avg Vorlaufzeit (Stunden)", kpis.avgLead.toFixed(1)],
      ["Tisch-Zuordnung", `${kpis.tableAssignmentRate.toFixed(1)}%`],
      ["Aktive Tische", kpis.activeTables.toString()],
      ["Kapazität (Sitzplätze)", kpis.capacity.toString()],
      ["Durchschnittliche Auslastung", `${percentFormatter.format(kpis.utilizationRate)}%`],
      ["Peak-Auslastung", `${percentFormatter.format(kpis.peakRate)}%`],
      ["Avg Slot-Auslastung", `${percentFormatter.format(kpis.avgRate)}%`],
    ];

    const statusRows = Object.entries(statusBreakdown).map(([status, count]) => [
      `Status ${status}`,
      `${count} (${percentFormatter.format((count / Math.max(1, kpis.total)) * 100)}%)`,
    ]);

    const channelRows = channelBreakdown.map(([channel, count]) => [
      `Kanal ${channel}`,
      `${count} (${percentFormatter.format((count / Math.max(1, kpis.total)) * 100)}%)`,
    ]);

    const sanitize = (value: string) =>
      value
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/Ä/g, "Ae")
        .replace(/Ö/g, "Oe")
        .replace(/Ü/g, "Ue")
        .replace(/ß/g, "ss");

    const csvContent =
      "\ufeff" +
      [...base, ...statusRows, ...channelRows]
        .map((row) => row.map((cell) => sanitize(cell)).join(";"))
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "dashboard-kpis.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (typeof window === "undefined") return;
    const target = document.getElementById("owner-insights-content");
    if (!target) return;

    const clone = target.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-print-exclude]").forEach((el) => el.remove());
    const contentHtml = clone.innerHTML;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const styles = `
      <style>
        body { background: #0f172a; color: #e5e7eb; font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 24px; }
        h1,h2,h3 { color: #fff; margin: 0 0 8px; }
        .card { border: 1px solid #1f2937; border-radius: 12px; padding: 12px 14px; margin-bottom: 10px; background: #111827; }
        .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
        .row:last-child { border-bottom: none; }
      </style>
    `;

    if (iframe.contentWindow) {
      iframe.contentWindow.document.open();
      iframe.contentWindow.document.write(`<!doctype html><html><head>${styles}</head><body>${contentHtml}</body></html>`);
      iframe.contentWindow.document.close();
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    }

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 300);
  };

  const kpiCards = [
    {
      title: "Reservierungen",
      value: numberFormatter.format(kpis.total),
      sub: `${numberFormatter.format(kpis.covers)} Gäste`,
      accent: "text-primary",
      spark: dailySeries.map((d) => d.count),
      icon: <Users className="h-5 w-5 text-primary" />,
      delta: kpis.total - prevKpis.total,
      deltaIsPercent: false,
      rows: [
        { label: "Reservierungen", value: numberFormatter.format(kpis.total) },
        { label: "Gäste (Covers)", value: numberFormatter.format(kpis.covers) },
        { label: "Ø Partygröße", value: kpis.avgParty.toFixed(2) },
        { label: "Aktive Tische", value: `${kpis.activeTables} / Kapazität ${kpis.capacity}` },
      ],
    },
    {
      title: "Bestätigung",
      value: `${percentFormatter.format(kpis.confirmationRate)}%`,
      sub: `${percentFormatter.format(kpis.tableAssignmentRate)}% Tischzuordnung`,
      accent: "text-emerald-300",
      spark: dailySeries.map((d) => d.covers),
      icon: <BarChart3 className="h-5 w-5 text-emerald-300" />,
      delta: kpis.confirmationRate - prevKpis.confirmationRate,
      deltaIsPercent: true,
      rows: [
        { label: "Bestätigt/platziert/abgeschlossen (mit Tisch)", value: `${percentFormatter.format(kpis.confirmationRate)}%` },
        { label: "Tisch-Zuordnung", value: `${percentFormatter.format(kpis.tableAssignmentRate)}%` },
        { label: "Ø Dauer", value: `${kpis.avgDuration.toFixed(0)} Min.` },
        { label: "Ø Vorlaufzeit", value: `${kpis.avgLead.toFixed(1)} h` },
      ],
    },
    {
      title: "No-Show / Storno",
      value: `${percentFormatter.format(kpis.noShowRate + kpis.cancellationRate)}%`,
      sub: `${percentFormatter.format(kpis.noShowRate)}% No-Show`,
      accent: "text-amber-300",
      spark: [],
      icon: <AlertTriangle className="h-5 w-5 text-amber-300" />,
      delta: (kpis.noShowRate + kpis.cancellationRate) - (prevKpis.noShowRate + prevKpis.cancellationRate),
      deltaIsPercent: true,
      rows: [
        { label: "No-Show", value: `${percentFormatter.format(kpis.noShowRate)}%` },
        { label: "Storno", value: `${percentFormatter.format(kpis.cancellationRate)}%` },
        { label: "Bestätigungsquote", value: `${percentFormatter.format(kpis.confirmationRate)}%` },
      ],
    },
    {
      title: "Auslastung",
      value: `${percentFormatter.format(kpis.utilizationRate)}%`,
      sub: `Peak ${percentFormatter.format(kpis.peakRate)}% · Ø ${percentFormatter.format(kpis.avgRate)}%`,
      accent: "text-indigo-300",
      spark: [],
      icon: <TrendingUp className="h-5 w-5 text-indigo-300" />,
      delta: kpis.utilizationRate - prevKpis.utilizationRate,
      deltaIsPercent: true,
      rows: [
        { label: "Durchschnittliche Auslastung", value: `${percentFormatter.format(kpis.utilizationRate)}%` },
        { label: "Peak-Auslastung", value: `${percentFormatter.format(kpis.peakRate)}%` },
        { label: "Ø Slot-Auslastung", value: `${percentFormatter.format(kpis.avgRate)}%` },
        { label: "Aktive Tische", value: `${kpis.activeTables}` },
        { label: "Kapazität", value: `${kpis.capacity} Plätze` },
      ],
    },
  ];

  return (
    <div className="h-full min-h-screen overflow-auto bg-background text-foreground">
      <div className="bg-card border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] via-cyan-400 to-emerald-400 flex items-center justify-center shadow-lg shadow-[#F95100]/25">
              <BarChart3 className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Kennzahlen</h1>
              <p className="text-sm text-muted-foreground">
                {restaurant ? `für ${restaurant.name}` : "Übersicht der wichtigsten Metriken"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                <span>Kennzahlen aus Reservierungen, Gästen, Kanälen, Status-Pipeline und aktiven Tischen.</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 min-h-[36px]">
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-2 min-h-[36px]">
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button size="sm" onClick={() => setReloadTick((v) => v + 1)} className="gap-2 min-h-[36px]">
              <RefreshCcw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              {refreshing ? "Aktualisiere..." : "Aktualisieren"}
            </Button>
          </div>
        </div>
      </div>

      <div id="owner-insights-content" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 space-y-6">
        <Card className="border-border bg-background/80" data-print-exclude>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Filter className="h-4 w-4 text-primary" />
                Zeitraum & Filter
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {format(range.from, "dd.MM.yyyy", { locale: de })} – {format(range.to, "dd.MM.yyyy", { locale: de })}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative col-span-1" ref={rangeMenuRef}>
                <label className="text-xs text-muted-foreground mb-1 block">Zeitraum</label>
                <button
                  type="button"
                  onClick={() => setRangeMenuOpen((prev) => !prev)}
                  className="w-full inline-flex items-center justify-between rounded-md border border-border bg-accent/70 px-3 py-2 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  <span>
                    {rangePreset === "today"
                      ? "Heute"
                      : rangePreset === "7d"
                      ? "Letzte 7 Tage"
                      : rangePreset === "30d"
                      ? "Letzte 30 Tage"
                      : rangePreset === "90d"
                      ? "Letzte 90 Tage"
                      : "Eigener Zeitraum"}
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${rangeMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {rangeMenuOpen && (
                  <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                    <div className="divide-y divide-border/80">
                      {[
                        { value: "today", label: "Heute" },
                        { value: "7d", label: "Letzte 7 Tage" },
                        { value: "30d", label: "Letzte 30 Tage" },
                        { value: "90d", label: "Letzte 90 Tage" },
                        { value: "custom", label: "Eigener Zeitraum" },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setRangePreset(opt.value as RangePreset);
                            setRangeMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            rangePreset === opt.value
                              ? "bg-card text-foreground font-semibold"
                              : "text-foreground hover:bg-accent/70"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Von
                </label>
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  disabled={rangePreset !== "custom"}
                  className="bg-card border-border text-sm"
                />
              </div>
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-muted-foreground" /> Bis
                </label>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  disabled={rangePreset !== "custom"}
                  className="bg-card border-border text-sm"
                />
              </div>

              <div className="relative col-span-1" ref={statusMenuRef}>
                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                <button
                  type="button"
                  onClick={() => setStatusMenuOpen((prev) => !prev)}
                  className="w-full inline-flex items-center justify-between rounded-md border border-border bg-accent/70 px-3 py-2 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background"
                >
                  {(() => {
                    const selected = STATUS_OPTIONS.find((opt) => opt.value === statusFilter);
                    const SelectedIcon = selected?.Icon;
                    return (
                      <span className="flex items-center gap-2 truncate">
                        {SelectedIcon && (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-input bg-background/70">
                            <SelectedIcon className={`w-3.5 h-3.5 ${selected?.tone ?? "text-muted-foreground"}`} />
                          </span>
                        )}
                        <span className="truncate">{selected?.label ?? "Alle"}</span>
                      </span>
                    );
                  })()}
                  <ChevronDown className={`w-4 h-4 transition-transform ${statusMenuOpen ? "rotate-180" : ""}`} />
                </button>
                {statusMenuOpen && (
                  <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-40 overflow-hidden">
                    <div className="divide-y divide-border/80">
                      {STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setStatusFilter(opt.value as ReservationStatus | "all");
                            setStatusMenuOpen(false);
                          }}
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            statusFilter === opt.value
                              ? "bg-card text-foreground font-semibold"
                              : "text-foreground hover:bg-accent/70"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {opt.Icon && (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md border border-border bg-background/70">
                                <opt.Icon className={`w-3.5 h-3.5 ${opt.tone ?? "text-muted-foreground"}`} />
                              </span>
                            )}
                            <span className="truncate">{opt.label}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {error && (
              <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-100 px-3 py-2 text-sm">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-muted-foreground py-12 text-center">Lade Kennzahlen...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {kpiCards.map((card) => (
                <Card
                  key={card.title}
                  className="border-border bg-gradient-to-br from-background via-background to-background cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => {
                    setDetail({ title: card.title, rows: card.rows });
                    setDetailOpen(true);
                  }}
                >
                  <CardHeader className="pb-1">
                    <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className={`p-1.5 rounded-lg bg-white/5 border border-white/5 ${card.accent}`}>{card.icon}</span>
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-foreground">{card.value}</div>
                      {typeof card.delta !== "undefined" && renderDelta(card.delta, card.deltaIsPercent)}
                    </div>
                    <div className="text-sm text-muted-foreground">{card.sub}</div>
                    {card.spark.length > 0 && <Sparkline values={card.spark} colorClass={card.accent} />}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card
                className="border-border bg-background/80 lg:col-span-2 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => {
                  setDetail({
                    title: "Verlauf (pro Tag)",
                    rows: dailySeries.map((d) => ({
                      label: format(parseISO(d.date), "dd.MM.yyyy", { locale: de }),
                      value: `${d.count} Res · ${d.covers} Gäste`,
                    })),
                  });
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    Verlauf (pro Tag)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {dailySeries.length ? (
                    dailySeries.map((day) => (
                      <div key={day.date} className="flex items-center gap-3 rounded-lg bg-white/5 border border-white/5 px-3 py-2">
                        <div className="w-28 text-sm text-muted-foreground">
                          {format(parseISO(day.date), "dd.MM.", { locale: de })}
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full bg-card overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#F95100] to-emerald-400"
                              style={{
                                width: `${Math.min(100, (day.count / Math.max(...dailySeries.map((d) => d.count), 1)) * 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                        <div className="w-28 text-right text-sm text-foreground">
                          {day.count} Res · {day.covers} Gäste
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-4">Keine Reservierungen im Zeitraum.</div>
                  )}
                </CardContent>
              </Card>

              <Card
                className="border-border bg-background/80 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => {
                  setDetail({
                    title: "Status-Pipeline",
                    rows: Object.entries(statusBreakdown).map(([status, count]) => {
                      const total = filteredReservations.length || 1;
                      const share = (count / total) * 100;
                      const label: Record<string, string> = {
                        pending: "Ausstehend",
                        confirmed: "Bestätigt",
                        seated: "Platziert",
                        completed: "Abgeschlossen",
                        canceled: "Storniert",
                        no_show: "No-Show",
                      };
                      return { label: label[status] || status, value: `${count} · ${percentFormatter.format(share)}%` };
                    }),
                  });
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-indigo-300" />
                    Status-Pipeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {Object.entries(statusBreakdown).map(([status, count]) => {
                    const total = filteredReservations.length || 1;
                    const share = (count / total) * 100;
                    const label: Record<string, string> = {
                      pending: "Ausstehend",
                      confirmed: "Bestätigt",
                      seated: "Platziert",
                      completed: "Abgeschlossen",
                      canceled: "Storniert",
                      no_show: "No-Show",
                    };
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{label[status] || status}</span>
                          <span className="text-muted-foreground">
                            {count} · {percentFormatter.format(share)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-card overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#F95100] via-indigo-500 to-emerald-400" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Tischzuordnung {percentFormatter.format(kpis.tableAssignmentRate)}% · Ø Dauer {kpis.avgDuration.toFixed(0)} Min.
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card
                className="border-border bg-background/80 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => {
                  setDetail({
                    title: "Kanäle",
                    rows: channelBreakdown.map(([channel, count]) => {
                      const share = filteredReservations.length ? (count / filteredReservations.length) * 100 : 0;
                      return { label: channel, value: `${count} · ${percentFormatter.format(share)}%` };
                    }),
                  });
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-300" />
                    Kanäle
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {channelBreakdown.length ? (
                    channelBreakdown.map(([channel, count]) => {
                      const share = filteredReservations.length ? (count / filteredReservations.length) * 100 : 0;
                      return (
                        <div key={channel}>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{channel}</span>
                            <span className="text-muted-foreground">
                              {count} · {percentFormatter.format(share)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-card overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500" style={{ width: `${share}%` }} />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-sm text-muted-foreground py-4">Keine Kanal-Daten.</div>
                  )}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Bekannte Gäste: {guests.length} · Kapazität: {kpis.capacity} Plätze
                  </div>
                </CardContent>
              </Card>

              <Card
                className="border-border bg-background/80 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => {
                  setDetail({
                    title: "Letzte Reservierungen",
                    rows: latestReservations.map((res) => ({
                      label: `${res.guest_name || "Gast"} · ${res.party_size} Pers.`,
                      value: `${format(parseISO(res.start_at), "dd.MM.yyyy HH:mm", { locale: de })} · ${res.status}`,
                    })),
                  });
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Letzte Reservierungen
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {latestReservations.length ? (
                    latestReservations.map((res) => (
                      <div key={res.id} className="p-3 rounded-lg bg-white/5 border border-white/5">
                        <div className="text-sm text-foreground font-semibold">
                          {res.guest_name || "Gast"} · {res.party_size} Pers.
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(res.start_at), "dd.MM.yyyy HH:mm", { locale: de })} · {res.channel || "Unbekannt"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Status: {res.status} {res.table_id ? `· Tisch ${res.table_id}` : "· ohne Tisch"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground py-4">Keine Reservierungen im Zeitraum.</div>
                  )}
                </CardContent>
              </Card>

              <Card
                className="border-border bg-background/80 cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => {
                  setDetail({
                    title: "Stoßzeiten",
                    rows: timeBuckets.map(({ label, value }) => {
                      const share = filteredReservations.length ? (value / filteredReservations.length) * 100 : 0;
                      return { label, value: `${value} · ${percentFormatter.format(share)}%` };
                    }),
                  });
                  setDetailOpen(true);
                }}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-300" />
                    Time Buckets
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {timeBuckets.map(({ label, value }) => {
                    const share = filteredReservations.length ? (value / filteredReservations.length) * 100 : 0;
                    return (
                      <div key={label}>
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{label}</span>
                          <span className="text-muted-foreground">
                            {value} · {percentFormatter.format(share)}%
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-card overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-amber-400 to-pink-500" style={{ width: `${share}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border">
                    Ø Vorlaufzeit {kpis.avgLead.toFixed(1)}h · Ø Dauer {kpis.avgDuration.toFixed(0)} Min.
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border bg-background/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base text-foreground flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-amber-300" />
                    Top-Slots (30 Min)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-1 space-y-2">
                  {slotBreakdown.length ? (
                    slotBreakdown.map((slot) => (
                      <div key={slot.ts} className="flex items-center justify-between text-sm text-muted-foreground py-1 border-b border-white/5 last:border-b-0">
                        <span>{slot.label}</span>
                        <span className="text-muted-foreground">
                          {slot.seats} Seats · {percentFormatter.format(slot.rate)}%
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-muted-foreground">Keine Slot-Daten</div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}

        <Dialog open={detailOpen && !!detail} onOpenChange={setDetailOpen}>
          {detail && (
            <DialogContent className="bg-background border border-border">
              <DialogHeader>
                <DialogTitle>{detail.title}</DialogTitle>
                <DialogDescription>
                  Zeitraum: {format(range.from, "dd.MM.yyyy", { locale: de })} – {format(range.to, "dd.MM.yyyy", { locale: de })} ·
                  Filter: {statusFilter === "all" ? "alle Status" : statusFilter}
                </DialogDescription>
              </DialogHeader>
              <div className="px-4 md:px-6 pb-4 space-y-2">
                {detail.rows.map((row, idx) => (
                  <div
                    key={`${row.label}-${idx}`}
                    className="flex items-center justify-between rounded-lg border border-border bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{row.label}</span>
                    <span className="text-sm text-foreground font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
              <DialogHeader>
                <Button variant="outline" className="w-full" onClick={() => setDetailOpen(false)}>
                  Schließen
                </Button>
              </DialogHeader>
            </DialogContent>
          )}
        </Dialog>
      </div>
    </div>
  );
}
