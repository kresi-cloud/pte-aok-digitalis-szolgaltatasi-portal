import type { PlanApproval, ProcurementPlanItem } from "./asset-types";
import type { AssetHandover, RoleKey, ServiceRequest, User } from "./types";
import { planApprovalForItem } from "./withdraw";
import { handoverConfigured } from "./procurement-rules";
import { PROCESS_STEP_COUNT } from "./process-steps";
import { normalizeLegacyPlanStatus } from "./plan-stage";

/**
 * A vezetőségi demó a központi nyolclépcsős folyamatot követi.
 * A lépést mindig az aktuális állapotból számoljuk ki, így a demóvezérlő
 * bármikor a valódi következő teendőre és szereplőre mutat.
 */

export const DEMO_REQUESTER_ID = "u-kovacs";
export const DEMO_TOTAL_STEPS = PROCESS_STEP_COUNT;

export interface DemoFlowContext {
  requests: ServiceRequest[];
  planItems: ProcurementPlanItem[];
  planApprovals: PlanApproval[];
  handovers: AssetHandover[];
  users: User[];
}

export interface DemoStep {
  /** 1-alapú lépésszám a nyolcból. */
  index: number;
  /** Az ügy jelenlegi állapotának rövid leírása. */
  state: string;
  /** Kire vár a folyamat. */
  waitingOn: string;
  /** A következő elvégzendő művelet. */
  action: string;
  /** A művelethez tartozó demófelhasználó. */
  actorId: string;
  /** A művelethez tartozó szerepkör. */
  role: RoleKey;
  /** Cél útvonal. */
  route: string;
  /** Igényazonosító, ha az útvonal igényhez kötött. */
  requestId?: string;
  done: boolean;
}

/** Szerepkör alapú demószereplő, hardcode-olt azonosító nélküli tartalékkal. */
export function demoUserForRole(
  users: User[],
  role: RoleKey,
  preferredId?: string,
): User | undefined {
  const preferred = preferredId ? users.find((u) => u.id === preferredId) : undefined;
  if (preferred && preferred.roles.includes(role)) return preferred;
  return users.find((u) => u.roles.includes(role)) ?? preferred;
}

/**
 * A lépéshez illő szerepkör: a preferált szerepkörök közül az első, amellyel a
 * felhasználó rendelkezik; ha egyikkel sem, az első saját szerepköre.
 */
function roleOfUser(users: User[], userId: string, ...preferred: RoleKey[]): RoleKey {
  const u = users.find((x) => x.id === userId);
  const match = preferred.find((r) => u?.roles.includes(r));
  return match ?? u?.roles[0] ?? preferred[0] ?? "igenylo";
}

/** Felhasználó megjelenítendő neve azonosító alapján. */
function nameOf(users: User[], userId: string, fallback: string): string {
  return users.find((u) => u.id === userId)?.name ?? fallback;
}

/** A demó ügye: a demó igénylőjének legutóbbi élő hardverigénye. */
export function demoRequest(ctx: DemoFlowContext): ServiceRequest | undefined {
  return ctx.requests.find(
    (r) =>
      r.requesterId === DEMO_REQUESTER_ID &&
      r.domain === "hardver" &&
      !["visszavonva", "elutasitva", "piszkozat"].includes(r.status),
  );
}

