import type { BudgetReview, ProcurementPlanItem } from "./asset-types";
import type { RoleKey, ServiceRequest } from "./types";
import { assetLookup } from "./asset-logic";

/**
 * Költségkeret-küszöb (D1/D5): a szervezeti jóváhagyáskor rögzített bruttó keretet a
 * tervezett vagy a tényleges ár legfeljebb a beállított százalékkal lépheti túl;
 * felette az igénylő értesül, és a szervezeti jóváhagyónak újra döntenie kell.
 */

/** Tervezett bruttó egységár: a katalógus-/felülírt ár (a keret ugyanezen az alapon készül). */
export function plannedUnitGross(item: ProcurementPlanItem): number {
  return Math.round(
    item.unitPriceOverride ?? assetLookup.price(item.referencePriceId)?.netPrice ?? 0,
  );
}

/** Tervezett bruttó összeg. */
export function plannedGross(item: ProcurementPlanItem): number {
  return plannedUnitGross(item) * (item.quantity || 1);
}

/** Tényleges bruttó összeg a rendelési rekordból, ha van. */
export function actualGross(item: ProcurementPlanItem): number | undefined {
  const unit = item.order?.actualUnitGross;
  return unit ? unit * (item.quantity || 1) : undefined;
}

/** Az aktuálisan érvényes összeg: tényleges, ha rögzítették, különben tervezett. */
export function currentGross(item: ProcurementPlanItem): number {
  return actualGross(item) ?? plannedGross(item);
}

/** A jóváhagyott bruttó keret: a jóváhagyáskori pillanatkép, különben a becsült költség. */
export function budgetOf(request: ServiceRequest | undefined): number {
  return Math.round(request?.approvedBudgetGross ?? request?.estimatedCost ?? 0);
}

export interface BudgetCheck {
  budgetGross: number;
  currentGross: number;
  deltaPct: number;
  tolerancePct: number;
  /** a küszöb feletti túllépés */
  exceeded: boolean;
  /** függő felülvizsgálat */
  pending?: BudgetReview | undefined;
  /** a legutóbbi felülvizsgálat, ha elutasított (a folyamat áll) */
  rejected?: BudgetReview | undefined;
  /** a következő lépés blokkolva (függő vagy elutasított felülvizsgálat) */
  blocked: boolean;
}

export function lastBudgetReview(item: ProcurementPlanItem): BudgetReview | undefined {
  return item.budgetReviews?.at(-1);
}

export function pendingBudgetReview(item: ProcurementPlanItem): BudgetReview | undefined {
  return (item.budgetReviews ?? []).find((r) => r.status === "fuggoben");
}

export function budgetCheck(
  request: ServiceRequest | undefined,
  item: ProcurementPlanItem,
  tolerancePct: number,
): BudgetCheck {
  const budgetGross = budgetOf(request);
  const current = currentGross(item);
  const deltaPct = budgetGross > 0 ? Math.round(((current - budgetGross) / budgetGross) * 100) : 0;
  const exceeded = budgetGross > 0 && current > Math.round(budgetGross * (1 + tolerancePct / 100));
  const pending = pendingBudgetReview(item);
  const last = lastBudgetReview(item);
  const rejected = last?.status === "elutasitva" && exceeded ? last : undefined;
  return {
    budgetGross,
    currentGross: current,
    deltaPct,
    tolerancePct,
    exceeded,
    pending,
    rejected,
    blocked: Boolean(pending || rejected),
  };
}

/** Kell-e új felülvizsgálat: túllépés van, és nincs függő vagy ugyanerre az összegre elutasított kör. */
export function needsBudgetReview(check: BudgetCheck, item: ProcurementPlanItem): boolean {
  if (!check.exceeded || check.pending) return false;
  const last = lastBudgetReview(item);
  if (last && last.status === "elutasitva" && last.newGross === check.currentGross) return false;
  return true;
}

/** A felülvizsgálatról a request szervezeti jóváhagyója (vagy admin) dönthet. */
export function canDecideBudgetReview(
  request: ServiceRequest | undefined,
  review: BudgetReview | undefined,
  role: RoleKey,
  userId: string,
  decision: "jovahagyva" | "elutasitva",
  comment: string,
): { allowed: boolean; reason?: string } {
  if (!request || !review) return { allowed: false, reason: "A felülvizsgálat nem található." };
  if (review.status !== "fuggoben")
    return { allowed: false, reason: "A felülvizsgálat már eldőlt." };
  const approver = request.approvals.some(
    (a) => a.approverId === userId && (a.role === "jovahagyo" || a.step === 1),
  );
  if (role !== "admin" && !(role === "jovahagyo" && approver))
    return {
      allowed: false,
      reason: "A kerettúllépésről az igény szervezeti jóváhagyója dönt.",
    };
  if (decision === "elutasitva" && comment.trim().length < 5)
    return { allowed: false, reason: "Elutasításnál az indoklás kötelező (legalább 5 karakter)." };
  return { allowed: true };
}

/** Beszerzési akadály jelzése (D11): a beszerző, indoklással, jóváhagyott vagy folyó beszerzésnél. */
export function canReportProcurementBlock(
  item: ProcurementPlanItem,
  role: RoleKey,
  reason: string,
  delivered: number,
): { allowed: boolean; reason?: string } {
  if (role !== "beszerzo") return { allowed: false, reason: "Az akadályt a beszerző jelzi." };
  if (item.status === "teljesult" || item.status === "meghiusult")
    return { allowed: false, reason: "A tétel már lezárult." };
  if (delivered > 0)
    return { allowed: false, reason: "Beérkezett darabok után az akadály már nem jelezhető." };
  if (reason.trim().length < 5)
    return { allowed: false, reason: "Az akadály indoklása kötelező (legalább 5 karakter)." };
  return { allowed: true };
}
