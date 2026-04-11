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
  const isOwner = hasAnyRole(user, ["platform_admin", "owner"]);
  const canViewAuditLogs = hasAnyRole(user, ["platform_admin", "owner", "manager"]);

  const links: Array<DashboardNavLink & { show: boolean }> = [
    {
      href: "/dashboard",
      label: "Übersicht",
      active: currentPath === "/dashboard",
      show: true,
    },
    {
      href: "/dashboard/tischplan",
      label: "Tischplan",
      active: currentPath.startsWith("/dashboard/tischplan"),
      show: !!user && !isGrundstatus,
    },
    {
      href: "/dashboard/timeline",
      label: "Zeitplan",
      active: currentPath.startsWith("/dashboard/timeline"),
      show: !!user && !isGrundstatus,
    },
    {
      href: "/dashboard/reservations",
      label: "Reservierungen",
      active: currentPath.startsWith("/dashboard/reservations"),
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
      href: "/dashboard/restaurants",
      label: "Tenants",
      active: currentPath === "/dashboard/restaurants",
      show: user?.role === "platform_admin",
    },
    {
      href: "/dashboard/devices",
      label: "Geräte / KDS",
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
    title: "",
    hrefs: [
      "/dashboard",
    ],
  },
  {
    title: "SERVICE",
    hrefs: [
      "/dashboard/tischplan",
      "/dashboard/timeline",
      "/dashboard/reservations",
    ],
  },
  {
    title: "VERKAUF",
    hrefs: [
      "/dashboard/order-statistics",
      "/dashboard/order-history",
    ],
  },
  {
    title: "VERWALTUNG",
    hrefs: [
      "/dashboard/restaurants",
      "/dashboard/devices",
    ],
  },
  {
    title: "CONTROLLING",
    hrefs: [
      "/dashboard/owner-insights",
      "/dashboard/billing",
    ],
  },
  {
    title: "SYSTEM & SUPPORT",
    hrefs: [
      "/dashboard/fiskaly",
      "/dashboard/audit-logs",
      "/dashboard/user-settings",
      "/dashboard/hilfecenter",
    ],
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
