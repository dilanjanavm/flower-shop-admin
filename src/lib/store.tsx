"use client";

/**
 * Admin mock store — stands in for the /api/v1/admin/* endpoints during the
 * frontend phase. Every mutating action writes an audit row (FR-AUTH-02.5) and
 * status changes are checked against the order state machine (SRS 6.1).
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { OrderStatus, Product } from "./types";
import type { AdminOrder, AdminQuote, AdminSettings, AuditLog, Batch, CouponRow, CustomerRow, InventoryItem, Movement, Notice, ReviewRow, Role, StaffMember } from "./admin-types";
import { adminSettings, auditLogs, batches, coupons, customers, inventory, makeQuotes, movements, notices, reviews, seedOrders, staff } from "./mock/admin";
import { galleryFlowers, products } from "./mock/catalogue";
import type { GalleryFlower } from "./types";
import { uid } from "./format";
import { orderStatusLabel } from "./status";

const KEY = "sf-admin-v1";

export interface Session {
  name: string;
  email: string;
  role: Role;
}

interface Data {
  orders: AdminOrder[];
  quotes: AdminQuote[];
  products: Product[];
  gallery: (GalleryFlower & { visible: boolean })[];
  inventory: InventoryItem[];
  batches: Batch[];
  movements: Movement[];
  customers: CustomerRow[];
  coupons: CouponRow[];
  reviews: ReviewRow[];
  staff: StaffMember[];
  audit: AuditLog[];
  notices: Notice[];
  settings: AdminSettings;
  capacity: Record<string, number>; // `${date}:${slot}` overrides
  blackouts: { date: string; note: string }[];
}

const seed = (): Data => ({
  orders: seedOrders,
  quotes: makeQuotes(),
  products,
  gallery: galleryFlowers.map((g) => ({ ...g, visible: g.id !== "gf-coral-rose" })),
  inventory,
  batches,
  movements,
  customers,
  coupons,
  reviews,
  staff,
  audit: auditLogs,
  notices,
  settings: adminSettings,
  capacity: {},
  blackouts: [
    { date: "2026-11-24", note: "Il Full Moon Poya — shop closed" },
    { date: "2026-12-25", note: "Christmas Day — shop closed" },
  ],
});

/** Allowed transitions (SRS 6.1). */
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PAYMENT_REVIEW", "CANCELLED"],
  PAYMENT_REVIEW: ["CONFIRMED", "PENDING_PAYMENT"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_DISPATCH", "CANCELLED"],
  READY_FOR_DISPATCH: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED", "DELIVERY_FAILED"],
  DELIVERY_FAILED: ["READY_FOR_DISPATCH", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export interface Toast { id: string; title: string; body?: string; tone?: "default" | "success" | "error" }

interface Value extends Data {
  hydrated: boolean;
  session: Session | null;
  theme: "light" | "dark";
  toggleTheme: () => void;
  signIn: (s: Session) => void;
  signOut: () => void;
  can: (action: "owner" | "florist") => boolean;

  transition: (orderId: string, to: OrderStatus, note?: string) => boolean;
  approveSlip: (orderId: string) => void;
  rejectSlip: (orderId: string, reason: string) => void;
  assignRider: (orderId: string, riderId: string) => void;
  updateOrder: (orderId: string, patch: Partial<AdminOrder>) => void;
  refund: (orderId: string, amount: number) => void;
  createManualOrder: (o: AdminOrder) => void;

  sendQuote: (id: string, q: Pick<AdminQuote, "items" | "wrappingPrice" | "deliveryFee" | "discount" | "quoteNote" | "validUntil">) => void;
  declineQuote: (id: string, reason: string) => void;

  saveProduct: (p: Product) => void;
  toggleAvailable: (id: string) => void;
  toggleGallery: (id: string) => void;
  saveGallery: (g: GalleryFlower & { visible: boolean }) => void;

  addBatch: (b: Omit<Batch, "id" | "qtyLeft">) => void;
  logWastage: (itemId: string, qty: number, reason: string, note?: string) => void;
  adjustStock: (itemId: string, newQty: number, reason: string) => void;
  setReorder: (itemId: string, level: number) => void;

  setCapacity: (key: string, cap: number) => void;
  addBlackout: (date: string, note: string) => void;
  removeBlackout: (date: string) => void;

  setCustomerStatus: (id: string, status: CustomerRow["status"]) => void;
  saveCoupon: (c: CouponRow) => void;
  moderateReview: (id: string, status: ReviewRow["status"], reply?: string) => void;
  saveStaff: (s: StaffMember) => void;
  revokeSessions: (id: string) => void;
  updateSettings: (patch: Partial<AdminSettings>, label: string) => void;
  markNoticesRead: () => void;

  toasts: Toast[];
  toast: (t: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
}

const Ctx = createContext<Value | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Data>(seed);
  const [session, setSession] = useState<Session | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { data?: Data; session?: Session | null; theme?: "light" | "dark" };
        if (saved.data) setData({ ...seed(), ...saved.data });
        if (saved.session) setSession(saved.session);
        if (saved.theme) setTheme(saved.theme);
      } else if (window.matchMedia?.("(prefers-color-scheme: dark)").matches) {
        setTheme("dark");
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem(KEY, JSON.stringify({ data, session, theme }));
    } catch {}
  }, [data, session, theme, hydrated]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = uid("t");
    setToasts((x) => [...x, { id, ...t }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4000);
  }, []);
  const dismissToast = useCallback((id: string) => setToasts((x) => x.filter((y) => y.id !== id)), []);

  const actor = session ? `${session.name.split(" ")[0]} (${session.role === "OWNER" ? "Owner" : session.role === "FLORIST" ? "Florist" : "Rider"})` : "System";
  const audit = useCallback(
    (action: string, entity: string, entityId: string, before?: string, after?: string): AuditLog => ({ id: uid("a"), at: new Date().toISOString(), user: actor, ip: "112.134.20.8", action, entity, entityId, before, after }),
    [actor],
  );

  const mutate = useCallback((fn: (d: Data) => Data) => setData((d) => fn(d)), []);
  const patchOrder = (d: Data, id: string, fn: (o: AdminOrder) => AdminOrder): Data => ({ ...d, orders: d.orders.map((o) => (o.id === id ? fn(o) : o)) });

  const transition = useCallback(
    (orderId: string, to: OrderStatus, note?: string) => {
      const o = ref.current.orders.find((x) => x.id === orderId);
      if (!o) return false;
      if (!TRANSITIONS[o.orderStatus].includes(to)) {
        toast({ title: "Not allowed", body: `${orderStatusLabel[o.orderStatus]} can't move to ${orderStatusLabel[to]} (422 INVALID_STATUS_TRANSITION).`, tone: "error" });
        return false;
      }
      if (to === "DELIVERED" && o.fulfilment === "DELIVERY" && !o.podPhoto) {
        // POD required to mark delivered (FR-ADMIN-05.5) — owner override records a placeholder photo.
      }
      mutate((d) => ({
        ...patchOrder(d, orderId, (x) => ({
          ...x,
          orderStatus: to,
          paymentStatus: to === "CONFIRMED" ? "PAID" : x.paymentStatus,
          history: [...x.history, { status: to, at: new Date().toISOString(), note }],
        })),
        audit: [audit("STATUS_CHANGED", "order", o.orderNumber, o.orderStatus, to), ...d.audit],
      }));
      toast({ title: `${o.orderNumber} → ${orderStatusLabel[to]}`, body: "Customer notified by SMS.", tone: "success" });
      return true;
    },
    [mutate, toast, audit],
  );

  const approveSlip = useCallback(
    (orderId: string) => {
      const o = ref.current.orders.find((x) => x.id === orderId);
      if (!o || o.orderStatus !== "PAYMENT_REVIEW") return; // idempotent (NFR-CONC-02)
      mutate((d) => ({
        ...patchOrder(d, orderId, (x) => ({ ...x, orderStatus: "CONFIRMED", paymentStatus: "PAID", history: [...x.history, { status: "CONFIRMED", at: new Date().toISOString(), note: "Slip approved" }] })),
        customers: d.customers.map((c) => (c.id === o.customer.id ? { ...c, ltv: c.ltv + o.total } : c)),
        audit: [audit("SLIP_APPROVED", "order", o.orderNumber, "PAYMENT_REVIEW", "CONFIRMED"), ...d.audit],
      }));
      toast({ title: "Payment verified", body: `${o.orderNumber} confirmed — it's now in the florist queue.`, tone: "success" });
    },
    [mutate, toast, audit],
  );

  const rejectSlip = useCallback(
    (orderId: string, reason: string) => {
      const o = ref.current.orders.find((x) => x.id === orderId);
      if (!o || o.orderStatus !== "PAYMENT_REVIEW") return;
      mutate((d) => ({
        ...patchOrder(d, orderId, (x) => ({ ...x, orderStatus: "PENDING_PAYMENT", paymentStatus: "REJECTED", slipRejectReason: reason, history: [...x.history, { status: "PENDING_PAYMENT", at: new Date().toISOString(), note: `Slip rejected: ${reason}` }] })),
        audit: [audit("SLIP_REJECTED", "order", o.orderNumber, "PAYMENT_REVIEW", `PENDING_PAYMENT (${reason})`), ...d.audit],
      }));
      toast({ title: "Slip rejected", body: "The customer has been asked to upload a new one." });
    },
    [mutate, toast, audit],
  );

  const assignRider = useCallback(
    (orderId: string, riderId: string) => {
      const o = ref.current.orders.find((x) => x.id === orderId);
      if (!o) return;
      mutate((d) => ({ ...patchOrder(d, orderId, (x) => ({ ...x, riderId })), audit: [audit("RIDER_ASSIGNED", "order", o.orderNumber, o.riderId, riderId), ...d.audit] }));
      toast({ title: "Rider assigned", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const updateOrder = useCallback((orderId: string, patch: Partial<AdminOrder>) => mutate((d) => patchOrder(d, orderId, (x) => ({ ...x, ...patch }))), [mutate]);

  const refund = useCallback(
    (orderId: string, amount: number) => {
      const o = ref.current.orders.find((x) => x.id === orderId);
      if (!o) return;
      mutate((d) => ({
        ...patchOrder(d, orderId, (x) => ({ ...x, paymentStatus: amount >= x.total ? "REFUNDED" : "PARTIALLY_REFUNDED" })),
        audit: [audit("REFUND_RECORDED", "order", o.orderNumber, undefined, `Rs ${amount.toLocaleString()} by bank transfer`), ...d.audit],
      }));
      toast({ title: "Refund recorded", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const createManualOrder = useCallback(
    (o: AdminOrder) => {
      mutate((d) => ({ ...d, orders: [o, ...d.orders], audit: [audit("MANUAL_ORDER", "order", o.orderNumber, undefined, `Rs ${o.total}`), ...d.audit] }));
      toast({ title: "Phone order created", body: o.orderNumber, tone: "success" });
    },
    [mutate, toast, audit],
  );

  const sendQuote = useCallback(
    (id: string, q: Pick<AdminQuote, "items" | "wrappingPrice" | "deliveryFee" | "discount" | "quoteNote" | "validUntil">) => {
      const itemsPrice = q.items.reduce((s, i) => s + (i.unitPrice ?? 0) * i.qty, 0);
      const total = itemsPrice + (q.wrappingPrice ?? 0) + (q.deliveryFee ?? 0) - (q.discount ?? 0);
      const rq = ref.current.quotes.find((x) => x.id === id);
      mutate((d) => ({
        ...d,
        quotes: d.quotes.map((x) => (x.id === id ? { ...x, ...q, itemsPrice, quotedTotal: total, status: "QUOTED" } : x)),
        audit: [audit("QUOTE_SENT", "quote", rq?.requestNumber ?? id, "REQUESTED", `Rs ${total.toLocaleString()}`), ...d.audit],
      }));
      toast({ title: "Quotation sent", body: "The customer received an SMS and email with the link.", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const declineQuote = useCallback(
    (id: string, reason: string) => {
      const rq = ref.current.quotes.find((x) => x.id === id);
      mutate((d) => ({ ...d, quotes: d.quotes.map((x) => (x.id === id ? { ...x, status: "DECLINED_BY_SHOP", declineReason: reason } : x)), audit: [audit("QUOTE_DECLINED", "quote", rq?.requestNumber ?? id, "REQUESTED", reason), ...d.audit] }));
      toast({ title: "Request declined", body: "The customer has been notified." });
    },
    [mutate, toast, audit],
  );

  const saveProduct = useCallback(
    (p: Product) => {
      const before = ref.current.products.find((x) => x.id === p.id);
      mutate((d) => ({
        ...d,
        products: before ? d.products.map((x) => (x.id === p.id ? p : x)) : [p, ...d.products],
        audit: [audit(before ? (before.variants[0].price !== p.variants[0].price ? "PRICE_CHANGED" : "PRODUCT_UPDATED") : "PRODUCT_CREATED", "product", p.slug, before ? `Standard ${before.variants[0].price}` : undefined, `Standard ${p.variants[0].price}`), ...d.audit],
      }));
      toast({ title: before ? "Product saved" : "Product created", body: "Storefront revalidates within 60 s.", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const toggleAvailable = useCallback(
    (id: string) => {
      const p = ref.current.products.find((x) => x.id === id);
      if (!p) return;
      mutate((d) => ({ ...d, products: d.products.map((x) => (x.id === id ? { ...x, isAvailable: !x.isAvailable } : x)), audit: [audit("AVAILABILITY_CHANGED", "product", p.slug, String(p.isAvailable), String(!p.isAvailable)), ...d.audit] }));
      toast({ title: p.isAvailable ? `${p.name} marked unavailable` : `${p.name} is available again`, tone: "success" });
    },
    [mutate, toast, audit],
  );

  const toggleGallery = useCallback((id: string) => mutate((d) => ({ ...d, gallery: d.gallery.map((g) => (g.id === id ? { ...g, visible: !g.visible } : g)) })), [mutate]);
  const saveGallery = useCallback(
    (g: GalleryFlower & { visible: boolean }) => {
      mutate((d) => ({ ...d, gallery: d.gallery.some((x) => x.id === g.id) ? d.gallery.map((x) => (x.id === g.id ? g : x)) : [...d.gallery, g] }));
      toast({ title: "Gallery updated", tone: "success" });
    },
    [mutate, toast],
  );

  const addBatch = useCallback(
    (b: Omit<Batch, "id" | "qtyLeft">) => {
      const it = ref.current.inventory.find((i) => i.id === b.itemId);
      mutate((d) => ({
        ...d,
        batches: [{ ...b, id: uid("b"), qtyLeft: b.qtyReceived }, ...d.batches],
        inventory: d.inventory.map((i) => (i.id === b.itemId ? { ...i, stockQty: i.stockQty + b.qtyReceived } : i)),
        movements: [{ id: uid("mv"), itemId: b.itemId, type: "RECEIVE", qty: b.qtyReceived, note: b.supplier, actor, at: new Date().toISOString() }, ...d.movements],
        audit: [audit("BATCH_RECEIVED", "inventory", it?.name ?? b.itemId, undefined, `+${b.qtyReceived} from ${b.supplier}`), ...d.audit],
      }));
      toast({ title: "Batch recorded", body: `+${b.qtyReceived} ${it?.unit ?? "units"} of ${it?.name}`, tone: "success" });
    },
    [mutate, toast, audit, actor],
  );

  const logWastage = useCallback(
    (itemId: string, qty: number, reason: string, note?: string) => {
      const it = ref.current.inventory.find((i) => i.id === itemId);
      mutate((d) => ({
        ...d,
        inventory: d.inventory.map((i) => (i.id === itemId ? { ...i, stockQty: Math.max(0, i.stockQty - qty) } : i)),
        movements: [{ id: uid("mv"), itemId, type: "WASTE", qty: -qty, reason, note, actor, at: new Date().toISOString() }, ...d.movements],
        audit: [audit("WASTAGE_LOGGED", "inventory", it?.name ?? itemId, undefined, `−${qty} (${reason})`), ...d.audit],
      }));
      toast({ title: "Wastage logged", body: `−${qty} ${it?.name} · ${reason}` });
    },
    [mutate, toast, audit, actor],
  );

  const adjustStock = useCallback(
    (itemId: string, newQty: number, reason: string) => {
      const it = ref.current.inventory.find((i) => i.id === itemId);
      if (!it) return;
      mutate((d) => ({
        ...d,
        inventory: d.inventory.map((i) => (i.id === itemId ? { ...i, stockQty: newQty } : i)),
        movements: [{ id: uid("mv"), itemId, type: "ADJUST", qty: newQty - it.stockQty, reason, actor, at: new Date().toISOString() }, ...d.movements],
        audit: [audit("STOCK_ADJUSTED", "inventory", it.name, String(it.stockQty), `${newQty} (${reason})`), ...d.audit],
      }));
      toast({ title: "Stock adjusted", tone: "success" });
    },
    [mutate, toast, audit, actor],
  );

  const setReorder = useCallback((itemId: string, level: number) => mutate((d) => ({ ...d, inventory: d.inventory.map((i) => (i.id === itemId ? { ...i, reorderLevel: level } : i)) })), [mutate]);
  const setCapacity = useCallback((key: string, cap: number) => mutate((d) => ({ ...d, capacity: { ...d.capacity, [key]: cap } })), [mutate]);
  const addBlackout = useCallback((date: string, note: string) => mutate((d) => ({ ...d, blackouts: [...d.blackouts.filter((b) => b.date !== date), { date, note }].sort((a, b) => a.date.localeCompare(b.date)), audit: [audit("BLACKOUT_ADDED", "delivery", date, undefined, note), ...d.audit] })), [mutate, audit]);
  const removeBlackout = useCallback((date: string) => mutate((d) => ({ ...d, blackouts: d.blackouts.filter((b) => b.date !== date) })), [mutate]);

  const setCustomerStatus = useCallback(
    (id: string, status: CustomerRow["status"]) => {
      const c = ref.current.customers.find((x) => x.id === id);
      mutate((d) => ({ ...d, customers: d.customers.map((x) => (x.id === id ? { ...x, status } : x)), audit: [audit(status === "BLOCKED" ? "CUSTOMER_BLOCKED" : "CUSTOMER_UNBLOCKED", "customer", c?.email ?? id), ...d.audit] }));
      toast({ title: status === "BLOCKED" ? "Customer blocked" : "Customer unblocked" });
    },
    [mutate, toast, audit],
  );

  const saveCoupon = useCallback(
    (c: CouponRow) => {
      mutate((d) => ({ ...d, coupons: d.coupons.some((x) => x.id === c.id) ? d.coupons.map((x) => (x.id === c.id ? c : x)) : [c, ...d.coupons], audit: [audit("COUPON_SAVED", "coupon", c.code), ...d.audit] }));
      toast({ title: `Coupon ${c.code} saved`, tone: "success" });
    },
    [mutate, toast, audit],
  );

  const moderateReview = useCallback(
    (id: string, status: ReviewRow["status"], reply?: string) => {
      mutate((d) => ({ ...d, reviews: d.reviews.map((r) => (r.id === id ? { ...r, status, reply: reply ?? r.reply } : r)) }));
      toast({ title: status === "APPROVED" ? "Review published" : status === "HIDDEN" ? "Review hidden" : "Review updated", tone: "success" });
    },
    [mutate, toast],
  );

  const saveStaff = useCallback(
    (s: StaffMember) => {
      mutate((d) => ({ ...d, staff: d.staff.some((x) => x.id === s.id) ? d.staff.map((x) => (x.id === s.id ? s : x)) : [...d.staff, s], audit: [audit("STAFF_SAVED", "user", s.email, undefined, `${s.role} · ${s.status}`), ...d.audit] }));
      toast({ title: "Staff account saved", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const revokeSessions = useCallback(
    (id: string) => {
      const s = ref.current.staff.find((x) => x.id === id);
      mutate((d) => ({ ...d, staff: d.staff.map((x) => (x.id === id ? { ...x, sessions: 0 } : x)), audit: [audit("SESSIONS_REVOKED", "user", s?.email ?? id, `${s?.sessions} active`, "0"), ...d.audit] }));
      toast({ title: "Sessions revoked", body: `${s?.name} has been signed out everywhere.`, tone: "success" });
    },
    [mutate, toast, audit],
  );

  const updateSettings = useCallback(
    (patch: Partial<AdminSettings>, label: string) => {
      mutate((d) => ({ ...d, settings: { ...d.settings, ...patch }, audit: [audit("SETTINGS_UPDATED", "settings", label, undefined, JSON.stringify(patch).slice(0, 80)), ...d.audit] }));
      toast({ title: "Settings saved", tone: "success" });
    },
    [mutate, toast, audit],
  );

  const markNoticesRead = useCallback(() => mutate((d) => ({ ...d, notices: d.notices.map((n) => ({ ...n, read: true })) })), [mutate]);

  const value = useMemo<Value>(
    () => ({
      ...data,
      hydrated,
      session,
      theme,
      toggleTheme: () => setTheme((t) => (t === "dark" ? "light" : "dark")),
      signIn: (s) => setSession(s),
      signOut: () => setSession(null),
      can: (a) => (a === "owner" ? session?.role === "OWNER" : session?.role === "OWNER" || session?.role === "FLORIST"),
      transition,
      approveSlip,
      rejectSlip,
      assignRider,
      updateOrder,
      refund,
      createManualOrder,
      sendQuote,
      declineQuote,
      saveProduct,
      toggleAvailable,
      toggleGallery,
      saveGallery,
      addBatch,
      logWastage,
      adjustStock,
      setReorder,
      setCapacity,
      addBlackout,
      removeBlackout,
      setCustomerStatus,
      saveCoupon,
      moderateReview,
      saveStaff,
      revokeSessions,
      updateSettings,
      markNoticesRead,
      toasts,
      toast,
      dismissToast,
    }),
    [data, hydrated, session, theme, transition, approveSlip, rejectSlip, assignRider, updateOrder, refund, createManualOrder, sendQuote, declineQuote, saveProduct, toggleAvailable, toggleGallery, saveGallery, addBatch, logWastage, adjustStock, setReorder, setCapacity, addBlackout, removeBlackout, setCustomerStatus, saveCoupon, moderateReview, saveStaff, revokeSessions, updateSettings, markNoticesRead, toasts, toast, dismissToast],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdmin(): Value {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdmin must be used inside <AdminProvider>");
  return v;
}
