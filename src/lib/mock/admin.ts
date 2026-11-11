import type { OrderStatus, PaymentStatus, SlotCode, StatusEvent } from "../types";
import type {
  AdminOrder,
  AdminQuote,
  AdminSettings,
  AuditLog,
  Batch,
  CouponRow,
  CustomerRow,
  InventoryItem,
  Movement,
  Notice,
  ReviewRow,
  Rider,
  StaffMember,
} from "../admin-types";
import { addDays, todayISO } from "../dates";
import { galleryFlowers, products } from "./catalogue";
import { deliveryZones, settings, timeSlots } from "./delivery";
import { IMG } from "./images";

/* deterministic PRNG so the demo is identical on every load */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
const R = rng(20261110);
const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
const int = (a: number, b: number) => a + Math.floor(R() * (b - a + 1));

const ts = (dateISO: string, hh: number, mm = 0) => {
  const d = new Date(`${dateISO}T00:00:00Z`);
  d.setUTCMinutes(hh * 60 + mm - 330); // Colombo → UTC
  return d.toISOString();
};

export const riders: Rider[] = [
  { id: "rd1", name: "Chamara Bandara", phone: "+94771110001", active: true },
  { id: "rd2", name: "Nuwan Jayasinghe", phone: "+94771110002", active: true },
  { id: "rd3", name: "Sahan Perera", phone: "+94771110003", active: false },
];

const firstNames = ["Nadeesha", "Kasun", "Ishara", "Malsha", "Ravindu", "Tharushi", "Dilan", "Hiruni", "Sachini", "Chathura", "Amaya", "Pasindu", "Dinithi", "Lahiru", "Senuri", "Yasas", "Kavindi", "Shehan"];
const lastNames = ["Perera", "Fernando", "Silva", "Jayawardena", "Wickramasinghe", "Bandara", "Gunasekara", "Rathnayake", "de Alwis", "Senanayake", "Dissanayake"];
const recipientsFirst = ["Amma", "Sanduni", "Dinuka", "Mrs. Kamala", "Thilini", "Nethmi", "Ruwan", "Anjali", "Hasini", "Mr. Gamini", "Sewwandi", "Oshadi"];
const messages = ["Happy birthday! 🎂", "Happy anniversary, my love ❤", "Congratulations on the new job!", "Get well soon — thinking of you.", "With deepest sympathy.", "For no reason at all 🌸", "So proud of you, graduate!", ""];

export const customers: CustomerRow[] = Array.from({ length: 18 }, (_, i) => {
  const name = `${firstNames[i % firstNames.length]} ${lastNames[(i * 3) % lastNames.length]}`;
  return {
    id: `c${i + 1}`,
    name,
    email: `${name.split(" ")[0].toLowerCase()}.${name.split(" ")[1].toLowerCase().replace(/\s/g, "")}@example.lk`,
    phone: `+9477${String(1000000 + i * 37311).slice(0, 7)}`,
    orders: 0,
    ltv: 0,
    lastOrder: "",
    occasions: int(0, 4),
    status: i === 11 ? "BLOCKED" : "ACTIVE",
    joined: addDays(todayISO(), -int(20, 600)),
  };
});

const flow: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_REVIEW", "CONFIRMED", "PREPARING", "READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"];

function historyTo(status: OrderStatus, created: string, delivery: string): StatusEvent[] {
  const out: StatusEvent[] = [{ status: "PENDING_PAYMENT", at: created }];
  if (status === "CANCELLED") return [...out, { status: "CANCELLED", at: new Date(new Date(created).getTime() + 24 * 3600_000).toISOString(), note: "No slip within payment window" }];
  const target = status === "DELIVERY_FAILED" ? flow.indexOf("OUT_FOR_DELIVERY") : flow.indexOf(status);
  for (let i = 1; i <= target; i++) {
    const at = i <= 2 ? new Date(new Date(created).getTime() + i * 50 * 60_000).toISOString() : ts(delivery, 6 + i, int(0, 50));
    out.push({ status: flow[i], at });
  }
  if (status === "DELIVERY_FAILED") out.push({ status: "DELIVERY_FAILED", at: ts(delivery, 15, 20), note: "Recipient unreachable" });
  return out;
}

