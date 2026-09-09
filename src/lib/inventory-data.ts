import { INITIAL_PRODUCTS } from "./product-catalog";
import type { HardwareSpec, InventoryItem } from "./types";

/**
 * Eszközfelismerési adatbázis: a leltárba felvett hardver modelljéhez a rendszer
 * automatikusan hozzárendeli az operációs rendszert és verzióját, a processzor-,
 * memória- és tárolóadatokat, valamint a speciális feature-öket.
 */
export interface HardwareModel {
  key: string;
  label: string;
  category: "notebook" | "asztali" | "munkaallomas" | "tablet" | "nyomtato" | "egyeb";
  spec: HardwareSpec;
}

export const HARDWARE_MODELS: HardwareModel[] = [
  {
    key: "dell-latitude-5540",
    label: "Dell Latitude 5540 (2023)",
    category: "notebook",
    spec: {
      os: "Windows 11 Enterprise",
      osVersion: "23H2 (build 22631.4169)",
      cpu: "Intel Core i7-1355U",
      cpuCores: 10,
      ram: "32 GB DDR5-4800",
      storage: "1 TB NVMe SSD",
      features: ["TPM 2.0", "BitLocker titkosítás", "Ujjlenyomat-olvasó", "Thunderbolt 4", "Wi-Fi 6E", "Docking támogatás"],
    },
  },
  {
    key: "lenovo-thinkpad-t14-g4",
    label: "Lenovo ThinkPad T14 Gen 4",
    category: "notebook",
    spec: {
      os: "Windows 11 Pro",
      osVersion: "24H2 (build 26100.1742)",
      cpu: "AMD Ryzen 7 PRO 7840U",
      cpuCores: 8,
      ram: "16 GB LPDDR5-6400",
      storage: "512 GB NVMe SSD",
      features: ["TPM 2.0", "BitLocker titkosítás", "IR-kamera (Windows Hello)", "LTE modul", "Wi-Fi 6E"],
    },
  },
  {
    key: "macbook-pro-14-m3",
    label: "Apple MacBook Pro 14\" (M3, 2023)",
    category: "notebook",
    spec: {
      os: "macOS Sonoma",
      osVersion: "14.6.1",
      cpu: "Apple M3 (8 mag CPU / 10 mag GPU)",
      cpuCores: 8,
      ram: "18 GB egyesített memória",
      storage: "512 GB SSD",
      features: ["Secure Enclave", "FileVault titkosítás", "Touch ID", "Neural Engine", "Thunderbolt 4"],
    },
  },
  {
    key: "hp-elitedesk-800-g9",
    label: "HP EliteDesk 800 G9 SFF",
    category: "asztali",
    spec: {
      os: "Windows 11 Enterprise",
      osVersion: "23H2 (build 22631.4169)",
      cpu: "Intel Core i5-13500",
      cpuCores: 14,
      ram: "16 GB DDR5-4800",
      storage: "512 GB NVMe SSD",
      features: ["TPM 2.0", "vPro távmenedzsment", "BitLocker titkosítás", "Kettős monitor kimenet"],
    },
  },
  {
    key: "dell-precision-5860",
    label: "Dell Precision 5860 munkaállomás",
    category: "munkaallomas",
    spec: {
      os: "Windows 11 Pro for Workstations",
      osVersion: "24H2 (build 26100.1742)",
      cpu: "Intel Xeon w5-2455X",
      cpuCores: 12,
      ram: "128 GB ECC DDR5",
      storage: "2 TB NVMe SSD + 4 TB HDD",
      features: ["NVIDIA RTX A4000 GPU", "ECC memória", "TPM 2.0", "GPU-gyorsított képfeldolgozás", "10 GbE hálózat"],
    },
  },
  {
    key: "lenovo-p3-linux",
    label: "Lenovo ThinkStation P3 (kutatói konfiguráció)",
    category: "munkaallomas",
    spec: {
      os: "Ubuntu LTS",
      osVersion: "24.04.1 LTS (kernel 6.8)",
      cpu: "Intel Core i9-13900K",
      cpuCores: 24,
      ram: "64 GB DDR5-5600",
      storage: "2 TB NVMe SSD",
      features: ["NVIDIA RTX 4070 GPU", "CUDA 12.4", "LUKS lemeztitkosítás", "Konténeres futtatókörnyezet"],
    },
  },
  {
    key: "ipad-pro-11-m2",
    label: "Apple iPad Pro 11\" (M2)",
    category: "tablet",
    spec: {
      os: "iPadOS",
      osVersion: "17.6.1",
      cpu: "Apple M2",
      cpuCores: 8,
      ram: "8 GB",
      storage: "256 GB",
      features: ["Face ID", "Apple Pencil támogatás", "MDM felügyelet", "eSIM"],
    },
  },
  {
    key: "hp-laserjet-m430",
    label: "HP LaserJet MFP M430",
    category: "nyomtato",
    spec: {
      os: "HP FutureSmart firmware",
      osVersion: "5.6.0.3",
      cpu: "1,2 GHz beágyazott vezérlő",
      cpuCores: 1,
      ram: "512 MB",
      storage: "8 GB eMMC",
      features: ["Hálózati nyomtatás", "Biztonságos PIN-es nyomtatás", "Duplex", "Szkennelés e-mailbe"],
    },
  },
];

