"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { restaurantsApi, Restaurant } from "@/lib/api/restaurants";
import {
  qrCodesApi,
  QrCodeResponse,
  TableInfo,
} from "@/lib/api/qr-codes";
import { Button } from "@/components/ui/button";
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
  QrCode,
  Download,
  RefreshCw,
  Copy,
  Printer,
  CheckCircle2,
  XCircle,
  X,
  Loader2,
} from "lucide-react";

interface TableQrData {
  table: TableInfo;
  qrData: QrCodeResponse | null;
  loading: boolean;
}

/**
 * Renders SVG string safely into a container element using DOMParser,
 * stripping scripts and event handlers.
 */
function SafeSvg({ svgString }: { svgString: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Clear previous content safely
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgString, "image/svg+xml");
      const svgElement = doc.documentElement;

      if (svgElement.tagName === "svg") {
        // Remove script elements for safety
        svgElement.querySelectorAll("script").forEach((s) => s.remove());
        // Remove event handler attributes
        svgElement.querySelectorAll("*").forEach((el) => {
          Array.from(el.attributes).forEach((attr) => {
            if (attr.name.startsWith("on")) {
              el.removeAttribute(attr.name);
            }
          });
        });
        containerRef.current.appendChild(
          document.importNode(svgElement, true)
        );
      }
    } catch {
      // Fallback: show nothing if SVG is invalid
    }
  }, [svgString]);

  return <div ref={containerRef} />;
}