export function demoCurrentStep(ctx: DemoFlowContext): DemoStep {
  const users = ctx.users;
  const id = (role: RoleKey, preferred: string) =>
    demoUserForRole(users, role, preferred)?.id ?? preferred;

  const request = demoRequest(ctx);
  if (!request) {
    return {
      index: 1,
      state: "Az igény még nincs beküldve.",
      waitingOn: `${nameOf(users, DEMO_REQUESTER_ID, "Az igénylő")} – igénylő`,
      action: "Fiktív notebook-csere igény kitöltése és beküldése",
      actorId: DEMO_REQUESTER_ID,
      role: "igenylo",
      route: "/uj-igeny",
      done: false,
    };
  }

  const base = { requestId: request.id, done: false };
  const pending = request.approvals.filter((a) => a.decision === "fuggoben");
  const first = request.approvals[0];

  void first;
  if (pending.length > 0) {
    const next = pending[0]!;
    return {
      ...base,
      index: 2,
      state: "Szervezeti jóváhagyásra vár.",
      waitingOn: `${users.find((u) => u.id === next.approverId)?.name ?? next.approverId} – szervezeti jóváhagyó`,
      action: "Bruttó költségkeret rögzítése és szervezeti jóváhagyás",
      actorId: next.approverId,
      role: roleOfUser(users, next.approverId, "jovahagyo", "vezeto", "szolgaltatasgazda"),
      route: "/igeny/$id",
    };
  }

  const buyerId = id("beszerzo", "u-beszerzo");
  const plannerId = id("eszkozmenedzser", "u-eszkozmgr");
  const financeId = id("gazdasagi_vezeto", "u-gazdvez");
  const referentId = id("it_referens", "u-itref");

  const item = ctx.planItems.find((p) => p.sourceRequestId === request.id);
  if (!item) {
    return {
      ...base,
      index: 3,
      state: "Az igény jóváhagyva, IT besorolásra vár.",
      waitingOn: `${users.find((u) => u.id === plannerId)?.name ?? "IT eszközmenedzser"} – IT eszközmenedzser`,
      action: "IT besorolás és beszerzési tervsor kezelése",
      actorId: plannerId,
      role: "eszkozmenedzser",
      route: "/beszerzesek",
    };
  }

  const handover = (ctx.handovers ?? []).find(
    (h) => h.planItemId === item.id || h.requestId === request.id,
  );

  if (handover?.status === "atvetel_igazolva") {
    return {
      ...base,
      index: 8,
      state: "Az átvétel visszaigazolva, az igény lezárult.",
      waitingOn: "Nincs nyitott teendő.",
      action: "Vezetői összefoglaló megtekintése",
      actorId: DEMO_REQUESTER_ID,
      role: "igenylo",
      route: "/igeny/$id",
      done: true,
    };
  }

  if (handover?.status === "atadva") {
    return {
      ...base,
      index: 8,
      state: "Az eszköz átadva, átvételi visszaigazolásra vár.",
      waitingOn: `${nameOf(users, DEMO_REQUESTER_ID, "Az igénylő")} – igénylő`,
      action: "Átvétel visszaigazolása és ügy lezárása",
      actorId: DEMO_REQUESTER_ID,
      role: "igenylo",
      route: "/igeny/$id",
    };
  }

  if (handover) {
    const configured = handoverConfigured(handover);
    return {
      ...base,
      index: configured ? 7 : 6,
      state: configured
        ? "Az eszköz konfigurálva, átadásra kész."
        : "Az eszköz beérkezett, konfigurálás folyamatban.",
      waitingOn: `${users.find((u) => u.id === (handover.referentId ?? referentId))?.name ?? "Kari IT referens"} – kari IT referens`,
      action: configured
        ? "Eszköz átadása az igénylőnek"
        : "Telepítés, checklist, gyári szám, leltárkód és fénykép rögzítése",
      actorId: handover.referentId ?? referentId,
      role: "it_referens",
      route: "/eszkozatadas",
    };
  }

  if (item.status === "beszerzes_alatt") {
    return {
      ...base,
      index: 5,
      state: "A beszerzés folyamatban van.",
      waitingOn: `${users.find((u) => u.id === buyerId)?.name ?? "Beszerző"} – beszerző`,
      action: "Az eszköz beérkezésének rögzítése",
      actorId: buyerId,
      role: "beszerzo",
      route: "/beszerzesek",
    };
  }

  const approval = planApprovalForItem(item, ctx.planApprovals ?? []);
  const status = approval ? normalizeLegacyPlanStatus(approval.status) : "tervezes";

  if (!approval || status === "tervezes" || status === "visszakuldve") {
    return {
      ...base,
      index: 3,
      state: "A tétel IT besorolás alatt van.",
      waitingOn: `${users.find((u) => u.id === plannerId)?.name ?? "IT eszközmenedzser"} – IT eszközmenedzser`,
      action: "Besorolás, ütemezés és beküldés gazdasági jóváhagyásra",
      actorId: plannerId,
      role: "eszkozmenedzser",
      route: "/beszerzesek",
    };
  }
  if (status === "gazdasagi_ellenorzes") {
    return {
      ...base,
      index: 4,
      state: "A terv gazdasági vezetői jóváhagyásra vár.",
      waitingOn: `${users.find((u) => u.id === financeId)?.name ?? "Gazdasági vezető"} – gazdasági vezető`,
      action: "Beszerzési terv gazdasági vezetői jóváhagyása",
      actorId: financeId,
      role: "gazdasagi_vezeto",
      route: "/beszerzesek",
    };
  }
  return {
    ...base,
    index: 5,
    state: "A terv jóváhagyva, a beszerzés indítható.",
    waitingOn: `${users.find((u) => u.id === buyerId)?.name ?? "Beszerző"} – beszerző`,
    action: "Beszerzés indítása",
    actorId: buyerId,
    role: "beszerzo",
    route: "/beszerzesek",
  };
}
