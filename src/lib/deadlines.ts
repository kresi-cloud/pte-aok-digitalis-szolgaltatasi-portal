import type { PlanApproval, ProcurementPlanItem } from "./asset-types";
import type { AssetHandover, ServiceRequest } from "./types";
import { addWorkdays, todayIso, workdaysBetween } from "./clock";
import { STEP } from "./process-steps";

/**
 * Lépésenkénti döntési határidők (D3/D6/D7).
 *
 * Minden várakozó lépésnek munkanapban mért határideje van; az értékek az
 * Adminisztrációban szabadon állíthatók, a folyamat sehol nem kódol be fix
 * napszámot. A határidő 80%-ánál emlékeztető, lejáratkor jelzés (eszkaláció
 * átvétel nélkül: a felelős marad).
 */

export type DeadlineStepKey =
  | "szervezeti_jovahagyas"
  | "it_besorolas"
  | "gazdasagi_jovahagyas"
  | "beszerzes"
  | "konfiguralas"
  | "atvetel";

export const DEADLINE_STEP_LABELS: Record<DeadlineStepKey, string> = {
  szervezeti_jovahagyas: "Szervezeti jóváhagyás",
  it_besorolas: "IT besorolás",
  gazdasagi_jovahagyas: "Gazdasági jóváhagyás",
  beszerzes: "Beszerzés (várható érkezésig)",
  konfiguralas: "Konfigurálás és átadás",
  atvetel: "Átvétel visszaigazolása",
};

export const DEADLINE_STEP_KEYS = Object.keys(DEADLINE_STEP_LABELS) as DeadlineStepKey[];

export interface ProcessSettings {
  /** Lépésenkénti határidő munkanapban. */
  deadlines: Record<DeadlineStepKey, number>;
  /** Az emlékeztető a határidő ennyi százalékánál esedékes. */
  reminderPct: number;
  /** Az átvétel visszaigazolása ennyi munkanap után automatikusan lezárul. */
  receiptAutoCloseDays: number;
}

/** D6 alapértékek – a tesztek ezekkel futnak. */
export const DEFAULT_PROCESS_SETTINGS: ProcessSettings = {
  deadlines: {
    szervezeti_jovahagyas: 5,
    it_besorolas: 10,
    gazdasagi_jovahagyas: 5,
    beszerzes: 30,
    konfiguralas: 5,
    atvetel: 5,
  },
  reminderPct: 80,
  receiptAutoCloseDays: 10,
};

/** Tárolt (részleges vagy hiányzó) beállítás kiegészítése az alapértékekkel. */
export function normalizeProcessSettings(raw: unknown): ProcessSettings {
  const src = (raw ?? {}) as Partial<ProcessSettings>;
  const deadlines = { ...DEFAULT_PROCESS_SETTINGS.deadlines };
  for (const k of DEADLINE_STEP_KEYS) {
    const v = Number(src.deadlines?.[k]);
    if (Number.isFinite(v) && v >= 1) deadlines[k] = Math.round(v);
  }
  const pct = Number(src.reminderPct);
  const auto = Number(src.receiptAutoCloseDays);
  return {
    deadlines,
    reminderPct:
      Number.isFinite(pct) && pct >= 10 && pct <= 100
        ? Math.round(pct)
        : DEFAULT_PROCESS_SETTINGS.reminderPct,
    receiptAutoCloseDays:
      Number.isFinite(auto) && auto >= 1
        ? Math.round(auto)
        : DEFAULT_PROCESS_SETTINGS.receiptAutoCloseDays,
  };
}

/** A nyolclépcsős folyamat lépésindexe → határidő-kulcs (az 1. lépésnek nincs határideje). */
export function deadlineKeyForStage(stageIndex: number): DeadlineStepKey | undefined {
  switch (stageIndex) {
    case STEP.szervezeti_jovahagyas:
      return "szervezeti_jovahagyas";
    case STEP.it_besorolas:
      return "it_besorolas";
    case STEP.gazdasagi_jovahagyas:
      return "gazdasagi_jovahagyas";
    case STEP.beszerzes:
      return "beszerzes";
    case STEP.konfiguralas:
    case STEP.eszkozatadas:
      return "konfiguralas";
    case STEP.atvetel:
      return "atvetel";
    default:
      return undefined;
  }
}

export interface StepSinceContext {
  planItem?: ProcurementPlanItem | undefined;
  approval?: PlanApproval | undefined;
  handover?: AssetHandover | undefined;
}

/**
 * Mióta vár az ügy a jelenlegi lépésben. A legpontosabb elérhető időbélyeg:
 * a lépésbe lépés naplózott dátuma; ha nincs, az igény utolsó módosítása.
 */
export function stepSince(
  request: ServiceRequest,
  stageIndex: number,
  ctx: StepSinceContext,
): string | undefined {
  const fallback = request.updatedAt || request.createdAt;
  switch (stageIndex) {
    case STEP.szervezeti_jovahagyas:
      return fallback;
    case STEP.it_besorolas:
      return ctx.planItem?.handedToPlannerAt ?? fallback;
    case STEP.gazdasagi_jovahagyas:
      return ctx.approval?.submittedAt ?? fallback;
    case STEP.beszerzes:
      return ctx.approval?.decidedAt ?? ctx.approval?.executionStartedAt ?? fallback;
    case STEP.konfiguralas:
    case STEP.eszkozatadas:
      return ctx.handover?.createdAt ?? fallback;
    case STEP.atvetel:
      return ctx.handover?.handedOverAt ?? ctx.handover?.createdAt ?? fallback;
    default:
      return undefined;
  }
}

export type DeadlineLevel = "ok" | "reminder" | "overdue";

export interface DeadlineInfo {
  key: DeadlineStepKey;
  /** A lépés kezdete (ISO). */
  since: string;
  /** Határidő (ISO). */
  dueDate: string;
  /** Határidő munkanapban. */
  limitWorkdays: number;
  /** Eddig eltelt munkanapok. */
  waitingWorkdays: number;
  /** Hátralévő munkanapok (negatív, ha lejárt). */
  remainingWorkdays: number;
  level: DeadlineLevel;
}

/** Határidő-számítás egy lépésre a beállításokból. */
export function deadlineInfo(
  key: DeadlineStepKey,
  since: string,
  settings: ProcessSettings,
  today: string = todayIso(),
  overrideDueDate?: string,
): DeadlineInfo {
  const limitWorkdays = settings.deadlines[key];
  const dueDate = overrideDueDate ?? addWorkdays(since, limitWorkdays);
  const waitingWorkdays = workdaysBetween(since, today);
  const totalWorkdays = overrideDueDate ? workdaysBetween(since, dueDate) : limitWorkdays;
  const remainingWorkdays = totalWorkdays - waitingWorkdays;
  const reminderAt = Math.ceil((totalWorkdays * settings.reminderPct) / 100);
  const level: DeadlineLevel =
    today > dueDate ? "overdue" : waitingWorkdays >= reminderAt ? "reminder" : "ok";
  return { key, since, dueDate, limitWorkdays, waitingWorkdays, remainingWorkdays, level };
}

export const DEADLINE_LEVEL_LABELS: Record<DeadlineLevel, string> = {
  ok: "Határidőn belül",
  reminder: "Emlékeztető – a határidő közeleg",
  overdue: "Lejárt határidő",
};
