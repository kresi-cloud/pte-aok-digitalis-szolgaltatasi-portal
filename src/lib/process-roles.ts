/**
 * A nyolclépcsős folyamat lépéseihez tartozó felelős szerepkörök egyetlen
 * központi táblája. Minden felület (tervsor-levezetés, helyzetkártya,
 * demóvezérlő) innen oldja fel a felelőst – nincs szétszórt szerepkör-literal.
 */
import { ROLE_LABELS, type RoleKey, type User } from "./types";
import { PROCESS_STEPS, STEP } from "./process-steps";

export const STEP_RESPONSIBLE: Record<number, RoleKey> = {
  [STEP.igenyles]: "igenylo",
  [STEP.szervezeti_jovahagyas]: "jovahagyo",
  [STEP.it_besorolas]: "eszkozmenedzser",
  [STEP.gazdasagi_jovahagyas]: "gazdasagi_vezeto",
  [STEP.beszerzes]: "beszerzo",
  [STEP.konfiguralas]: "it_referens",
  [STEP.eszkozatadas]: "it_referens",
  [STEP.atvetel]: "igenylo",
};

export interface StepResponsible {
  role: RoleKey;
  /** „Név – Beosztás” alakú megjelenítés. */
  waitingOn: string;
  actorId?: string;
}

export function userByRole(users: User[], role: RoleKey): User | undefined {
  return users.find((u) => u.roles.includes(role));
}

/** A megadott szerepkör aktuális szereplője megjelenítésre kész alakban. */
export function responsibleForRole(users: User[], role: RoleKey): StepResponsible {
  const u = userByRole(users, role);
  return {
    role,
    waitingOn: `${u?.name ?? ROLE_LABELS[role]} – ${ROLE_LABELS[role]}`,
    ...(u ? { actorId: u.id } : {}),
  };
}

/** A folyamat adott lépésének felelőse. */
export function responsibleForStep(users: User[], stepIndex: number): StepResponsible {
  const role = STEP_RESPONSIBLE[stepIndex] ?? "igenylo";
  return responsibleForRole(users, role);
}

export function stepLabel(stepIndex: number): string {
  return PROCESS_STEPS[stepIndex] ?? PROCESS_STEPS[0]!;
}