export const GENERIC_SPEC: HardwareSpec = {
  os: "Ismeretlen / kézi rögzítés",
  osVersion: "—",
  cpu: "Nem felismert",
  cpuCores: 0,
  ram: "Nem felismert",
  storage: "Nem felismert",
  features: ["Adminisztrátori ellenőrzés szükséges"],
};

export function specForModel(modelKey?: string): HardwareSpec {
  return HARDWARE_MODELS.find((m) => m.key === modelKey)?.spec ?? GENERIC_SPEC;
}

/** Mobil (személyi használatra kiadható) eszközkategóriák. */
export const MOBILE_MODEL_CATEGORIES = ["notebook", "tablet"] as const;

/** Igaz, ha a modell mobil eszköz – ilyenkor nem kell épület/helyiség. */
export function isMobileModel(modelKey?: string): boolean {
  const cat = HARDWARE_MODELS.find((m) => m.key === modelKey)?.category;
  return cat ? (MOBILE_MODEL_CATEGORIES as readonly string[]).includes(cat) : false;
}

export const SOFTWARE_SUGGESTIONS = [
  "Microsoft 365 Apps",
  "EndNote 21",
  "SPSS Statistics 29",
  "MATLAB R2024a",
  "Adobe Acrobat Pro",
  "GraphPad Prism 10",
  "Zoom Workplace",
  "ImageJ / Fiji",
];

const ALL_INVENTORY: InventoryItem[] = [
  {
    id: "inv-1001",
    ownerId: "u-kovacs",
    kind: "hardver",
    name: "Oktatói notebook – Élettani Intézet",
    modelKey: "dell-latitude-5540",
    serial: "AOK-NB-2314",
    location: "Élettani Intézet, 214. szoba",
    spec: specForModel("dell-latitude-5540"),
    status: "jovahagyva",
    createdAt: "2026-02-11",
    decidedAt: "2026-02-12",
    decidedBy: "u-molnar",
    note: "Oktatási és kutatási felhasználás.",
  },
  {
    id: "inv-1002",
    ownerId: "u-kovacs",
    kind: "szoftver",
    name: "SPSS Statistics 29",
    version: "29.0.2.0",
    licenseType: "Kari kampuszlicenc",
    licenseKey: "PTE-AOK-SPSS-29-0417",
    installedOn: "AOK-NB-2314",
    status: "jovahagyva",
    createdAt: "2026-02-11",
    decidedAt: "2026-02-12",
    decidedBy: "u-molnar",
  },
  {
    id: "inv-1003",
    ownerId: "u-kovacs",
    kind: "hardver",
    name: "Kutatói munkaállomás – képfeldolgozás",
    modelKey: "lenovo-p3-linux",
    serial: "AOK-WS-0088",
    location: "Kutatólabor, alagsor 3.",
    spec: specForModel("lenovo-p3-linux"),
    status: "jovahagyasra_var",
    createdAt: "2026-03-02",
  },
  {
    id: "inv-1004",
    ownerId: "u-szabo",
    kind: "hardver",
    name: "Vezetői notebook",
    modelKey: "macbook-pro-14-m3",
    serial: "AOK-NB-1902",
    location: "Dékáni Hivatal",
    spec: specForModel("macbook-pro-14-m3"),
    status: "jovahagyasra_var",
    createdAt: "2026-03-04",
  },
  {
    id: "inv-1005",
    ownerId: "u-horvath",
    kind: "szoftver",
    name: "Adobe Acrobat Pro",
    version: "2024.002.20933",
    licenseType: "Egyedi előfizetés",
    installedOn: "AOK-PC-0451",
    status: "jovahagyasra_var",
    createdAt: "2026-03-05",
  },
];

/** A beszerezhető termékkatalógusban szereplő eszközmodellek. */
const CATALOG_MODEL_KEYS = new Set(
  INITIAL_PRODUCTS.map((p) => p.modelKey).filter((k): k is string => Boolean(k)),
);

/**
 * Demó leltár: kizárólag eszköz (hardver) tételek, és csak olyan modellek,
 * amelyek szerepelnek a beszerezhető termékek listájában.
 */
export const INVENTORY: InventoryItem[] = ALL_INVENTORY.filter(
  (i) => i.kind === "hardver" && !!i.modelKey && CATALOG_MODEL_KEYS.has(i.modelKey),
);
