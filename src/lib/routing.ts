import { ORG_UNITS, TEAMS, USERS } from "./seed";
import type { RoleKey, User } from "./types";

/**
 * Egyetlen helyen dől el, ki a következő döntéshozó vagy ügyintéző.
 * Mindig létező felhasználó azonosítójával tér vissza, hogy a folyamat
 * ne akadjon el nem létező szereplő miatt.
 */

function byRole(users: User[], role: RoleKey, orgUnitId?: string): User | undefined {
  if (orgUnitId) {
    const local = users.find((u) => u.roles.includes(role) && u.orgUnitId === orgUnitId);
    if (local) return local;
  }
  return users.find((u) => u.roles.includes(role));
}

function exists(users: User[], id: string | undefined): User | undefined {
  if (!id) return undefined;
  return users.find((u) => u.id === id);
}

/** Utolsó mentsvár: dékán, majd bármely vezető, végül az első felhasználó. */
function ultimateFallback(users: User[]): string {
  return (
    byRole(users, "dekan")?.id ??
    byRole(users, "vezeto")?.id ??
    users[0]?.id ??
    USERS[0]!.id
  );
}

/** Szervezeti (1. lépés) jóváhagyó, önjóváhagyás elkerülésével. */
export function resolveUnitApprover(
  users: User[],
  orgUnitId: string,
  requesterId?: string,
): string {
  const unit = ORG_UNITS.find((o) => o.id === orgUnitId);
  const candidates = [
    exists(users, unit?.approverUserId),
    exists(users, unit?.deputyApproverUserId),
    byRole(users, "jovahagyo", orgUnitId),
    exists(users, users.find((u) => u.id === requesterId)?.managerId),
    byRole(users, "jovahagyo"),
    byRole(users, "vezeto"),
  ].filter((u): u is User => Boolean(u));

  const notSelf = candidates.find((u) => u.id !== requesterId);
  return notSelf?.id ?? candidates[0]?.id ?? ultimateFallback(users);
}

/** Szolgáltatásgazda (2. lépés) jóváhagyó. */
export function resolveServiceOwner(users: User[], teamId?: string): string {
  const team = TEAMS.find((t) => t.id === teamId);
  return (
    exists(users, team?.ownerUserId)?.id ??
    byRole(users, "szolgaltatasgazda")?.id ??
    ultimateFallback(users)
  );
}

/** Kari IT referens – egyetlen személy látja el az egész kar telepítéseit. */
export function resolveItReferent(users: User[], _orgUnitId?: string): string | undefined {
  return byRole(users, "it_referens")?.id;
}

/** Igaz, ha a megadott azonosító nem oldható fel létező felhasználóra. */
export function isUnknownUser(users: User[], id: string | undefined): boolean {
  return !id || !users.some((u) => u.id === id);
}