function makeOrders(): AdminOrder[] {
  const t = todayISO();
  const plan: { offset: number; status: OrderStatus; slot?: SlotCode }[] = [
    ...Array.from({ length: 9 }, (_, i) => ({ offset: -int(1, 25), status: (i === 3 ? "CANCELLED" : "DELIVERED") as OrderStatus })),
    { offset: -1, status: "DELIVERY_FAILED", slot: "AFTERNOON" },
    { offset: 0, status: "DELIVERED", slot: "MORNING" },
    { offset: 0, status: "DELIVERED", slot: "MORNING" },
    { offset: 0, status: "OUT_FOR_DELIVERY", slot: "AFTERNOON" },
    { offset: 0, status: "OUT_FOR_DELIVERY", slot: "AFTERNOON" },
    { offset: 0, status: "READY_FOR_DISPATCH", slot: "EVENING" },
    { offset: 0, status: "PREPARING", slot: "EVENING" },
    { offset: 0, status: "PREPARING", slot: "MIDNIGHT" },
    { offset: 1, status: "CONFIRMED", slot: "MORNING" },
    { offset: 1, status: "CONFIRMED", slot: "AFTERNOON" },
    { offset: 1, status: "CONFIRMED", slot: "EVENING" },
    { offset: 2, status: "PAYMENT_REVIEW", slot: "MORNING" },
    { offset: 2, status: "PENDING_PAYMENT", slot: "AFTERNOON" },
    { offset: 3, status: "PAYMENT_REVIEW", slot: "EVENING" },
    { offset: 3, status: "CONFIRMED", slot: "MORNING" },
    { offset: 4, status: "PAYMENT_REVIEW", slot: "AFTERNOON" },
    { offset: 5, status: "PENDING_PAYMENT", slot: "MORNING" },
    { offset: 6, status: "CONFIRMED", slot: "EVENING" },
  ];
  const sellable = products.filter((p) => p.isAvailable);
  return plan.map((p, i) => {
    const delivery = addDays(t, p.offset);
    const created = ts(addDays(delivery, -int(2, 5)), int(8, 20), int(0, 59));
    const cust = customers[i % customers.length];
    const prod = pick(sellable);
    const variant = pick(prod.variants.filter((v) => v.isActive));
    const qty = R() < 0.85 ? 1 : 2;
    const unit = (variant.salePrice ?? variant.price) + (R() < 0.4 ? 450 : 0);
    const custom = i % 9 === 4;
    const zone = pick(deliveryZones);
    const pickup = i % 11 === 6;
    const subtotal = unit * qty;
    const deliveryFee = pickup ? 0 : zone.fee;
    const slot: SlotCode = p.slot ?? pick(["MORNING", "AFTERNOON", "EVENING"] as SlotCode[]);
    const surcharge = timeSlots.find((s) => s.code === slot)?.surcharge ?? 0;
    const discount = i % 7 === 2 ? Math.round(subtotal * 0.1) : 0;
    const paymentStatus: PaymentStatus =
      p.status === "PENDING_PAYMENT" ? (i % 2 ? "REJECTED" : "UNPAID") : p.status === "PAYMENT_REVIEW" ? "PENDING_VERIFICATION" : p.status === "CANCELLED" ? "UNPAID" : "PAID";
    const seq = 31 + i;
    const anon = i % 5 === 1;
    const recipientName = `${pick(recipientsFirst)} ${pick(lastNames)}`;
    const history = historyTo(p.status, created, delivery);
    const order: AdminOrder = {
      id: `ord${i + 1}`,
      orderNumber: `SF-${created.slice(2, 10).replace(/-/g, "")}-${String(seq).padStart(5, "0")}`,
      trackingToken: `tk${i}${seq}`,
      orderType: custom ? "CUSTOM" : "STANDARD",
      fulfilment: pickup ? "PICKUP" : "DELIVERY",
      deliveryDate: delivery,
      timeSlot: slot,
      recipient: {
        name: recipientName,
        phone: `+9471${String(2000000 + i * 4111).slice(0, 7)}`,
        line1: pickup ? "Store pickup" : `${int(3, 210)}/${int(1, 9)} ${pick(["Galle Road", "Temple Road", "Park Avenue", "Flower Road", "Duplication Road", "Havelock Road", "Lake Drive", "Station Road"])}`,
        city: pickup ? "Colombo 07" : pick(zone.cities),
        landmark: pick(["Near the temple", "Opposite the school", "Blue gate", "Next to Keells", ""]),
        instructions: R() < 0.3 ? "Call on arrival" : "",
      },
      isAnonymousSender: anon,
      cardMessage: pick(messages),
      senderName: anon ? undefined : cust.name.split(" ")[0],
      items: [
        custom
          ? { id: `oi${i}`, name: "Custom bouquet", image: IMG.pinkWhiteRoseBouquet, qty: 1, unitPrice: subtotal, detail: "15 × Pink Rose, 10 × White Tulip, 5 × Eucalyptus · Frosted wrap · Ivory ribbon", isCustom: true }
          : { id: `oi${i}`, name: prod.name, image: prod.images[0], sizeTier: variant.sizeTier, qty, unitPrice: unit, detail: `${variant.sizeTier.charAt(0) + variant.sizeTier.slice(1).toLowerCase()} · ${variant.stemCount} stems · ${unit > (variant.salePrice ?? variant.price) ? "Frosted" : "Kraft"} wrap`, isCustom: false },
      ],
      subtotal,
      discount,
      deliveryFee,
      surcharge,
      total: subtotal - discount + deliveryFee + surcharge,
      couponCode: discount ? "LOVE10" : undefined,
      orderStatus: p.status,
      paymentStatus,
      paymentDueAt: p.status === "PENDING_PAYMENT" ? new Date(Date.now() + (i % 3 + 4) * 3600_000).toISOString() : new Date(new Date(created).getTime() + settings.paymentWindowHours * 3600_000).toISOString(),
      history,
      createdAt: created,
      customer: { id: cust.id, name: cust.name, email: cust.email, phone: cust.phone },
      riderId: ["OUT_FOR_DELIVERY", "DELIVERED", "DELIVERY_FAILED"].includes(p.status) && !pickup ? riders[i % 2].id : undefined,
      slipFileName: paymentStatus === "PENDING_VERIFICATION" || paymentStatus === "PAID" ? `slip_${seq}.jpg` : paymentStatus === "REJECTED" ? `slip_${seq}_blurry.jpg` : undefined,
      slipRejectReason: paymentStatus === "REJECTED" ? "Amount on slip doesn't match the order total" : undefined,
      slipUploadedAt: paymentStatus === "PENDING_VERIFICATION" ? new Date(Date.now() - int(20, 190) * 60_000).toISOString() : undefined,
      bouquetPhoto: ["READY_FOR_DISPATCH", "OUT_FOR_DELIVERY", "DELIVERED"].includes(p.status) ? prod.images[0] : undefined,
      podPhoto: p.status === "DELIVERED" ? IMG.womanBouquet : undefined,
    };
    cust.orders += 1;
    if (paymentStatus === "PAID") cust.ltv += order.total;
    if (!cust.lastOrder || created > cust.lastOrder) cust.lastOrder = created;
    return order;
  });
}

