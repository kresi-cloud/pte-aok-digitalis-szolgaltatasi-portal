import type { AppNotification, Delegation, RoleKey, ServiceRequest, User } from "./types";
import type { SituationContext } from "./request-situation";
import { requestSituation } from "./request-situation";
import { PROCESS_STEPS } from "./process-steps";

/** D8 – időszakos helyettesítés: a felhasználó helyettest és időszakot ad meg. */

export function delegationActive(d: Delegation, today: string): boolean {
  return d.from <= today && today <= d.to;
}

/** Kiket helyettesít a felhasználó ma. */
export function actingFor(
  delegations: Delegation[],
  substituteId: string,
  today: string,
): string[] {
  return delegations
    .filter((d) => d.substituteId === substituteId && delegationActive(d, today))
    .map((d) => d.userId);
}

/** Ki a felhasználó aktív helyettese ma. */
export function substituteOf(
  delegations: Delegation[],
  userId: string,
  today: string,
): Delegation | undefined {
  return delegations.find((d) => d.userId === userId && delegationActive(d, today));
}

/** A felhasználó saját maga vagy helyettesként jár el a megadott személyért. */
export function actsAs(
  delegations: Delegation[],
  me: string,
  userId: string | undefined,
  today: string,
): boolean {
  if (!userId) return false;
  if (userId === me) return true;
  return actingFor(delegations, me, today).includes(userId);
}

export function validateDelegation(
  userId: string,
  input: { substituteId: string; from: string; to: string },
  users: User[],
): string | null {
  if (!input.substituteId) return "Válasszon helyettest.";
  if (input.substituteId === userId) return "A helyettes nem lehet saját maga.";
  const sub = users.find((u) => u.id === input.substituteId);
  if (!sub || sub.active === false) return "A helyettes csak aktív munkatárs lehet.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.from) || !/^\d{4}-\d{2}-\d{2}$/.test(input.to))
    return "Adja meg az időszak kezdetét és végét.";
  if (input.to < input.from) return "Az időszak vége nem lehet a kezdete előtt.";
  return null;
}

/** D14 – személyre szóló értesítések: címzett, teendő, lépés, határidő. */

const ROLE_SCOPED_TEXT: [RegExp, RoleKey[]][] = [
  [/beszerzési terv|Beszerzési terv/, ["eszkozmenedzser", "gazdasagi_vezeto", "beszerzo"]],
];

/** Egy értesítés címzettjeinek és teendőjének levezetése az ügy helyzetéből. */
export function enrichNotification(
  n: AppNotification,
  ctx: SituationContext & { requests: ServiceRequest[] },
): AppNotification {
  if (n.recipientIds) return n;
  const request = n.requestId ? ctx.requests.find((r) => r.id === n.requestId) : undefined;
  if (!request) {
    const roles = ROLE_SCOPED_TEXT.find(([re]) => re.test(n.text))?.[1] ?? ["admin"];
    const ids = ctx.users.filter((u) => u.roles.some((r) => roles.includes(r))).map((u) => u.id);
    return { ...n, recipientIds: ids };
  }
  const sit = requestSituation(request, ctx);
  const recipients = new Set<string>([request.requesterId]);
  if (sit.nextActorId && !sit.closed && !sit.terminated) recipients.add(sit.nextActorId);
  return {
    ...n,
    recipientIds: [...recipients],
    todoActorId: sit.nextActorId && !sit.closed && !sit.terminated ? sit.nextActorId : undefined,
    todo: sit.nextActorId && !sit.closed && !sit.terminated ? sit.nextAction : undefined,
    step: PROCESS_STEPS[sit.stageIndex],
    dueDate: sit.deadline?.dueDate,
  };
}

/** A felhasználónak (és az általa helyettesítetteknek) szóló értesítések. */
export function notificationsFor(
  notifications: AppNotification[],
  me: string,
  delegations: Delegation[],
  today: string,
  isAdmin = false,
): AppNotification[] {
  const acting = new Set([me, ...actingFor(delegations, me, today)]);
  return notifications.filter((n) => {
    if (!n.recipientIds) return true;
    if (n.recipientIds.length === 0) return isAdmin;
    return n.recipientIds.some((id) => acting.has(id));
  });
}
