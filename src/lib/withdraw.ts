import type { PlanApproval, ProcurementPlanItem } from "./asset-types";
import type { AssetHandover, ServiceRequest } from "./types";

/** Terv-jóváhagyási állapotok, amelyekben a gazdasági vezető még nem küldte tovább a tervet. */
const OPEN_PLAN_STATUSES = ["tervezes", "gazdasagi_ellenorzes", "visszakuldve"];

/** Az igényhez tartozó tervsort tartalmazó jóváhagyási ciklus. */
export function planApprovalForItem(
  item: ProcurementPlanItem,
  approvals: PlanApproval[],
): PlanApproval | undefined {
  return approvals.find((p) =>
    p.planYear === item.planYear &&
    (p.scope === "azonnali"
      ? item.timing === "azonnali"
      : p.scope === "negyedeves"
        ? p.quarter === item.quarter && item.timing !== "azonnali"
        : false),
  );
}

export interface WithdrawContext {
  planItems: ProcurementPlanItem[];
  planApprovals: PlanApproval[];
  handovers: AssetHandover[];
}

/**
 * Az igénylő a beszerzés gazdasági vezetői jóváhagyásáig vonhatja vissza az igényét.
 * A visszatérési érték `null`, ha visszavonható, egyébként a magyarázó indok.
 */
export function withdrawBlockReason(
  request: ServiceRequest,
  ctx: WithdrawContext,
): string | null {
  if (request.status === "visszavonva") return "Az igény már vissza lett vonva.";
  if (request.status === "lezarva") return "A lezárt igény már nem vonható vissza.";
  if (request.status === "elutasitva") return "Az elutasított igény már nem vonható vissza.";

  const item = ctx.planItems.find((p) => p.sourceRequestId === request.id);
  if (!item) return null;

  if ((ctx.handovers ?? []).some((h) => h.planItemId === item.id))
    return "Az eszköz átadása már elindult, az igény nem vonható vissza.";
  if (item.status === "beszerzes_alatt" || item.status === "teljesult")
    return "A beszerzés már folyamatban van, az igény nem vonható vissza.";
  if (item.status === "jovahagyva")
    return "A beszerzést már jóváhagyták, az igény nem vonható vissza.";

  const approval = planApprovalForItem(item, ctx.planApprovals ?? []);
  if (approval && !OPEN_PLAN_STATUSES.includes(approval.status))
    return "A beszerzési tervet a gazdasági vezető már továbbította, az igény nem vonható vissza.";

  return null;
}

export function canWithdrawRequest(request: ServiceRequest, ctx: WithdrawContext): boolean {
  return withdrawBlockReason(request, ctx) === null;
}
