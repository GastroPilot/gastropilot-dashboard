import { describe, expect, it } from "vitest";
import {
  buildDashboardNavLinks,
  groupDashboardNavLinks,
  type DashboardNavLink,
} from "@/lib/navigation/dashboard-nav";
import type { User } from "@/lib/api/auth";

const buildUser = (role: User["role"], id = "u-1"): User => ({
  id,
  role,
  operator_number: "1001",
  first_name: "Test",
  last_name: "User",
  is_active: true,
});

const hrefs = (links: DashboardNavLink[]) => links.map((link) => link.href);

describe("dashboard navigation model", () => {
  it("hides day-to-day tenant pages in grundstatus for platform admin", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard",
      user: buildUser("platform_admin"),
      isGrundstatus: true,
    });
    const allHrefs = hrefs(links);

    expect(allHrefs).toContain("/dashboard");
    expect(allHrefs).toContain("/dashboard/restaurants");
    expect(allHrefs).toContain("/dashboard/user-settings");
    expect(allHrefs).toContain("/dashboard/audit-logs");
    expect(allHrefs).not.toContain("/dashboard/tischplan");

    expect(allHrefs).not.toContain("/dashboard/orders");
    expect(allHrefs).not.toContain("/dashboard/menu");
    expect(allHrefs).not.toContain("/dashboard/tenant-settings");
  });

  it("includes manager-specific pages but excludes owner-only pages for manager", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard/order-statistics",
      user: buildUser("manager"),
      isGrundstatus: false,
    });
    const allHrefs = hrefs(links);

    expect(allHrefs).toContain("/dashboard/order-history");
    expect(allHrefs).toContain("/dashboard/tischplan");
    expect(allHrefs).toContain("/dashboard/order-statistics");

    expect(allHrefs).not.toContain("/dashboard/restaurants");
    expect(allHrefs).not.toContain("/dashboard/operators");
    expect(allHrefs).not.toContain("/dashboard/finanzen");
    expect(allHrefs).not.toContain("/dashboard/finanzen/tse");
  });

  it("marks the current path as active", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard/order-history",
      user: buildUser("owner"),
      isGrundstatus: false,
    });

    const active = links.find((link) => link.active);
    expect(active?.href).toBe("/dashboard/order-history");
  });

  it("includes finance routes for owner and marks finance detail pages as active", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard/finanzen/tse",
      user: buildUser("owner"),
      isGrundstatus: false,
    });
    const allHrefs = hrefs(links);

    expect(allHrefs).not.toContain("/dashboard/finanzen");
    expect(allHrefs).toContain("/dashboard/finanzen/umsaetze");
    expect(allHrefs).toContain("/dashboard/finanzen/kartenlesegeraete");
    expect(allHrefs).toContain("/dashboard/finanzen/tse");
    expect(allHrefs).toContain("/dashboard/finanzen/rechnungs-editor");
    expect(allHrefs).toContain("/dashboard/finanzen/tagesabschluss");
    expect(allHrefs).not.toContain("/dashboard/finanzen/statistiken");
    expect(allHrefs).not.toContain("/dashboard/finanzen/finanzamt-export");
    expect(allHrefs).not.toContain("/dashboard/fiskaly");

    const active = links.find((link) => link.active);
    expect(active?.href).toBe("/dashboard/finanzen/tse");

    const grouped = groupDashboardNavLinks(links);
    expect(grouped.some((group) => group.title === "FINANZEN")).toBe(true);
  });

  it("groups links in the defined order and omits empty groups", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard/order-history",
      user: buildUser("manager"),
      isGrundstatus: false,
    });
    const grouped = groupDashboardNavLinks(links);

    expect(grouped.map((group) => group.title)).toEqual([
      "",
      "BETRIEB",
      "SYSTEM & SUPPORT",
    ]);

    expect(grouped[0].items[0].href).toBe("/dashboard");
    expect(grouped[1].items.some((item) => item.href === "/dashboard/tischplan")).toBe(true);
    expect(grouped[1].items.some((item) => item.href === "/dashboard/order-history")).toBe(true);
    expect(grouped[2].items.some((item) => item.href === "/dashboard/user-settings")).toBe(true);
  });

  it("places FINANZEN before SYSTEM group for owner", () => {
    const links = buildDashboardNavLinks({
      pathname: "/dashboard/finanzen/umsaetze",
      user: buildUser("owner"),
      isGrundstatus: false,
    });
    const grouped = groupDashboardNavLinks(links);

    expect(grouped.map((group) => group.title)).toEqual([
      "",
      "BETRIEB",
      "FINANZEN",
      "SYSTEM & SUPPORT",
    ]);

    const financeGroup = grouped.find((group) => group.title === "FINANZEN");
    expect(financeGroup).toBeDefined();
    expect(financeGroup?.items.some((item) => item.href === "/dashboard/finanzen/tagesabschluss")).toBe(true);
    expect(financeGroup?.items.some((item) => item.href === "/dashboard/finanzen/tse")).toBe(true);
    expect(financeGroup?.items.some((item) => item.href === "/dashboard/finanzen/finanzamt-export")).toBe(false);
  });
});
