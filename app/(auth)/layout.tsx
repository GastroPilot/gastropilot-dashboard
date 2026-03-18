"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api/auth";
import { LoadingOverlay } from "@/components/loading-overlay";

export default function AuthLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    if (authApi.isAuthenticated()) {
      // Bei bestehender Session direkt ins Dashboard schicken
      router.replace("/dashboard");
      return;
    }
    setCheckingAuth(false);
  }, [router]);

  if (checkingAuth) {
    return <LoadingOverlay variant="light" message="Weiterleitung..." />;
  }

  return <>{children}</>;
}
