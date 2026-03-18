"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Clock, Users, RefreshCw } from "lucide-react";

interface WaitlistStatus {
  position: number;
  estimated_wait_minutes: number;
  status: "waiting" | "ready" | "expired" | "seated";
  restaurant_name: string;
  party_size: number;
}

export default function WaitlistPage() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<WaitlistStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:80";
      const prefix = process.env.NEXT_PUBLIC_API_PREFIX || "v1";
      const response = await fetch(`${baseUrl}/${prefix}/public/waitlist/${token}`);
      if (!response.ok) throw new Error("Warteliste nicht gefunden");
      const data = await response.json();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchStatus();

    // Try SSE connection
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:80";
      const prefix = process.env.NEXT_PUBLIC_API_PREFIX || "v1";
      const es = new EventSource(`${baseUrl}/${prefix}/public/waitlist/${token}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setStatus(data);
          setError(null);
        } catch {
          // ignore parse errors
        }
      };

      es.onerror = () => {
        // Fallback to polling if SSE fails
        es.close();
        eventSourceRef.current = null;
        startPolling();
      };
    } catch {
      startPolling();
    }

    function startPolling() {
      if (!pollingRef.current) {
        pollingRef.current = setInterval(fetchStatus, 10000);
      }
    }

    return () => {
      eventSourceRef.current?.close();
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [token, fetchStatus]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="space-y-4 p-8">
            <Skeleton className="mx-auto h-24 w-24 rounded-full" />
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto h-4 w-64" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Bitte überprüfen Sie den Link oder fragen Sie beim Restaurant nach.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!status) return null;

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>{status.restaurant_name}</CardTitle>
          <p className="text-sm text-muted-foreground">Warteliste - Live-Tracking</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          {status.status === "ready" ? (
            <div className="rounded-lg bg-green-100 p-6 text-center">
              <p className="text-2xl font-bold text-green-700">Ihr Tisch ist bereit!</p>
              <p className="mt-2 text-sm text-green-600">
                Bitte begeben Sie sich zum Empfang.
              </p>
            </div>
          ) : status.status === "seated" ? (
            <div className="rounded-lg bg-primary/10 p-6 text-center">
              <p className="text-xl font-bold text-primary">Sie wurden platziert</p>
              <p className="mt-2 text-sm text-muted-foreground">Guten Appetit!</p>
            </div>
          ) : status.status === "expired" ? (
            <div className="rounded-lg bg-muted p-6 text-center">
              <p className="text-xl font-bold">Warteliste abgelaufen</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Bitte melden Sie sich erneut beim Restaurant.
              </p>
            </div>
          ) : (
            <>
              {/* Position Animation */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-primary">
                  <span className="text-4xl font-bold text-primary animate-pulse">
                    {status.position}
                  </span>
                </div>
                <p className="text-sm font-medium text-muted-foreground">
                  Position in der Warteschlange
                </p>
              </div>

              {/* Wait Time */}
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">
                      ca. {status.estimated_wait_minutes} Min.
                    </p>
                    <p className="text-xs text-muted-foreground">Geschätzte Wartezeit</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-lg font-semibold">{status.party_size}</p>
                    <p className="text-xs text-muted-foreground">Personen</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span>Wird automatisch aktualisiert</span>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