export const seedOrders = makeOrders();

export function makeQuotes(): AdminQuote[] {
  const t = todayISO();
  const now = Date.now();
  const base = (i: number) => customers[(i * 5 + 2) % customers.length];
  const g = (id: string) => galleryFlowers.find((f) => f.id === id)!;
  const item = (id: string, qty: number, unitPrice?: number) => ({ flowerId: id, name: g(id).name, image: g(id).image, qty, unitPrice });
  const mk = (i: number, status: AdminQuote["status"], offset: number, items: AdminQuote["items"], extra: Partial<AdminQuote> = {}): AdminQuote => {
    const c = base(i);
    return {
      id: `qr${i}`,
      requestNumber: `QR-${t.slice(2).replace(/-/g, "")}-${String(11 + i).padStart(4, "0")}`,
      status,
      items,
      style: pick(["hand-tied", "box", "basket"]),
      wrapId: pick(["wrap-kraft", "wrap-frosted"]),
      ribbonId: pick(["rib-blush", "rib-ivory", "rib-gold"]),
      notes: pick(["Soft pastel look please, around 50 cm tall.", "For a corporate opening — bright and bold.", "She loves white and green, nothing too pink.", "Can you add a few extra fillers to make it fuller?"]),
      referencePhotos: i % 2 ? [IMG.pinkWhiteRoseBouquet] : [],
      fulfilment: i === 3 ? "PICKUP" : "DELIVERY",
      deliveryDate: addDays(t, offset),
      timeSlot: pick(["MORNING", "AFTERNOON", "EVENING"] as SlotCode[]),
      recipient: { name: `${pick(recipientsFirst)} ${pick(lastNames)}`, phone: "+94712345678", line1: "12 Park Avenue", city: pick(deliveryZones[0].cities) },
      cardMessage: pick(messages),
      isAnonymousSender: false,
      estimate: items.reduce((s, x) => s + (g(x.flowerId).indicativePrice ?? 0) * x.qty, 0),
      createdAt: new Date(now - (i + 1) * 97 * 60_000).toISOString(),
      customer: { id: c.id, name: c.name, email: c.email, phone: c.phone },
      ...extra,
    };
  };
  return [
    mk(1, "REQUESTED", 2, [item("gf-pink-rose", 20), item("gf-babys-breath", 3)]),
    mk(2, "REQUESTED", 3, [item("gf-white-lily", 6), item("gf-white-tulip", 10), item("gf-eucalyptus", 4)]),
    mk(3, "REQUESTED", 4, [item("gf-sunflower", 9), item("gf-ruscus", 3)]),
    mk(4, "REQUESTED", 6, [item("gf-red-rose", 50)]),
    mk(5, "QUOTED", 4, [item("gf-pink-tulip", 15, 450), item("gf-eucalyptus", 4, 180)], { itemsPrice: 7470, wrappingPrice: 450, deliveryFee: 500, discount: 0, quotedTotal: 8420, quoteNote: "Pink tulips are lovely this week!", validUntil: new Date(now + 17 * 3600_000).toISOString() }),
    mk(6, "ACCEPTED", 5, [item("gf-orchid", 8, 750), item("gf-pink-rose", 10, 380)], { itemsPrice: 9800, wrappingPrice: 450, deliveryFee: 750, discount: 500, quotedTotal: 10500, orderNumber: "SF-261109-00061" }),
    mk(7, "DECLINED_BY_SHOP", 2, [item("gf-white-tulip", 40)], { declineReason: "We can't source 40 white tulips for that date. Try 20 tulips with white roses?" }),
  ];
}

