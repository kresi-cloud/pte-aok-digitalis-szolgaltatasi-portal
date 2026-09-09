import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getProcurementNextAction } from "@/lib/procurement-rules";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore, lookup } from "@/lib/store";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NEXT_FINANCIAL_YEAR, HARDWARE_STANDARDS, TODAY } from "@/lib/asset-data";
import { huf, itemCost } from "@/lib/asset-logic";
import {
  PLAN_APPROVAL_LEAD_DAYS,
  PLAN_APPROVAL_STATUS_LABELS,
  PLAN_SCOPE_LABELS,
  QUARTER_LABELS,
  type PlanApproval,
  type ProcurementPlanItem,
  type Quarter,
} from "@/lib/asset-types";
import { daysUntil } from "@/lib/plan-approvals";
import { planItemStage } from "@/lib/plan-stage";
import { planApprovalForItem } from "@/lib/withdraw";
import { normalizeLegacyPlanStatus } from "@/lib/plan-stage";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { ProductCatalogAdmin } from "@/components/product-catalog-admin";
import { StatTile } from "@/components/asset-bits";

export const Route = createFileRoute("/beszerzesek")({
  head: () => ({
    meta: [
      { title: "Beszerzői munkatér – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Jóváhagyott eseti beszerzések átvétele, valamint a negyedéves és éves beszerzési tervek gazdasági vezetői jóváhagyási státusza és határidői.",
      },
      { property: "og:title", content: "Beszerzői munkatér – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Eseti beszerzések és tervciklusok egy felületen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BuyerWorkspace,
});

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

/** Ki a soron következő döntéshozó az adott tervciklus-státuszban. */
const WAITING_ON: Record<string, string> = {
  tervezes: "IT eszközmenedzser – terv összeállítása és beküldése",
  gazdasagi_ellenorzes: "Gazdasági vezető – pénzügyi ellenőrzés",
  dekani_jovahagyas: "Gazdasági vezető – jóváhagyás",
  jovahagyasra_var: "Gazdasági vezető – jóváhagyás",
  visszakuldve: "IT eszközmenedzser – átdolgozás",
  jovahagyva: "Beszerző – beszerzés indítása",
  vegrehajtas: "Beszerző – végrehajtás alatt",
  lezarva: "Lezárva",
  elutasitva: "Elutasítva",
};

/** Egy évre előre eső negyedéves tervblokkok (aktuális negyedévtől számítva). */
function schedulingBlocks(): { value: string; label: string; planYear: number; quarter: Quarter }[] {
  const now = new Date(TODAY);
  const year = now.getFullYear();
  const qIndex = Math.floor(now.getMonth() / 3);
  const out: { value: string; label: string; planYear: number; quarter: Quarter }[] = [];
  for (let i = 0; i < 5; i++) {
    const abs = qIndex + i;
    const planYear = year + Math.floor(abs / 4);
    const quarter = QUARTERS[abs % 4]!;
    out.push({
      value: `${planYear}-${quarter}`,
      label: `${planYear}. ${QUARTER_LABELS[quarter]}`,
      planYear,
      quarter,
    });
  }
  return out;
}

const BLOCKS = schedulingBlocks();

function standardLabel(key: string) {
  return HARDWARE_STANDARDS.find((s) => s.key === key)?.label ?? key;
}


function ItemRow({
  item,
  canAct,
  canSchedule = false,
  showActions = true,
  selected,
  onToggleSelect,
}: {
  item: ProcurementPlanItem;
  canAct: boolean;
  canSchedule?: boolean | undefined;
  showActions?: boolean | undefined;
  selected?: boolean | undefined;
  onToggleSelect?: ((on: boolean) => void) | undefined;
}) {
  const store = useStore();
  const cost = itemCost(item);
  const hasHandover = (store.handovers ?? []).some((h) => h.planItemId === item.id);
  const blockValue = `${item.planYear}-${item.quarter}`;
  const isImmediate = item.timing === "azonnali";
  // Egyetlen elsődleges művelet állapotonként, közös szabályok alapján.
  const stage = planItemStage(
    item,
    planApprovalForItem(item, store.planApprovals ?? []),
    (store.handovers ?? []).find((h) => h.planItemId === item.id),
    store.users,
  );
  const next = getProcurementNextAction(
    item,
    { planApprovals: store.planApprovals ?? [], handovers: store.handovers ?? [] },
    store.activeRole,
  );
  return (
    <tr className="border-t border-border align-top">
      {canSchedule && (
        <td className="px-3 py-3">
          <Checkbox
            checked={!!selected}
            onCheckedChange={(v) => onToggleSelect?.(v === true)}
            aria-label="Tétel kijelölése átütemezéshez"
          />
        </td>
      )}
      <td className="px-3 py-3">
        <span className="block text-sm font-medium">{standardLabel(item.standardKey)}</span>
        <span className="block text-xs text-muted-foreground">
          {item.quantity} db · {lookup.unit(item.orgUnitId)} · {QUARTER_LABELS[item.quarter]}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{item.reason}</span>
        {item.sourceRequestId && (
          <Link
            to="/igeny/$id"
            params={{ id: item.sourceRequestId }}
            className="mt-1 inline-block text-xs font-medium text-primary underline"
          >
            Forrásigény: {item.sourceRequestId}
          </Link>
        )}
        {item.handedToPlannerAt && (
          <span className="mt-1 block text-xs text-muted-foreground">
            Eszközmenedzserhez átadva: {item.handedToPlannerAt}
          </span>
        )}
        {item.rescheduledAt && (
          <span className="mt-1 block text-xs text-muted-foreground">
            Gazdasági vezető által átütemezve: {item.rescheduledAt}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-sm whitespace-nowrap">{huf(cost.withContingency)}</td>
      <td className="px-3 py-3 text-xs">{stage.label}</td>
      <td className="px-3 py-3 text-xs text-muted-foreground">
        {stage.waitingOn}
        {stage.overdue && (
          <span className="ml-2 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
            Késedelmes
          </span>
        )}
      </td>
      {canSchedule && (
        <td className="px-3 py-3">
          <div className="space-y-2">
            <span className="block text-xs font-medium">
              Jelenleg:{" "}
              {isImmediate ? "Azonnali" : `${item.planYear}. ${QUARTER_LABELS[item.quarter]}`}
            </span>
            <label className="block text-[11px] tracking-wide text-muted-foreground uppercase">
              Bontás
            </label>
            <Select
              value={isImmediate ? "azonnali" : "negyedeves"}
              onValueChange={(v) => {
                store.setPlanItemTiming(item.id, v as "azonnali" | "negyedeves");
                toast.success(v === "azonnali" ? "Azonnali beszerzés" : "Negyedéves tervbe sorolva");
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue placeholder="Bontás" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="azonnali">Azonnali</SelectItem>
                <SelectItem value="negyedeves">Negyedéves terv</SelectItem>
              </SelectContent>
            </Select>
            <label className="block text-[11px] tracking-wide text-muted-foreground uppercase">
              Célnegyedév
            </label>
            <Select
              disabled={isImmediate}
              value={BLOCKS.some((b) => b.value === blockValue) ? blockValue : ""}
              onValueChange={(v) => {
                const block = BLOCKS.find((b) => b.value === v);
                if (!block) return;
                store.reschedulePlanItem(item.id, block.planYear, block.quarter);
                toast.success(`Átütemezve: ${block.label}`);
              }}
            >
              <SelectTrigger className="w-[170px]">
                <SelectValue
                  placeholder={
                    isImmediate
                      ? "Azonnali – nincs tervnegyedév"
                      : `${item.planYear}. ${QUARTER_LABELS[item.quarter]}`
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {BLOCKS.map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </td>
      )}
      {showActions && (
        <td className="px-3 py-3">
          <div className="flex flex-wrap gap-2">
            {next.key && next.allowed && canAct ? (
              <Button
                size="sm"
                variant={next.key === "deliver" ? "default" : "outline"}
                onClick={() => {
                  const error =
                    next.key === "start"
                      ? store.startItemProcurement(item.id)
                      : store.markPlanItemDelivered(item.id);
                  if (error) {
                    toast.error(error);
                    return;
                  }
                  toast.success(
                    next.key === "start"
                      ? "Beszerzés elindítva"
                      : "Beérkezés rögzítve – átadva a kari IT referensnek",
                  );
                }}
              >
                {next.label}
              </Button>
            ) : (
              <span className="self-center text-xs text-muted-foreground">
                {next.hint ||
                  (hasHandover
                    ? "Átadási folyamatban a kari IT referensnél"
                    : "Nincs teendő – a művelet más szerepkörnél van.")}
              </span>
            )}
          </div>
        </td>
      )}

    </tr>
  );
}


function ItemsTable({
  items,
  canAct,
  canSchedule = false,
  selectedIds,
  onToggleSelect,
}: {
  items: ProcurementPlanItem[];
  canAct: boolean;
  canSchedule?: boolean | undefined;
  selectedIds?: string[] | undefined;
  onToggleSelect?: ((id: string, on: boolean) => void) | undefined;
}) {
  const store = useStore();
  const showActions = store.activeRole === "beszerzo";
  if (items.length === 0)
    return <p className="px-3 py-6 text-sm text-muted-foreground">Nincs megjeleníthető tétel.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="text-xs tracking-wide text-muted-foreground uppercase">
            {canSchedule && <th className="px-3 py-2" />}
            <th className="px-3 py-2">Tétel</th>
            <th className="px-3 py-2">Becsült bruttó</th>
            <th className="px-3 py-2">Állapot</th>
            <th className="px-3 py-2">Kire vár</th>
            {canSchedule && <th className="px-3 py-2">Ütemezés</th>}
            {showActions && <th className="px-3 py-2">Művelet</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((i) => (
            <ItemRow
              key={i.id}
              item={i}
              canAct={canAct}
              canSchedule={canSchedule}
              showActions={showActions}

              selected={selectedIds?.includes(i.id)}
              onToggleSelect={(on) => onToggleSelect?.(i.id, on)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ApprovalCard({ approval }: { approval: PlanApproval }) {
  const store = useStore();
  const [comment, setComment] = useState("");
  const role = store.activeRole;
  const isBuyer = role === "beszerzo";
  const isPlanner = role === "eszkozmenedzser";
  const isFinance = role === "gazdasagi_vezeto";
  const left = daysUntil(approval.dueAt);
  const items = store.planItems.filter((p) =>
    p.planYear !== approval.planYear
      ? false
      : approval.scope === "eves"
        ? true
        : approval.scope === "azonnali"
          ? p.timing === "azonnali"
          : p.quarter === approval.quarter && p.timing !== "azonnali",
  );
  const total = items.reduce((s, i) => s + itemCost(i).withContingency, 0);
  const status = normalizeLegacyPlanStatus(approval.status);

  const STEPS: { key: string; label: string }[] = [
    { key: "tervezes", label: "Eszközmenedzseri tervezés" },
    { key: "gazdasagi_ellenorzes", label: "Gazdasági ellenőrzés" },
    { key: "jovahagyva", label: "Beszerzés indítása" },
  ];
  const activeIndex =
    status === "vegrehajtas" ? 2 : STEPS.findIndex((s) => s.key === status);

  return (
    <article className="card-surface space-y-3 p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">
            {PLAN_SCOPE_LABELS[approval.scope]} – {approval.planYear}
            {approval.quarter ? ` ${QUARTER_LABELS[approval.quarter]}` : ""}
          </h3>
          {approval.scope === "azonnali" ? (
            <p className="text-xs text-muted-foreground">
              Azonnali (soron kívüli) beszerzési igények csomagja – gazdasági vezetői jóváhagyás
              után indítható.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Esedékesség: {approval.periodStart} · jóváhagyási határidő:{" "}
              <strong>{approval.dueAt}</strong> ({PLAN_APPROVAL_LEAD_DAYS[approval.scope]} nappal az
              esedékesség előtt)
            </p>
          )}
        </div>
        <span
          className={
            status === "jovahagyva" || status === "vegrehajtas"
              ? "rounded-sm bg-accent/15 px-2 py-1 text-xs font-semibold text-accent-foreground"
              : status === "visszakuldve"
                ? "rounded-sm bg-destructive/10 px-2 py-1 text-xs font-semibold text-destructive"
                : "rounded-sm bg-secondary px-2 py-1 text-xs font-semibold"
          }
        >
          {PLAN_APPROVAL_STATUS_LABELS[status]}
        </span>
      </header>

      <ol className="flex flex-wrap gap-2 text-xs">
        {STEPS.map((s, i) => (
          <li
            key={s.key}
            className={
              i <= activeIndex
                ? "rounded-sm bg-primary/10 px-2 py-1 font-medium text-primary"
                : "rounded-sm bg-muted px-2 py-1 text-muted-foreground"
            }
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <p className="text-sm">
        {items.length} tétel · becsült keret: <strong>{huf(total)}</strong>
      </p>
      {status === "gazdasagi_ellenorzes" &&
        approval.scope !== "azonnali" && (
          <p className="text-xs text-muted-foreground">
            {left >= 0
              ? `${left} nap van hátra a jóváhagyási határidőig.`
              : `A jóváhagyási határidő ${Math.abs(left)} napja lejárt.`}
          </p>
        )}
      {(approval.history ?? []).length > 0 && (
        <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
          {(approval.history ?? []).map((h, i) => (
            <li key={i}>
              {h.at} · {lookup.user(h.actorId)?.name ?? "—"} – {h.action}
              {h.comment ? ` – ${h.comment}` : ""}
            </li>
          ))}
        </ul>
      )}

      <p className="rounded-sm bg-muted px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Kire vár: </span>
        {WAITING_ON[status]}
      </p>

      {(isPlanner || isBuyer || isFinance) && status !== "vegrehajtas" && (
        <div className="space-y-2 border-t border-border pt-3">
          {isFinance && (status === "tervezes" || status === "visszakuldve") && (
            <Button
              size="sm"
              variant="outline"
              disabled={items.length === 0}
              onClick={() => {
                store.nudgePlanSubmission(approval.id);
                toast.success("Sürgetés elküldve az IT eszközmenedzsernek");
              }}
            >
              Beküldés sürgetése
            </Button>
          )}

          {isPlanner && (status === "tervezes" || status === "visszakuldve") && (
            <>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Eszközmenedzseri megjegyzés a tervhez (opcionális)"
                rows={2}
              />
              <Button
                size="sm"
                onClick={() => {
                  store.submitPlanForFinance(approval.id, comment || undefined);
                  toast.success("Terv beküldve gazdasági ellenőrzésre");
                }}
              >
                Beküldés gazdasági ellenőrzésre
              </Button>
            </>
          )}

          {isFinance && status === "gazdasagi_ellenorzes" && (
            <>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Gazdasági vezetői megjegyzés (opcionális)"
                rows={2}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    store.decidePlanApproval(approval.id, "jovahagyva", comment || undefined);
                    toast.success("Terv jóváhagyva – visszakerült a beszerzőhöz");
                  }}
                >
                  Jóváhagyom
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    store.decidePlanApproval(approval.id, "visszakuldve", comment || undefined);
                    toast("Terv visszaküldve az eszközmenedzsernek");
                  }}
                >
                  Átdolgozásra visszaküldöm
                </Button>
              </div>
            </>
          )}


          {isBuyer && status === "jovahagyva" && (
            <Button
              size="sm"
              onClick={() => {
                store.startPlanExecution(approval.id);
                toast.success("Beszerzési folyamat elindítva");
              }}
            >
              Beszerzési folyamat indítása
            </Button>
          )}
        </div>
      )}
    </article>
  );
}


function BuyerWorkspace() {
  const store = useStore();
  const viewOnly = useViewOnly("beszerzesek");
  const allowed = [
    "beszerzo",
    "eszkozmenedzser",
    "gazdasagi_vezeto",
    "dekan",
  ].includes(store.activeRole);
  const canSchedule =
    store.activeRole === "gazdasagi_vezeto" || store.activeRole === "eszkozmenedzser";
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkBlock, setBulkBlock] = useState<string>("");

  const yearItems = useMemo(
    () => store.planItems.filter((p) => p.planYear === NEXT_FINANCIAL_YEAR),
    [store.planItems],
  );
  const adHoc = useMemo(
    () => store.planItems.filter((p) => p.sourceRequestId),
    [store.planItems],
  );
  const approvals = store.planApprovals ?? [];
  const immediate = approvals.filter((a) => a.scope === "azonnali");
  const annual = approvals.filter((a) => a.scope === "eves");
  const quarterly = approvals.filter((a) => a.scope === "negyedeves");

  if (!allowed) {
    return (
      <div className="card-surface mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="font-display text-xl font-semibold">Beszerzői munkatér</h1>
        <p className="text-sm text-muted-foreground">
          Ez a felület a beszerző, az IT eszközmenedzser, a gazdasági vezető és a dékán (betekintés) számára érhető el.
        </p>
        <Button asChild variant="outline">
          <Link to="/igenyeim">Saját igényeim</Link>
        </Button>
      </div>
    );
  }

  const openAdHoc = adHoc.filter((p) => p.status !== "teljesult").length;
  const financePending = approvals.filter(
    (a) => normalizeLegacyPlanStatus(a.status) === "gazdasagi_ellenorzes",
  ).length;
  const planningCycles = approvals.filter((a) =>
    ["tervezes", "visszakuldve"].includes(a.status),
  ).length;
  const totalYear = yearItems.reduce((s, i) => s + itemCost(i).withContingency, 0);
  const role = store.activeRole;
  const secondTile =
    role === "gazdasagi_vezeto"
      ? { label: "Gazdasági ellenőrzésre vár", value: String(financePending) }
      : role === "eszkozmenedzser"
        ? { label: "Beküldésre váró tervciklus", value: String(planningCycles) }
        : { label: "Gazdasági jóváhagyásra vár", value: String(financePending) };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <PageHeading
          title="Beszerzői munkatér"
          description={`Jóváhagyott eseti beszerzések, valamint a ${NEXT_FINANCIAL_YEAR}. évi negyedéves és éves beszerzési terv jóváhagyási státusza.`}
        />
        {viewOnly && <ViewOnlyNotice />}
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Nyitott eseti beszerzés" value={String(openAdHoc)} />
        <StatTile label={secondTile.label} value={secondTile.value} />
        <StatTile label={`${NEXT_FINANCIAL_YEAR}. évi keret`} value={huf(totalYear)} />
      </div>

      <Tabs defaultValue="eseti">
        <TabsList>
          <TabsTrigger value="eseti">Eseti beszerzések</TabsTrigger>
          <TabsTrigger value="negyedeves">Negyedéves terv</TabsTrigger>
          <TabsTrigger value="eves">Éves terv</TabsTrigger>
          <TabsTrigger value="katalogus">Termékkatalógus</TabsTrigger>
        </TabsList>

        <TabsContent value="eseti" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            Jóváhagyott szolgáltatási igényből keletkezett tételek. Az IT eszközmenedzser azonnali
            vagy negyedéves bontásba sorolja és összeállítja a tervet; ezt a gazdasági vezető
            jóváhagyásával zárul a tervezés, majd a beszerző indítja a beszerzést.
          </p>
          {canSchedule && (
            <div className="card-surface flex flex-wrap items-center gap-3 p-4">
              <span className="text-sm font-medium">
                Tömeges átütemezés ({selectedIds.length} kijelölt)
              </span>
              <Select value={bulkBlock} onValueChange={setBulkBlock}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue placeholder="Cél: azonnali vagy negyedév" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="azonnali">Azonnali beszerzés</SelectItem>
                  {BLOCKS.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                disabled={selectedIds.length === 0 || !bulkBlock}
                onClick={() => {
                  if (bulkBlock === "azonnali") {
                    selectedIds.forEach((id) => store.setPlanItemTiming(id, "azonnali"));
                    toast.success(
                      `${selectedIds.length} tétel azonnali beszerzésbe sorolva`,
                    );
                    setSelectedIds([]);
                    return;
                  }
                  const block = BLOCKS.find((b) => b.value === bulkBlock);
                  if (!block) return;
                  selectedIds.forEach((id) => {
                    store.setPlanItemTiming(id, "negyedeves");
                    store.reschedulePlanItem(id, block.planYear, block.quarter);
                  });
                  toast.success(`${selectedIds.length} tétel átütemezve: ${block.label}`);
                  setSelectedIds([]);
                }}
              >
                Áthelyezés
              </Button>

            </div>
          )}
          <div className="grid gap-4">
            {immediate.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
          <div className="card-surface">
            <ItemsTable
              items={adHoc}
              canAct={store.activeRole === "beszerzo"}
              canSchedule={canSchedule}
              selectedIds={selectedIds}
              onToggleSelect={(id, on) =>
                setSelectedIds((prev) => (on ? [...prev, id] : prev.filter((x) => x !== id)))
              }
            />
          </div>
        </TabsContent>

        <TabsContent value="negyedeves" className="mt-4 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {quarterly.map((a) => (
              <ApprovalCard key={a.id} approval={a} />
            ))}
          </div>
          {QUARTERS.map((q) => (
            <section key={q} className="card-surface">
              <h3 className="border-b border-border px-3 py-2 text-sm font-semibold">
                {QUARTER_LABELS[q]} tételei
              </h3>
              <ItemsTable
                items={yearItems.filter((i) => i.quarter === q)}
                canAct={store.activeRole === "beszerzo"}
              />
            </section>
          ))}
        </TabsContent>

        <TabsContent value="eves" className="mt-4 space-y-6">
          {annual.map((a) => (
            <ApprovalCard key={a.id} approval={a} />
          ))}
          <div className="card-surface">
            <ItemsTable items={yearItems} canAct={store.activeRole === "beszerzo"} />
          </div>
          <p className="text-xs text-muted-foreground">
            Részletes tervezés és szerkesztés:{" "}
            <Link to="/beszerzesi-terv" className="font-medium text-primary underline">
              Beszerzési terv
            </Link>
          </p>
        </TabsContent>

        <TabsContent value="katalogus" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Termékkörök és konkrét eszközmodellek kezelése. A modellekhez megadott technikai
            adatlap jelenik meg az igénylőnek. A munkavállalói besorolás szerinti szűkés csak a
            notebook, okostelefon, mobiltelefon és tablet körökben érvényesül; minden más
            termékkört besorolástól függetlenül mindenki igényelhet.
          </p>
          <ProductCatalogAdmin readOnly={viewOnly} />
        </TabsContent>
      </Tabs>
    </div>
  );
}