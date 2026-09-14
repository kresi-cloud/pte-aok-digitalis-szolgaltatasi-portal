import type { FinanceHold, ProcurementPlanItem } from "./asset-types";
import type { RoleKey, ServiceRequest } from "./types";
import { QUARTER_LABELS } from "./asset-types";
import { requestedTimingLabel } from "./types";

/**
 * D9 – ütemezés-eltérés: ha az IT eszközmenedzser az igénylő kért ütemezésétől
 * (azonnali / évszámos negyedév) eltérően sorol be, az eltérést indokolnia kell;
 * az igénylő értesül, beleegyezés nem szükséges.
 */

/** A tervsor tényleges ütemezésének kulcsa: "azonnali" vagy "ÉÉÉÉ-Qn". */
export function itemTimingKey(
  item: Pick<ProcurementPlanItem, "timing" | "planYear" | "quarter">,
): string {
  return item.timing === "azonnali" ? "azonnali" : `${item.planYear}-${item.quarter}`;
}

export function timingLabel(key: string): string {
  if (key === "azonnali") return "Azonnali beszerzés";
  const [year, q] = key.split("-");
  return year && q ? `${year}. ${QUARTER_LABELS[q as keyof typeof QUARTER_LABELS] ?? q}` : key;
}

export interface ScheduleCheck {
  requested?: string | undefined;
  requestedLabel: string;
  actual: string;
  actualLabel: string;
  deviates: boolean;
}

/** Eltér-e a tervsor ütemezése az igénylő kérésétől (csak ha volt kérés). */
export function scheduleCheck(
  request: ServiceRequest | undefined,
  item: Pick<ProcurementPlanItem, "timing" | "planYear" | "quarter">,
): ScheduleCheck {
  const requested = request?.requestedQuarter;
  const actual = itemTimingKey(item);
  if (!requested)
    return {
      requested: undefined,
      requestedLabel: "—",
      actual,
      actualLabel: timingLabel(actual),
      deviates: false,
    };
  // Régi, évszám nélküli kérés ("Q1") csak a negyedévre nézve hasonlítható.
  const deviates =
    requested === "azonnali"
      ? actual !== "azonnali"
      : /^\d{4}-Q[1-4]$/.test(requested)
        ? actual !== requested
        : actual === "azonnali" || !actual.endsWith(`-${requested}`);
  return {
    requested,
    requestedLabel: requestedTimingLabel(requested),
    actual,
    actualLabel: timingLabel(actual),
    deviates,
  };
}

export const MIN_SCHEDULE_REASON = 5;

/** Az eltérés csak indoklással rögzíthető. */
export function scheduleChangeAllowed(
  check: ScheduleCheck,
  reason: string | undefined,
): string | null {
  if (!check.deviates) return null;
  if ((reason ?? "").trim().length < MIN_SCHEDULE_REASON)
    return `Az ütemezés eltér az igénylő kérésétől (${check.requestedLabel} → ${check.actualLabel}) – az indoklás kötelező.`;
  return null;
}

/**
 * D10 – tételszintű kiemelés a gazdasági jóváhagyásnál: a kiemelt tétel külön kört fut
 * (átdolgozás → újbóli beküldés → döntés), a többi tétel jóváhagyva a beszerzőhöz kerül.
 */
export function financeHoldReason(
  item: Pick<ProcurementPlanItem, "financeHold">,
): string | undefined {
  const h = item.financeHold;
  if (!h) return undefined;
  if (h.status === "kiemelve")
    return `A gazdasági vezető kiemelte a tételt: ${h.reason} – az IT eszközmenedzser átdolgozza és újra beküldi.`;
  if (h.status === "atdolgozva")
    return "A kiemelt tétel átdolgozva, a gazdasági vezető döntésére vár.";
  return undefined;
}

export function holdBlocksProcurement(item: Pick<ProcurementPlanItem, "financeHold">): boolean {
  const s = item.financeHold?.status;
  return s === "kiemelve" || s === "atdolgozva";
}

export function canResubmitHold(
  item: Pick<ProcurementPlanItem, "financeHold">,
  role: RoleKey,
  comment: string,
) {
  if (role !== "eszkozmenedzser")
    return { allowed: false, reason: "Az újbóli beküldés az IT eszközmenedzser feladata." };
  if (item.financeHold?.status !== "kiemelve")
    return { allowed: false, reason: "A tétel nincs kiemelt állapotban." };
  if (comment.trim().length < MIN_SCHEDULE_REASON)
    return { allowed: false, reason: "Írja le, mit dolgozott át (legalább 5 karakter)." };
  return { allowed: true };
}

export function canDecideHold(
  item: Pick<ProcurementPlanItem, "financeHold">,
  role: RoleKey,
  decision: "jovahagyva" | "elutasitva",
  comment: string,
) {
  if (role !== "gazdasagi_vezeto")
    return { allowed: false, reason: "A kiemelt tételről a gazdasági vezető dönt." };
  if (item.financeHold?.status !== "atdolgozva")
    return { allowed: false, reason: "A tétel még nincs átdolgozva, vagy már eldőlt." };
  if (decision === "elutasitva" && comment.trim().length < MIN_SCHEDULE_REASON)
    return { allowed: false, reason: "Ismételt kiemeléshez az indoklás kötelező." };
  return { allowed: true };
}

export function nextHoldRound(prev: FinanceHold | undefined): number {
  return (prev?.round ?? 0) + 1;
}
