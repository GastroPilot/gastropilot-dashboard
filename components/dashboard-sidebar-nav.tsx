"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import type { DashboardNavGroup, DashboardNavLink } from "@/lib/navigation/dashboard-nav";

type SidebarItemVariant = "dropdown" | "mobile" | "sidebar";

interface SidebarItemProps {
  link: DashboardNavLink;
  variant?: SidebarItemVariant;
  compact?: boolean;
  onNavigate?: () => void;
}

export function SidebarItem({ link, variant = "dropdown", compact = false, onNavigate }: SidebarItemProps) {
  if (variant === "mobile") {
    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={link.active ? "page" : undefined}
        className={cn(
          "flex items-center justify-between rounded-md px-3 py-2 min-h-[40px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          link.active
            ? "bg-accent text-foreground border border-primary"
            : "text-foreground hover:bg-accent border border-transparent"
        )}
      >
        <span>{link.label}</span>
        {link.active && <span className="text-xs text-primary">aktiv</span>}
      </Link>
    );
  }

  if (variant === "sidebar") {
    if (compact) {
      return (
        <Link
          href={link.href}
          title={link.label}
          aria-label={link.label}
          aria-current={link.active ? "page" : undefined}
          onClick={onNavigate}
          className={cn(
            "flex items-center justify-center rounded-md h-10 w-10 min-h-[40px] min-w-[40px] text-sm transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            link.active
              ? "bg-primary/10 text-foreground border-primary/60 shadow-sm"
              : "text-foreground hover:bg-accent border-transparent"
          )}
        >
          <span
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold border",
              link.active
                ? "bg-primary/20 border-primary/50 text-foreground"
                : "bg-muted border-border text-muted-foreground"
            )}
          >
            {link.label.charAt(0).toUpperCase()}
          </span>
          <span className="sr-only">{link.label}</span>
        </Link>
      );
    }

    return (
      <Link
        href={link.href}
        onClick={onNavigate}
        aria-current={link.active ? "page" : undefined}
        className={cn(
          "flex items-center justify-between px-3 py-2 min-h-[40px] rounded-md text-sm transition-all border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          link.active
            ? "bg-primary/10 text-foreground border-primary/60 shadow-sm"
            : "text-foreground hover:bg-accent border-transparent"
        )}
      >
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              "h-2 w-2 rounded-full shrink-0",
              link.active
                ? "bg-[#F95100] shadow-[0_0_0_3px_rgba(249,81,0,0.25)]"
                : "bg-muted-foreground/40"
            )}
          />
          <span className="truncate">{link.label}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={link.href}
      onClick={onNavigate}
      aria-current={link.active ? "page" : undefined}
      className={cn(
        "flex items-center justify-between px-3 py-2 min-h-[40px] rounded-md text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        link.active
          ? "bg-primary/10 text-foreground border border-primary/60 shadow-sm"
          : "text-foreground hover:bg-accent border border-transparent"
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "h-2 w-2 rounded-full",
            link.active
              ? "bg-[#F95100] shadow-[0_0_0_3px_rgba(249,81,0,0.25)]"
              : "bg-muted-foreground/40"
          )}
        />
        <span>{link.label}</span>
      </span>
    </Link>
  );
}

interface SidebarGroupProps {
  group: DashboardNavGroup;
  itemVariant?: SidebarItemVariant;
  compact?: boolean;
  collapsible?: boolean;
  expanded?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}

export function SidebarGroup({
  group,
  itemVariant = "dropdown",
  compact = false,
  collapsible = false,
  expanded = true,
  onToggle,
  onNavigate,
}: SidebarGroupProps) {
  const showGroupLabel = !(itemVariant === "sidebar" && compact);

  return (
    <div className="px-3">
      {showGroupLabel && (
        collapsible ? (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="w-full mb-1 inline-flex items-center justify-between rounded-md px-2 py-1.5 min-h-[40px] text-[11px] uppercase tracking-wide text-muted-foreground hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span>{group.title}</span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 transition-transform",
                expanded ? "rotate-180" : "rotate-0"
              )}
            />
          </button>
        ) : (
          <div className="text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">
            {group.title}
          </div>
        )
      )}
      {expanded && (
        <div className="space-y-0">
          {group.items.map((link) => (
            <SidebarItem
              key={link.href}
              link={link}
              variant={itemVariant}
              compact={compact}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface DashboardSidebarProps {
  groups: DashboardNavGroup[];
  itemVariant?: SidebarItemVariant;
  compact?: boolean;
  enableSubmenus?: boolean;
  className?: string;
  onNavigate?: () => void;
}

export function DashboardSidebar({
  groups,
  itemVariant = "dropdown",
  compact = false,
  enableSubmenus = false,
  className,
  onNavigate,
}: DashboardSidebarProps) {
  const hideItemsInCompactSidebar = itemVariant === "sidebar" && compact;

  const initialExpanded = useMemo(() => {
    const activeTitles = groups
      .filter((group) => group.items.some((item) => item.active))
      .map((group) => group.title);

    if (activeTitles.length === 0) {
      return groups.reduce<Record<string, boolean>>((acc, group, index) => {
        acc[group.title] = index === 0;
        return acc;
      }, {});
    }

    return groups.reduce<Record<string, boolean>>((acc, group) => {
      acc[group.title] = activeTitles.includes(group.title);
      return acc;
    }, {});
  }, [groups]);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(initialExpanded);

  useEffect(() => {
    setExpandedGroups((prev) => {
      const next: Record<string, boolean> = {};
      groups.forEach((group) => {
        const hasActive = group.items.some((item) => item.active);
        if (hasActive) {
          next[group.title] = true;
          return;
        }
        next[group.title] = prev[group.title] ?? initialExpanded[group.title] ?? false;
      });
      return next;
    });
  }, [groups, initialExpanded]);

  const collapsible = enableSubmenus && !hideItemsInCompactSidebar;

  if (hideItemsInCompactSidebar) {
    return <div className={cn("py-3", className)} aria-label="Navigation" />;
  }

  return (
    <div className={cn("py-3 space-y-0", className)} aria-label="Navigation">
      {groups.map((group) => (
        <SidebarGroup
          key={group.title}
          group={group}
          itemVariant={itemVariant}
          compact={compact}
          collapsible={collapsible}
          expanded={collapsible ? !!expandedGroups[group.title] : true}
          onToggle={
            collapsible
              ? () =>
                  setExpandedGroups((prev) => ({
                    ...prev,
                    [group.title]: !prev[group.title],
                  }))
              : undefined
          }
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

interface DashboardMobileGroupedNavProps {
  groups: DashboardNavGroup[];
  className?: string;
  onNavigate?: () => void;
}

export function DashboardMobileGroupedNav({
  groups,
  className,
  onNavigate,
}: DashboardMobileGroupedNavProps) {
  return (
    <DashboardSidebar
      groups={groups}
      itemVariant="mobile"
      enableSubmenus={true}
      className={cn("py-1 space-y-0", className)}
      onNavigate={onNavigate}
    />
  );
}
