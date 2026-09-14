import { withRouteAccess } from "@/lib/with-route-access";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowRight, ChevronRight, Layers } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { itemCost } from "@/lib/asset-logic";
import { planItemStage } from "@/lib/plan-stage";
import { planApprovalForItem } from "@/lib/withdraw";
import { PROCESS_STEPS } from "@/lib/process-steps";
import { DOMAINS, ORG_UNITS, PROJECTS, TEAMS, lookup, useStore } from "@/lib/store";
import { STATUS_LABELS, type ServiceRequest, type StatusKey } from "@/lib/types";
import { requestSituation } from "@/lib/request-situation";
import { formatHuDate } from "@/lib/clock";

export const Route = createFileRoute("/vezetoi-attekintes")({
  head: () => ({
    meta: [
      { title: "Vezetői áttekintés – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Kari szintű vezetői irányítópult: minden digitális igény, projekt és költség egy nézetben, eset szintre lebontható.",
      },
      { property: "og:title", content: "Vezetői áttekintés – ÁOK Portál" },
      {
        property: "og:description",
        content: "Teljes kari rálátás, tetszőleges bontásban, eset szintig.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: withRouteAccess("/vezetoi-attekintes", "Vezetői áttekintés", LeaderView),
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

const COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type Dimension = "domain" | "unit" | "status" | "team";

const DIMENSIONS: { key: Dimension; label: string }[] = [
  { key: "domain", label: "Szolgáltatási terület" },
  { key: "unit", label: "Szervezeti egység" },
  { key: "status", label: "Állapot" },
  { key: "team", label: "Végrehajtó csapat" },
];

const huf = (n: number) => `${Math.round(n / 1000).toLocaleString("hu-HU")} eFt`;

function groupKey(r: ServiceRequest, dim: Dimension): string {
  if (dim === "domain") return r.domain;
  if (dim === "unit") return r.orgUnitId;
  if (dim === "team") return r.teamId ?? "—";
  return r.status;
}

function groupLabel(key: string, dim: Dimension): string {
  if (dim === "domain") return lookup.domain(key)?.short ?? key;
  if (dim === "unit") return lookup.unit(key);
  if (dim === "team") return lookup.team(key);
  return STATUS_LABELS[key as StatusKey] ?? key;
}

function LeaderView() {
  const { requests, planItems, planApprovals, handovers, users, processSettings } = useStore();
  const [dimension, setDimension] = useState<Dimension>("domain");
  const [drill, setDrill] = useState<string | null>(null);

  const open = requests.filter((r) => OPEN.includes(r.status));
  const closed = requests.filter((r) => r.status === "lezarva");
  const risky = requests.filter((r) => r.slaRisk && OPEN.includes(r.status));
  const waitingApproval = requests.filter((r) => r.status === "jovahagyasra_var");
  const totalCost = requests.reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
  const plannedCost = planItems.reduce((s, p) => s + itemCost(p).withContingency, 0);

  const groups = useMemo(() => {
    const map = new Map<string, ServiceRequest[]>();
    for (const r of requests) {
      const k = groupKey(r, dimension);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    return [...map.entries()]
      .map(([key, items]) => ({
        key,
        label: groupLabel(key, dimension),
        total: items.length,
        open: items.filter((r) => OPEN.includes(r.status)).length,
        risk: items.filter((r) => r.slaRisk && OPEN.includes(r.status)).length,
        cost: items.reduce((s, r) => s + (r.estimatedCost ?? 0), 0),
      }))
      .sort((a, b) => b.total - a.total);
  }, [requests, dimension]);

  // Nyolclépcsős folyamat: lépésenkénti megoszlás és késedelmes tételek.
  // Származtatott adat, nincs külön tárolt állapot.
  const processOverview = useMemo(() => {
    const perStep = PROCESS_STEPS.map((label) => ({
      label,
      count: 0,
      waitingSum: 0,
      waitingN: 0,
      overdue: 0,
    }));
    const overdue: {
      id: string;
      name: string;
      step: string;
      waitingOn: string;
      detail: string;
      requestId?: string;
    }[] = [];
    for (const item of planItems) {
      const approval = planApprovalForItem(item, planApprovals ?? []);
      const handover = (handovers ?? []).find((h) => h.planItemId === item.id);
      const stage = planItemStage(item, approval, handover, users);
      // Az igényből származó tételeket az ügyek szintjén számoljuk (lent).
      if (!item.sourceRequestId) perStep[stage.stageIndex]!.count += 1;
      if (stage.overdue) {
        overdue.push({
          id: item.id,
          name: item.deviceName ?? item.standardKey,
          step: stage.stepLabel,
          waitingOn: stage.waitingOn,
          detail: "A tervezett negyedév vége elmúlt, a tétel nem teljesült.",
          ...(item.sourceRequestId ? { requestId: item.sourceRequestId } : {}),
        });
      }
    }
    // D3/D7: lépés-határidők az igények szintjén – mióta vár, lejárt jelzés.
    for (const r of requests) {
      if (r.domain !== "hardver") continue;
      const sit = requestSituation(r, {
        planItems,
        planApprovals: planApprovals ?? [],
        handovers: handovers ?? [],
        users,
        settings: processSettings,
      });
      if (sit.closed || sit.terminated) continue;
      const step = perStep[sit.stageIndex]!;
      step.count += 1;
      const d = sit.deadline;
      if (!d) continue;
      step.waitingSum += d.waitingWorkdays;
      step.waitingN += 1;
      if (d.level === "overdue") {
        step.overdue += 1;
        overdue.push({
          id: `req-${r.id}`,
          name: r.title,
          step: PROCESS_STEPS[sit.stageIndex] ?? "",
          waitingOn: sit.waitingOn,
          detail: `Lejárt határidő: ${formatHuDate(d.dueDate)} · ${d.waitingWorkdays} munkanapja vár (${-d.remainingWorkdays} munkanap késés)`,
          requestId: r.id,
        });
      }
    }
    return { perStep, overdue };
  }, [requests, planItems, planApprovals, handovers, users, processSettings]);
  const overdueDeadlines = processOverview.perStep.reduce((n, s2) => n + s2.overdue, 0);

  const drillItems = useMemo(
    () => (drill ? requests.filter((r) => groupKey(r, dimension) === drill) : []),
    [drill, dimension, requests],
  );

  const kpis = [
    { label: "Nyitott ügyek", value: open.length, hint: `${requests.length} összes igény` },
    { label: "Jóváhagyásra vár", value: waitingApproval.length, hint: "vezetői döntést igényel" },
    { label: "SLA-kockázat", value: risky.length, hint: "határidőn kívül kerülhet" },
    {
      label: "Lejárt lépés-határidő",
      value: overdueDeadlines,
      hint: "beszerzési ügy, ahol a lépés határideje elmúlt",
    },
    { label: "Lezárt ügyek", value: closed.length, hint: "teljesített igények" },
    { label: "Igényelt költség", value: huf(totalCost), hint: "összes igény becsült értéke" },
    { label: "Tervezett beszerzés", value: huf(plannedCost), hint: "beszerzési terv sorai" },
  ];

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <header className="rounded-md bg-primary px-6 py-8 text-primary-foreground lg:px-10">
        <p className="text-xs font-semibold tracking-[0.18em] uppercase opacity-80">
          Vezetői irányítópult
        </p>
        <PageHeading
          className="mt-2 text-primary-foreground"
          titleClassName="font-display text-3xl font-semibold lg:text-4xl"
          infoClassName="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          title="Kari digitális működés egy képernyőn"
          description="Minden szolgáltatási igény, fejlesztési projekt és beszerzési tétel összesítve. Bármely mutató tetszőleges bontásban megnyitható, egészen az egyes ügyek szintjéig."
        />
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-md border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-semibold">{k.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
          </div>
        ))}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">
            Beszerzési ügyek a folyamat lépései szerint
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Nyitott ügyek száma, átlagos várakozás munkanapban, lejárt határidők.
          </p>
          <ul className="mt-4 space-y-2 text-sm">
            {processOverview.perStep.map((s2, i) => (
              <li key={s2.label} className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">
                  {i + 1}. {s2.label}
                </span>
                <span className="flex items-center gap-2 text-xs">
                  {s2.waitingN > 0 && (
                    <span className="text-muted-foreground">
                      {`átl. ${Math.round(s2.waitingSum / s2.waitingN)} mn`}
                    </span>
                  )}
                  {s2.overdue > 0 && (
                    <span className="rounded-full bg-destructive/10 px-2 py-0.5 font-medium text-destructive">
                      {`${s2.overdue} lejárt`}
                    </span>
                  )}
                  <span className="font-display text-sm font-semibold">{s2.count}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Lejárt határidejű ügyek</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Jelzés a felelősnek és a szakmai felügyeletnek; a döntés a felelősnél marad.
          </p>
          {processOverview.overdue.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Nincs lejárt határidejű vagy késedelmes beszerzési ügy.
            </p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {processOverview.overdue.map((o) => (
                <li key={o.id} className="rounded-md bg-destructive/10 px-3 py-2">
                  {o.requestId ? (
                    <Link
                      to="/igeny/$id"
                      params={{ id: o.requestId }}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {o.name}
                    </Link>
                  ) : (
                    <p className="font-medium">{o.name}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {o.step} · {o.waitingOn}
                  </p>
                  <p className="text-xs text-destructive">{o.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Ügyek területenként</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={DOMAINS.map((d) => ({
                  name: d.short,
                  nyitott: open.filter((r) => r.domain === d.key).length,
                  lezart: closed.filter((r) => r.domain === d.key).length,
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="nyitott"
                  name="Nyitott"
                  fill="var(--color-chart-1)"
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="lezart"
                  name="Lezárt"
                  fill="var(--color-chart-3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-5">
          <h2 className="font-display text-lg font-semibold">Fejlesztési portfólió állapota</h2>
          {PROJECTS.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Jelenleg nincs nyilvántartott fejlesztési projekt.
            </p>
          ) : (
            <div className="mt-4 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[...new Set(PROJECTS.map((p) => p.stage))].map((s) => ({
                      name: s,
                      value: PROJECTS.filter((p) => p.stage === s).length,
                    }))}
                    dataKey="value"
                    nameKey="name"
                    outerRadius={90}
                    label
                  >
                    {PROJECTS.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card min-w-0">
          <div className="flex items-center justify-between gap-3 border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">Döntésre váró ügyek</h2>
            <Link
              to="/jovahagyasok"
              className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              Jóváhagyási sor <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {waitingApproval.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {r.approvals.find((a) => a.decision === "fuggoben")
                    ? lookup.userName(
                        r.approvals.find((a) => a.decision === "fuggoben")!.approverId,
                      )
                    : "—"}
                </span>
                <Link
                  to="/igeny/$id"
                  params={{ id: r.id }}
                  className="text-primary hover:underline"
                >
                  Eset
                </Link>
              </li>
            ))}
            {waitingApproval.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nincs döntésre váró ügy.
              </li>
            )}
          </ul>
        </div>

        <div className="rounded-md border border-border bg-card min-w-0">
          <div className="border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">SLA-kockázatos ügyek</h2>
            <p className="text-sm text-muted-foreground">
              Határidőn kívül kerülhetnek – felelős csapattal és határidővel.
            </p>
          </div>
          <ul className="divide-y divide-border">
            {risky.slice(0, 6).map((r) => (
              <li key={r.id} className="flex items-center gap-3 p-4 text-sm">
                <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                <span className="min-w-0 flex-1 truncate">{r.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {lookup.team(r.teamId)} · {r.dueDate ?? "nincs határidő"}
                </span>
                <Link
                  to="/igeny/$id"
                  params={{ id: r.id }}
                  className="text-primary hover:underline"
                >
                  Eset
                </Link>
              </li>
            ))}
            {risky.length === 0 && (
              <li className="p-6 text-center text-sm text-muted-foreground">
                Nincs SLA-kockázatos ügy.
              </li>
            )}
          </ul>
        </div>
      </section>

      <section className="mt-8 rounded-md border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Layers className="size-4" aria-hidden="true" /> Lebontás
            </h2>
            <p className="text-sm text-muted-foreground">
              Válasszon bontást, majd nyisson meg egy sort az ügyek listájához.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DIMENSIONS.map((d) => (
              <Button
                key={d.key}
                size="sm"
                variant={dimension === d.key ? "default" : "outline"}
                onClick={() => {
                  setDimension(d.key);
                  setDrill(null);
                }}
              >
                {d.label}
              </Button>
            ))}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{DIMENSIONS.find((d) => d.key === dimension)!.label}</TableHead>
              <TableHead className="text-right">Összes</TableHead>
              <TableHead className="text-right">Nyitott</TableHead>
              <TableHead className="text-right">SLA-kockázat</TableHead>
              <TableHead className="text-right">Becsült költség</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {groups.map((g) => (
              <TableRow key={g.key} data-state={drill === g.key ? "selected" : undefined}>
                <TableCell className="font-medium">{g.label}</TableCell>
                <TableCell className="text-right">{g.total}</TableCell>
                <TableCell className="text-right">{g.open}</TableCell>
                <TableCell className="text-right">
                  {g.risk > 0 ? (
                    <Badge variant="destructive">{g.risk}</Badge>
                  ) : (
                    <span className="text-muted-foreground">0</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{huf(g.cost)}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDrill(drill === g.key ? null : g.key)}
                  >
                    Ügyek <ChevronRight className="size-4" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      {drill && (
        <section className="mt-6 rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-5">
            <h2 className="font-display text-lg font-semibold">
              {groupLabel(drill, dimension)} – {drillItems.length} ügy
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setDrill(null)}>
              Bezárás
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Azonosító</TableHead>
                <TableHead>Ügy</TableHead>
                <TableHead>Igénylő</TableHead>
                <TableHead>Egység</TableHead>
                <TableHead>Állapot</TableHead>
                <TableHead className="text-right">Költség</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {drillItems.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs">{r.id}</TableCell>
                  <TableCell className="max-w-[320px] truncate">{r.title}</TableCell>
                  <TableCell className="text-sm">{lookup.userName(r.requesterId)}</TableCell>
                  <TableCell className="text-sm">{lookup.unit(r.orgUnitId)}</TableCell>
                  <TableCell>
                    <Badge variant={r.slaRisk ? "destructive" : "secondary"}>
                      {STATUS_LABELS[r.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">{huf(r.estimatedCost ?? 0)}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      to="/igeny/$id"
                      params={{ id: r.id }}
                      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                    >
                      Eset megnyitása <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TEAMS.map((t) => {
          const items = requests.filter((r) => r.teamId === t.id && OPEN.includes(r.status));
          return (
            <div key={t.id} className="rounded-md border border-border bg-card p-4">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="mt-1 font-display text-2xl font-semibold">{items.length}</p>
              <p className="text-xs text-muted-foreground">nyitott ügy</p>
            </div>
          );
        })}
      </section>

      <p className="mt-6 text-xs text-muted-foreground">
        {ORG_UNITS.length} szervezeti egység · {PROJECTS.length} fejlesztési projekt · adatok a
        demonstrációs adatbázisból.
      </p>
    </div>
  );
}
