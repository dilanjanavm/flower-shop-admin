import type { Order, Quotation } from "./types";

export type Role = "OWNER" | "FLORIST" | "RIDER";

export interface AdminOrder extends Order {
  customer: { id: string; name: string; email: string; phone: string };
  riderId?: string;
  courierName?: string;
  slipUploadedAt?: string;
  slipPreview?: string;
  printedJobSheet?: boolean;
  internalNotes?: string;
}

export interface AdminQuote extends Quotation {
  customer: { id: string; name: string; email: string; phone: string };
}

export type RawType = "STEM" | "FOLIAGE" | "WRAP" | "RIBBON" | "BOX" | "ADDON";

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  type: RawType;
  unit: string;
  stockQty: number;
  reorderLevel: number;
  costPrice: number;
  image?: string;
}

export interface Batch {
  id: string;
  itemId: string;
  supplier: string;
  qtyReceived: number;
  qtyLeft: number;
  unitCost: number;
  arrivalDate: string;
  expiryDate: string;
}

export type MovementType = "RECEIVE" | "RESERVE" | "RELEASE" | "CONSUME" | "WASTE" | "ADJUST";

export interface Movement {
  id: string;
  itemId: string;
  type: MovementType;
  qty: number;
  reason?: string;
  note?: string;
  actor: string;
  at: string;
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  active: boolean;
}

export interface CustomerRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  orders: number;
  ltv: number;
  lastOrder: string;
  occasions: number;
  status: "ACTIVE" | "BLOCKED";
  joined: string;
}

export interface CouponRow {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  minSpend: number;
  maxDiscount?: number;
  startsAt: string;
  endsAt: string;
  usageLimit: number;
  perUserLimit: number;
  used: number;
  firstOrderOnly: boolean;
  category?: string;
  active: boolean;
}

export interface ReviewRow {
  id: string;
  product: string;
  orderNumber: string;
  author: string;
  rating: number;
  body: string;
  photo?: string;
  status: "PENDING" | "APPROVED" | "HIDDEN";
  reply?: string;
  at: string;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  twoFactor: boolean;
  status: "ACTIVE" | "DISABLED" | "LOCKED";
  lastLogin?: string;
  sessions: number;
}

export interface AuditLog {
  id: string;
  at: string;
  user: string;
  ip: string;
  action: string;
  entity: string;
  entityId: string;
  before?: string;
  after?: string;
}

export interface Notice {
  id: string;
  at: string;
  title: string;
  body: string;
  href: string;
  read: boolean;
  kind: "slip" | "quote" | "stock" | "delivery" | "order";
}

export interface AdminSettings {
  leadTimeDays: number;
  paymentWindowHours: number;
  quotationValidityHours: number;
  midnightSurcharge: number;
  cardPremium: number;
  pointsPerHundred: number;
  shopHours: string;
  bank: { bank: string; branch: string; accountName: string; accountNumber: string };
  templates: { key: string; label: string; channel: "SMS" | "EMAIL" | "WHATSAPP"; body: string }[];
}
