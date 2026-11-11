"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { formatDateTime } from "@/lib/dates";
import { Badge, Button, PageHeader, SearchInput, downloadCsv } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Append-only audit viewer with filters and CSV export (FR-ADMIN-07.2, FR-AUTH-02.5). */
export default function AuditPage() {
  const { audit } = useAdmin();
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const [user, setUser] = useState("");
  const actions = [...new Set(audit.map((a) => a.action))].sort();
  const users = [...new Set(audit.map((a) => a.user))].sort();
  const list = audit.filter((a) => (!action || a.action === action) && (!user || a.user === user) && (!q || `${a.entityId} ${a.before} ${a.after}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <OwnerOnly>
      <PageHeader
        title="Audit log"
        subtitle="Logins, price changes, slip decisions, overrides and settings — append-only, kept 3 years."
        actions={<Button variant="outline" size="sm" onClick={() => downloadCsv("audit-log.csv", [["When", "User", "IP", "Action", "Entity", "ID", "Before", "After"], ...list.map((a) => [a.at, a.user, a.ip, a.action, a.entity, a.entityId, a.before ?? "", a.after ?? ""])])}><Icon name="download" size={15} /> CSV</Button>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="w-64"><SearchInput value={q} onChange={setQ} placeholder="Search ID or values" /></div>
        <select className="field h-10 w-auto rounded-full" value={action} onChange={(e) => setAction(e.target.value)} aria-label="Filter by action"><option value="">All actions</option>{actions.map((a) => <option key={a}>{a}</option>)}</select>
        <select className="field h-10 w-auto rounded-full" value={user} onChange={(e) => setUser(e.target.value)} aria-label="Filter by user"><option value="">All users</option>{users.map((a) => <option key={a}>{a}</option>)}</select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="border-b border-line bg-panel-2/50"><tr><th className="th">When</th><th className="th">User</th><th className="th">Action</th><th className="th">Entity</th><th className="th">Before</th><th className="th">After</th><th className="th">IP</th></tr></thead>
          <tbody className="divide-y divide-line font-[450]">
            {list.map((a) => (
              <tr key={a.id} className="hover:bg-panel-2/40">
                <td className="td whitespace-nowrap text-xs text-muted">{formatDateTime(a.at)}</td>
                <td className="td">{a.user}</td>
                <td className="td"><Badge tone={a.action.includes("FAILED") || a.action.includes("REJECT") || a.action.includes("BLOCK") ? "red" : a.action.includes("PRICE") || a.action.includes("OVERRIDE") || a.action.includes("REFUND") ? "amber" : "neutral"}>{a.action}</Badge></td>
                <td className="td text-xs"><span className="text-muted">{a.entity}</span> <span className="font-mono">{a.entityId}</span></td>
                <td className="td max-w-48 truncate text-xs text-muted">{a.before ?? "—"}</td>
                <td className="td max-w-56 truncate text-xs">{a.after ?? "—"}</td>
                <td className="td font-mono text-[11px] text-muted">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OwnerOnly>
  );
}
