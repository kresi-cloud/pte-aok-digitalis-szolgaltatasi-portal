import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { WithdrawRequestButton } from "@/components/withdraw-request-button";
import { Input } from "@/components/ui/input";
import { lookup, useStore } from "@/lib/store";
import { STATUS_LABELS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/igenyeim")({
  head: () => ({
    meta: [
      { title: "Igényeim – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content: "Saját beküldött igényei, piszkozatai és azok aktuális állapota egy listában.",
      },
      { property: "og:title", content: "Igényeim – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Kövesse nyomon saját digitális igényeit." },
    ],
  }),
  component: MyRequests,
});

const TABS = [
  { key: "aktiv", label: "Folyamatban" },
  { key: "piszkozat", label: "Piszkozatok" },
  { key: "visszavont", label: "Visszavont" },
  { key: "lezart", label: "Lezárt" },
  { key: "mind", label: "Mind" },
] as const;

function MyRequests() {
  const { requests, currentUser } = useStore();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("aktiv");
  const [q, setQ] = useState("");

  const mine = requests.filter((r) => r.requesterId === currentUser.id);
  const filtered = mine
    .filter((r) => {
      if (tab === "aktiv")
        return !["lezarva", "elutasitva", "piszkozat", "visszavonva"].includes(r.status);
      if (tab === "piszkozat") return r.status === "piszkozat";
      if (tab === "visszavont") return r.status === "visszavonva";
      if (tab === "lezart") return ["lezarva", "elutasitva"].includes(r.status);
      return true;
    })
    .filter((r) => (q ? `${r.id} ${r.title}`.toLowerCase().includes(q.toLowerCase()) : true));

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Igényeim"
          description={
            <>
              {lookup.unit(currentUser.orgUnitId)} · {mine.length} igény
            </>
          }
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Szűrés állapot szerint" className="flex gap-1 rounded-md border border-border bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "rounded px-3 py-1.5 text-sm",
                tab === t.key ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <Input
          className="max-w-xs"
          placeholder="Keresés az igényeim között…"
          aria-label="Keresés az igényeim között"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <p className="card-surface p-6 text-sm text-muted-foreground">Nincs megjeleníthető igény.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li key={r.id} className="card-surface flex flex-wrap items-center gap-2 p-2 transition-colors hover:border-primary/40">
              <Link
                to="/igeny/$id"
                params={{ id: r.id }}
                className="flex flex-1 flex-wrap items-center gap-4 p-2"
              >
                <span className="w-32 shrink-0 font-mono text-xs text-muted-foreground">{r.id}</span>
                <span className="min-w-[240px] flex-1 font-medium">{r.title}</span>
                <span className="text-sm text-muted-foreground">{lookup.team(r.teamId)}</span>
                <PriorityBadge priority={r.priority} />
                <StatusBadge status={r.status} />
                <span className="w-24 text-right text-xs text-muted-foreground">{r.updatedAt}</span>
              </Link>
              <WithdrawRequestButton request={r} showBlockReason={false} />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Állapotok: {Object.values(STATUS_LABELS).join(" · ")}
      </p>
    </div>
  );
}