export const inventory: InventoryItem[] = [
  ...galleryFlowers.map((f, i) => ({
    id: `inv-${f.id}`,
    sku: `RAW-${f.kind === "FILLER" ? "FOL" : "STM"}-${String(i + 1).padStart(3, "0")}`,
    name: f.name,
    type: (f.kind === "FILLER" ? "FOLIAGE" : "STEM") as InventoryItem["type"],
    unit: f.kind === "FILLER" ? "bunch" : "stem",
    stockQty: [140, 22, 85, 30, 8, 60, 45, 18, 120, 95, 4, 12, 26, 40][i] ?? 30,
    reorderLevel: f.kind === "FILLER" ? 10 : 25,
    costPrice: Math.round((f.indicativePrice ?? 200) * 0.45),
    image: f.image,
  })),
  { id: "inv-wrap-kraft", sku: "RAW-WRP-001", name: "Kraft paper", type: "WRAP", unit: "sheet", stockQty: 210, reorderLevel: 50, costPrice: 40 },
  { id: "inv-wrap-frosted", sku: "RAW-WRP-002", name: "Frosted waterproof film", type: "WRAP", unit: "sheet", stockQty: 64, reorderLevel: 40, costPrice: 120 },
  { id: "inv-wrap-burlap", sku: "RAW-WRP-003", name: "Burlap", type: "WRAP", unit: "sheet", stockQty: 0, reorderLevel: 20, costPrice: 90 },
  { id: "inv-rib-satin", sku: "RAW-RIB-001", name: "Satin ribbon (assorted)", type: "RIBBON", unit: "metre", stockQty: 380, reorderLevel: 100, costPrice: 25 },
  { id: "inv-box-hat", sku: "RAW-BOX-001", name: "Black hat box", type: "BOX", unit: "box", stockQty: 9, reorderLevel: 10, costPrice: 950 },
  { id: "inv-add-choc", sku: "RAW-ADD-001", name: "Belgian chocolates (12)", type: "ADDON", unit: "box", stockQty: 16, reorderLevel: 8, costPrice: 1400 },
  { id: "inv-add-teddy", sku: "RAW-ADD-002", name: "Teddy bear 30 cm", type: "ADDON", unit: "piece", stockQty: 7, reorderLevel: 5, costPrice: 1600 },
  { id: "inv-add-vase", sku: "RAW-ADD-003", name: "Glass vase", type: "ADDON", unit: "piece", stockQty: 0, reorderLevel: 6, costPrice: 900 },
];

