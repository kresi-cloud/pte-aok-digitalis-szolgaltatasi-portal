import { useStore } from "./store";
import type { RoleKey } from "./types";

/**
 * Areas that can be opened in view-only ("betekintés") mode.
 * The dean may open every page, but may only act where the decision is
 * genuinely his: procurement plan sign-off and request approvals where he is
 * the next approver in the chain.
 */
export type AccessArea =
  | "jogosultsagok"
  | "eszkozatadas"
  | "selejtezes"
  | "beszerzesek"
  | "beszerzesi-terv"
  | "munkater"
  | "adminisztracio"
  | "igeny"
  | "jovahagyasok";

export function isViewOnly(role: RoleKey, _area: AccessArea): boolean {
  // The dean has delegated these areas: read-only everywhere.
  return role === "dekan";
}

export function useViewOnly(area: AccessArea): boolean {
  const { activeRole } = useStore();
  return isViewOnly(activeRole, area);
}

/** Tervtételt csak az IT eszközmenedzser és a beszerző vihet fel/szerkeszthet. */
export function canPlanProcurement(role: RoleKey): boolean {
  return role === "eszkozmenedzser" || role === "beszerzo";
}

/** A beszerzési tervet ellenőrző/betekintő szerepkörök. */
export function canReviewProcurement(role: RoleKey): boolean {
  return canPlanProcurement(role) || ["gazdasagi_vezeto", "vezeto", "dekan"].includes(role);
}
