import {
  ASSET_CATEGORIES,
  ASSET_MODELS,
  ASSET_LOCATIONS,
  HARDWARE_STANDARDS,
  LIFECYCLE_POLICIES,
  REFERENCE_PRICES,
  FUNDING_SOURCES,
  SOFTWARE_PRODUCTS,
  TODAY,
} from "./asset-data";
import type {
  Asset,
  AssetModel,
  LicenceStatus,
  LifecyclePolicy,
  LifecycleStatus,
  PersonalSoftwareLicence,
  ProcurementPlanItem,
  ReferencePrice,
  ReplacementPriority,
} from "./asset-types";
import { LOCATION_KIND_LABELS } from "./asset-types";
import { USERS } from "./seed";

/** A felhasználó munkahelyéhez (szervezeti egység) tartozó helyiségek, saját iroda elöl. */
export function locationsForUser(userId?: string) {
  const user = USERS.find((u) => u.id === userId);
  if (!user) return ASSET_LOCATIONS;
  const own = ASSET_LOCATIONS.filter((l) => l.primaryUserIds?.includes(user.id));
  const unit = ASSET_LOCATIONS.filter(
    (l) => l.orgUnitId === user.orgUnitId && !own.includes(l),
  );
  const rest = ASSET_LOCATIONS.filter((l) => !own.includes(l) && !unit.includes(l));
  return [...own, ...unit, ...rest];
}

/** A felhasználóhoz rendelt alapértelmezett helyiség (saját iroda/műhely/labor). */
export function defaultLocationForUser(userId?: string) {
  return locationsForUser(userId)[0];
}

export function locationOptionLabel(l: { building: string; room: string; kind: keyof typeof LOCATION_KIND_LABELS }) {
  return `${l.building} · ${l.room} (${LOCATION_KIND_LABELS[l.kind]})`;
}


export const assetLookup = {
  model: (key: string): AssetModel | undefined => ASSET_MODELS.find((m) => m.key === key),
  modelLabel: (key: string) => {
    const m = ASSET_MODELS.find((x) => x.key === key);
    return m ? `${m.manufacturer} ${m.model}` : "Ismeretlen modell";
  },
  category: (key: string) => ASSET_CATEGORIES.find((c) => c.key === key),
  categoryLabel: (key: string) => ASSET_CATEGORIES.find((c) => c.key === key)?.label ?? key,
  location: (id: string) => ASSET_LOCATIONS.find((l) => l.id === id),
  locationLabel: (id: string) => {
    const l = ASSET_LOCATIONS.find((x) => x.id === id);
    return l ? `${l.building} · ${l.room}` : "—";
  },
  locationKindLabel: (id: string) => {
    const l = ASSET_LOCATIONS.find((x) => x.id === id);
    return l ? LOCATION_KIND_LABELS[l.kind] : "—";
  },

  standard: (key?: string) => HARDWARE_STANDARDS.find((s) => s.key === key),
  price: (id: string) => REFERENCE_PRICES.find((p) => p.id === id),
  funding: (id: string) => FUNDING_SOURCES.find((f) => f.id === id)?.name ?? "—",
  product: (key: string) => SOFTWARE_PRODUCTS.find((p) => p.key === key),
  productName: (key: string) => SOFTWARE_PRODUCTS.find((p) => p.key === key)?.name ?? key,
};

export function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
}

/** Mobil eszközkategóriák: ezeket személyi használatba adjuk, nincs fix helyiség. */
export const MOBILE_ASSET_CATEGORIES = ["notebook", "tablet", "mobil"] as const;

export function isMobileAssetCategory(key: string): boolean {
  return (MOBILE_ASSET_CATEGORIES as readonly string[]).includes(key);
}

export function yearsSince(date: string, ref = TODAY) {
  return daysBetween(date, ref) / 365.25;
}

