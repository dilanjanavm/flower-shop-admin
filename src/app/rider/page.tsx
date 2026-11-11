"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdmin } from "@/lib/store";
import { cn } from "@/lib/format";
import { todayISO } from "@/lib/dates";
import { timeSlots } from "@/lib/mock/delivery";
import { riders } from "@/lib/mock/admin";
import { Badge, Button, Modal, Thumb } from "@/components/ui";
import { Icon } from "@/components/Icon";

/**
 * Rider view (FR-ADMIN-05.5, UI-05): mobile-first, assigned drops only, no
 * prices (R2) and no sender details when anonymous (R1).
 */
export default function RiderPage() {
  const router = useRouter();
  const { session, hydrated, orders, transition, updateOrder, signOut, toast } = useAdmin();
  const [open, setOpen] = useState<string | null>(null);
  const [fail, setFail] = useState<string | null>(null);
  const [reason, setReason] = useState("Recipient unreachable");

  useEffect(() => {
    if (hydrated && !session) router.replace("/login");
  }, [hydrated, session, router]);
  if (!hydrated || !session) return null;

  // Owners previewing the rider view see rider 1's list
  const rider = riders.find((r) => r.name === session.name) ?? riders[0];
  const t = todayISO();
  const mine = orders
    .filter((o) => o.riderId === rider.id && o.deliveryDate === t)
    .sort((a, b) => timeSlots.findIndex((s) => s.code === a.timeSlot) - timeSlots.findIndex((s) => s.code === b.timeSlot));
  const done = mine.filter((o) => o.orderStatus === "DELIVERED").length;

  return (
    <div className="mx-auto min-h-dvh max-w-md bg-bg pb-10">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Today&apos;s drops</p>
            <p className="font-serif text-2xl">Hi {rider.name.split(" ")[0]} 👋</p>
          </div>
          <div className="flex items-center gap-2">
            {session.role === "OWNER" && <button onClick={() => router.push("/delivery")} className="rounded-full border border-line px-3 py-1.5 text-xs">Back to admin</button>}
            <button onClick={signOut} className="grid h-9 w-9 place-items-center rounded-full hover:bg-panel-2" aria-label="Sign out"><Icon name="logout" size={18} /></button>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${mine.length ? (done / mine.length) * 100 : 0}%` }} /></div>
        <p className="mt-1 text-xs text-muted">{done} of {mine.length} delivered</p>
      </header>

      <ol className="space-y-3 px-4 pt-4">
        {mine.map((o, i) => {
          const slot = timeSlots.find((s) => s.code === o.timeSlot);
          const isOpen = open === o.id;
          const finished = o.orderStatus === "DELIVERED";
          return (
            <li key={o.id} className={cn("card overflow-hidden transition", finished && "opacity-60")}>
              <button className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setOpen(isOpen ? null : o.id)}>
                <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold", finished ? "bg-emerald-500 text-white" : "bg-invert text-invert-fg")}>{finished ? <Icon name="check" size={16} strokeWidth={2.4} /> : i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.recipient.name}</span>
                  <span className="block truncate text-xs text-muted">{o.recipient.city} · {slot?.window}</span>
                </span>
                <Badge tone={o.orderStatus === "OUT_FOR_DELIVERY" ? "ink" : finished ? "green" : o.orderStatus === "DELIVERY_FAILED" ? "red" : "neutral"}>{o.orderStatus === "OUT_FOR_DELIVERY" ? "On the way" : finished ? "Done" : o.orderStatus === "DELIVERY_FAILED" ? "Failed" : "Pick up"}</Badge>
              </button>
              {isOpen && (
                <div className="animate-fade-in space-y-4 border-t border-line p-4">
                  <div className="flex gap-3">
                    <Thumb src={o.bouquetPhoto ?? o.items[0]?.image} className="h-20 w-16 rounded-xl" />
                    <div className="text-sm">
                      <p>{o.recipient.line1}</p>
                      <p className="font-medium">{o.recipient.city}</p>
                      {o.recipient.landmark && <p className="text-xs text-muted">Landmark: {o.recipient.landmark}</p>}
                      {o.recipient.instructions && <p className="text-xs text-muted">Note: {o.recipient.instructions}</p>}
                      <p className="mt-1 text-xs text-muted">{o.items.reduce((s, x) => s + x.qty, 0)} item(s) · {o.isAnonymousSender ? "Anonymous gift — don't reveal the sender" : `From ${o.senderName ?? "the customer"}`}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <a href={`tel:${o.recipient.phone}`} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-panel-2 text-sm font-medium"><Icon name="phone" size={17} /> Call</a>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${o.recipient.line1}, ${o.recipient.city}, Sri Lanka`)}`} target="_blank" rel="noreferrer" className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-panel-2 text-sm font-medium"><Icon name="map" size={17} /> Navigate</a>
                  </div>
                  {o.orderStatus === "READY_FOR_DISPATCH" && <Button className="h-12 w-full" onClick={() => transition(o.id, "OUT_FOR_DELIVERY")}><Icon name="bike" size={17} /> Start this drop</Button>}
                  {o.orderStatus === "OUT_FOR_DELIVERY" && (
                    <>
                      <label className={cn("flex h-28 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-2 border-dashed text-sm", o.podPhoto ? "border-emerald-400" : "border-line")}>
                        {o.podPhoto ? <Thumb src={o.podPhoto} className="h-full w-full" /> : <><Icon name="camera" size={24} /> Take proof-of-delivery photo</>}
                        <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) { updateOrder(o.id, { podPhoto: URL.createObjectURL(f) }); toast({ title: "Photo attached", tone: "success" }); } }} />
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" className="h-12" onClick={() => setFail(o.id)}>Failed</Button>
                        <Button className="h-12" disabled={!o.podPhoto} onClick={() => { transition(o.id, "DELIVERED", "POD uploaded by rider"); setOpen(null); }}><Icon name="check" size={17} /> Delivered</Button>
                      </div>
                      {!o.podPhoto && <p className="text-center text-xs text-muted">A photo is required before marking delivered.</p>}
                    </>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {mine.length === 0 && <p className="py-20 text-center text-sm text-muted">No drops assigned for today yet.</p>}
      </ol>

      <Modal open={!!fail} onClose={() => setFail(null)} title="What happened?" footer={<Button variant="danger" onClick={() => { if (fail) transition(fail, "DELIVERY_FAILED", reason); setFail(null); }}>Mark failed</Button>}>
        <div className="space-y-2">
          {["Recipient unreachable", "Wrong address", "Refused by recipient", "Other"].map((r) => (
            <label key={r} className={cn("flex items-center gap-3 rounded-xl border px-3 py-3 text-sm", reason === r ? "border-fg" : "border-line")}><input type="radio" checked={reason === r} onChange={() => setReason(r)} /> {r}</label>
          ))}
        </div>
      </Modal>
    </div>
  );
}
