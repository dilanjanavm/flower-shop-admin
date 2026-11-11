"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { Badge, Button, Field, PageHeader, Tabs } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Shop settings (FR-ADMIN-05.6, FR-ADMIN-07.3). Every change is audit-logged. */
export default function SettingsPage() {
  const { settings, updateSettings } = useAdmin();
  const [tab, setTab] = useState<"rules" | "bank" | "templates">("rules");
  const [rules, setRules] = useState({ leadTimeDays: settings.leadTimeDays, paymentWindowHours: settings.paymentWindowHours, quotationValidityHours: settings.quotationValidityHours, midnightSurcharge: settings.midnightSurcharge, cardPremium: settings.cardPremium, pointsPerHundred: settings.pointsPerHundred, shopHours: settings.shopHours });
  const [bank, setBank] = useState(settings.bank);
  const [templates, setTemplates] = useState(settings.templates);

  return (
    <OwnerOnly>
      <PageHeader title="Settings" subtitle="Business rules, payment details and message templates." />
      <Tabs tabs={[{ key: "rules", label: "Ordering rules" }, { key: "bank", label: "Bank details" }, { key: "templates", label: "Notification templates" }]} value={tab} onChange={setTab} />

      {tab === "rules" && (
        <section className="card max-w-3xl p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Minimum lead time (days)" hint="Earliest delivery = today + this. No same-day/next-day."><input type="number" min={2} className="field" value={rules.leadTimeDays} onChange={(e) => setRules({ ...rules, leadTimeDays: Math.max(2, Number(e.target.value)) })} /></Field>
            <Field label="Payment window (hours)" hint="Unpaid orders auto-cancel after this; reminder at half-time."><input type="number" className="field" value={rules.paymentWindowHours} onChange={(e) => setRules({ ...rules, paymentWindowHours: Number(e.target.value) })} /></Field>
            <Field label="Quotation validity (hours)" hint="Never later than the lead-time limit for the requested date."><input type="number" className="field" value={rules.quotationValidityHours} onChange={(e) => setRules({ ...rules, quotationValidityHours: Number(e.target.value) })} /></Field>
            <Field label="Midnight Surprise surcharge (LKR)"><input type="number" className="field" value={rules.midnightSurcharge} onChange={(e) => setRules({ ...rules, midnightSurcharge: Number(e.target.value) })} /></Field>
            <Field label="Card message premium (LKR)" hint="0 = free card"><input type="number" className="field" value={rules.cardPremium} onChange={(e) => setRules({ ...rules, cardPremium: Number(e.target.value) })} /></Field>
            <Field label="Loyalty: points per Rs 100"><input type="number" className="field" value={rules.pointsPerHundred} onChange={(e) => setRules({ ...rules, pointsPerHundred: Number(e.target.value) })} /></Field>
            <Field label="Shop hours" className="sm:col-span-2"><input className="field" value={rules.shopHours} onChange={(e) => setRules({ ...rules, shopHours: e.target.value })} /></Field>
          </div>
          <div className="mt-6 flex items-center justify-between border-t border-line pt-5">
            <p className="flex items-center gap-2 text-xs text-muted"><Icon name="info" size={14} /> Stock checks and card payments are switched off in v1.0.</p>
            <Button onClick={() => updateSettings(rules, "ordering rules")}>Save rules</Button>
          </div>
        </section>
      )}

      {tab === "bank" && (
        <section className="card max-w-3xl p-6">
          <p className="mb-5 text-sm text-muted">Shown to customers after checkout and on every quotation acceptance, and sent by SMS and email.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Bank"><input className="field" value={bank.bank} onChange={(e) => setBank({ ...bank, bank: e.target.value })} /></Field>
            <Field label="Branch"><input className="field" value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })} /></Field>
            <Field label="Account name"><input className="field" value={bank.accountName} onChange={(e) => setBank({ ...bank, accountName: e.target.value })} /></Field>
            <Field label="Account number"><input className="field font-mono" value={bank.accountNumber} onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })} /></Field>
          </div>
          <div className="mt-6 rounded-xl bg-panel-2 p-4 text-sm">
            <p className="label">Customer preview</p>
            <p>{bank.bank} · {bank.branch}</p>
            <p className="font-medium">{bank.accountName}</p>
            <p className="font-mono">{bank.accountNumber}</p>
          </div>
          <div className="mt-6 flex justify-end border-t border-line pt-5"><Button onClick={() => updateSettings({ bank }, "bank details")}>Save bank details</Button></div>
        </section>
      )}

      {tab === "templates" && (
        <div className="max-w-3xl space-y-4">
          {templates.map((tpl, i) => (
            <section key={tpl.key} className="card p-5">
              <div className="mb-3 flex items-center justify-between"><p className="font-medium">{tpl.label}</p><Badge tone={tpl.channel === "SMS" ? "blue" : tpl.channel === "EMAIL" ? "neutral" : "green"}>{tpl.channel}</Badge></div>
              <textarea className="field resize-none font-mono text-xs" rows={3} value={tpl.body} onChange={(e) => setTemplates(templates.map((x, k) => (k === i ? { ...x, body: e.target.value } : x)))} />
              {tpl.channel === "SMS" && <p className="mt-1 text-right text-[11px] text-muted">{tpl.body.length} chars · {Math.ceil(tpl.body.length / 160)} SMS</p>}
            </section>
          ))}
          <p className="text-xs text-muted">Placeholders: {"{{orderNumber}} {{recipientName}} {{slot}} {{date}} {{trackingUrl}} {{quoteUrl}} {{bank}}"} — recipient messages never mention the sender when an order is anonymous.</p>
          <div className="flex justify-end"><Button onClick={() => updateSettings({ templates }, "templates")}>Save templates</Button></div>
        </div>
      )}
    </OwnerOnly>
  );
}
