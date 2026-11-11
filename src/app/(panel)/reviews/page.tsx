"use client";

import { useState } from "react";
import { useAdmin } from "@/lib/store";
import { formatDateTime } from "@/lib/dates";
import { Badge, Button, Empty, PageHeader, Tabs, Thumb } from "@/components/ui";
import { OwnerOnly } from "@/components/Shell";
import { Icon } from "@/components/Icon";

/** Review moderation (FR-ADMIN-06.3). Only delivered orders can be reviewed. */
export default function ReviewsPage() {
  const { reviews, moderateReview } = useAdmin();
  const [tab, setTab] = useState<"PENDING" | "APPROVED" | "HIDDEN">("PENDING");
  const [replies, setReplies] = useState<Record<string, string>>({});
  const list = reviews.filter((r) => r.status === tab);

  return (
    <OwnerOnly>
      <PageHeader title="Reviews" subtitle="Verified reviews wait here for approval before appearing on product pages." />
      <Tabs tabs={(["PENDING", "APPROVED", "HIDDEN"] as const).map((k) => ({ key: k, label: k === "PENDING" ? "Awaiting" : k === "APPROVED" ? "Published" : "Hidden", count: reviews.filter((r) => r.status === k).length }))} value={tab} onChange={setTab} />
      {list.length === 0 ? <div className="card"><Empty icon="star" title="Nothing here" /></div> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => (
            <article key={r.id} className="card animate-fade-up p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{r.author} <span className="text-sm font-normal text-muted">on {r.product}</span></p>
                  <p className="font-mono text-[11px] text-muted">{r.orderNumber} · {formatDateTime(r.at)}</p>
                </div>
                <span className="flex text-amber-500">{[1, 2, 3, 4, 5].map((i) => <Icon key={i} name="star" size={15} fill={i <= r.rating ? "currentColor" : "none"} />)}</span>
              </div>
              <div className="mt-3 flex gap-4">
                <p className="flex-1 text-[15px] leading-relaxed">{r.body}</p>
                {r.photo && <Thumb src={r.photo} className="h-20 w-20 rounded-xl" />}
              </div>
              {r.reply && <p className="mt-3 rounded-xl bg-panel-2 p-3 text-sm"><span className="font-medium">Shop reply:</span> {r.reply}</p>}
              <div className="mt-4 border-t border-line pt-4">
                {tab !== "HIDDEN" && (
                  <input className="field mb-3" placeholder="Write a public reply (optional)" value={replies[r.id] ?? ""} onChange={(e) => setReplies({ ...replies, [r.id]: e.target.value })} />
                )}
                <div className="flex flex-wrap gap-2">
                  {r.status !== "APPROVED" && <Button size="sm" onClick={() => moderateReview(r.id, "APPROVED", replies[r.id] || undefined)}><Icon name="check" size={14} /> Publish</Button>}
                  {r.status === "APPROVED" && replies[r.id] && <Button size="sm" variant="outline" onClick={() => moderateReview(r.id, "APPROVED", replies[r.id])}>Post reply</Button>}
                  {r.status !== "HIDDEN" && <Button size="sm" variant="ghost" onClick={() => moderateReview(r.id, "HIDDEN")}><Icon name="eye" size={14} /> Hide</Button>}
                  {r.rating <= 2 && <Badge tone="amber" className="ml-auto">Low rating — consider reaching out</Badge>}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </OwnerOnly>
  );
}
