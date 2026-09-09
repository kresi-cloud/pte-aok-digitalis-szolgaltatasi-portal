import { assetLookup, daysBetween } from "./asset-logic";
import type { Asset, AssetCategoryKey, ScrapProposal } from "./asset-types";

export interface ScrapListRow {
  assetId: string;
  name: string;
  inventoryNo: string;
  employeeName: string;
  employeeLabel: string;
  activationDate: string;
  disposalDate: string;
  grossPurchaseValue: number;
  bookValue: number;
  ratePct: number;
  fullyDepreciated: boolean;
  note: string;
}

export interface ScrapListSummary {
  proposal: ScrapProposal;
  rows: ScrapListRow[];
  totalCount: number;
  totalGross: number;
  totalBook: number;
}

/** IT eszközök esetében az értékvesztés évi 20%; egyéb gépek, berendezések 14,5%. */
export function depreciationRate(categoryKey: AssetCategoryKey): number {
  switch (categoryKey) {
    case "notebook":
    case "asztali":
    case "munkaallomas":
    case "monitor":
    case "tablet":
    case "mobil":
    case "dokkolo":
    case "nyomtato":
    case "periferia":
      return 0.2;
    case "kutatasi":
    case "egyeb":
    default:
      return 0.145;
  }
}

const SMALL_ASSET_LIMIT = 200_000;

/** Csak a hordozható eszközök kerülhetnek személyes használatba. */
export const PORTABLE_CATEGORIES: AssetCategoryKey[] = ["notebook", "tablet", "mobil"];

export function isPortable(categoryKey: AssetCategoryKey): boolean {
  return PORTABLE_CATEGORIES.includes(categoryKey);
}

export function isPersonalUse(asset: Asset): boolean {
  return asset.usage === "szemelyi" && isPortable(asset.categoryKey);
}

export function bookValue(
  asset: Asset,
  activationDate: string,
  disposalDate: string,
): { bookValue: number; ratePct: number; fullyDepreciated: boolean; note: string } {
  const gross = asset.purchaseValue;
  const days = Math.max(0, daysBetween(activationDate, disposalDate));

  if (gross <= SMALL_ASSET_LIMIT) {
    return {
      bookValue: 0,
      ratePct: 0,
      fullyDepreciated: true,
      note: "Egyösszegű leírás (≤200 000 Ft)",
    };
  }

  const rate = depreciationRate(asset.categoryKey);
  const depreciated = gross * rate * (days / 365);
  const bookValue = Math.max(0, Math.round(gross - depreciated));
  const fullyDepreciated = depreciated >= gross || days <= 0;

  return {
    bookValue,
    ratePct: rate * 100,
    fullyDepreciated,
    note: fullyDepreciated
      ? "Teljesen leírt"
      : `${(rate * 100).toFixed(0)}%/év, ${Math.round(days / 365.25 * 10) / 10} év`,
  };
}

export function buildScrapList(
  proposal: ScrapProposal,
  assets: Asset[],
  lookupUser: (id: string) => { name?: string } | undefined,
): ScrapListSummary {
  const disposalDate = proposal.decidedAt ?? proposal.submittedAt ?? proposal.createdAt;
  const rows = proposal.assetIds
    .map((id) => {
      const a = assets.find((x) => x.id === id);
      if (!a) return undefined;
      const model = assetLookup.model(a.modelKey);
      const name = model ? `${model.manufacturer} ${model.model}` : a.modelKey;

      const personal = isPersonalUse(a);
      const userId = personal ? a.assignedUserId : (a.inventoryResponsibleId ?? a.assignedUserId);
      const user = userId ? lookupUser(userId) : undefined;
      const employeeName = user?.name ?? "—";
      const employeeLabel = personal ? employeeName : `${employeeName} (leltárfelelős)`;

      const { bookValue: bv, ratePct, fullyDepreciated, note } = bookValue(a, a.commissionDate, disposalDate);

      return {
        assetId: a.id,
        name,
        inventoryNo: a.inventoryNo,
        employeeName,
        employeeLabel,
        activationDate: a.commissionDate,
        disposalDate,
        grossPurchaseValue: a.purchaseValue,
        bookValue: bv,
        ratePct,
        fullyDepreciated,
        note,
      };
    })
    .filter((r): r is ScrapListRow => r !== undefined);

  return {
    proposal,
    rows,
    totalCount: rows.length,
    totalGross: rows.reduce((s, r) => s + r.grossPurchaseValue, 0),
    totalBook: rows.reduce((s, r) => s + r.bookValue, 0),
  };
}
