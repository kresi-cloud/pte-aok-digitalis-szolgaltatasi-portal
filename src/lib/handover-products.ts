import type { AssetHandover, HardwareSpec, Product, ProductCategory, ServiceRequest } from "./types";
import { specForModel } from "./inventory-data";

export interface HandoverCatalogContext {
  products: Product[];
  categories: ProductCategory[];
  requests: ServiceRequest[];
}

/** Az átadási tételhez tartozó katalógustétel, ha azonosítható. */
export function productForHandover(
  handover: Pick<AssetHandover, "productId" | "requestId" | "deviceName">,
  ctx: HandoverCatalogContext,
): Product | undefined {
  if (handover.productId) {
    const direct = ctx.products.find((p) => p.id === handover.productId);
    if (direct) return direct;
  }
  const request = handover.requestId
    ? ctx.requests.find((r) => r.id === handover.requestId)
    : undefined;
  if (request?.productId) {
    const fromRequest = ctx.products.find((p) => p.id === request.productId);
    if (fromRequest) return fromRequest;
  }
  // Tartalék: az eszköznév alapján keresünk illeszkedő katalógustételt.
  const name = (handover.deviceName ?? "").toLowerCase();
  return name
    ? ctx.products.find((p) => name.includes(p.name.toLowerCase()))
    : undefined;
}

/** Az átadási tétel termékköre (igény → termék → termékkör sorrendben). */
export function categoryForHandover(
  handover: Pick<AssetHandover, "productId" | "requestId" | "deviceName">,
  ctx: HandoverCatalogContext,
): ProductCategory | undefined {
  const product = productForHandover(handover, ctx);
  if (product) return ctx.categories.find((c) => c.id === product.categoryId);
  const request = handover.requestId
    ? ctx.requests.find((r) => r.id === handover.requestId)
    : undefined;
  if (request?.productCategoryId) {
    return ctx.categories.find((c) => c.id === request.productCategoryId);
  }
  return undefined;
}

/**
 * A legördülőben felkínált modellek: az adott termékkör összes, a beszerző
 * által beszerezhetőként (aktívként) jelölt tétele. Ha a termékkör nem
 * állapítható meg, a teljes aktív katalógus jelenik meg.
 */
export function handoverProductOptions(
  handover: Pick<AssetHandover, "productId" | "requestId" | "deviceName">,
  ctx: HandoverCatalogContext,
): Product[] {
  const category = categoryForHandover(handover, ctx);
  const active = ctx.products.filter((p) => p.active);
  const list = category ? active.filter((p) => p.categoryId === category.id) : active;
  // A már kiválasztott / igényelt tétel akkor is maradjon választható, ha időközben inaktív lett.
  const current = productForHandover(handover, ctx);
  return current && !list.some((p) => p.id === current.id) ? [current, ...list] : list;
}

/** Katalógustétel adatlapjából a leltárba kerülő műszaki adatok. */
export function specFromProduct(product: Product): HardwareSpec {
  const base = product.modelKey ? specForModel(product.modelKey) : undefined;
  return {
    os: product.spec.os,
    osVersion: product.spec.osVersion,
    cpu: product.spec.cpu,
    cpuCores: base?.cpuCores ?? 0,
    ram: product.spec.ram,
    storage: product.spec.storage,
    features: product.spec.features,
  };
}

/** Nem személyi használatú (helyhez kötött) eszköznél kell épület/helyiség. */
export function needsLocationForCategory(category?: ProductCategory): boolean {
  return category ? category.personalUse !== true : false;
}

/** A katalógustétel megjelenítendő modellcímkéje (név + gyártó). */
export function productModelLabel(product: Product): string {
  return product.vendor ? `${product.name} · ${product.vendor}` : product.name;
}

/**
 * A leltártétel megnevezése: a felhasználási célt tükrözi (az eredeti igény
 * címe), nem a modellnevet. Tartalék: a termékkör neve, majd az eszköznév.
 */
export function handoverPurposeTitle(
  handover: Pick<AssetHandover, "productId" | "requestId" | "deviceName">,
  ctx: HandoverCatalogContext,
): string {
  const request = handover.requestId
    ? ctx.requests.find((r) => r.id === handover.requestId)
    : undefined;
  if (request?.title?.trim()) return request.title.trim();
  const category = categoryForHandover(handover, ctx);
  if (category) return category.name;
  return handover.deviceName;
}
