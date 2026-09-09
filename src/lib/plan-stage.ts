import type { PlanApproval, PlanApprovalStatus, ProcurementPlanItem } from "./asset-types";
import type { AssetHandover, User } from "./types";
import { handoverConfigured, planApprovalApproved } from "./procurement-rules";
import { PROCESS_STEPS, STEP } from "./process-steps";
import { responsibleForRole } from "./process-roles";
import { todayIso } from "./clock";

/**
 * A tervsor levezetett folyamatlépcsője a központi nyolclépcsős modellben.
 * A tárolt `status` mező önmagában nem mutatja a valós előrehaladást, ezért
 * minden felület ebből az egyetlen függvényből veszi az állapotot.
 */
export interface PlanItemStage {
  /** Emberi nyelvű lépcsőnév. */
  label: string;
  /** A nyolclépcsős folyamat lépésneve. */
  stepLabel: string;
  /** Kire vár a folyamat (név + beosztás). */
  waitingOn: string;
  /** A soron következő szükséges művelet. */
  nextAction: string;
  /** A soron következő szereplő azonosítója, ha ismert. */
  actorId?: string;
  /** 0-alapú lépésindex a nyolclépcsős folyamatban. */
  stageIndex: number;
  done: boolean;
  /** A célnegyedév vége már elmúlt, de a tétel nem teljesült. */
  overdue: boolean;
}

/**
 * Örökölt tervciklus-státuszok egyetlen normalizálása.
 * A régi dékáni jóváhagyási lépcső ma gazdasági vezetői ellenőrzés.
 */
export function normalizeLegacyPlanStatus(status: string): PlanApprovalStatus {
  if (status === "dekani_jovahagyas" || status === "jovahagyasra_var") {
    return "gazdasagi_ellenorzes";
  }
  return status as PlanApprovalStatus;
}

/** A tervsor célnegyedévének utolsó napja ISO alakban. */
export function quarterEndIso(item: ProcurementPlanItem): string {
  const q = Number(String(item.quarter).replace(/\D/g, "")) || 4;
  const endMonth = q * 3;
  const lastDay = new Date(item.planYear, endMonth, 0).getDate();
  return `${item.planYear}-${String(endMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Késedelmes-e a tétel: a célnegyedév vége elmúlt, és a tétel még nem
 * teljesült. Azonnali tételnél nincs negyedéves határidő, így nem késedelmes.
 */
export function isOverdue(
  item: ProcurementPlanItem,
  today: string = todayIso(),
  completed = false,
): boolean {
  if (completed || item.status === "teljesult") return false;
  if (item.timing === "azonnali") return false;
  return quarterEndIso(item) < today;
}

function step(index: number) {
  return { stageIndex: index, stepLabel: PROCESS_STEPS[index]! };
}

export function planItemStage(
  item: ProcurementPlanItem,
  approval: PlanApproval | undefined,
  handover: AssetHandover | undefined,
  users: User[],
): PlanItemStage {
  const approved = planApprovalApproved(approval);
  const status = approval ? normalizeLegacyPlanStatus(approval.status) : undefined;
  const completed = handover?.status === "atvetel_igazolva" || item.status === "teljesult";
  const overdue = isOverdue(item, todayIso(), completed);

  if (completed) {
    return {
      ...step(STEP.atvetel),
      label: "Teljesült – az eszköz a leltárban",
      nextAction: "Az igény lezárult, az eszköz a személyi leltárban van.",
      waitingOn: "Nincs nyitott teendő.",
      done: true,
      overdue: false,
    };
  }
  if (handover) {
    if (handover.status === "atadva") {
      const rec = users.find((u) => u.id === handover.recipientId);
      return {
        ...step(STEP.atvetel),
        label: "Átadva – átvételi visszaigazolásra vár",
        nextAction: "Átvétel visszaigazolása és ügy lezárása",
        waitingOn: rec ? `${rec.name} – Igénylő` : responsibleForRole(users, "igenylo").waitingOn,
        ...(rec ? { actorId: rec.id } : {}),
        done: false,
        overdue,
      };
    }
    if (handoverConfigured(handover)) {
      return {
        ...step(STEP.eszkozatadas),
        label: "Konfigurálva – átadásra kész",
        nextAction: "Eszköz átadása az igénylőnek",
        ...responsibleForRole(users, "it_referens"),
        done: false,
        overdue,
      };
    }
    const started = Boolean(
      handover.serial ||
        handover.inventoryNo ||
        (handover.attachments ?? []).length > 0 ||
        Object.values(handover.checklist ?? {}).some(Boolean),
    );
    return {
      ...step(STEP.konfiguralas),
      label: started ? "Konfigurálás alatt" : "Beérkezett – konfigurálásra vár",
      nextAction: "Telepítés, checklist, gyári szám, leltárkód és fénykép rögzítése",
      ...responsibleForRole(users, "it_referens"),
      done: false,
      overdue,
    };
  }
  if (item.status === "beszerzes_alatt") {
    return {
      ...step(STEP.beszerzes),
      label: "Beszerzés alatt – beérkezésre vár",
      nextAction: "Az eszköz beérkezésének rögzítése",
      ...responsibleForRole(users, "beszerzo"),
      done: false,
      overdue,
    };
  }
  if (approved || item.status === "jovahagyva") {
    return {
      ...step(STEP.beszerzes),
      label: "Jóváhagyva – beszerzés indítható",
      nextAction: "Beszerzés indítása",
      ...responsibleForRole(users, "beszerzo"),
      done: false,
      overdue,
    };
  }
  if (status === "gazdasagi_ellenorzes") {
    return {
      ...step(STEP.gazdasagi_jovahagyas),
      label: "Gazdasági vezetői jóváhagyásra vár",
      nextAction: "Beszerzési terv gazdasági vezetői jóváhagyása",
      ...responsibleForRole(users, "gazdasagi_vezeto"),
      done: false,
      overdue,
    };
  }
  if (status === "visszakuldve") {
    return {
      ...step(STEP.it_besorolas),
      label: "Átdolgozásra visszaküldve",
      nextAction: "Besorolás átdolgozása és ismételt beküldése",
      ...responsibleForRole(users, "eszkozmenedzser"),
      done: false,
      overdue,
    };
  }
  return {
    ...step(STEP.it_besorolas),
    label: "IT besorolás alatt",
    nextAction: "Besorolás, ütemezés és beküldés gazdasági jóváhagyásra",
    ...responsibleForRole(users, "eszkozmenedzser"),
    done: false,
    overdue,
  };
}