export default function QrCodesPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tableQrDataList, setTableQrDataList] = useState<TableQrData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<QrCodeResponse | null>(
    null
  );
  const [toasts, setToasts] = useState<
    { id: string; message: string; variant?: "info" | "error" | "success" }[]
  >([]);

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

      const tables = await qrCodesApi.listTables(selectedRestaurant.id);
      setTableQrDataList(
        tables.map((table) => ({ table, qrData: null, loading: false }))
      );
    } catch (err) {
      console.error("Error loading tables:", err);
      addToast("Fehler beim Laden der Tische", "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadQrCode = useCallback(
    async (tableId: string) => {
      setTableQrDataList((prev) =>
        prev.map((item) =>
          item.table.id === tableId ? { ...item, loading: true } : item
        )
      );

      try {
        const qrData = await qrCodesApi.getQrCode(tableId);
        setTableQrDataList((prev) =>
          prev.map((item) =>
            item.table.id === tableId
              ? { ...item, qrData, loading: false }
              : item
          )
        );
        return qrData;
      } catch (err: any) {
        addToast(
          err?.message || "Fehler beim Laden des QR-Codes",
          "error"
        );
        setTableQrDataList((prev) =>
          prev.map((item) =>
            item.table.id === tableId
              ? { ...item, loading: false }
              : item
          )
        );
        return null;
      }
    },
    [addToast]
  );

  const handleViewQr = async (tableId: string) => {
    const existing = tableQrDataList.find((item) => item.table.id === tableId);
    if (existing?.qrData) {
      setPreviewDialog(existing.qrData);
      return;
    }
    const qrData = await loadQrCode(tableId);
    if (qrData) {
      setPreviewDialog(qrData);
    }
  };

  const handleRegenerateToken = async (tableId: string) => {
    const confirmed = confirmAction(
      "Token neu generieren? Alle bisherigen QR-Codes dieses Tisches werden ungueltig."
    );
    if (!confirmed) return;

    try {
      await qrCodesApi.regenerateToken(tableId);
      addToast("Token erfolgreich neu generiert", "success");
      const qrData = await loadQrCode(tableId);
      if (qrData && previewDialog?.table_id === tableId) {
        setPreviewDialog(qrData);
      }
    } catch (err: any) {
      addToast(
        err?.message || "Fehler beim Regenerieren des Tokens",
        "error"
      );
    }
  };

  const handleBulkGenerate = async () => {
    setBulkLoading(true);
    try {
      let successCount = 0;
      for (const item of tableQrDataList) {
        try {
          await loadQrCode(item.table.id);
          successCount++;
        } catch {
          // continue with others
        }
      }
      addToast(
        `QR-Codes fuer ${successCount} von ${tableQrDataList.length} Tischen generiert`,
        "success"
      );
    } finally {
      setBulkLoading(false);
    }
  };

  const handleDownloadSvg = (qrData: QrCodeResponse) => {
    const blob = new Blob([qrData.qr_svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-tisch-${qrData.table_number}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast("SVG heruntergeladen", "success");
  };

  const handlePrint = (qrData: QrCodeResponse) => {
    // Build the print content as a Blob with object URL (safe approach)
    const htmlParts = [
      "<!DOCTYPE html><html><head>",
      "<title>QR-Code Tisch ",
      qrData.table_number,
      "</title>",
      "<style>",
      "body{display:flex;flex-direction:column;align-items:center;",
      "justify-content:center;min-height:100vh;margin:0;font-family:sans-serif}",
      "h2{margin-bottom:16px}p{color:#666;font-size:14px;margin-top:8px}",
      "</style></head><body>",
      "<h2>Tisch ",
      qrData.table_number,
      "</h2>",
      qrData.qr_svg,
      "<p>",
      qrData.order_url,
      "</p>",
      "</body></html>",
    ];
    const blob = new Blob(htmlParts, { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const printWindow = window.open(url, "_blank");
    if (!printWindow) {
      addToast("Popup-Blocker verhindert das Drucken", "error");
      URL.revokeObjectURL(url);
      return;
    }
    printWindow.addEventListener("afterprint", () => {
      URL.revokeObjectURL(url);
    });
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    addToast("URL kopiert", "success");
  };

  if (isLoading) {
    return <LoadingOverlay />;
  }

  if (!restaurant) {
    return (
      <div className="h-full flex flex-col bg-background text-foreground items-center justify-center">
        <p className="text-muted-foreground">Kein Restaurant gefunden</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background text-foreground overflow-hidden">
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
      <div className="shrink-0 border-b border-border bg-card shadow-sm">
        <div className="px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center shadow-lg shadow-orange-500/25">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  QR-Code Verwaltung
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  {restaurant.name} &mdash; {tableQrDataList.length} Tische
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1.5 md:pt-2">
              <Button
                size="sm"
                className="bg-primary text-white dark:text-foreground shadow-none hover:bg-primary hover:text-white dark:hover:text-foreground hover:shadow-none"
                onClick={handleBulkGenerate}
                disabled={bulkLoading}
              >
                {bulkLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <QrCode className="w-4 h-4 mr-2" />
                )}
                Alle QR-Codes generieren
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {tableQrDataList.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Keine Tische vorhanden
              </h2>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Tische im Grundriss-Editor, um QR-Codes zu
                generieren.
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-background/50">
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">
                      Tisch
                    </th>
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 hidden md:table-cell">
                      Status
                    </th>
                    <th className="text-left text-xs uppercase tracking-wide text-muted-foreground px-4 py-3 hidden lg:table-cell">
                      Bestell-URL
                    </th>
                    <th className="text-right text-xs uppercase tracking-wide text-muted-foreground px-4 py-3">
                      Aktionen
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {tableQrDataList.map((item) => (
                    <tr
                      key={item.table.id}
                      className="border-b border-border/50 hover:bg-accent/50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-sm font-semibold shrink-0">
                            {item.table.number}
                          </div>
                          <div>
                            <div className="font-medium text-foreground">
                              Tisch {item.table.number}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.table.capacity} Plaetze
                              {item.table.is_outdoor ? " (Aussen)" : ""}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {item.qrData ? (
                          <div className="flex items-center gap-1.5 text-sm text-green-500">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>QR-Code vorhanden</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <XCircle className="w-4 h-4" />
                            <span>Nicht generiert</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {item.qrData ? (
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs text-muted-foreground bg-background px-2 py-1 rounded truncate max-w-[300px] block">
                              {item.qrData.order_url}
                            </code>
                            <button
                              onClick={() =>
                                copyUrl(item.qrData!.order_url)
                              }
                              className="text-muted-foreground hover:text-orange-400 transition-colors"
                              title="URL kopieren"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            &mdash;
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewQr(item.table.id)}
                            disabled={item.loading}
                            title="QR-Code anzeigen / generieren"
                          >
                            {item.loading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <QrCode className="w-4 h-4" />
                            )}
                          </Button>
                          {item.qrData && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDownloadSvg(item.qrData!)
                                }
                                title="SVG herunterladen"
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handlePrint(item.qrData!)}
                                title="Drucken"
                              >
                                <Printer className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleRegenerateToken(item.table.id)
                            }
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                            title="Token neu generieren"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* QR-Code Preview Dialog */}
      <Dialog
        open={!!previewDialog}
        onOpenChange={() => setPreviewDialog(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border text-foreground">
          {previewDialog && (
            <>
              <DialogHeader>
                <DialogTitle>
                  QR-Code - Tisch {previewDialog.table_number}
                </DialogTitle>
                <DialogDescription>
                  Gaeste scannen diesen Code, um die Speisekarte aufzurufen und
                  zu bestellen.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-lg">
                  <SafeSvg svgString={previewDialog.qr_svg} />
                </div>
                <div className="w-full space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Bestell-URL:
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="text-xs bg-background px-2 py-1 rounded">
                        {previewDialog.order_url}
                      </code>
                      <button
                        onClick={() =>
                          copyUrl(previewDialog.order_url)
                        }
                        className="text-muted-foreground hover:text-orange-400 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token:</span>
                    <code className="text-xs bg-background px-2 py-1 rounded truncate max-w-[200px]">
                      {previewDialog.token}
                    </code>
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border pt-4 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPreviewDialog(null)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Schliessen
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadSvg(previewDialog)}
                >
                  <Download className="w-4 h-4 mr-1" />
                  SVG
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handlePrint(previewDialog)}
                >
                  <Printer className="w-4 h-4 mr-1" />
                  Drucken
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