export const batches: Batch[] = inventory
  .filter((i) => i.type === "STEM" || i.type === "FOLIAGE")
  .flatMap((it, i) => {
    const t = todayISO();
    const arr = addDays(t, -int(0, 4));
    return [
      { id: `b${i}a`, itemId: it.id, supplier: pick(["Nuwara Eliya Growers", "Colombo Flower Market", "Kandy Blooms Co.", "Imported — Dubai hub"]), qtyReceived: it.stockQty + int(10, 60), qtyLeft: it.stockQty, unitCost: it.costPrice, arrivalDate: arr, expiryDate: addDays(arr, it.type === "FOLIAGE" ? 10 : int(4, 7)) },
    ];
  });

export const movements: Movement[] = Array.from({ length: 26 }, (_, i) => {
  const it = pick(inventory.slice(0, 14));
  const type = pick(["RECEIVE", "WASTE", "ADJUST", "RECEIVE", "WASTE"] as Movement["type"][]);
  return {
    id: `mv${i}`,
    itemId: it.id,
    type,
    qty: type === "RECEIVE" ? int(20, 120) : type === "WASTE" ? -int(1, 12) : int(-5, 5) || 2,
    reason: type === "WASTE" ? pick(["Wilted", "Damaged in transit", "Production error", "Other"]) : type === "ADJUST" ? "Stock-take" : undefined,
    actor: pick(["Sithuliya (Owner)", "Hansi (Florist)"]),
    at: new Date(Date.now() - i * int(2, 7) * 3600_000).toISOString(),
  };
});

export const coupons: CouponRow[] = [
  { id: "cp1", code: "LOVE10", type: "PERCENT", value: 10, minSpend: 5000, maxDiscount: 3000, startsAt: "2026-11-01", endsAt: "2027-02-16", usageLimit: 500, perUserLimit: 2, used: 128, firstOrderOnly: false, active: true },
  { id: "cp2", code: "WELCOME500", type: "FIXED", value: 500, minSpend: 4000, startsAt: "2026-01-01", endsAt: "2026-12-31", usageLimit: 1000, perUserLimit: 1, used: 342, firstOrderOnly: true, active: true },
  { id: "cp3", code: "MOTHERSDAY", type: "PERCENT", value: 15, minSpend: 7000, maxDiscount: 2500, startsAt: "2026-05-01", endsAt: "2026-05-11", usageLimit: 200, perUserLimit: 1, used: 200, firstOrderOnly: false, category: "birthday", active: false },
  { id: "cp4", code: "SYMPATHY5", type: "PERCENT", value: 5, minSpend: 0, startsAt: "2026-01-01", endsAt: "2027-01-01", usageLimit: 9999, perUserLimit: 5, used: 41, firstOrderOnly: false, category: "sympathy", active: true },
];

