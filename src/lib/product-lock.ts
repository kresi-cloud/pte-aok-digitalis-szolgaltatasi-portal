import type { AssetHandover, ServiceRequest } from "./types";
import type { ProcurementPlanItem } from "./asset-types";

export interface ProductLockContext {
  requests: ServiceRequest[];
  planItems: ProcurementPlanItem[];
  handovers: AssetHandover[];
}

export interface ProductLockInfo {
  locked: boolean;
  count: number;
  reason?: string;
}

const CLOSED_REQUEST_STATUSES = ["lezarva", "elutasitva", "visszavonva", "piszkozat"];

/**
 * Egy katalógustétel akkor zárolt, ha aktív beszerzési folyamat hivatkozik rá:
 * nyitott igény, nem teljesült tervsor vagy le nem zárt eszközátadás.
 */
export function productLockInfo(productId: string, ctx: ProductLockContext): ProductLockInfo {
  const openRequests = (ctx.requests ?? []).filter(
    (r) => r.productId === productId && !CLOSED_REQUEST_STATUSES.includes(r.status),
  ).length;
  const openPlanItems = (ctx.planItems ?? []).filter(
    (p) => p.productId === productId && p.status !== "teljesult",
  ).length;
  const openHandovers = (ctx.handovers ?? []).filter(
    (h) => h.productId === productId && h.status !== "atvetel_igazolva",
  ).length;
  const count = openRequests + openPlanItems + openHandovers;
  if (count === 0) return { locked: false, count: 0 };
  const parts: string[] = [];
  if (openRequests) parts.push(`${openRequests} folyamatban lévő igény`);
  if (openPlanItems) parts.push(`${openPlanItems} nyitott beszerzési tervsor`);
  if (openHandovers) parts.push(`${openHandovers} lezáratlan eszközátadás`);
  return {
    locked: true,
    count,
    reason: `${parts.join(", ")} hivatkozik rá – amíg ezek le nem zárulnak, nem távolítható el a beszerezhető eszközök közül.`,
  };
}
