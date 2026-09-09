import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Inbox, Timer, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityBadge, StatusBadge } from "@/components/status-badge";
import { DOMAINS, TEAMS, USERS, lookup, useStore } from "@/lib/store";
import { STATUS_LABELS, type StatusKey } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";

export const Route = createFileRoute("/munkater")({
  head: () => ({
    meta: [
      { title: "Szolgáltatási munkatér – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Beérkező igények kezelése, besorolás, kiosztás és SLA-figyelés a szolgáltatási csapatok számára.",
      },
      { property: "og:title", content: "Szolgáltatási munkatér – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Munkasor, besorolás, kiosztás és SLA-kockázatok egy felületen.",
      },
    ],
  }),
  component: Workbench,
});

const OPEN: StatusKey[] = [
  "bekuldve",
  "elso_ertekeles",
  "pontositas",
  "jovahagyasra_var",
  "elfogadva",
  "tervezes",
  "megvalositas",
  "teszteles",
  "atadasra_var",
];

function Workbench() {
  const store = useStore();
  const viewOnly = useViewOnly("munkater");
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState("mind");
  const [status, setStatus] = useState("mind");
  const [assignee, setAssignee] = useState("mind");

  const all = store.requests;
  const kpis = useMemo(() => {
    const open = all.filter((r) => OPEN.includes(r.status));
    return [
      { label: "Nyitott igény", value: open.length, Icon: Inbox },
      { label: "Kiosztásra vár", value: all.filter((r) => !r.assigneeId && OPEN.includes(r.status)).length, Icon: Timer },
      { label: "SLA-kockázat", value: all.filter((r) => r.slaRisk).length, Icon: AlertTriangle },
      { label: "Lezárva (30 nap)", value: all.filter((r) => r.status === "lezarva").length, Icon: TrendingUp },
    ];
  }, [all]);

  const filtered = all
    .filter((r) => (domain === "mind" ? true : r.domain === domain))
    .filter((r) => (status === "mind" ? OPEN.includes(r.status) : r.status === status))
    .filter((r) =>
      assignee === "mind"
        ? true
        : assignee === "nincs"
          ? !r.assigneeId
          : r.assigneeId === assignee,
    )
    .filter((r) =>
      q ? `${r.id} ${r.title} ${lookup.userName(r.requesterId)}`.toLowerCase().includes(q.toLowerCase()) : true,
    );

  const triage = all.filter((r) => r.status === "bekuldve" || r.status === "elso_ertekeles");
  const staffUsers = USERS.filter((u) => u.teamId);

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Szolgáltatási munkatér"
          description={
            <>
              {lookup.team(store.currentUser.teamId) !== "—"
                ? `${lookup.team(store.currentUser.teamId)} · `
                : ""}
              munkasor, besorolás és kapacitás.
            </>
          }
        />
        {viewOnly && <ViewOnlyNotice />}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-surface flex items-center gap-4 p-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary">
              <k.Icon className="size-5 text-primary" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-display text-2xl font-semibold">{k.value}</span>
              <span className="block text-sm text-muted-foreground">{k.label}</span>
            </span>
          </div>
        ))}
      </div>

      <Tabs defaultValue="sor">
        <TabsList>
          <TabsTrigger value="sor">Munkasor</TabsTrigger>
          <TabsTrigger value="besorolas">Besorolásra vár ({triage.length})</TabsTrigger>
          <TabsTrigger value="kapacitas">Csapatkapacitás</TabsTrigger>
        </TabsList>

        <TabsContent value="sor" className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              className="max-w-xs"
              placeholder="Keresés azonosító, tárgy, igénylő…"
              aria-label="Keresés az igények között"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <Select value={domain} onValueChange={setDomain}>
              <SelectTrigger className="w-44" aria-label="Terület szűrő">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mind">Minden terület</SelectItem>
                {DOMAINS.map((d) => (
                  <SelectItem key={d.key} value={d.key}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-52" aria-label="Státusz szűrő">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mind">Minden nyitott</SelectItem>
                {OPEN.concat(["lezarva", "elutasitva"]).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="w-52" aria-label="Felelős szűrő">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mind">Minden felelős</SelectItem>
                <SelectItem value="nincs">Nincs kiosztva</SelectItem>
                {staffUsers.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="card-surface overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Azonosító</TableHead>
                  <TableHead>Tárgy</TableHead>
                  <TableHead>Egység</TableHead>
                  <TableHead>Státusz</TableHead>
                  <TableHead>Prioritás</TableHead>
                  <TableHead>Felelős</TableHead>
                  <TableHead>Határidő</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id} className={cn(r.slaRisk && "bg-destructive/5")}>
                    <TableCell className="font-mono text-xs">
                      <Link to="/igeny/$id" params={{ id: r.id }} className="text-primary hover:underline">
                        {r.id}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <span className="block truncate font-medium">{r.title}</span>
                      <span className="block text-xs text-muted-foreground">
                        {lookup.domain(r.domain)?.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{lookup.unit(r.orgUnitId)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell>
                      <PriorityBadge priority={r.priority} />
                    </TableCell>
                    <TableCell>
                      <Select
                        disabled={viewOnly}
                        value={r.assigneeId ?? "nincs"}
                        onValueChange={(v) => {
                          store.updateRequest(
                            r.id,
                            { assigneeId: v === "nincs" ? undefined : v },
                            "Felelős kijelölése",
                          );
                          toast.success("Felelős frissítve.");
                        }}
                      >
                        <SelectTrigger className="h-8 w-44" aria-label={`${r.id} felelőse`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nincs">Nincs kiosztva</SelectItem>
                          {staffUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {r.dueDate ?? "—"}
                      {r.slaRisk && (
                        <span className="block text-xs font-medium text-destructive">SLA-kockázat</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Nincs a szűrésnek megfelelő igény.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="besorolas" className="space-y-4">
          {triage.map((r) => (
            <article key={r.id} className="card-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    to="/igeny/$id"
                    params={{ id: r.id }}
                    className="font-display text-base font-semibold hover:underline"
                  >
                    {r.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.id} · {lookup.userName(r.requesterId)} · {lookup.unit(r.orgUnitId)}
                  </p>
                </div>
                <StatusBadge status={r.status} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{r.goal}</p>
              {r.ai && (
                <div className="mt-4 rounded-md border border-info/30 bg-info/5 p-3 text-sm">
                  <p className="text-xs font-semibold tracking-wide text-info uppercase">
                    ✦ AI-javaslat ({Math.round(r.ai.confidence * 100)}%)
                  </p>
                  <p className="mt-1.5">
                    {r.ai.category} / {r.ai.subtype} · {r.ai.team} · {r.ai.complexity}
                    {r.ai.duplicateOf ? ` · lehetséges duplikáció: ${r.ai.duplicateOf}` : ""}
                  </p>
                </div>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  disabled={viewOnly}
                  onClick={() => {
                    store.setStatus(r.id, "jovahagyasra_var");
                    toast.success("Besorolás elfogadva, jóváhagyásra küldve.");
                  }}
                >
                  Javaslat elfogadása
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={viewOnly}
                  onClick={() => {
                    store.setStatus(r.id, "pontositas");
                    toast.info("Pontosítás kérve az igénylőtől.");
                  }}
                >
                  Pontosítás kérése
                </Button>
                <Button size="sm" variant="ghost" asChild>
                  <Link to="/igeny/$id" params={{ id: r.id }}>
                    Adatlap megnyitása
                  </Link>
                </Button>
              </div>
            </article>
          ))}
          {triage.length === 0 && (
            <p className="card-surface p-10 text-center text-muted-foreground">
              Nincs besorolásra váró igény.
            </p>
          )}
        </TabsContent>

        <TabsContent value="kapacitas">
          <div className="grid gap-4 lg:grid-cols-2">
            {TEAMS.map((t) => {
              const teamRequests = all.filter((r) => r.teamId === t.id && OPEN.includes(r.status));
              return (
                <section key={t.id} className="card-surface p-5">
                  <h2 className="font-display text-base font-semibold">{t.name}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {teamRequests.length} nyitott igény · szolgáltatásgazda: {lookup.userName(t.ownerUserId)}
                  </p>
                  <ul className="mt-4 space-y-3">
                    {t.members.map((m) => {
                      const load = all.filter((r) => r.assigneeId === m && OPEN.includes(r.status)).length;
                      const pct = Math.min(100, load * 25);
                      return (
                        <li key={m} className="text-sm">
                          <div className="flex justify-between">
                            <span>{lookup.userName(m)}</span>
                            <span className="text-muted-foreground">{load} igény</span>
                          </div>
                          <div
                            className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary"
                            role="progressbar"
                            aria-valuenow={pct}
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-label={`${lookup.userName(m)} leterheltsége`}
                          >
                            <div
                              className={cn("h-full rounded-full", pct > 75 ? "bg-destructive" : "bg-primary")}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}