export function policyFor(asset: Asset): LifecyclePolicy {
  if (asset.policyKey) {
    const p = LIFECYCLE_POLICIES.find((x) => x.key === asset.policyKey);
    if (p) return p;
  }
  const cat = ASSET_CATEGORIES.find((c) => c.key === asset.categoryKey);
  return (
    LIFECYCLE_POLICIES.find((p) => p.key === cat?.policyKey) ??
    LIFECYCLE_POLICIES.find((p) => p.key === "pol-periferia")!
  );
}

export function lifecycleEnd(asset: Asset) {
  if (asset.lifecycleEndOverride) return asset.lifecycleEndOverride;
  const policy = policyFor(asset);
  const [y, m, d] = asset.commissionDate.split("-").map(Number) as [number, number, number];
  return `${y + policy.plannedYears}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** OS támogatás vége – egyszerűsített intézményi szabály */
export function osSupportEnd(asset: Asset): string | undefined {
  const os = assetLookup.model(asset.modelKey)?.spec.os ?? "";
  if (os.startsWith("Windows 10")) return "2025-10-14";
  if (os.startsWith("Windows 11")) return "2031-10-14";
  if (os.startsWith("macOS Sonoma")) return "2026-09-30";
  if (os.startsWith("Ubuntu")) return "2029-04-30";
  if (os.startsWith("iPadOS")) return "2028-09-30";
  if (os.startsWith("Android")) return "2027-04-30";
  return undefined;
}

export function lifecycleStatus(asset: Asset): LifecycleStatus {
  if (asset.lifecycleStatusOverride) return asset.lifecycleStatusOverride;
  if (!asset.active) return "selejtezett";
  const policy = policyFor(asset);
  const age = yearsSince(asset.commissionDate);
  const osEnd = osSupportEnd(asset);
  const osExpired = osEnd ? Date.parse(osEnd) < Date.parse(TODAY) : false;
  if (osExpired && age >= policy.minYears) return "tamogatasbol_kifutott";
  if (age >= policy.maxYears + 2) return "selejtezesre_var";
  if (age >= policy.maxYears) return "cserere_erett";
  if (age >= policy.plannedYears - 1) return "cserere_tervezendo";
  if (age >= policy.plannedYears / 2) return "kozep";
  if (age < 1) return "uj";
  return "normal";
}

export function replacementPriority(asset: Asset): ReplacementPriority {
  const status = lifecycleStatus(asset);
  let score = 0;
  if (status === "selejtezesre_var") score += 4;
  if (status === "cserere_erett") score += 3;
  if (status === "tamogatasbol_kifutott") score += 4;
  if (status === "cserere_tervezendo") score += 2;
  if (asset.condition === "hibas") score += 3;
  if (asset.condition === "kopott") score += 1;
  if (asset.businessCritical) score += 2;
  score += Math.min(3, asset.repairCount);
  score += Math.min(2, Math.floor(asset.reportedIssues / 2));
  if (Date.parse(asset.warrantyEnd) < Date.parse(TODAY)) score += 1;
  if (score >= 8) return "kritikus";
  if (score >= 5) return "magas";
  if (score >= 3) return "kozepes";
  return "alacsony";
}

/** Standard-megfelelés vizsgálata */
export function meetsStandard(asset: Asset): { ok: boolean; reasons: string[] } {
  const model = assetLookup.model(asset.modelKey);
  const std = assetLookup.standard(model?.standardKey);
  if (!model || !std) return { ok: true, reasons: [] };
  const reasons: string[] = [];
  const cpuYear = model.spec.processor?.releaseYear ?? 0;
  if (std.minSpec.cpuGeneration && cpuYear && cpuYear < std.minSpec.cpuGeneration)
    reasons.push(`Processzorgeneráció elavult (${cpuYear} < ${std.minSpec.cpuGeneration})`);
  const ram = model.spec.memory?.capacityGb ?? 0;
  if (std.minSpec.ramGb && ram && ram < std.minSpec.ramGb)
    reasons.push(`Memória a minimum alatt (${ram} GB < ${std.minSpec.ramGb} GB)`);
  const cores = model.spec.processor?.cores ?? 0;
  if (std.minSpec.cores && cores && cores < std.minSpec.cores)
    reasons.push(`Magszám a minimum alatt (${cores} < ${std.minSpec.cores})`);
  return { ok: reasons.length === 0, reasons };
}

export function licenceStatus(l: PersonalSoftwareLicence, ref = TODAY): LicenceStatus {
  if (l.statusOverride) return l.statusOverride;
  if (l.reportedUnused) return "nem_hasznalt";
  const product = assetLookup.product(l.productKey);
  const support = product?.supportEnd[l.version];
  if (l.licenceEnd) {
    const days = daysBetween(ref, l.licenceEnd);
    if (days < 0) return "lejart";
    if (days <= 90) return "lejarathoz_kozel";
  }
  if (support && Date.parse(support) < Date.parse(ref)) return "megujitas_szukseges";
  return "aktiv";
}

export function priceIsStale(p: ReferencePrice, ref = TODAY) {
  return daysBetween(p.priceDate, ref) > 180;
}

export interface ItemCost {
  unitNet: number;
  netTotal: number;
  grossTotal: number;
  withContingency: number;
  source: string;
  stale: boolean;
}

export function itemCost(item: ProcurementPlanItem): ItemCost {
  const price = assetLookup.price(item.referencePriceId);
  const base = item.unitPriceOverride ?? price?.netPrice ?? 0;
  const adjusted =
    base *
    (1 + item.priceChangePct / 100) *
    (1 + item.inflationPct / 100) *
    (1 - item.quantityDiscountPct / 100);
  const netTotal = adjusted * item.quantity;
  const vat = price?.vatRate ?? 0.27;
  const grossTotal = netTotal * (1 + vat);
  return {
    unitNet: Math.round(adjusted),
    netTotal: Math.round(netTotal),
    grossTotal: Math.round(grossTotal),
    withContingency: Math.round(grossTotal * (1 + item.contingencyPct / 100)),
    source: item.unitPriceOverride ? "Kézzel felülírt egységár" : (price?.supplier ?? "—"),
    stale: price ? priceIsStale(price) : false,
  };
}

export const huf = (n: number) =>
  new Intl.NumberFormat("hu-HU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " Ft";

export const hufShort = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} M Ft`;
  if (Math.abs(n) >= 1000) return `${Math.round(n / 1000)} e Ft`;
  return `${Math.round(n)} Ft`;
};