export const reviews: ReviewRow[] = [
  { id: "rv1", product: "Blush Whisper", orderNumber: "SF-261101-00031", author: "Nadeesha P.", rating: 5, body: "Arrived exactly in the morning slot and looked even better than the photos. My mother was in tears!", photo: IMG.roseBabysBreath, status: "PENDING", at: new Date(Date.now() - 3 * 3600_000).toISOString() },
  { id: "rv2", product: "Crimson Romance", orderNumber: "SF-261028-00022", author: "Kasun W.", rating: 4, body: "Beautiful roses. Wrapping got a little crushed on one side but the flowers were perfect.", status: "PENDING", at: new Date(Date.now() - 20 * 3600_000).toISOString() },
  { id: "rv3", product: "Sunlit Basket", orderNumber: "SF-261024-00019", author: "Ishara D.", rating: 5, body: "Brightened up the whole office. Rider was very polite.", status: "APPROVED", reply: "Thank you Ishara! 🌻", at: "2026-10-25T08:00:00Z" },
  { id: "rv4", product: "Tulip Sonnet", orderNumber: "SF-261020-00014", author: "Anonymous", rating: 2, body: "Visit my site for cheap followers!!!", status: "HIDDEN", at: "2026-10-21T08:00:00Z" },
  { id: "rv5", product: "Garden in a Box", orderNumber: "SF-261103-00035", author: "Malsha F.", rating: 5, body: "The box is so pretty I'm keeping it. Flowers still fresh a week later.", photo: IMG.flowerBox, status: "PENDING", at: new Date(Date.now() - 30 * 3600_000).toISOString() },
];

export const staff: StaffMember[] = [
  { id: "s1", name: "Sithuliya Jayawardena", email: "owner@sithuliyaflora.lk", phone: "+94771234000", role: "OWNER", twoFactor: true, status: "ACTIVE", lastLogin: new Date().toISOString(), sessions: 2 },
  { id: "s2", name: "Hansi Wickramasinghe", email: "hansi@sithuliyaflora.lk", phone: "+94771234001", role: "FLORIST", twoFactor: true, status: "ACTIVE", lastLogin: new Date(Date.now() - 2 * 3600_000).toISOString(), sessions: 1 },
  { id: "s3", name: "Pavithra Silva", email: "pavithra@sithuliyaflora.lk", phone: "+94771234002", role: "FLORIST", twoFactor: false, status: "LOCKED", lastLogin: "2026-11-08T05:00:00Z", sessions: 0 },
  ...riders.map((r, i) => ({ id: `s${4 + i}`, name: r.name, email: `${r.name.split(" ")[0].toLowerCase()}@sithuliyaflora.lk`, phone: r.phone, role: "RIDER" as const, twoFactor: false, status: (r.active ? "ACTIVE" : "DISABLED") as StaffMember["status"], lastLogin: r.active ? new Date(Date.now() - (i + 1) * 3600_000).toISOString() : undefined, sessions: r.active ? 1 : 0 })),
];

