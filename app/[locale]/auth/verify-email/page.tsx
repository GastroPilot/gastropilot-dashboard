"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { guestAuthApi } from "@/lib/api/auth";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Kein Verifizierungstoken gefunden.");
      return;
    }

    guestAuthApi
      .verifyEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMessage(
          err instanceof Error ? err.message : "Die Verifizierung ist fehlgeschlagen."
        );
      });
  }, [token]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <Card>
        <CardContent className="flex flex-col items-center p-8 text-center">
          {status === "loading" && (
            <>
              <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
              <h1 className="text-xl font-semibold">E-Mail wird verifiziert...</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Bitte warten Sie einen Moment.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle className="mb-4 h-12 w-12 text-green-500" />
              <h1 className="text-xl font-semibold">E-Mail verifiziert!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
              </p>
              <Link href="/auth/login" className="mt-6">
                <Button>Zum Login</Button>
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <XCircle className="mb-4 h-12 w-12 text-destructive" />
              <h1 className="text-xl font-semibold">Verifizierung fehlgeschlagen</h1>
              <p className="mt-2 text-sm text-muted-foreground">{errorMessage}</p>
              <Link href="/auth/login" className="mt-6">
                <Button variant="outline">Zum Login</Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md px-4 py-16">
          <Card>
            <CardContent className="flex flex-col items-center p-8">
              <Skeleton className="mb-4 h-12 w-12 rounded-full" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="mt-2 h-4 w-64" />
            </CardContent>
          </Card>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
