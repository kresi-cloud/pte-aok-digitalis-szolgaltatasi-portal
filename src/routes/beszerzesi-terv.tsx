import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeading } from "@/components/page-heading";
import { canPlanProcurement, canReviewProcurement, useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { lookup, ORG_UNITS, useStore } from "@/lib/store";
import { FUNDING_SOURCES, HARDWARE_STANDARDS, NEXT_FINANCIAL_YEAR, REFERENCE_PRICES } from "@/lib/asset-data";
import {
  assetLookup,
  huf,
  hufShort,
  itemCost,
  lifecycleEnd,
  lifecycleStatus,
  replacementPriority,
} from "@/lib/asset-logic";
import {
  PROCUREMENT_STATUS_LABELS,
  QUARTER_LABELS,
  type ProcurementPlanItem,
  type ProcurementStatus,
  type Quarter,
} from "@/lib/asset-types";
import { ProcurementBadge, PriorityBadge, StatTile } from "@/components/asset-bits";
import { planItemStage } from "@/lib/plan-stage";
import { planApprovalForItem } from "@/lib/withdraw";


export const Route = createFileRoute("/beszerzesi-terv")({
  head: () => ({
    meta: [
      { title: "Beszerzési terv 2027 – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "A következő gazdasági év eszközbeszerzési terve: cserejelöltek, negyedéves ütemezés, referenciaárak, tartalékkeret és forrásbontás.",
      },
      { property: "og:title", content: "Beszerzési terv 2027 – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Eszközcsere-tervezés negyedéves ütemezéssel és költségbecsléssel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProcurementPage,
});

const QUARTERS: Quarter[] = ["Q1", "Q2", "Q3", "Q4"];

function ProcurementPage() {
  const store = useStore();
  const canPlan = canPlanProcurement(store.activeRole);
  const canReview = canReviewProcurement(store.activeRole);
  /** Ellenőrző szerepkörök (gazdasági vezető, vezető, dékán) csak betekintenek. */
  const viewOnly = useViewOnly("beszerzesi-terv") || (canReview && !canPlan);
  const items = store.planItems.filter((p) => p.planYear === NEXT_FINANCIAL_YEAR);

  const candidates = useMemo(
    () =>
      store.assets
        .filter((a) =>
          ["cserere_erett", "cserere_tervezendo", "tamogatasbol_kifutott", "selejtezesre_var"].includes(
            lifecycleStatus(a),
          ),
        )
        .sort((a, b) => lifecycleEnd(a).localeCompare(lifecycleEnd(b))),
    [store.assets],
  );

  const totals = items.reduce(
    (acc, i) => {
      const c = itemCost(i);
      acc.net += c.netTotal;
      acc.gross += c.grossTotal;
      acc.withContingency += c.withContingency;
      acc.qty += i.quantity;
      return acc;
    },
    { net: 0, gross: 0, withContingency: 0, qty: 0 },
  );

  if (!canReview) {
    return (
      <div className="card-surface mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="font-display text-xl font-semibold">Beszerzési terv</h1>
        <p className="text-sm text-muted-foreground">
          A beszerzési terv az IT eszközmenedzser, a beszerző, a gazdasági vezető és a kari
          vezetés felülete. Saját igényei állapotát az „Igényeim” oldalon követheti.
        </p>
        <Button asChild variant="outline">
          <Link to="/igenyeim">Saját igényeim</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title={`Beszerzési terv – ${NEXT_FINANCIAL_YEAR}. gazdasági év`}
          description="A tervezés az életciklus-adatokból automatikusan javasolt cserejelöltekből indul, de minden tétel felülvizsgálható, átütemezhető és indoklással módosítható. A költségbecslés referenciaárakkal, árváltozási feltételezéssel, mennyiségi kedvezménnyel és tartalékkerettel számol – a becslés soha nem tekinthető kötelezettségvállalásnak."
        />
        {viewOnly && <ViewOnlyNotice />}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Tervezett tételek" value={items.length} hint={`${totals.qty} db eszköz`} />
        <StatTile label="Nettó tervezett érték" value={hufShort(totals.net)} />
        <StatTile label="Bruttó tervezett érték" value={hufShort(totals.gross)} hint="27% áfával" />
        <StatTile
          label="Tartalékkerettel"
          value={hufShort(totals.withContingency)}
          tone="warn"
          hint="Bruttó + tételenkénti tartalék"
        />
      </div>

      <fieldset disabled={viewOnly} className="contents">
      <Tabs defaultValue="terv">
        <TabsList className="flex-wrap">
          <TabsTrigger value="terv">Negyedéves terv</TabsTrigger>
          <TabsTrigger value="jeloltek">Cserejelöltek</TabsTrigger>
          {canPlan && <TabsTrigger value="uj">Új tétel</TabsTrigger>}
          <TabsTrigger value="forras">Forrás és egység szerint</TabsTrigger>
        </TabsList>

        <TabsContent value="terv" className="space-y-5">
          {QUARTERS.map((q) => {
            const list = items.filter((i) => i.quarter === q);
            const qTotal = list.reduce((s, i) => s + itemCost(i).grossTotal, 0);
            return (
              <section key={q} className="card-surface p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-display text-base font-semibold">
                    {NEXT_FINANCIAL_YEAR} · {QUARTER_LABELS[q]}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {list.length} tétel · bruttó {huf(qTotal)}
                  </p>
                </div>
                {list.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Erre a negyedévre még nincs tervezett tétel.</p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {list.map((item) => (
                      <PlanItemCard key={item.id} item={item} />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </TabsContent>

        <TabsContent value="jeloltek" className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {candidates.length} eszköz életciklusa jár le {NEXT_FINANCIAL_YEAR} végéig vagy már lejárt.
            A lista a tervezés kiindulópontja – a döntés emberi felülvizsgálat után születik.
          </p>
          <div className="card-surface overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Leltári szám</th>
                  <th className="px-4 py-3">Eszköz</th>
                  <th className="px-4 py-3">Egység</th>
                  <th className="px-4 py-3">Életciklus vége</th>
                  <th className="px-4 py-3">Prioritás</th>
                  <th className="px-4 py-3">Javasolt standard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.slice(0, 60).map((a) => {
                  const std = assetLookup.standard(assetLookup.model(a.modelKey)?.standardKey);
                  return (
                    <tr key={a.id} className="hover:bg-secondary/50">
                      <td className="px-4 py-3">
                        <Link to="/eszkoz/$id" params={{ id: a.id }} className="text-primary hover:underline">
                          {a.inventoryNo}
                        </Link>
                      </td>
                      <td className="px-4 py-3">{assetLookup.modelLabel(a.modelKey)}</td>
                      <td className="px-4 py-3">{lookup.unit(a.orgUnitId)}</td>
                      <td className="px-4 py-3">{lifecycleEnd(a)}</td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={replacementPriority(a)} />
                      </td>
                      <td className="px-4 py-3">{std?.label ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {canPlan && (
          <TabsContent value="uj">
            <NewPlanItemForm />
          </TabsContent>
        )}

        <TabsContent value="forras" className="space-y-4">
          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-base font-semibold">Forrás szerinti bontás</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Forrás</th>
                  <th className="py-2">Tételek</th>
                  <th className="py-2">Darab</th>
                  <th className="py-2">Bruttó</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {FUNDING_SOURCES.map((f) => {
                  const list = items.filter((i) => i.fundingSourceId === f.id);
                  return (
                    <tr key={f.id}>
                      <td className="py-2 font-medium">{f.name}</td>
                      <td className="py-2">{list.length}</td>
                      <td className="py-2">{list.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="py-2">{huf(list.reduce((s, i) => s + itemCost(i).grossTotal, 0))}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="card-surface overflow-x-auto p-5">
            <h2 className="font-display text-base font-semibold">Szervezeti egység szerinti bontás</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="py-2">Egység</th>
                  <th className="py-2">Darab</th>
                  <th className="py-2">Bruttó</th>
                  <th className="py-2">Státuszok</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ORG_UNITS.map((o) => {
                  const list = items.filter((i) => i.orgUnitId === o.id);
                  if (!list.length) return null;
                  return (
                    <tr key={o.id}>
                      <td className="py-2 font-medium">{o.name}</td>
                      <td className="py-2">{list.reduce((s, i) => s + i.quantity, 0)}</td>
                      <td className="py-2">{huf(list.reduce((s, i) => s + itemCost(i).grossTotal, 0))}</td>
                      <td className="py-2">
                        {[...new Set(list.map((i) => PROCUREMENT_STATUS_LABELS[i.status]))].join(", ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        </TabsContent>
      </Tabs>
      </fieldset>
    </div>
  );
}

function PlanItemCard({ item }: { item: ProcurementPlanItem }) {
  const store = useStore();
  const cost = itemCost(item);
  const price = assetLookup.price(item.referencePriceId);
  const [open, setOpen] = useState(false);
  // A tárolt státusz helyett a központi folyamatmodell levezetett lépcsője.
  const stage = planItemStage(
    item,
    planApprovalForItem(item, store.planApprovals ?? []),
    (store.handovers ?? []).find((h) => h.planItemId === item.id),
    store.users,
  );


  return (
    <li className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-sm font-semibold">
            {assetLookup.standard(item.standardKey)?.label ?? assetLookup.categoryLabel(item.categoryKey)} ·{" "}
            {item.quantity} db
          </p>
          <p className="text-sm text-muted-foreground">
            {lookup.unit(item.orgUnitId)} · {item.reason}
          </p>
          {item.sourceRequestId ? (
            <p className="mt-1 text-xs">
              <span className="mr-2 rounded-sm bg-accent/15 px-2 py-0.5 font-medium text-accent-foreground">
                Jóváhagyott igényből
              </span>
              <Link to="/igeny/$id" params={{ id: item.sourceRequestId }} className="underline">
                {item.sourceRequestId}
              </Link>
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted-foreground">
            Egységár: {huf(cost.unitNet)} nettó · ár forrása: {cost.source}
            {price ? ` (${price.priceDate})` : ""}
            {cost.stale ? " · árinformáció felülvizsgálandó" : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{stage.label}</span> · {stage.stepLabel} ·
            felelős: {stage.waitingOn}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={item.priority} />
          <ProcurementBadge status={item.status} />
          {stage.overdue && (
            <span className="inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
              Késedelmes
            </span>
          )}
        </div>
      </div>


      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-xs text-muted-foreground">Nettó összesen</dt>
          <dd className="font-medium">{huf(cost.netTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Bruttó összesen</dt>
          <dd className="font-medium">{huf(cost.grossTotal)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Tartalékkerettel ({item.contingencyPct}%)</dt>
          <dd className="font-medium">{huf(cost.withContingency)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Feltételezések</dt>
          <dd className="text-xs text-muted-foreground">
            árváltozás {item.priceChangePct}% · infláció {item.inflationPct}% · kedvezmény{" "}
            {item.quantityDiscountPct}%
          </dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setOpen((v) => !v)}>
          {open ? "Szerkesztés bezárása" : "Tétel módosítása"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            store.removePlanItem(item.id);
            toast.success("A tétel törölve a tervből.");
          }}
        >
          Törlés
        </Button>
      </div>

      {open && (
        <div className="mt-4 grid gap-3 rounded-md bg-secondary/40 p-4 md:grid-cols-3">
          <NumField
            id={`q-${item.id}`}
            label="Mennyiség"
            value={item.quantity}
            onChange={(v) => store.updatePlanItem(item.id, { quantity: Math.max(1, v) })}
          />
          <NumField
            id={`pc-${item.id}`}
            label="Árváltozás (%)"
            value={item.priceChangePct}
            onChange={(v) => store.updatePlanItem(item.id, { priceChangePct: v })}
          />
          <NumField
            id={`ct-${item.id}`}
            label="Tartalékkeret (%)"
            value={item.contingencyPct}
            onChange={(v) => store.updatePlanItem(item.id, { contingencyPct: v })}
          />
          <NumField
            id={`qd-${item.id}`}
            label="Mennyiségi kedvezmény (%)"
            value={item.quantityDiscountPct}
            onChange={(v) => store.updatePlanItem(item.id, { quantityDiscountPct: v })}
          />
          <NumField
            id={`inf-${item.id}`}
            label="Infláció (%)"
            value={item.inflationPct}
            onChange={(v) => store.updatePlanItem(item.id, { inflationPct: v })}
          />
          <NumField
            id={`up-${item.id}`}
            label="Egyedi nettó egységár"
            value={item.unitPriceOverride ?? 0}
            onChange={(v) => store.updatePlanItem(item.id, { unitPriceOverride: v > 0 ? v : undefined })}
          />
          <div className="space-y-1.5">
            <Label htmlFor={`qt-${item.id}`}>Negyedév</Label>
            <Select value={item.quarter} onValueChange={(v) => store.updatePlanItem(item.id, { quarter: v as Quarter })}>
              <SelectTrigger id={`qt-${item.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q} value={q}>
                    {QUARTER_LABELS[q]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`st-${item.id}`}>Státusz</Label>
            <Select
              value={item.status}
              onValueChange={(v) => store.updatePlanItem(item.id, { status: v as ProcurementStatus })}
            >
              <SelectTrigger id={`st-${item.id}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(PROCUREMENT_STATUS_LABELS).map(([k, l]) => (
                  <SelectItem key={k} value={k}>
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-3">
            <Label htmlFor={`cm-${item.id}`}>Indoklás / megjegyzés</Label>
            <Textarea
              id={`cm-${item.id}`}
              maxLength={500}
              value={item.comment ?? ""}
              onChange={(e) => store.updatePlanItem(item.id, { comment: e.target.value })}
            />
          </div>
        </div>
      )}
    </li>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
      />
    </div>
  );
}

function NewPlanItemForm() {
  const store = useStore();
  const [form, setForm] = useState({
    quarter: "Q1" as Quarter,
    orgUnitId: ORG_UNITS[0]!.id,
    standardKey: HARDWARE_STANDARDS[0]!.key,
    quantity: 5,
    reason: "",
    fundingSourceId: FUNDING_SOURCES[0]!.id,
    kind: "csere" as "csere" | "uj_kapacitas",
  });
  const std = HARDWARE_STANDARDS.find((s) => s.key === form.standardKey)!;
  const price = REFERENCE_PRICES.find((p) => p.id === std.referencePriceId);

  return (
    <section className="card-surface p-5">
      <h2 className="font-display text-base font-semibold">Új beszerzési tételtervezet</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Csere vagy új kapacitásigény rögzítése a {NEXT_FINANCIAL_YEAR}. évi tervbe. A tétel a gazdasági
        jóváhagyás előtt bármikor módosítható.
      </p>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="np-unit">Szervezeti egység</Label>
          <Select value={form.orgUnitId} onValueChange={(v) => setForm({ ...form, orgUnitId: v })}>
            <SelectTrigger id="np-unit">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ORG_UNITS.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-std">Hardverstandard</Label>
          <Select value={form.standardKey} onValueChange={(v) => setForm({ ...form, standardKey: v })}>
            <SelectTrigger id="np-std">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {HARDWARE_STANDARDS.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-q">Negyedév</Label>
          <Select value={form.quarter} onValueChange={(v) => setForm({ ...form, quarter: v as Quarter })}>
            <SelectTrigger id="np-q">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUARTERS.map((q) => (
                <SelectItem key={q} value={q}>
                  {QUARTER_LABELS[q]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <NumField
          id="np-qty"
          label="Mennyiség"
          value={form.quantity}
          onChange={(v) => setForm({ ...form, quantity: Math.max(1, v) })}
        />
        <div className="space-y-1.5">
          <Label htmlFor="np-fs">Finanszírozási forrás</Label>
          <Select value={form.fundingSourceId} onValueChange={(v) => setForm({ ...form, fundingSourceId: v })}>
            <SelectTrigger id="np-fs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FUNDING_SOURCES.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np-kind">Igény típusa</Label>
          <Select
            value={form.kind}
            onValueChange={(v) => setForm({ ...form, kind: v as "csere" | "uj_kapacitas" })}
          >
            <SelectTrigger id="np-kind">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csere">Csere</SelectItem>
              <SelectItem value="uj_kapacitas">Új kapacitás</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 md:col-span-3">
          <Label htmlFor="np-reason">Indoklás</Label>
          <Textarea
            id="np-reason"
            maxLength={500}
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            placeholder="Miért szükséges a beszerzés? Milyen kockázatot kezel?"
          />
        </div>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Becsült nettó érték: {huf((price?.netPrice ?? 0) * form.quantity)} · referenciaár forrása:{" "}
        {price?.supplier ?? "—"} ({price?.priceDate ?? "—"})
      </p>
      <Button
        className="mt-4"
        disabled={!form.reason.trim()}
        onClick={() => {
          store.addPlanItem({
            planYear: NEXT_FINANCIAL_YEAR,
            quarter: form.quarter,
            orgUnitId: form.orgUnitId,
            replacedAssetIds: [],
            reason: form.reason.trim(),
            categoryKey: std.categoryKey,
            standardKey: std.key,
            quantity: form.quantity,
            referencePriceId: std.referencePriceId,
            priceChangePct: 3,
            contingencyPct: 5,
            quantityDiscountPct: 0,
            inflationPct: 3,
            priority: "kozepes",
            fundingSourceId: form.fundingSourceId,
            status: "tervezett",
            kind: form.kind,
          });
          setForm({ ...form, reason: "" });
          toast.success("A tétel bekerült a beszerzési tervbe.");
        }}
      >
        Tétel hozzáadása a tervhez
      </Button>
    </section>
  );
}