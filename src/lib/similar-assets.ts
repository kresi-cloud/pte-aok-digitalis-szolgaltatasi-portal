import type { Asset, AssetCategoryKey } from "./asset-types";

/** Termékkör → leltári eszközkategória leképezés. */
export const PRODUCT_CATEGORY_TO_ASSET_KEY: Record<string, AssetCategoryKey> = {
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

export interface SimilarAsset {
  asset: Asset;
  /** személyes használatban van-e (hozzárendelt) vagy felelősként kezeli */
  relation: "hasznalo" | "felelos";
}

/**
 * Az adott felhasználóhoz kötött, a kért termékkörnek megfelelő aktív eszközök.
 */
export function similarAssetsFor(
  assets: Asset[],
  userId: string,
  productCategoryId: string | undefined,
  personalUse: boolean,
): SimilarAsset[] {
  if (!productCategoryId) return [];
  const categoryKey = PRODUCT_CATEGORY_TO_ASSET_KEY[productCategoryId];
  if (!categoryKey) return [];

  return assets
    .filter((a) => a.active && a.categoryKey === categoryKey)
    .filter((a) => a.assignedUserId === userId || (!personalUse && a.custodianUserId === userId))
    .map<SimilarAsset>((asset) => ({
      asset,
      relation: asset.assignedUserId === userId ? "hasznalo" : "felelos",
    }));
}
