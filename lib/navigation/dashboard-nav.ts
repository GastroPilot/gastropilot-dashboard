import type { User } from "@/lib/api/auth";

export interface DashboardNavLink {
  href: string;
  label: string;
  active: boolean;
}

export interface DashboardNavGroup {
  title: string;
  items: DashboardNavLink[];
}

interface DashboardNavBuildParams {
  pathname: string | null;
  user: User | null;
  isGrundstatus: boolean;
}

const hasAnyRole = (user: User | null, roles: string[]): boolean => {
  return Boolean(user && roles.includes(user.role));
};

export function buildDashboardNavLinks({
  pathname,
  user,
  isGrundstatus,
}: DashboardNavBuildParams): DashboardNavLink[] {
  const currentPath = pathname ?? "";
  const canManageRestaurant = hasAnyRole(user, ["platform_admin", "owner", "manager"]);
  const isOwner = hasAnyRole(user, ["platform_admin", "owner"]);
  const canViewAuditLogs = hasAnyRole(user, ["platform_admin", "owner", "manager"]);

  const links: Array<DashboardNavLink & { show: boolean }> = [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: currentPath === "/dashboard",
      show: true,
    },
    {
      href: "/dashboard/orders",
      label: "Bestellungen",
      active: currentPath.startsWith("/dashboard/orders"),
      show: !!user && !isGrundstatus,
    },
    {
      href: "/dashboard/kitchen",
      label: "Küchen-Ansicht",
      active: currentPath.startsWith("/dashboard/kitchen"),
      show: !!user && !isGrundstatus,
    },
    {
      href: "/dashboard/order-statistics",
      label: "Bestellstatistiken",
      active: currentPath.startsWith("/dashboard/order-statistics"),
      show: !!user && user.role === "manager" && !isGrundstatus,
    },
    {
      href: "/dashboard/order-history",
      label: "Bestellhistorie",
      active: currentPath.startsWith("/dashboard/order-history"),
      show: !!user && !isGrundstatus,
    },
    {
      href: "/dashboard/menu",
      label: "Menü verwalten",
      active: currentPath.startsWith("/dashboard/menu"),
      show: canManageRestaurant && !isGrundstatus,
    },
    {
      href: "/dashboard/qr-codes",
      label: "QR-Codes",
      active: currentPath.startsWith("/dashboard/qr-codes"),
      show: canManageRestaurant && !isGrundstatus,
    },
    {
      href: "/dashboard/guests",
      label: "Gäste / CRM",
      active: currentPath.startsWith("/dashboard/guests"),
      show: canManageRestaurant && !isGrundstatus,
    },
    {
      href: "/dashboard/restaurants",
      label: "Tenants",
      active: currentPath === "/dashboard/restaurants",
      show: user?.role === "platform_admin",
    },
    {
      href: "/dashboard/tenant-settings",
      label: "Restaurant-Einstellungen",
      active: currentPath === "/dashboard/tenant-settings",
      show: canManageRestaurant && !isGrundstatus,
    },
    {
      href: "/dashboard/operators",
      label: "Bedienerverwaltung",
      active: currentPath === "/dashboard/operators",
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/devices",
      label: "Geraete / KDS",
      active: currentPath.startsWith("/dashboard/devices"),
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/owner-insights",
      label: "Kennzahlen",
      active: currentPath.startsWith("/dashboard/owner-insights"),
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/ai-insights",
      label: "KI-Prognosen",
      active: currentPath.startsWith("/dashboard/ai-insights"),
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/billing",
      label: "Abonnement",
      active: currentPath.startsWith("/dashboard/billing"),
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/fiskaly",
      label: "TSE / KassenSichV",
      active: currentPath.startsWith("/dashboard/fiskaly"),
      show: isOwner && !isGrundstatus,
    },
    {
      href: "/dashboard/hilfecenter",
      label: "Hilfecenter",
      active: currentPath.startsWith("/dashboard/hilfecenter"),
      show: !!user,
    },
    {
      href: "/dashboard/user-settings",
      label: "Benutzereinstellungen",
      active: currentPath === "/dashboard/user-settings",
      show: !!user,
    },
    {
      href: "/dashboard/audit-logs",
      label: "Audit-Logs",
      active: currentPath === "/dashboard/audit-logs",
      show: canViewAuditLogs,
    },
  ];

  return links
    .filter((link) => link.show)
    .map(({ show: _show, ...link }) => link);
}

const GROUP_ORDER: Array<{ title: string; hrefs: string[] }> = [
  {
    title: "TAGESGESCHÄFT",
    hrefs: [
      "/dashboard",
      "/dashboard/orders",
      "/dashboard/kitchen",
      "/dashboard/menu",
      "/dashboard/qr-codes",
      "/dashboard/order-statistics",
      "/dashboard/order-history",
      "/dashboard/hilfecenter",
    ],
  },
  {
    title: "VERWALTUNG",
    hrefs: [
      "/dashboard/restaurants",
      "/dashboard/tenant-settings",
      "/dashboard/operators",
      "/dashboard/guests",
      "/dashboard/devices",
      "/dashboard/owner-insights",
      "/dashboard/ai-insights",
      "/dashboard/billing",
      "/dashboard/fiskaly",
    ],
  },
  {
    title: "SYSTEM",
    hrefs: ["/dashboard/user-settings", "/dashboard/audit-logs"],
  },
];

export function groupDashboardNavLinks(navLinks: DashboardNavLink[]): DashboardNavGroup[] {
  const map = new Map(navLinks.map((link) => [link.href, link]));
  return GROUP_ORDER
    .map((group) => ({
      title: group.title,
      items: group.hrefs
        .map((href) => map.get(href))
        .filter((item): item is DashboardNavLink => Boolean(item)),
    }))
    .filter((group) => group.items.length > 0);
}
