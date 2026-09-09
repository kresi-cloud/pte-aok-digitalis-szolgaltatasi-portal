import { HARDWARE_STANDARDS, NEXT_FINANCIAL_YEAR, REFERENCE_PRICES } from "./asset-data";
import type { AssetCategoryKey, ProcurementPlanItem, Quarter } from "./asset-types";
import { requestedTimingLabel, type Product, type ProductCategory, type ServiceRequest } from "./types";

/**
 * Jóváhagyott igényből beszerzési tervsor-javaslat.
 * Termékkatalógusból indított igénynél a kiválasztott termék adatai az
 * elsődlegesek; szabad szöveges igénynél kulcsszavas becslés a tartalék.
 */

export interface CatalogContext {
  products: Product[];
  categories: ProductCategory[];
}

interface Rule {
  words: string[];
  standardKey: string;
}

const RULES: Rule[] = [
  { words: ["workstation", "munkaállomás", "gpu", "szimuláció", "hpc"], standardKey: "std-research-workstation" },
  { words: ["notebook", "laptop", "hordozható"], standardKey: "std-office-notebook" },
  { words: ["macbook", "videovágás", "rendering", "emelt teljesítmény"], standardKey: "std-power-notebook" },
  { words: ["monitor", "kijelző"], standardKey: "std-monitor-base" },
  { words: ["tablet", "ipad"], standardKey: "std-tablet" },
  { words: ["dokkoló", "dokkolo", "dock"], standardKey: "std-dock" },
  { words: ["asztali", "pc", "desktop", "számítógép", "szamitogep"], standardKey: "std-office-desktop" },
];

/** Termékkör → intézményi eszközkategória. */
const CATEGORY_ID_TO_ASSET_KEY: Record<string, AssetCategoryKey> = {
  "pc-notebook": "notebook",
  "pc-desktop": "asztali",
  "pc-workstation": "munkaallomas",
  "pc-okostelefon": "mobil",
  "pc-mobiltelefon": "mobil",
  "pc-tablet": "tablet",
  "pc-monitor": "monitor",
  "pc-projektor": "egyeb",
  "pc-periferia": "periferia",
  "pc-nyomtato": "nyomtato",
};

const NAME_TO_ASSET_KEY: { words: string[]; key: AssetCategoryKey }[] = [
  { words: ["notebook", "laptop"], key: "notebook" },
  { words: ["workstation", "munkaállomás"], key: "munkaallomas" },
  { words: ["asztali", "desktop"], key: "asztali" },
  { words: ["telefon", "mobil"], key: "mobil" },
  { words: ["tablet"], key: "tablet" },
  { words: ["monitor", "kijelző"], key: "monitor" },
  { words: ["nyomtat"], key: "nyomtato" },
  { words: ["dokkol"], key: "dokkolo" },
  { words: ["periféri", "periferi"], key: "periferia" },
];

function assetKeyForCategory(category?: ProductCategory): AssetCategoryKey {
  if (!category) return "egyeb";
  const mapped = CATEGORY_ID_TO_ASSET_KEY[category.id];
  if (mapped) return mapped;
  const name = category.name.toLowerCase();
  return NAME_TO_ASSET_KEY.find((m) => m.words.some((w) => name.includes(w)))?.key ?? "egyeb";
}

function fallbackStandardKey(): string {
  return HARDWARE_STANDARDS[0]?.key ?? "std-office-notebook";
}

function pickStandardKey(text: string): string | null {
  for (const rule of RULES) {
    if (rule.words.some((w) => text.includes(w))) {
      const found = HARDWARE_STANDARDS.find((s) => s.key === rule.standardKey);
      if (found) return found.key;
    }
  }
  return null;
}

function pickQuantity(text: string): number {
  const m = text.match(/(\d{1,3})\s*(db|darab)/);
  const n = m ? Number(m[1]) : 1;
  return Number.isFinite(n) && n > 0 && n < 500 ? n : 1;
}

function quarterFor(priority: ServiceRequest["priority"]): Quarter {
  if (priority === "kritikus" || priority === "magas") return "Q1";
  if (priority === "kozepes") return "Q2";
  return "Q3";
}

