export type PaymentBucket = "cash" | "card" | "other";

export function classifyPaymentMethod(method: string | null | undefined): PaymentBucket {
  const normalized = (method ?? "").trim().toLowerCase();

  if (!normalized) return "other";
  if (["cash", "bar", "barzahlung"].includes(normalized)) return "cash";

  if (
    normalized.includes("sumup") ||
    normalized.includes("card") ||
    normalized.includes("ec") ||
    normalized.includes("kredit") ||
    normalized.includes("debit")
  ) {
    return "card";
  }

  return "other";
}

export const PAYMENT_BUCKET_LABEL: Record<PaymentBucket, string> = {
  cash: "Bar",
  card: "Karte",
  other: "Sonstige",
};
