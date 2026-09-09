import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Check, Clock, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, PriorityBadge } from "@/components/status-badge";
import { lookup, useStore } from "@/lib/store";
import type { ServiceRequest } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/jovahagyasok")({
  head: () => ({
    meta: [
      { title: "Jóváhagyási sor – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Minden döntésre váró szolgáltatási igény egy listában: saját jóváhagyási teendők, kari függő döntések és SLA-kockázatos ügyek.",
      },
      { property: "og:title", content: "Jóváhagyási sor – ÁOK Portál" },
      { property: "og:description", content: "Döntésre váró igények és jóváhagyási teendők." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApprovalQueue,
});

const TABS = [
  { key: "sajat", label: "Rám vár döntés" },
  { key: "fuggo", label: "Minden függő döntés" },
  { key: "kockazat", label: "SLA-kockázat" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const OPEN_RISK = ["lezarva", "elutasitva", "piszkozat"];

function ApprovalQueue() {
  const store = useStore();
  const [tab, setTab] = useState<TabKey>("sajat");

  const myPending = useMemo(
    () =>
      store.requests.filter((r) =>
        r.approvals.some(
          (a) => a.decision === "fuggoben" && a.approverId === store.currentUser.id,
        ) && !["lezarva", "elutasitva"].includes(r.status),
      ),
    [store.requests, store.currentUser.id],
  );

  const allPending = useMemo(
    () =>
      store.requests.filter(
        (r) =>
          r.status === "jovahagyasra_var" ||
          r.approvals.some((a) => a.decision === "fuggoben" && !["lezarva", "elutasitva"].includes(r.status)),
      ),
    [store.requests],
  );

  const risky = useMemo(
    () => store.requests.filter((r) => r.slaRisk && !OPEN_RISK.includes(r.status)),
    [store.requests],
  );

  const rows = tab === "sajat" ? myPending : tab === "fuggo" ? allPending : risky;

  // Igénylő szerepkörben is dönthet, ha személy szerint rá vár jóváhagyás.
  const canApprove = store.activeRole !== "igenylo" || myPending.length > 0;

  const decide = (r: ServiceRequest, decision: "jovahagyva" | "elutasitva") => {
    const mine = r.approvals.find(
      (a) => a.decision === "fuggoben" && a.approverId === store.currentUser.id,
    );
    if (!mine) return;
    store.decideApproval(
      r.id,
      mine.id,
      decision,
      decision === "jovahagyva" ? "Támogatom." : "Jelenleg nem támogatott.",
    );
    if (decision === "jovahagyva") toast.success(`${r.id} jóváhagyva.`);
    else toast.error(`${r.id} elutasítva.`);
  };

  return (
    <div className="space-y-6">
      {!canApprove ? (
        <div className="card-surface p-6">
          <h1 className="font-display text-2xl font-semibold">Jóváhagyási sor</h1>
          <p className="mt-2 text-muted-foreground">
            Igénylő szerepkörben nincs jóváhagyási hatásköre – az Ön igényeiről a szervezeti
            jóváhagyó és a szolgáltatásgazda dönt. Saját ügyeit az „Igényeim” oldalon követheti.
          </p>
          <Button asChild className="mt-4">
            <Link to="/igenyeim">Igényeim megnyitása</Link>
          </Button>
        </div>
      ) : (
      <>
      <div>
        <PageHeading
          title="Jóváhagyási sor"
          description="Minden döntésre váró igény egy helyen – a saját teendőitől a kari szintű függő döntésekig, teljes indoklással és lefúrási lehetőséggel."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Rám vár döntés", value: myPending.length, Icon: Clock },
          { label: "Összes függő döntés", value: allPending.length, Icon: Check },
          { label: "SLA-kockázatos ügy", value: risky.length, Icon: TriangleAlert },
        ].map((k) => (
          <div key={k.label} className="card-surface flex items-center gap-4 p-5">
            <k.Icon className="size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm text-muted-foreground">{k.label}</p>
              <p className="font-display text-2xl font-semibold">{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div role="tablist" aria-label="Jóváhagyási nézetek" className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
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

      <section className="card-surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Azonosító</TableHead>
              <TableHead>Ügy</TableHead>
              <TableHead>Igénylő / egység</TableHead>
              <TableHead>Lépés</TableHead>
              <TableHead>Állapot</TableHead>
              <TableHead className="text-right">Költség</TableHead>
              <TableHead className="text-right">Művelet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const pending = r.approvals.filter((a) => a.decision === "fuggoben");
              const mine = pending.find((a) => a.approverId === store.currentUser.id);
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate font-medium">{r.title}</p>
                    <p className="mt-1 flex items-center gap-2">
                      <PriorityBadge priority={r.priority} />
                      {r.slaRisk && <Badge variant="destructive">SLA-kockázat</Badge>}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {lookup.userName(r.requesterId)}
                    <span className="block text-xs text-muted-foreground">
                      {lookup.unit(r.orgUnitId)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {pending.length
                      ? pending
                          .map((a) => `${a.step}. ${a.role} – ${lookup.userName(a.approverId)}`)
                          .join(" · ")
                      : "Nincs függő lépés"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {(r.estimatedCost ?? 0).toLocaleString("hu-HU")} Ft
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {mine && (
                        <>
                          <Button size="sm" onClick={() => decide(r, "jovahagyva")}>
                            <Check className="size-4" /> Jóváhagyás
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => decide(r, "elutasitva")}>
                            <X className="size-4" /> Elutasítás
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              store.setStatus(r.id, "pontositas");
                              toast.info("Pontosítást kért az igénylőtől.");
                            }}
                          >
                            Pontosítás
                          </Button>
                        </>
                      )}
                      <Link
                        to="/igeny/$id"
                        params={{ id: r.id }}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      >
                        Eset <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  Nincs megjeleníthető tétel ebben a nézetben.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </section>
      </>
      )}
    </div>
  );
}