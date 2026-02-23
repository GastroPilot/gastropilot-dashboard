"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import { auditLogsApi, AuditLog } from "@/lib/api/audit-logs";
import { authApi, User } from "@/lib/api/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";
import { 
  RefreshCw, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  ChevronDown, 
  Check,
  FileText,
  Search,
  User as UserIcon,
  Shield,
  UserCheck,
  Calendar,
  Activity,
  Globe,
  Info,
  Plus,
  Trash2,
  Edit,
  Loader2,
  AlertCircle,
  Clock
} from "lucide-react";

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasTotal, setHasTotal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [action, setAction] = useState("");
  const [userId, setUserId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [operators, setOperators] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; variant?: "info" | "error" | "success" }[]>([]);
  const actionMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

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

  const userMap = useMemo(() => {
    const map = new Map<string, User>();
    operators.forEach((op) => map.set(op.id, op));
    return map;
  }, [operators]);

  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const [restaurants, ops] = await Promise.all([restaurantsApi.list(), authApi.listOperators()]);
      setOperators(ops);
      if (restaurants.length === 0) {
        setRestaurant(null);
        setLogs([]);
        setTotalCount(0);
        setHasTotal(false);
        return;
      }
      const selected = restaurants[0];
      setRestaurant(selected);
      await loadLogs(selected.id, 0);
    } catch (err) {
      console.error("Fehler beim Laden der Audit-Logs:", err);
      setError("Audit-Logs konnten nicht geladen werden.");
      addToast("Fehler beim Laden der Audit-Logs", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
        setActionMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const friendlyAction = (value?: string) => {
    const normalized = (value || "").toLowerCase();
    switch (normalized) {
      case "create":
        return "Erstellt";
      case "update":
        return "Aktualisiert";
      case "delete":
        return "Gelöscht";
      case "move":
        return "Verschoben";
      case "patch":
        return "Geändert";
      case "post":
        return "Erstellt";
      default:
        return value;
    }
  };

  const getActionIcon = (action?: string) => {
    const normalized = (action || "").toLowerCase();
    switch (normalized) {
      case "create":
      case "post":
        return Plus;
      case "delete":
        return Trash2;
      case "update":
      case "patch":
        return Edit;
      default:
        return Activity;
    }
  };

  const getActionColor = (action?: string) => {
    const normalized = (action || "").toLowerCase();
    switch (normalized) {
      case "create":
      case "post":
        return "bg-emerald-200 text-black border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-700";
      case "delete":
        return "bg-red-200 text-black border-red-300 dark:bg-red-900/40 dark:text-red-200 dark:border-red-700";
      case "update":
      case "patch":
        return "bg-orange-200 text-black border-orange-300 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-700";
      default:
        return "bg-card text-foreground border-border";
    }
  };

  const getActionTone = (action?: string) => {
    const normalized = (action || "").toLowerCase();
    switch (normalized) {
      case "create":
      case "post":
        return "text-emerald-300 border-emerald-600 bg-emerald-900/30";
      case "delete":
        return "text-red-300 border-red-600 bg-red-900/30";
      case "update":
      case "patch":
        return "text-orange-300 border-orange-600 bg-orange-900/30";
      default:
        return "text-muted-foreground border-input bg-background/50";
    }
  };

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case "platform_admin":
        return Shield;
      case "owner":
        return UserCheck;
      case "manager":
        return UserIcon;
      default:
        return UserIcon;
    }
  };

  const getRoleTone = (role?: string) => {
    switch (role) {
      case "platform_admin":
        return "text-purple-300 border-purple-500/60 bg-purple-900/40";
      case "owner":
        return "text-primary border-primary/60 bg-primary/20";
      case "manager":
        return "text-amber-300 border-amber-500/60 bg-amber-900/40";
      default:
        return "text-muted-foreground border-border/60 bg-background/50";
    }
  };

  const loadLogs = async (restaurantId: string, nextOffset = offset) => {
    try {
      setIsRefreshing(true);
      const actionParam = action === "create" ? "post" : action || undefined;
      const hasLocalFilters = Boolean(dateFrom || dateTo || searchTerm.trim());
      const response = await auditLogsApi.list(restaurantId, {
        action: actionParam,
        user_id: userId || undefined,
        limit: PAGE_SIZE,
        offset: nextOffset,
      });
      const fromTs = dateFrom ? new Date(dateFrom).getTime() : null;
      const toTs = dateTo ? new Date(dateTo).getTime() : null;
      const term = searchTerm.trim().toLowerCase();
      const filtered = response.results.filter((log) => {
        const ts = new Date(log.created_at_utc).getTime();
        if (fromTs !== null && ts < fromTs) return false;
        if (toTs !== null && ts > toTs) return false;

        if (!term) return true;
        const parts: string[] = [];
        parts.push(log.entity_type || "");
        if (log.entity_id !== null && log.entity_id !== undefined) parts.push(String(log.entity_id));
        parts.push(log.action || "");
        if (log.description) parts.push(log.description);
        if (log.ip_address) parts.push(log.ip_address);
        if (log.created_at_utc) parts.push(log.created_at_utc);
        if (log.details) {
          try {
            parts.push(typeof log.details === "string" ? log.details : JSON.stringify(log.details));
          } catch {
            // ignore
          }
        }
        const user = log.user_id ? userMap.get(log.user_id) : null;
        if (user) {
          parts.push(user.first_name || "");
          parts.push(user.last_name || "");
          parts.push(user.operator_number || "");
        }
        const haystack = parts.join(" ").toLowerCase();
        return haystack.includes(term);
      });
      if (hasLocalFilters && filtered.length === 0 && nextOffset > 0) {
        const prevOffset = Math.max(0, nextOffset - PAGE_SIZE);
        setOffset(prevOffset);
        await loadLogs(restaurantId, prevOffset);
        return;
      }
      setLogs(filtered);
      setOffset(response.offset);
      const derivedTotal = hasLocalFilters
        ? filtered.length + response.offset
        : response.hasTotal
        ? Math.max(response.total, filtered.length + response.offset)
        : filtered.length + response.offset;
      setTotalCount(derivedTotal);
      setHasTotal(!hasLocalFilters && response.hasTotal);
    } catch (err) {
      console.error("Fehler beim Laden der Audit-Logs:", err);
      setError("Audit-Logs konnten nicht geladen werden.");
      addToast("Fehler beim Laden der Audit-Logs", "error");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApplyFilters = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant) return;
    await loadLogs(restaurant.id, 0);
  };

  const hasLocalFilters = Boolean(dateFrom || dateTo || searchTerm.trim());
  const hasServerTotal = !hasLocalFilters && hasTotal && totalCount > 0;
  const hasMoreFromTotal = hasServerTotal ? offset + logs.length < totalCount : false;
  const inferredCanGoNext = !hasServerTotal && logs.length === PAGE_SIZE;
  const canGoNext = hasMoreFromTotal || inferredCanGoNext;
  const canGoPrev = offset > 0;
  const estimatedTotal = hasServerTotal
    ? totalCount
    : offset + logs.length + (inferredCanGoNext ? PAGE_SIZE : 0);
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(estimatedTotal, offset + logs.length, 1) / PAGE_SIZE)
  );
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const showingFrom = logs.length === 0 ? 0 : offset + 1;
  const showingTo = logs.length === 0 ? 0 : offset + logs.length;
  const displayTotal = Math.max(estimatedTotal, showingTo);

  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxPagesToShow = 7;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
      return pages;
    }

    pages.push(1);

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 2) {
      pages.push("start-ellipsis");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPages - 1) {
      pages.push("end-ellipsis");
    }

    pages.push(totalPages);
    return pages;
  }, [currentPage, totalPages]);

  const goToPage = async (page: number) => {
    if (!restaurant) return;
    const maxPage = hasServerTotal ? totalPages : totalPages + (canGoNext ? 1 : 0);
    const clampedPage = Math.min(Math.max(page, 1), maxPage);
    const nextOffset = (clampedPage - 1) * PAGE_SIZE;
    await loadLogs(restaurant.id, nextOffset);
  };

  const handleNext = async () => {
    if (!restaurant || !canGoNext) return;
    await goToPage(currentPage + 1);
  };

  const handlePrev = async () => {
    if (!restaurant || !canGoPrev) return;
    await goToPage(currentPage - 1);
  };

  const formatDate = (value: string) => {
    try {
      const date = new Date(value);
      return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "medium",
      }).format(date);
    } catch (err) {
      return value;
    }
  };

  const normalizeDetails = (details?: Record<string, any> | string | null) => {
    if (!details) return null;
    try {
      if (typeof details === "string") {
        return JSON.parse(details);
      }
      return details;
    } catch (err) {
      return details;
    }
  };

  const renderDetails = (details?: Record<string, any> | string | null) => {
    if (!details) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }

    const isString = typeof details === "string";
    const hasContent = isString ? details.trim().length > 0 : Object.keys(details).length > 0;
    if (!hasContent) {
      return <span className="text-muted-foreground text-sm">—</span>;
    }

    let pretty = "";
    if (isString) {
      try {
        pretty = JSON.stringify(JSON.parse(details), null, 2);
      } catch {
        pretty = details;
      }
    } else {
      pretty = JSON.stringify(details, null, 2);
    }

    return (
      <pre className="bg-background/70 text-xs text-foreground rounded-md px-3 py-2 max-w-md whitespace-pre-wrap break-words border border-card shadow-inner font-mono">
        {pretty}
      </pre>
    );
  };

  if (loading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Zurück zum Dashboard
            </Link>
            <Card className="border-border bg-card/50 backdrop-blur-sm">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-foreground text-lg mb-2">Kein Restaurant gefunden</p>
                  <p className="text-muted-foreground text-sm">
                    Bitte lege zuerst ein Restaurant an, um Audit-Logs anzuzeigen.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Toasts */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[200] space-y-3">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`min-w-[260px] rounded-lg border px-4 py-3 shadow-[0_14px_32px_rgba(0,0,0,0.35)] text-sm ${
                toast.variant === "error"
                  ? "bg-red-900/80 border-red-500 text-red-50"
                  : toast.variant === "success"
                  ? "bg-green-900/80 border-green-500 text-green-50"
                  : "bg-slate-800/90 border-slate-600 text-slate-100"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#F95100] to-[#E04800] flex items-center justify-center shadow-lg shadow-[#F95100]/25">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  Audit-Logs
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {restaurant.name} • {displayTotal} Einträge
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="default"
                size="sm"
                className="gap-2 touch-manipulation min-h-[36px] md:min-h-[40px] bg-primary hover:bg-primary/90 text-white dark:text-foreground border border-primary shadow-lg shadow-[#F95100]/25"
                onClick={() => loadLogs(restaurant.id, offset)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isRefreshing ? "Aktualisiere..." : "Aktualisieren"}</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          {/* Filter */}
          <Card className="relative z-30 border-border bg-card/50 backdrop-blur-sm overflow-visible">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Filter className="w-5 h-5 text-primary" />
                Filter
              </CardTitle>
            </CardHeader>
            <CardContent className="relative pt-6 overflow-visible">
              <form onSubmit={handleApplyFilters} className="space-y-4">
                {error && (
                  <div className="p-4 bg-red-900/30 border border-red-600/50 text-red-300 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Fehler</p>
                      <p className="text-sm mt-1">{error}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Activity className="w-4 h-4 text-primary" />
                      Aktion
                    </label>
                    <div className="relative z-[60]" ref={actionMenuRef}>
                      <button
                        type="button"
                        onClick={() => setActionMenuOpen((prev) => !prev)}
                        className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card/50 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
                      >
                        {(() => {
                          const Icon = action ? getActionIcon(action) : Activity;
                          return (
                            <span className="flex items-center gap-2 truncate">
                              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${getActionTone(action)}`}>
                                <Icon className="w-3.5 h-3.5" />
                              </span>
                              <span className="truncate">{friendlyAction(action) || "Alle Aktionen"}</span>
                            </span>
                          );
                        })()}
                        <ChevronDown className={`w-4 h-4 transition-transform ${actionMenuOpen ? "rotate-180" : ""}`} />
                      </button>
                      {actionMenuOpen && (
                        <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-[80] overflow-hidden">
                          {[
                            { value: "", label: "Alle Aktionen" },
                            { value: "create", label: "Erstellt" },
                            { value: "delete", label: "Gelöscht" },
                            { value: "patch", label: "Geändert" },
                          ].map((item) => {
                            const active = action === item.value;
                            const Icon = item.value ? getActionIcon(item.value) : Activity;
                            return (
                              <button
                                key={item.value || "all"}
                                type="button"
                                onClick={() => {
                                  setAction(item.value);
                                  setActionMenuOpen(false);
                                }}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors ${
                                  active
                                    ? "bg-card text-foreground font-semibold"
                                    : "text-foreground hover:bg-accent"
                                }`}
                              >
                                <span className="flex items-center gap-2 truncate">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${getActionTone(item.value)}`}>
                                    <Icon className="w-3.5 h-3.5" />
                                  </span>
                                  <span className="truncate">{item.label}</span>
                                </span>
                                {active && <Check className="w-4 h-4 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <UserIcon className="w-4 h-4 text-primary" />
                      Benutzer
                    </label>
                    <div className="relative z-[60]" ref={userMenuRef}>
                      <button
                        type="button"
                        onClick={() => setUserMenuOpen((prev) => !prev)}
                        className="w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md border border-input bg-card/50 text-sm text-foreground shadow-inner hover:border-primary focus:outline-none focus:ring-2 focus:ring-ring min-h-[40px]"
                      >
                        <span className="truncate">
                          {userId ? (() => {
                                const user = operators.find((u) => u.id === userId);
                                return user ? `${user.first_name} ${user.last_name} (#${user.operator_number})` : "Benutzer wählen";
                              })()
                            : "Alle Benutzer"}
                        </span>
                        <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? "rotate-180" : ""}`} />
                      </button>
                      {userMenuOpen && (
                        <div className="absolute mt-1 w-full rounded-lg border border-border bg-background shadow-xl z-[80]">
                          <div
                            className="max-h-64 overflow-y-scroll overflow-x-hidden"
                            style={{ 
                              WebkitOverflowScrolling: 'touch',
                              scrollbarWidth: 'thin',
                              scrollbarColor: 'rgba(156, 163, 175, 0.5) transparent'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                setUserId("");
                                setUserMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors whitespace-nowrap ${
                                userId === ""
                                  ? "bg-card text-foreground font-semibold"
                                  : "text-foreground hover:bg-accent"
                              }`}
                            >
                              <span className="truncate">Alle Benutzer</span>
                              {userId === "" && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                            </button>
                            {operators.map((op) => {
                              const active = userId === String(op.id);
                              return (
                                <button
                                  key={op.id}
                                  type="button"
                                  onClick={() => {
                                    setUserId(String(op.id));
                                    setUserMenuOpen(false);
                                  }}
                                className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-sm transition-colors whitespace-nowrap ${
                                  active
                                    ? "bg-card text-foreground font-semibold"
                                    : "text-foreground hover:bg-accent"
                                }`}
                              >
                                  <span className="flex items-center gap-2 truncate">
                                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border bg-background/70 ${getRoleTone(op.role)}`}>
                                    {(() => {
                                      const RoleIcon = getRoleIcon(op.role);
                                      return <RoleIcon className="w-3.5 h-3.5" />;
                                    })()}
                                  </span>
                                    <span className="truncate">
                                      {op.first_name} {op.last_name} (#{op.operator_number})
                                    </span>
                                  </span>
                                  {active && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      Datum von
                    </label>
                    <Input
                      type="datetime-local"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="bg-card/50 border-input text-foreground focus:border-primary"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Calendar className="w-4 h-4 text-primary" />
                      Datum bis
                    </label>
                    <Input
                      type="datetime-local"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="bg-card/50 border-input text-foreground focus:border-primary"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Search className="w-4 h-4 text-primary" />
                    Freitext-Suche
                  </label>
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Suche in allen Spalten (z.B. Name, Aktion, ID, IP)..."
                    className="bg-card/50 border-input text-foreground placeholder:text-muted-foreground focus:border-primary"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    className="gap-2 touch-manipulation min-h-[40px]" 
                    disabled={isRefreshing}
                  >
                    {isRefreshing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Wird geladen...</span>
                      </>
                    ) : (
                      <>
                        <Filter className="w-4 h-4" />
                        <span>Filter anwenden</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card className="border-border bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <FileText className="w-5 h-5 text-primary" />
                Log-Einträge
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      Keine Audit-Logs gefunden
                    </p>
                    <p className="text-sm mt-2">
                      {hasLocalFilters 
                        ? "Versuchen Sie, die Filter anzupassen."
                        : "Es sind noch keine Log-Einträge vorhanden."}
                    </p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-background/50">
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">Zeitpunkt</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">User</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">Entity</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">Aktion</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">Beschreibung</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">Details</th>
                        <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((log) => {
                        const user = log.user_id ? userMap.get(log.user_id) : null;
                        const normalizedAction = (log.action || "").toLowerCase();
                        const ActionIcon = getActionIcon(log.action);
                        return (
                          <tr 
                            key={log.id} 
                            className="border-b border-border/50 hover:bg-accent transition-colors"
                          >
                            <td className="px-4 py-3 text-foreground whitespace-nowrap text-sm">
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                {formatDate(log.created_at_utc)}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              {user ? (
                                <div className="flex items-center gap-2">
                                  {(() => {
                                    const RoleIcon = getRoleIcon(user.role);
                                    return (
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md border ${getRoleTone(user.role)}`}>
                                        <RoleIcon className="w-3.5 h-3.5" />
                                      </span>
                                    );
                                  })()}
                                  <div className="flex flex-col leading-tight">
                                    <span className="text-sm">{user.first_name} {user.last_name}</span>
                                    <span className="text-xs text-muted-foreground font-mono">#{user.operator_number}</span>
                                  </div>
                                </div>
                              ) : log.user_id ? (
                                <span className="text-muted-foreground text-sm">User ID {log.user_id}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-foreground">
                              <div className="flex flex-col leading-tight">
                                <span className="font-semibold text-sm">{log.entity_type || "—"}</span>
                                {log.entity_id !== null && log.entity_id !== undefined && (
                                  <span className="text-xs text-muted-foreground">ID: {log.entity_id}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${getActionColor(normalizedAction)}`}
                              >
                                <ActionIcon className="w-3.5 h-3.5" />
                                {friendlyAction(log.action)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-foreground max-w-md">
                              {log.description ? (
                                <span className="block text-sm leading-snug text-foreground">{log.description}</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {(() => {
                                const normalized = normalizeDetails(log.details as any);
                                const hasContent =
                                  typeof normalized === "string"
                                    ? normalized.trim().length > 0
                                    : normalized && Object.keys(normalized).length > 0;
                                if (!hasContent) {
                                  return <span className="text-muted-foreground text-sm">—</span>;
                                }
                                return (
                                  <details className="group">
                                    <summary className="cursor-pointer text-sm text-primary hover:text-primary/80 flex items-center gap-2 list-none">
                                      <Info className="w-3.5 h-3.5" />
                                      <span className="group-open:hidden">Mehr anzeigen</span>
                                      <span className="hidden group-open:inline">Weniger anzeigen</span>
                                    </summary>
                                    <div className="mt-2">
                                      {renderDetails(normalized as any)}
                                    </div>
                                  </details>
                                );
                              })()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {log.ip_address ? (
                                <div className="flex items-center gap-1.5 text-sm">
                                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                                  {log.ip_address}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Pagination */}
              {logs.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-background/60 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    Zeigt {showingFrom}-{showingTo} von {displayTotal} Einträgen
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrev}
                      disabled={!canGoPrev || isRefreshing}
                      className="gap-1.5 touch-manipulation min-h-[36px]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Zurück</span>
                    </Button>
                    <div className="flex items-center gap-1">
                      {pageNumbers.map((page) =>
                        typeof page === "number" ? (
                          <Button
                            key={`page-${page}`}
                            variant={page === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            disabled={isRefreshing || page === currentPage}
                            className="min-h-[36px] px-3"
                          >
                            {page}
                          </Button>
                        ) : (
                          <span key={page} className="px-2 text-muted-foreground select-none">
                            ...
                          </span>
                        )
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNext}
                      disabled={!canGoNext || isRefreshing}
                      className="gap-1.5 touch-manipulation min-h-[36px]"
                    >
                      <span className="hidden sm:inline">Weiter</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