export const auditLogs: AuditLog[] = [
  { id: "a1", at: new Date(Date.now() - 25 * 60_000).toISOString(), user: "Sithuliya (Owner)", ip: "112.134.20.8", action: "SLIP_APPROVED", entity: "order", entityId: seedOrders[19]?.orderNumber ?? "", before: "PAYMENT_REVIEW", after: "CONFIRMED" },
  { id: "a2", at: new Date(Date.now() - 2 * 3600_000).toISOString(), user: "Sithuliya (Owner)", ip: "112.134.20.8", action: "PRICE_CHANGED", entity: "product", entityId: "crimson-romance", before: "Standard 7,200", after: "Standard 7,500" },
  { id: "a3", at: new Date(Date.now() - 3 * 3600_000).toISOString(), user: "Pavithra Silva", ip: "175.157.44.2", action: "LOGIN_FAILED", entity: "user", entityId: "s3", after: "5th attempt — account locked 15 min" },
  { id: "a4", at: new Date(Date.now() - 5 * 3600_000).toISOString(), user: "Hansi (Florist)", ip: "112.134.20.9", action: "WASTAGE_LOGGED", entity: "inventory", entityId: "Pink Lily", after: "−6 (Wilted)" },
  { id: "a5", at: new Date(Date.now() - 26 * 3600_000).toISOString(), user: "Sithuliya (Owner)", ip: "112.134.20.8", action: "SETTINGS_UPDATED", entity: "settings", entityId: "bank", before: "Branch: Bambalapitiya", after: "Branch: Kollupitiya" },
  { id: "a6", at: new Date(Date.now() - 30 * 3600_000).toISOString(), user: "Sithuliya (Owner)", ip: "112.134.20.8", action: "ORDER_OVERRIDE", entity: "order", entityId: seedOrders[3]?.orderNumber ?? "", before: "PENDING_PAYMENT", after: "CANCELLED" },
];

export const notices: Notice[] = [
  { id: "n1", at: new Date(Date.now() - 12 * 60_000).toISOString(), title: "New bank slip", body: "A slip was uploaded and is waiting for review.", href: "/payments", read: false, kind: "slip" },
  { id: "n2", at: new Date(Date.now() - 40 * 60_000).toISOString(), title: "Quotation request", body: "A customer asked for a custom bouquet.", href: "/quotations", read: false, kind: "quote" },
  { id: "n3", at: new Date(Date.now() - 2 * 3600_000).toISOString(), title: "Low stock", body: "Dendrobium Orchid is below its reorder level.", href: "/inventory", read: false, kind: "stock" },
  { id: "n4", at: new Date(Date.now() - 20 * 3600_000).toISOString(), title: "Delivery failed", body: "Recipient unreachable — re-dispatch needed.", href: "/orders", read: true, kind: "delivery" },
];

export const adminSettings: AdminSettings = {
  leadTimeDays: settings.leadTimeDays,
  paymentWindowHours: settings.paymentWindowHours,
  quotationValidityHours: settings.quotationValidityHours,
  midnightSurcharge: 1500,
  cardPremium: 0,
  pointsPerHundred: 1,
  shopHours: settings.shop.hours,
  bank: { ...settings.bank },
  templates: [
    { key: "ORDER_PLACED", label: "Order placed (with bank details)", channel: "SMS", body: "Thank you! Order {{orderNumber}} is reserved. Please transfer the total to {{bank}} and upload your slip within 24h." },
    { key: "SLIP_APPROVED", label: "Payment verified", channel: "SMS", body: "Payment verified for {{orderNumber}} — we'll deliver on {{date}} ({{slot}}). 💐" },
    { key: "QUOTE_SENT", label: "Quotation sent", channel: "EMAIL", body: "Your custom bouquet quotation is ready: {{quoteUrl}}" },
    { key: "OUT_FOR_DELIVERY", label: "Out for delivery", channel: "WHATSAPP", body: "Your flowers for {{recipientName}} are on the way! Track: {{trackingUrl}}" },
  ],
};

/** 30 days of revenue for the trend chart (FR-ADMIN-01.2). */
export function revenueSeries(days = 30): { date: string; revenue: number; orders: number }[] {
  const r = rng(77);
  const t = todayISO();
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(t, i - days + 1);
    const dow = new Date(`${date}T12:00:00Z`).getUTCDay();
    const base = dow === 0 ? 0 : dow === 5 || dow === 6 ? 52000 : 34000;
    const orders = dow === 0 ? 0 : Math.round((base / 9000) * (0.7 + r() * 0.6));
    return { date, revenue: dow === 0 ? 0 : Math.round(base * (0.65 + r() * 0.7) / 100) * 100, orders };
  });
}
