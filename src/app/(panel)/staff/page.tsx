"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import type { StaffMember } from "@/lib/admin-types";
import { initials, normalisePhone } from "@/lib/format";
import { formatDateTime } from "@/lib/dates";
import { Badge, Button, Field, Modal, PageHeader, Toggle } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Staff accounts and session revocation (FR-ADMIN-07.1, FR-AUTH-02.4). */
export default function StaffPage() {
  const { staff, saveStaff, revokeSessions, toast } = useAdmin();
  const [edit, setEdit] = useState<StaffMember | null>(null);
  const blank = (): StaffMember => ({ id: `s${Date.now()}`, name: "", email: "", phone: "", role: "FLORIST", twoFactor: true, status: "ACTIVE", sessions: 0 });

  return (
    <OwnerOnly>
      <PageHeader title="Staff" subtitle="Owner accounts always use 2FA. Revoking sessions signs a person out everywhere within seconds." actions={<Button size="sm" onClick={() => setEdit(blank())}><Icon name="plus" size={15} /> Add staff</Button>} />
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">Person</th><th className="th">Role</th><th className="th">2FA</th><th className="th">Status</th><th className="th">Last login</th><th className="th">Sessions</th><th className="th text-right">Actions</th></tr></thead>
          <tbody className="divide-y divide-line">
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="td"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-accent-soft text-xs font-bold text-accent-fg">{initials(s.name)}</span><div><p className="font-medium">{s.name}</p><p className="text-xs text-muted">{s.email}</p></div></div></td>
                <td className="td"><Badge tone={s.role === "OWNER" ? "ink" : s.role === "FLORIST" ? "accent" : "blue"}>{s.role.toLowerCase()}</Badge></td>
                <td className="td">{s.twoFactor ? <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400"><Icon name="shield" size={15} /> On</span> : <span className="text-muted">Off</span>}</td>
                <td className="td">{s.status === "ACTIVE" ? <Badge tone="green" dot>Active</Badge> : s.status === "LOCKED" ? <Badge tone="amber" dot>Locked</Badge> : <Badge tone="neutral" dot>Disabled</Badge>}</td>
                <td className="td text-xs text-muted">{s.lastLogin ? formatDateTime(s.lastLogin) : "—"}</td>
                <td className="td tabular-nums">{s.sessions}</td>
                <td className="td">
                  <div className="flex justify-end gap-1">
                    {s.role !== "OWNER" && <button onClick={() => setEdit(s)} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2">Edit</button>}
                    {s.status === "LOCKED" && <button onClick={() => saveStaff({ ...s, status: "ACTIVE" })} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2">Unlock</button>}
                    {s.role !== "OWNER" && <button onClick={() => toast({ title: "Password reset sent", body: `A single-use link went to ${s.email}.`, tone: "success" })} className="rounded-full px-2.5 py-1 text-xs hover:bg-panel-2">Reset password</button>}
                    <button disabled={!s.sessions} onClick={() => revokeSessions(s.id)} className="rounded-full px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-500/10">Revoke</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.name ? `Edit ${edit.name}` : "Add staff member"} footer={<><Button variant="outline" onClick={() => setEdit(null)}>Cancel</Button><Button disabled={!edit?.name || !edit?.email.includes("@") || !normalisePhone(edit?.phone ?? "")} onClick={() => { if (edit) saveStaff({ ...edit, phone: normalisePhone(edit.phone) ?? edit.phone }); setEdit(null); }}>Save</Button></>}>
        {edit && (
          <div className="space-y-4">
            <Field label="Full name"><input className="field" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Email"><input className="field" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} /></Field>
              <Field label="Mobile"><input className="field" value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
            </div>
            <Field label="Role"><select className="field" value={edit.role} onChange={(e) => setEdit({ ...edit, role: e.target.value as StaffMember["role"] })}><option value="FLORIST">Florist — order queue, printables, wastage</option><option value="RIDER">Rider — assigned deliveries only</option></select></Field>
            <Toggle checked={edit.twoFactor} onChange={(v) => setEdit({ ...edit, twoFactor: v })} label="Require 2FA" description="Recommended for florists (OI-7)" />
            <Toggle checked={edit.status === "ACTIVE"} onChange={(v) => setEdit({ ...edit, status: v ? "ACTIVE" : "DISABLED" })} label="Account enabled" />
          </div>
        )}
      </Modal>
    </OwnerOnly>
  );
}
