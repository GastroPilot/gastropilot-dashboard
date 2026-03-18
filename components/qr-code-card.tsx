"use client";

import { QRCodeSVG } from "qrcode.react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QrCode } from "lucide-react";

interface QrCodeCardProps {
  confirmationCode: string;
  restaurantSlug: string;
}

export function QrCodeCard({ confirmationCode, restaurantSlug }: QrCodeCardProps) {
  const qrValue = `gastropilot://reservation/${restaurantSlug}/${confirmationCode}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <QrCode className="h-5 w-5" />
          QR-Code
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <div className="rounded-lg bg-white p-4">
          <QRCodeSVG value={qrValue} size={200} level="M" />
        </div>
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Zeigen Sie diesen Code im Restaurant
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tracking-wider">
            {confirmationCode}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
