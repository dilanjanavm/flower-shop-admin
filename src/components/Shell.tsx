"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/store";
import { cn, initials } from "@/lib/format";
import { formatDateTime } from "@/lib/dates";
import { Icon, type IconName } from "./Icon";

type NavItem = { href: string; label: string; icon: IconName; ownerOnly?: boolean; badge?: number };

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, hydrated, signOut, theme, toggleTheme, orders, quotes, inventory, reviews, notices, markNoticesRead } = useAdmin();
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [bell, setBell] = useState(false);

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
    if (hydrated && session?.role === "RIDER") router.replace("/rider");
  }, [hydrated, session, router]);
  useEffect(() => setMobile(false), [pathname]);

  if (!hydrated || !session || session.role === "RIDER") {
    return <div className="grid min-h-dvh place-items-center"><span className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-accent" /></div>;
  }

  const owner = session.role === "OWNER";
  const slips = orders.filter((o) => o.orderStatus === "PAYMENT_REVIEW").length;
  const openQuotes = quotes.filter((q) => q.status === "REQUESTED").length;
  const low = inventory.filter((i) => i.stockQty <= i.reorderLevel).length;
  const pendingReviews = reviews.filter((r) => r.status === "PENDING").length;
  const unread = notices.filter((n) => !n.read).length;

  const groups: { title: string; items: NavItem[] }[] = [
    { title: "Overview", items: [{ href: "/", label: "Dashboard", icon: "grid" }] },
    {
      title: "Fulfilment",
      items: [
        { href: "/orders", label: "Orders board", icon: "kanban" },
        { href: "/quotations", label: "Quotations", icon: "inbox", badge: openQuotes },
        { href: "/payments", label: "Slip approvals", icon: "bank", ownerOnly: true, badge: slips },
        { href: "/delivery", label: "Delivery & riders", icon: "truck", ownerOnly: true },
      ],
    },
    {
      title: "Catalogue",
      items: [
        { href: "/products", label: "Products", icon: "flower", ownerOnly: true },
        { href: "/gallery", label: "Custom gallery", icon: "sparkle", ownerOnly: true },
        { href: "/inventory", label: "Stock & wastage", icon: "box", badge: low },
      ],
    },
    {
      title: "Customers",
      items: [
        { href: "/customers", label: "Customers", icon: "users", ownerOnly: true },
        { href: "/coupons", label: "Coupons", icon: "tag", ownerOnly: true },
        { href: "/reviews", label: "Reviews", icon: "star", ownerOnly: true, badge: pendingReviews },
      ],
    },
    {
      title: "Admin",
      items: [
        { href: "/reports", label: "Reports", icon: "chart", ownerOnly: true },
        { href: "/staff", label: "Staff", icon: "shield", ownerOnly: true },
        { href: "/audit", label: "Audit log", icon: "list", ownerOnly: true },
        { href: "/settings", label: "Settings", icon: "settings", ownerOnly: true },
      ],
    },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const Nav = (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-6" aria-label="Admin">
      {groups.map((g) => {
        const items = g.items.filter((i) => owner || !i.ownerOnly);
        if (!items.length) return null;
        return (
          <div key={g.title}>
            {!collapsed && <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-faint">{g.title}</p>}
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    title={collapsed ? i.label : undefined}
                    className={cn(
"group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      isActive(i.href) ? "bg-invert text-invert-fg" : "text-fg-soft hover:bg-panel-2 hover:text-fg",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    <Icon name={i.icon} size={18} />
                    {!collapsed && <span className="flex-1">{i.label}</span>}
                    {!!i.badge && (
                      <span className={cn("grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold", isActive(i.href) ? "bg-brand text-[#1b1714]" : "bg-accent-soft text-accent-fg", collapsed && "absolute right-1 top-0.5 h-4 min-w-4 text-[9px]")}>
                        {i.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Sidebar */}
      <aside className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-panel transition-[width] duration-300 lg:flex", collapsed ? "w-[76px]" : "w-64")}>
        <div className={cn("flex h-16 items-center gap-2 px-5", collapsed && "justify-center px-0")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={theme === "dark" ? "/brand/logo-mark-white.png" : "/brand/logo-mark.png"} alt="" className="h-8" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {!collapsed && <span className="text-[15px] font-semibold tracking-tight text-fg">Sithuliya Flora</span>}
        </div>
        {Nav}
        <div className="border-t border-line p-3">
          <button onClick={() => setCollapsed((c) => !c)} className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted hover:bg-panel-2 hover:text-fg", collapsed && "justify-center px-0")}>
            <Icon name="sidebar" size={18} /> {!collapsed && "Collapse"}
          </button>
        </div>
      </aside>

      {/* Mobile nav */}
      <div className={cn("fixed inset-0 z-[70] lg:hidden", mobile ? "visible" : "invisible")}>
        <button className={cn("absolute inset-0 bg-black/40 transition-opacity", mobile ? "opacity-100" : "opacity-0")} onClick={() => setMobile(false)} aria-label="Close menu" />
        <aside className={cn("absolute inset-y-0 left-0 flex w-72 flex-col bg-panel transition-transform duration-300", mobile ? "translate-x-0" : "-translate-x-full")}>
          <div className="flex h-16 items-center gap-2 px-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-mark.png" alt="" className="h-8" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="text-[15px] font-semibold tracking-tight text-fg">Sithuliya Flora</span>
          </div>
          {Nav}
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-3 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-panel-2 lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <div className="hidden text-sm text-muted md:block">
            {new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Colombo" }).format(new Date())}
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <a href="http://localhost:3000" target="_blank" rel="noreferrer" className="hidden h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[13px] text-fg-soft transition hover:border-fg/40 sm:flex">
              <Icon name="arrowUpRight" size={14} /> Storefront
            </a>
            <button onClick={toggleTheme} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-panel-2" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
              <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
            </button>
            <div className="relative">
              <button onClick={() => { setBell((b) => !b); }} className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-panel-2" aria-label={`Notifications, ${unread} unread`}>
                <Icon name="bell" size={19} />
                {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-accent ring-2 ring-bg" />}
              </button>
              {bell && (
                <div className="absolute right-0 top-12 w-80 animate-fade-up overflow-hidden rounded-xl border border-line bg-panel shadow-[var(--shadow-lift)]">
                  <div className="flex items-center justify-between border-b border-line px-4 py-3">
                    <p className="font-medium">Notifications</p>
                    <button onClick={markNoticesRead} className="text-xs text-muted hover:text-fg">Mark all read</button>
                  </div>
                  <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                    {notices.map((n) => (
                      <li key={n.id}>
                        <Link href={n.href} onClick={() => setBell(false)} className="flex gap-3 px-4 py-3 transition hover:bg-panel-2">
                          <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-accent")} />
                          <span className="min-w-0">
                            <span className="block text-sm font-medium">{n.title}</span>
                            <span className="block text-xs text-muted">{n.body}</span>
                            <span className="text-[11px] text-faint">{formatDateTime(n.at)}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="ml-1 flex items-center gap-2.5 rounded-full border border-line py-1 pl-1 pr-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-fg">{initials(session.name)}</span>
              <span className="hidden leading-tight sm:block">
                <span className="block text-[13px] font-medium">{session.name.split(" ")[0]}</span>
                <span className="block text-[11px] capitalize text-muted">{session.role.toLowerCase()}</span>
              </span>
              <button onClick={signOut} className="ml-1 text-muted hover:text-fg" aria-label="Sign out" title="Sign out"><Icon name="logout" size={17} /></button>
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div key={pathname} className="mx-auto max-w-[1400px] animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}

/** Blocks florists from Owner-only screens (the API enforces the same with RolesGuard). */
export function OwnerOnly({ children }: { children: React.ReactNode }) {
  const { session } = useAdmin();
  if (session?.role !== "OWNER")
    return (
      <div className="card mx-auto mt-10 max-w-md p-8 text-center">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-panel-2"><Icon name="lock" /></span>
        <p className="mt-4 font-semibold tracking-tight text-lg">Owner access only</p>
        <p className="mt-1 text-sm text-muted">Ask the shop owner if you need this screen.</p>
      </div>
    );
  return <>{children}</>;
}
