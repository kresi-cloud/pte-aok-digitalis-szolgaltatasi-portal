import type { ServiceRequest } from "./types";

/**
 * D15 – egység-keret: ha az egység éves keretét az igény kimerítené, a szervezeti
 * jóváhagyó figyelmeztetést lát, de indoklással jóváhagyhatja; kemény tiltás nincs.
 */

export const DEFAULT_UNIT_BUDGET = 5_000_000;

const COUNTED_STATUSES = new Set([
  "bekuldve",
  "elso_ertekeles",
  "pontositas",
  "jovahagyasra_var",
  "elfogadva",
  "tervezes",
  "megvalositas",
  "teszteles",
  "atadasra_var",
  "lezarva",
]);

export function unitBudgetOf(budgets: Record<string, number>, orgUnitId: string): number {
  const v = budgets[orgUnitId];
  return Number.isFinite(v) && (v as number) >= 0 ? (v as number) : DEFAULT_UNIT_BUDGET;
}

export function requestAmount(r: ServiceRequest): number {
  return Math.round(r.approvedBudgetGross ?? r.estimatedCost ?? 0);
}

/** Az egység adott évi felhasználása: jóváhagyott vagy folyó eszközigények bruttó összege. */
export function unitUsage(
  requests: ServiceRequest[],
  orgUnitId: string,
  year: number,
  excludeId?: string,
): number {
  return requests
    .filter(
      (r) =>
        r.orgUnitId === orgUnitId &&
        r.domain === "hardver" &&
        r.id !== excludeId &&
        COUNTED_STATUSES.has(r.status) &&
        r.status !== "jovahagyasra_var" &&
        r.status !== "bekuldve" &&
        r.status !== "elso_ertekeles" &&
        r.status !== "pontositas" &&
        Number(r.createdAt.slice(0, 4)) === year,
    )
    .reduce((s, r) => s + requestAmount(r), 0);
}

export interface UnitBudgetCheck {
  orgUnitId: string;
  year: number;
  budget: number;
  usedBefore: number;
  amount: number;
  remainingAfter: number;
  exceeded: boolean;
}

export function unitBudgetCheck(
  request: ServiceRequest,
  requests: ServiceRequest[],
  budgets: Record<string, number>,
  today: string,
): UnitBudgetCheck {
  const year = Number(today.slice(0, 4));
  const budget = unitBudgetOf(budgets, request.orgUnitId);
  const usedBefore = unitUsage(requests, request.orgUnitId, year, request.id);
  const amount = requestAmount(request);
  const remainingAfter = budget - usedBefore - amount;
  return {
    orgUnitId: request.orgUnitId,
    year,
    budget,
    usedBefore,
    amount,
    remainingAfter,
    exceeded: remainingAfter < 0,
  };
}

export const MIN_OVERRUN_JUSTIFICATION = 5;