/** Több éves előrejelzés: melyik évben jár le az eszközök életciklusa */
export function forecastByYear(assets: Asset[], fromYear: number, years: number) {
  const rows: { year: number; count: number; estimatedCost: number; byCategory: Record<string, number> }[] = [];
  for (let i = 0; i < years; i++) {
    const year = fromYear + i;
    const due = assets.filter((a) => Number(lifecycleEnd(a).slice(0, 4)) === year);
    const byCategory: Record<string, number> = {};
    let cost = 0;
    for (const a of due) {
      byCategory[a.categoryKey] = (byCategory[a.categoryKey] ?? 0) + 1;
      const model = assetLookup.model(a.modelKey);
      const std = assetLookup.standard(model?.standardKey);
      const price = std ? assetLookup.price(std.referencePriceId)?.netPrice : model?.referenceNewPrice;
      // évi 3% árváltozási feltételezés
      cost += (price ?? model?.referenceNewPrice ?? 0) * Math.pow(1.03, i);
    }
    rows.push({ year, count: due.length, estimatedCost: Math.round(cost), byCategory });
  }
  return rows;
}

/** Korfa: hány eszköz esik az adott életkori sávba */
export function ageDistribution(assets: Asset[]) {
  const buckets = ["0–1 év", "1–3 év", "3–5 év", "5–7 év", "7+ év"];
  const counts = new Map(buckets.map((b) => [b, 0]));
  for (const a of assets) {
    const age = yearsSince(a.commissionDate);
    const b = age < 1 ? buckets[0]! : age < 3 ? buckets[1]! : age < 5 ? buckets[2]! : age < 7 ? buckets[3]! : buckets[4]!;
    counts.set(b, (counts.get(b) ?? 0) + 1);
  }
  return buckets.map((b) => ({ bucket: b, count: counts.get(b) ?? 0 }));
}