import { HARDWARE_MODELS } from "./inventory-data";
import { HARDWARE_STANDARDS } from "./asset-data";

/**
 * A beszerzési hardverstandardhoz tartozó eszközfelismerési modellkulcs.
 * Ebből származnak az átvételkor a személyi leltárba kerülő műszaki adatok.
 */
const STANDARD_TO_MODEL: Record<string, string> = {
  "std-office-notebook": "dell-latitude-5540",
  "std-power-notebook": "macbook-pro-14-m3",
  "std-office-desktop": "hp-elitedesk-800-g9",
  "std-teaching-workstation": "hp-elitedesk-800-g9",
  "std-research-workstation": "dell-precision-5860",
  "std-hpc-workstation": "lenovo-p3-linux",
  "std-tablet": "ipad-pro-11-m2",
};

export function modelKeyForStandard(standardKey: string): string | undefined {
  const key = STANDARD_TO_MODEL[standardKey];
  return key && HARDWARE_MODELS.some((m) => m.key === key) ? key : undefined;
}

export function standardLabel(standardKey: string): string {
  return HARDWARE_STANDARDS.find((s) => s.key === standardKey)?.label ?? standardKey;
}
