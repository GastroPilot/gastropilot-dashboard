import { api } from "./client";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  features: string[];
  tier: string;
}

export interface Subscription {
  id: string;
  plan: string;
  status: string;
  current_period_end: string | null;
}

export const billingApi = {
  getPlans: async (): Promise<SubscriptionPlan[]> => {
    return api.get<SubscriptionPlan[]>("/billing/plans");
  },

  getSubscription: async (): Promise<Subscription> => {
    return api.get<Subscription>("/billing/subscription");
  },

  createCheckout: async (planId: string): Promise<{ checkout_url: string }> => {
    return api.post<{ checkout_url: string }>("/billing/checkout", {
      plan_id: planId,
      success_url: `${window.location.origin}/dashboard/billing?success=true`,
      cancel_url: `${window.location.origin}/dashboard/billing?canceled=true`,
    });
  },

  openPortal: async (): Promise<{ url: string }> => {
    return api.post<{ url: string }>("/billing/portal", {});
  },
};

// Tier-basierte Feature-Limits
export const TIER_FEATURES: Record<string, string[]> = {
  free: ["reservations", "basic_dashboard"],
  starter: ["reservations", "basic_dashboard", "ai", "allergens", "analytics"],
  professional: [
    "reservations",
    "basic_dashboard",
    "ai",
    "allergens",
    "analytics",
    "orders",
    "kds",
    "qr_ordering",
    "crm",
    "sms",
  ],
  enterprise: [
    "reservations",
    "basic_dashboard",
    "ai",
    "allergens",
    "analytics",
    "orders",
    "kds",
    "qr_ordering",
    "crm",
    "sms",
    "multi_location",
    "api_access",
  ],
};

export function hasFeature(tier: string, feature: string): boolean {
  return (TIER_FEATURES[tier] || TIER_FEATURES.free).includes(feature);
}
