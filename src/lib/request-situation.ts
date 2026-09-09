import type { PlanApproval, ProcurementPlanItem } from "./asset-types";
import type { AssetHandover, RoleKey, ServiceRequest, User } from "./types";
import { ROLE_LABELS, STATUS_LABELS } from "./types";
import { planApprovalForItem } from "./withdraw";
import { planItemStage } from "./plan-stage";
import { PROCESS_STEPS, STEP } from "./process-steps";

/**
 * Az ügy jelenlegi helyzetének egységes összefoglalója.
 * Ugyanezt használja az igény oldali helyzetkártya és a lezárási összegzés.
 */

export interface SituationContext {
  planItems: ProcurementPlanItem[];
  planApprovals: PlanApproval[];
  handovers: AssetHandover[];
  users: User[];
}

export interface TrackStage {
  label: string;
  done: boolean;
  current: boolean;
}

export interface RequestSituation {
  statusLabel: string;
  /** Ki a jelenlegi felelős (személy vagy szerepkör). */
  owner: string;
  /** Kire vár a folyamat. */
  waitingOn: string;
  /** A következő szükséges döntés vagy művelet. */
  nextAction: string;
  /** Becsült bruttó költség forintban. */
  grossCost: number;
  approvalsDone: number;
  approvalsTotal: number;
  track: TrackStage[];
  /** A következő műveletre jogosult felhasználó azonosítója, ha ismert. */
  nextActorId?: string;
  closed: boolean;
  /** A folyamat zsákutcába futott (elutasítva vagy visszavonva). */
  terminated: boolean;
  /** A tervezett negyedév vége elmúlt, a tétel nem teljesült. */
  overdue: boolean;
}

const STAGES: readonly string[] = PROCESS_STEPS;

function userName(users: User[], id?: string): string {
  return users.find((u) => u.id === id)?.name ?? "Kijelölés alatt";
}

function byRole(users: User[], role: RoleKey): User | undefined {
  return users.find((u) => u.roles.includes(role));
}

export function requestSituation(request: ServiceRequest, ctx: SituationContext): RequestSituation {
  const users = ctx.users;
  const planItem = ctx.planItems.find((p) => p.sourceRequestId === request.id);
  const handover = (ctx.handovers ?? []).find(
    (h) => h.requestId === request.id || (planItem && h.planItemId === planItem.id),
  );
  const approval = planItem ? planApprovalForItem(planItem, ctx.planApprovals ?? []) : undefined;
  const pending = request.approvals.filter((a) => a.decision === "fuggoben");
  const approvalsDone = request.approvals.filter((a) => a.decision === "jovahagyva").length;

  const grossCost = planItem
    ? (planItem.unitPriceOverride ?? 0) * planItem.quantity
    : (request.estimatedCost ?? 0);

  let stageIndex = 0;
  let owner = "";
  let waitingOn = "";
  let nextAction = "";
  let nextActorId: string | undefined;
  let derivedStatusLabel: string | undefined;
  let overdue = false;
  const terminated = request.status === "elutasitva" || request.status === "visszavonva";
  const closed =
    terminated || handover?.status === "atvetel_igazolva" || request.status === "lezarva";

  if (terminated) {
    // Zsákutca-ág: a folyamatjelző a beküldésig elért lépésnél megszakad,
    // nincs felelős és nincs következő teendő.
    const decided = request.approvals.find((a) => a.decision === "elutasitva");
    const decidedBy = decided ? userName(users, decided.approverId) : undefined;
    stageIndex = request.status === "elutasitva" ? STEP.szervezeti_jovahagyas : STEP.igenyles;
    owner = "Nincs felelős – a folyamat megszakadt.";
    waitingOn = "Nincs nyitott teendő.";
    nextAction =
      request.status === "elutasitva"
        ? `Az igényt elutasították${decidedBy ? ` – ${decidedBy}` : ""}${
            decided?.comment ? `: ${decided.comment}` : "."
          }`
        : "Az igénylő visszavonta az igényt.";
    derivedStatusLabel =
      request.status === "elutasitva" ? "Elutasítva – a folyamat lezárult" : "Visszavonva az igénylő által";
  } else if (pending.length > 0) {
    const next = pending[0]!;
    stageIndex = STEP.szervezeti_jovahagyas;
    owner = userName(users, next.approverId);
    waitingOn = `${owner} – ${ROLE_LABELS[next.role as RoleKey] ?? next.role}`;
    nextAction = "Bruttó költségkeret rögzítése és szervezeti jóváhagyás";
    nextActorId = next.approverId;
  } else if (closed) {
    stageIndex = STAGES.length;
    owner = "Nincs felelős – az ügy lezárult.";
    waitingOn = "Nincs nyitott teendő.";
    nextAction = "Az igény lezárult, az eszköz a személyi leltárban van.";
  } else if (!planItem) {
    const planner = byRole(users, "eszkozmenedzser");
    stageIndex = STEP.it_besorolas;
    owner = planner?.name ?? "IT eszközmenedzser";
    waitingOn = `${owner} – IT eszközmenedzser`;
    nextAction = "IT besorolás és beszerzési tervsor kezelése";
    nextActorId = planner?.id;
  } else {

    const stage = planItemStage(planItem, approval, handover, users);
    stageIndex = stage.stageIndex;
    owner = stage.waitingOn.split(" – ")[0] ?? stage.waitingOn;
    waitingOn = stage.waitingOn;
    nextAction = stage.nextAction;
    nextActorId = stage.actorId;
    derivedStatusLabel = stage.label;
    overdue = stage.overdue;
  }


  return {
    statusLabel: derivedStatusLabel ?? STATUS_LABELS[request.status],
    owner,
    waitingOn,
    nextAction,
    grossCost,
    approvalsDone,
    approvalsTotal: request.approvals.length,
    track: STAGES.map((label, i) => ({
      label,
      done: !terminated && i < stageIndex,
      current: !terminated && i === stageIndex,
    })),
    ...(nextActorId ? { nextActorId } : {}),
    closed,
    terminated,
    overdue,
  };
}
