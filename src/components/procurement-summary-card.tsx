import { Link } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useDemoMode } from "@/lib/demo-mode";
import { daysBetween } from "@/lib/clock";
import type { ServiceRequest } from "@/lib/types";

/** Vezetői eredménykártya a sikeresen lezárt beszerzésről. */
export function ProcurementSummaryCard({ request }: { request: ServiceRequest }) {
  const store = useStore();
  const { demo } = useDemoMode();
  const navigate = useNavigate();

  const planItem = store.planItems.find((p) => p.sourceRequestId === request.id);
  const handover = (store.handovers ?? []).find(
    (h) => h.requestId === request.id || (planItem && h.planItemId === planItem.id),
  );
  if (!handover || handover.status !== "atvetel_igazolva") return null;

  const inventoryItem = store.inventory.find(
    (i) => i.id === handover.inventoryItemId || (i.serial && i.serial === handover.serial),
  );
  const quantity = planItem?.quantity ?? request.quantity ?? 1;
  const gross = planItem
    ? (planItem.unitPriceOverride ?? 0) * quantity
    : (request.estimatedCost ?? 0);
  const confirmedAt = handover.confirmedAt ?? request.updatedAt;
  const leadTime = daysBetween(request.createdAt, confirmedAt);
  const slaLimit = request.dueDate ? daysBetween(request.createdAt, request.dueDate) : null;
  const slaOk = slaLimit === null ? true : leadTime <= slaLimit;
  const auditSteps =
    request.audit.length +
    (store.assetAudit ?? []).filter((a) => a.entityId === planItem?.id).length;

  const reset = () => {
    store.resetDemo({ leadershipDemo: true });
    navigate({ to: "/uj-igeny" });
  };

  const rows: [string, string][] = [
    ["Igényazonosító", request.id],
    ["Átadott eszköz", `${handover.deviceName} · ${quantity} db`],
    [
      "Jóváhagyások eredménye",
      `${request.approvals.filter((a) => a.decision === "jovahagyva").length} / ${request.approvals.length} jóváhagyva`,
    ],
    ["Bruttó költség", gross ? `${gross.toLocaleString("hu-HU")} Ft` : "Nincs rögzített érték"],
    ["Teljes átfutási idő", `${leadTime} nap`],
    [
      "SLA eredmény",
      slaLimit === null
        ? "Nincs rögzített határidő"
        : slaOk
          ? `Határidőn belül (${leadTime} / ${slaLimit} nap)`
          : `Határidőn túl (${leadTime} / ${slaLimit} nap)`,
    ],
    [
      "Személyi leltárba vétel",
      inventoryItem
        ? `Megtörtént – ${inventoryItem.name}${inventoryItem.inventoryNo ? ` · ${inventoryItem.inventoryNo}` : ""}`
        : "Feldolgozás alatt",
    ],
    ["Auditlépések száma", String(auditSteps)],
  ];

  return (
    <section
      aria-label="A beszerzés lezárása"
      className="card-surface mt-6 border-l-4 border-l-primary p-6"
    >
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
        <h2 className="font-display text-lg font-semibold">A beszerzés sikeresen lezárult</h2>
      </div>

      <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="mt-0.5 font-medium">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <Button asChild>
          <Link to="/vezetoi-attekintes">Vezetői áttekintés megnyitása</Link>
        </Button>
        {demo && (
          <Button variant="outline" onClick={reset}>
            <RotateCcw className="mr-1 size-3.5" />
            Demó újraindítása
          </Button>
        )}
      </div>
    </section>
  );
}