/** Beszerzést igénylő-e a jóváhagyott igény. */
export function needsProcurement(r: ServiceRequest): boolean {
  // Termékkatalógusból indított eszközigénylés mindig beszerzési tétel.
  if (r.productId || r.productCategoryId) return true;
  if (r.internal?.procurement) return true;
  if (r.domain !== "hardver" && r.domain !== "szoftver") return false;
  const text = `${r.title} ${r.goal}`.toLowerCase();
  return ["beszerz", "vásár", "vasar", "csere", "új eszköz", "uj eszkoz", "licenc", "notebook", "laptop", "monitor", "workstation", "számítógép"].some(
    (w) => text.includes(w),
  );
}

export function planItemFromRequest(
  r: ServiceRequest,
  catalog?: CatalogContext,
): Omit<ProcurementPlanItem, "id"> {
  const text = `${r.title} ${r.goal}`.toLowerCase();
  const product = catalog?.products.find((p) => p.id === r.productId);
  const category =
    catalog?.categories.find((c) => c.id === (product?.categoryId ?? r.productCategoryId)) ??
    undefined;

  const categoryKey = product || category ? assetKeyForCategory(category) : undefined;
  const standard =
    (categoryKey
      ? HARDWARE_STANDARDS.find((s) => s.categoryKey === categoryKey)
      : undefined) ??
    HARDWARE_STANDARDS.find((s) => s.key === (pickStandardKey(text) ?? fallbackStandardKey()))!;

  const resolvedCategoryKey = categoryKey ?? standard.categoryKey;
  const price =
    REFERENCE_PRICES.find((p) => p.categoryKey === resolvedCategoryKey) ??
    REFERENCE_PRICES.find((p) => p.id === standard.referencePriceId) ??
    REFERENCE_PRICES[0]!;
  const quantity = r.quantity && r.quantity > 0 ? r.quantity : pickQuantity(text);
  const unitPrice = product
    ? product.referencePrice
    : r.estimatedCost && quantity > 0
      ? Math.round(r.estimatedCost / quantity)
      : undefined;

  const requested = r.requestedQuarter;
  const immediate = requested === "azonnali";
  // Évszámos formátum ("2027-Q1") és régi csupasz negyedév ("Q1") egyaránt elfogadott.
  const requestedQ =
    requested && requested !== "azonnali"
      ? ((requested.split("-").pop() ?? requested) as Quarter)
      : undefined;
  const quarter: Quarter =
    requestedQ ?? (immediate ? "Q1" : quarterFor(r.priority));

  return {
    planYear: NEXT_FINANCIAL_YEAR,
    quarter,
    orgUnitId: r.orgUnitId,
    replacedAssetIds: r.replacedAssetId ? [r.replacedAssetId] : [],
    reason: `Jóváhagyott igény (${r.id}): ${r.title}`,
    categoryKey: resolvedCategoryKey,
    standardKey: standard.key,
    quantity,
    referencePriceId: price.id,
    unitPriceOverride: unitPrice,
    priceChangePct: 0,
    contingencyPct: 10,
    quantityDiscountPct: 0,
    inflationPct: 3,
    priority: immediate
      ? "kritikus"
      : r.priority === "kritikus"
        ? "kritikus"
        : r.priority === "magas"
          ? "magas"
          : "kozepes",
    fundingSourceId: "fs-kari",
    status: "tervezett",
    comment: [
      product
        ? `Katalógusból igényelt eszköz: ${product.name} (${product.vendor}).`
        : "Automatikusan generálva jóváhagyott szolgáltatási igényből; gazdasági felülvizsgálat szükséges.",
      immediate
        ? `Az igénylő azonnali beszerzést kért. Indoklás: ${r.urgencyReason ?? "nincs megadva"}`
        : requested
          ? `Az igénylő által kért ütemezés: ${requestedTimingLabel(requested)}.`
          : "",
    ]
      .filter(Boolean)
      .join(" "),
    kind: r.replacedAssetId ? "csere" : "uj_kapacitas",
    sourceRequestId: r.id,
    productId: product?.id,
    deviceName: product ? `${product.name} (${product.vendor})` : undefined,
    modelKey: product?.modelKey,
    timing: immediate ? "azonnali" : "negyedeves",
  };
}

