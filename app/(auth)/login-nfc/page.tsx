"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingOverlay } from "@/components/loading-overlay";

function NFCLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Wird angemeldet...");

  useEffect(() => {
    const handleNFCLogin = async () => {
      // Extrahiere Tag-ID aus URL-Parameter
      const tagId = searchParams.get("tag_id");
      
      if (!tagId) {
        setStatus("error");
        setMessage("Keine Tag-ID in der URL gefunden. Bitte scannen Sie den NFC-Transponder erneut.");
        return;
      }

      // Normalisiere die Tag-ID (entferne Leerzeichen, konvertiere zu Großbuchstaben)
      const normalizedTagId = tagId.trim().toUpperCase().replace(/\s+/g, "");

      try {
        setMessage("Melde an...");
        
        // Führe NFC-Login durch
        await authApi.loginNFC({ nfc_tag_id: normalizedTagId });
        
        // Prüfe ob Token gespeichert wurde
        const token = typeof window !== "undefined" 
          ? localStorage.getItem("access_token") 
          : null;
        
        if (!token) {
          setStatus("error");
          setMessage("Token konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
          return;
        }
        
        setStatus("success");
        setMessage("Erfolgreich angemeldet! Weiterleitung zum Dashboard...");
        
        // Weiterleitung zum Dashboard nach kurzer Verzögerung
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 1000);
        
      } catch (err) {
        console.error("NFC Login error:", err);
        setStatus("error");
        
        if (err instanceof ApiError) {
          if (err.status === 401) {
            setMessage("Ungültiger NFC-Transponder. Dieser Transponder ist keinem Benutzer zugeordnet.");
          } else if (err.status === 403) {
            setMessage("Benutzerkonto ist deaktiviert. Bitte kontaktieren Sie den Administrator.");
          } else {
            setMessage(err.message || "Fehler beim Anmelden. Bitte versuchen Sie es erneut.");
          }
        } else {
          setMessage("Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.");
        }
      }
    };

    handleNFCLogin();
  }, [searchParams, router]);

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>NFC-Login</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {status === "loading" && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">{message}</p>
              </div>
            )}
            
            {status === "success" && (
              <div className="text-center">
                <div className="rounded-full h-12 w-12 bg-green-600 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-green-400 font-medium">{message}</p>
              </div>
            )}
            
            {status === "error" && (
              <div className="space-y-4">
                <div className="text-center">
                  <div className="rounded-full h-12 w-12 bg-red-600 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <p className="text-red-400 font-medium mb-4">{message}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => router.push("/login")}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-foreground rounded-md transition-colors"
                  >
                    Zur normalen Anmeldung
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full px-4 py-2 bg-muted hover:bg-accent text-foreground rounded-md transition-colors"
                  >
                    Erneut versuchen
                  </button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function NFCLoginPage() {
  return (
    <Suspense fallback={
      <LoadingOverlay message="Wird geladen..." />
    }>
      <NFCLoginContent />
    </Suspense>
  );
}
