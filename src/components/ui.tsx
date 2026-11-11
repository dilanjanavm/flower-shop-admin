"use client";

import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/format";
import { useAdmin } from "@/lib/store";
import { Icon, type IconName } from "./Icon";

type Variant = "primary" | "outline" | "ghost" | "accent" | "danger";
type Size = "sm" | "md";
const variants: Record<Variant, string> = {
  primary: "bg-invert text-invert-fg hover:opacity-90",
  outline: "border border-line bg-panel text-fg hover:border-fg/40",
  ghost: "text-fg-soft hover:bg-panel-2 hover:text-fg",
  accent: "bg-brand text-[#1b1714] hover:brightness-105",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
export const btn = (v: Variant = "primary", s: Size = "md", extra?: string) =>
  cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
    s === "sm" ? "h-8 px-3.5 text-[13px]" : "h-10 px-5 text-sm",
    variants[v],
    extra,
  );

export function Button({ variant = "primary", size = "md", className, ...rest }: { variant?: Variant; size?: Size } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={btn(variant, size, className)} {...rest} />;
}

export function LinkButton({ href, variant = "primary", size = "md", className, children }: { href: string; variant?: Variant; size?: Size; className?: string; children: ReactNode }) {
  return <Link href={href} className={btn(variant, size, className)}>{children}</Link>;
}

export type Tone = "neutral" | "accent" | "green" | "amber" | "red" | "blue" | "ink";
const tones: Record<Tone, string> = {
  neutral: "bg-panel-2 text-fg-soft",
  accent: "bg-accent-soft text-accent-fg",
  green: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300",
  red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  blue: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
  ink: "bg-invert text-invert-fg",
};
export function Badge({ tone = "neutral", children, dot, className }: { tone?: Tone; children: ReactNode; dot?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, icon, tone = "neutral", href, delay = 0 }: { label: string; value: ReactNode; hint?: ReactNode; icon: IconName; tone?: "neutral" | "accent" | "amber" | "red"; href?: string; delay?: number }) {
  const ring = { neutral: "bg-panel-2 text-fg-soft", accent: "bg-accent-soft text-accent-fg", amber: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300", red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" }[tone];
  const inner = (
    <div className="card group h-full animate-fade-up p-5 transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-start justify-between">
        <p className="text-[13px] text-muted">{label}</p>
        <span className={cn("grid h-9 w-9 place-items-center rounded-xl", ring)}><Icon name={icon} size={18} /></span>
      </div>
      <p className="mt-3 font-serif text-3xl tabular-nums tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

export function Field({ label, children, hint, error, className }: { label: string; children: ReactNode; hint?: string; error?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-400">{error}</span> : hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }: { checked: boolean; onChange: (v: boolean) => void; label?: string; description?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={() => onChange(!checked)} className="flex items-center justify-between gap-4 text-left disabled:opacity-40">
      {label && (
        <span>
          <span className="block text-sm font-medium">{label}</span>
          {description && <span className="block text-xs text-muted">{description}</span>}
        </span>
      )}
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", checked ? "bg-emerald-500" : "bg-line")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all duration-300", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-full bg-panel-2 p-1" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)} className={cn("flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm transition", value === t.key ? "bg-panel font-medium text-fg shadow-sm" : "text-muted hover:text-fg")}>
          {t.label}
          {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", value === t.key ? "bg-accent-soft text-accent-fg" : "bg-line/70")}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 animate-fade-in bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-label="Close" />
      <div className={cn("relative flex max-h-[92vh] w-full animate-fade-up flex-col overflow-hidden rounded-t-3xl border border-line bg-panel shadow-[var(--shadow-lift)] sm:rounded-3xl", wide ? "max-w-3xl" : "max-w-lg")}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-panel-2" aria-label="Close dialog"><Icon name="close" size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open, onClose]);
  return (
    <div className={cn("fixed inset-0 z-[75]", open ? "visible" : "invisible")}>
      <button className={cn("absolute inset-0 bg-black/35 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")} onClick={onClose} aria-label="Close" tabIndex={-1} />
      <aside role="dialog" aria-label={title} className={cn("absolute inset-y-0 right-0 flex w-full max-w-xl flex-col border-l border-line bg-panel shadow-[var(--shadow-lift)] transition-transform duration-500 ease-[var(--ease-out-soft)]", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h3 className="font-serif text-2xl">{title}</h3>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full hover:bg-panel-2" aria-label="Close"><Icon name="close" size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{open && children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function Empty({ icon, title, body, action }: { icon: IconName; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-panel-2 text-muted"><Icon name={icon} size={24} /></span>
      <p className="mt-4 font-serif text-xl">{title}</p>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "Search…"} className="field h-10 rounded-full pl-10" aria-label={placeholder ?? "Search"} />
    </div>
  );
}

export function Toaster() {
  const { toasts, dismissToast } = useAdmin();
  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[90] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto flex animate-fade-up items-start gap-3 rounded-2xl bg-invert px-4 py-3 text-invert-fg shadow-[var(--shadow-lift)]">
          <span className={cn("mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full", t.tone === "error" ? "bg-red-500 text-white" : t.tone === "success" ? "bg-emerald-500 text-white" : "bg-brand text-[#1b1714]")}>
            <Icon name={t.tone === "error" ? "alert" : "check"} size={13} strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{t.title}</p>
            {t.body && <p className="text-[13px] opacity-70">{t.body}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss" className="opacity-60 hover:opacity-100"><Icon name="close" size={15} /></button>
        </div>
      ))}
    </div>
  );
}

export function Thumb({ src, className }: { src?: string; className?: string }) {
  return (
    <span className={cn("block shrink-0 overflow-hidden bg-panel-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" /> : null}
    </span>
  );
}

/** Small CSV export helper (FR-ADMIN-01.3, FR-ADMIN-07.2). */
export function downloadCsv(name: string, rows: (string | number)[][]) {
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
