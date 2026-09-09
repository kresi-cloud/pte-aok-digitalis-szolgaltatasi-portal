import { EXTRA_PRODUCTS_COMPUTING } from "./product-catalog-extra-computing";
import { EXTRA_PRODUCTS_PERIPHERALS } from "./product-catalog-extra-peripherals";
import type { EmployeeTier, Product, ProductCategory, User } from "./types";

/** Munkavállalói kategóriák rangsora – a magasabb szint mindent lát alatta. */
export const TIER_RANK: Record<EmployeeTier, number> = {
  alkalmazotti: 1,
  vezetoi: 2,
  felsovezetoi: 3,
};

export const TIER_LABELS: Record<EmployeeTier, string> = {
  alkalmazotti: "Alkalmazotti",
  vezetoi: "Vezetői",
  felsovezetoi: "Felsővezetői",
};

export const TIERS: EmployeeTier[] = ["alkalmazotti", "vezetoi", "felsovezetoi"];

/** Alapértelmezett besorolás, ha a felhasználónál nincs külön megadva. */
export function tierOf(user: Pick<User, "employeeTier">): EmployeeTier {
  return user.employeeTier ?? "alkalmazotti";
}

/**
 * Ezekben a termékkörökben érvényesül a munkavállalói besorolás
 * (alkalmazotti/vezetői/felsővezetői); minden más termékkörben
 * besorolástól függetlenül mindenki számára igényelhetők a modellek.
 */
export const TIERED_CATEGORY_IDS: ReadonlySet<string> = new Set([
  "pc-notebook",
  "pc-okostelefon",
  "pc-mobiltelefon",
  "pc-tablet",
]);

export function categoryIsTiered(categoryId: string): boolean {
  return TIERED_CATEGORY_IDS.has(categoryId);
}

/** Látható-e a termék az adott besorolású munkavállaló számára. */
export function productVisibleFor(product: Product, tier: EmployeeTier): boolean {
  if (!product.active) return false;
  if (!categoryIsTiered(product.categoryId)) return true;
  return TIER_RANK[product.tier] <= TIER_RANK[tier];
}

export function visibleProducts(products: Product[], tier: EmployeeTier): Product[] {
  return products.filter((p) => productVisibleFor(p, tier));
}

export function visibleCategories(
  categories: ProductCategory[],
  products: Product[],
  tier: EmployeeTier,
): ProductCategory[] {
  const vis = visibleProducts(products, tier);
  return categories.filter((c) => c.active && vis.some((p) => p.categoryId === c.id));
}

export const INITIAL_PRODUCT_CATEGORIES: ProductCategory[] = [
  { id: "pc-notebook", name: "Notebook", description: "Hordozható munkaállomások oktatói és adminisztratív munkához.", active: true, personalUse: true },
  { id: "pc-desktop", name: "Asztali számítógép", description: "Rögzített munkahelyi konfigurációk.", active: true, personalUse: false },
  { id: "pc-workstation", name: "Workstation", description: "Kutatási, szimulációs és képfeldolgozási feladatokra.", active: true, personalUse: false },
  { id: "pc-okostelefon", name: "Okostelefon", description: "Intézményi mobilkommunikáció, mobilalkalmazások.", active: true, personalUse: true },
  { id: "pc-mobiltelefon", name: "Mobiltelefon", description: "Egyszerű hívás- és SMS-funkciók, terepi használat.", active: true, personalUse: true },
  { id: "pc-tablet", name: "Tablet", description: "Oktatási, betegágy melletti és vizitációs használat.", active: true, personalUse: true },
  { id: "pc-monitor", name: "Kijelző", description: "Monitorok egy- és kétmonitoros munkaállomásokhoz.", active: true },
  { id: "pc-projektor", name: "Projektor", description: "Tantermi és tárgyalótermi vetítés.", active: true },
  { id: "pc-periferia", name: "Perifériák", description: "Dokkolók, billentyűzetek, egerek, headsetek, webkamerák.", active: true },
  { id: "pc-nyomtato", name: "Nyomtató", description: "Munkacsoportos nyomtatás és szkennelés.", active: true },
];

const BASE_PRODUCTS: Product[] = [
  // Notebook
  {
    id: "prod-lenovo-t14-g4",
    categoryId: "pc-notebook",
    name: "Lenovo ThinkPad T14 Gen 4",
    vendor: "Lenovo",
    tier: "alkalmazotti",
    referencePrice: 620000,
    active: true,
    modelKey: "lenovo-thinkpad-t14-g4",
    spec: {
      os: "Windows 11 Pro",
      osVersion: "24H2 (build 26100.1742)",
      cpu: "AMD Ryzen 7 PRO 7840U (8 mag)",
      ram: "16 GB LPDDR5-6400",
      storage: "512 GB NVMe SSD",
      display: "14\" WUXGA IPS, 400 nit",
      battery: "52,5 Wh, kb. 10 óra",
      ports: "2× USB-C (USB4), 2× USB-A, HDMI 2.1, 3,5 mm jack",
      warranty: "3 év helyszíni garancia",
      features: ["TPM 2.0", "BitLocker titkosítás", "IR-kamera (Windows Hello)", "Wi-Fi 6E", "Dokkolható"],
    },
  },
  {
    id: "prod-dell-latitude-5540",
    categoryId: "pc-notebook",
    name: "Dell Latitude 5540 (2023)",
    vendor: "Dell",
    tier: "alkalmazotti",
    referencePrice: 690000,
    active: true,
    modelKey: "dell-latitude-5540",
    spec: {
      os: "Windows 11 Enterprise",
      osVersion: "23H2 (build 22631.4169)",
      cpu: "Intel Core i7-1355U (10 mag)",
      ram: "32 GB DDR5-4800",
      storage: "1 TB NVMe SSD",
      display: "15,6\" FHD IPS, 250 nit",
      battery: "54 Wh, kb. 9 óra",
      ports: "2× Thunderbolt 4, 2× USB-A, HDMI 2.0, RJ-45",
      warranty: "3 év ProSupport",
      features: ["TPM 2.0", "BitLocker titkosítás", "Ujjlenyomat-olvasó", "Wi-Fi 6E", "Docking támogatás"],
    },
  },
  {
    id: "prod-asus-expertbook-b5-g2",
    categoryId: "pc-notebook",
    name: "ASUS ExpertBook B5 G2 (14\" Intel) – Copilot+ PC",
    vendor: "ASUS",
    tier: "alkalmazotti",
    referencePrice: 715000,
    active: true,
    spec: {
      os: "Windows 11 Pro",
      osVersion: "24H2 (build 26100.1742)",
      cpu: "Intel Core Ultra 7 258V (8 mag, 47 TOPS NPU)",
      ram: "32 GB LPDDR5X-8533",
      storage: "1 TB NVMe SSD",
      display: "14\" WUXGA IPS, 400 nit, 16:10",
      battery: "63 Wh, kb. 12 óra",
      ports: "2× Thunderbolt 4, 1× USB-A, HDMI 2.1, RJ-45, 3,5 mm jack",
      warranty: "3 év helyszíni garancia",
      features: [
        "Copilot+ PC (NPU)",
        "TPM 2.0",
        "BitLocker titkosítás",
        "Ujjlenyomat-olvasó",
        "IR-kamera (Windows Hello)",
        "Wi-Fi 7",
        "MIL-STD-810H",
        "Dokkolható",
      ],
    },
  },

  {
    id: "prod-macbook-pro-14-m3",
    categoryId: "pc-notebook",
    name: "Apple MacBook Pro 14\" (M3)",
    vendor: "Apple",
    tier: "vezetoi",
    referencePrice: 1090000,
    active: true,
    modelKey: "macbook-pro-14-m3",
    spec: {
      os: "macOS Sonoma",
      osVersion: "14.6.1",
      cpu: "Apple M3 (8 mag CPU / 10 mag GPU)",
      ram: "18 GB egyesített memória",
      storage: "512 GB SSD",
      display: "14,2\" Liquid Retina XDR, 120 Hz",
      battery: "70 Wh, kb. 15 óra",
      ports: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3",
      warranty: "3 év AppleCare for Enterprise",
      features: ["Secure Enclave", "FileVault titkosítás", "Touch ID", "Neural Engine"],
    },
  },
  {
    id: "prod-macbook-pro-16-m3max",
    categoryId: "pc-notebook",
    name: "Apple MacBook Pro 16\" (M3 Max)",
    vendor: "Apple",
    tier: "felsovezetoi",
    referencePrice: 1890000,
    active: true,
    spec: {
      os: "macOS Sonoma",
      osVersion: "14.6.1",
      cpu: "Apple M3 Max (14 mag CPU / 30 mag GPU)",
      ram: "36 GB egyesített memória",
      storage: "1 TB SSD",
      display: "16,2\" Liquid Retina XDR, 120 Hz",
      battery: "100 Wh, kb. 17 óra",
      ports: "3× Thunderbolt 4, HDMI, SDXC, MagSafe 3",
      warranty: "3 év AppleCare for Enterprise",
      features: ["Secure Enclave", "FileVault titkosítás", "Touch ID", "Reprezentációs használatra alkalmas"],
    },
  },
  // Asztali
  {
    id: "prod-hp-elitedesk-800-g9",
    categoryId: "pc-desktop",
    name: "HP EliteDesk 800 G9 SFF",
    vendor: "HP",
    tier: "alkalmazotti",
    referencePrice: 410000,
    active: true,
    modelKey: "hp-elitedesk-800-g9",
    spec: {
      os: "Windows 11 Enterprise",
      osVersion: "23H2 (build 22631.4169)",
      cpu: "Intel Core i5-13500 (14 mag)",
      ram: "16 GB DDR5-4800",
      storage: "512 GB NVMe SSD",
      display: "Nem tartozék",
      ports: "6× USB-A, 2× USB-C, DisplayPort, HDMI, RJ-45",
      warranty: "3 év helyszíni garancia",
      features: ["TPM 2.0", "vPro távmenedzsment", "BitLocker titkosítás", "Kettős monitor kimenet"],
    },
  },
  // Workstation
  {
    id: "prod-lenovo-p3-linux",
    categoryId: "pc-workstation",
    name: "Lenovo ThinkStation P3 (kutatói konfiguráció)",
    vendor: "Lenovo",
    tier: "alkalmazotti",
    referencePrice: 1450000,
    active: true,
    modelKey: "lenovo-p3-linux",
    spec: {
      os: "Ubuntu LTS",
      osVersion: "24.04.1 LTS (kernel 6.8)",
      cpu: "Intel Core i9-13900K (24 mag)",
      ram: "64 GB DDR5-5600",
      storage: "2 TB NVMe SSD",
      display: "Nem tartozék",
      ports: "8× USB-A, 2× USB-C, 3× DisplayPort, 10 GbE",
      warranty: "3 év helyszíni garancia",
      features: ["NVIDIA RTX 4070 GPU", "CUDA 12.4", "LUKS lemeztitkosítás", "Konténeres futtatókörnyezet"],
    },
  },
  {
    id: "prod-dell-precision-5860",
    categoryId: "pc-workstation",
    name: "Dell Precision 5860 munkaállomás",
    vendor: "Dell",
    tier: "vezetoi",
    referencePrice: 2450000,
    active: true,
    modelKey: "dell-precision-5860",
    spec: {
      os: "Windows 11 Pro for Workstations",
      osVersion: "24H2 (build 26100.1742)",
      cpu: "Intel Xeon w5-2455X (12 mag)",
      ram: "128 GB ECC DDR5",
      storage: "2 TB NVMe SSD + 4 TB HDD",
      display: "Nem tartozék",
      ports: "10× USB-A, 2× USB-C, 4× DisplayPort, 10 GbE",
      warranty: "5 év ProSupport Plus",
      features: ["NVIDIA RTX A4000 GPU", "ECC memória", "TPM 2.0", "GPU-gyorsított képfeldolgozás"],
    },
  },
  // Okostelefon
  {
    id: "prod-xiaomi-redmi-note-15-pro",
    categoryId: "pc-okostelefon",
    name: "Xiaomi Redmi Note 15 Pro 5G 256GB / 8GB RAM",
    vendor: "Xiaomi",
    tier: "alkalmazotti",
    referencePrice: 149000,
    active: true,
    spec: {
      os: "Android (HyperOS)",
      osVersion: "Android 15 / HyperOS 2",
      cpu: "MediaTek Dimensity 7400-Ultra (8 mag)",
      ram: "8 GB LPDDR4X",
      storage: "256 GB UFS 2.2",
      display: "6,83\" AMOLED, 120 Hz, 3200 nit csúcsfényerő",
      battery: "5500 mAh, 45 W gyorstöltés",
      ports: "USB-C 2.0, dual SIM + eSIM",
      warranty: "2 év gyártói garancia",
      features: ["5G", "IP66 por- és vízállóság", "NFC", "Intézményi MDM felügyelet", "Ujjlenyomat-olvasó a kijelzőben"],
    },
  },
  {
    id: "prod-samsung-a56",
    categoryId: "pc-okostelefon",
    name: "Samsung Galaxy A56 5G 128GB",
    vendor: "Samsung",
    tier: "alkalmazotti",
    referencePrice: 169000,
    active: true,
    spec: {
      os: "Android (One UI)",
      osVersion: "Android 15 / One UI 7",
      cpu: "Exynos 1580 (8 mag)",
      ram: "8 GB",
      storage: "128 GB",
      display: "6,7\" Super AMOLED, 120 Hz",
      battery: "5000 mAh, 45 W töltés",
      ports: "USB-C, dual SIM + eSIM",
      warranty: "2 év gyártói garancia",
      features: ["5G", "IP67", "Samsung Knox", "NFC", "MDM felügyelet"],
    },
  },
  {
    id: "prod-iphone-16",
    categoryId: "pc-okostelefon",
    name: "Apple iPhone 16 256GB",
    vendor: "Apple",
    tier: "vezetoi",
    referencePrice: 419000,
    active: true,
    spec: {
      os: "iOS",
      osVersion: "18.6",
      cpu: "Apple A18",
      ram: "8 GB",
      storage: "256 GB",
      display: "6,1\" Super Retina XDR OLED",
      battery: "3561 mAh, kb. 22 óra videólejátszás",
      ports: "USB-C, eSIM",
      warranty: "2 év AppleCare",
      features: ["Face ID", "Secure Enclave", "MDM felügyelet", "IP68"],
    },
  },
  {
    id: "prod-iphone-16-pro",
    categoryId: "pc-okostelefon",
    name: "Apple iPhone 16 Pro 512GB",
    vendor: "Apple",
    tier: "felsovezetoi",
    referencePrice: 749000,
    active: true,
    spec: {
      os: "iOS",
      osVersion: "18.6",
      cpu: "Apple A18 Pro",
      ram: "8 GB",
      storage: "512 GB",
      display: "6,3\" Super Retina XDR OLED, ProMotion 120 Hz",
      battery: "3582 mAh, kb. 27 óra videólejátszás",
      ports: "USB-C (USB 3), eSIM",
      warranty: "2 év AppleCare",
      features: ["Face ID", "Titánház", "MDM felügyelet", "Reprezentációs használatra alkalmas"],
    },
  },
  // Mobiltelefon
  {
    id: "prod-nokia-2660",
    categoryId: "pc-mobiltelefon",
    name: "Nokia 2660 Flip",
    vendor: "Nokia",
    tier: "alkalmazotti",
    referencePrice: 29000,
    active: true,
    spec: {
      os: "S30+",
      osVersion: "gyári firmware",
      cpu: "Unisoc T107",
      ram: "48 MB",
      storage: "128 MB (microSD bővíthető)",
      display: "2,8\" QVGA",
      battery: "1450 mAh, kb. 20 nap készenlét",
      ports: "USB-C, 3,5 mm jack",
      warranty: "2 év gyártói garancia",
      features: ["4G VoLTE", "Nagy gombok", "Vészhívó gomb", "Dual SIM"],
    },
  },
  // Tablet
  {
    id: "prod-ipad-pro-11-m2",
    categoryId: "pc-tablet",
    name: "Apple iPad Pro 11\" (M2) 256GB",
    vendor: "Apple",
    tier: "vezetoi",
    referencePrice: 469000,
    active: true,
    modelKey: "ipad-pro-11-m2",
    spec: {
      os: "iPadOS",
      osVersion: "17.6.1",
      cpu: "Apple M2 (8 mag)",
      ram: "8 GB",
      storage: "256 GB",
      display: "11\" Liquid Retina, 120 Hz",
      battery: "28,65 Wh, kb. 10 óra",
      ports: "Thunderbolt / USB-C, eSIM",
      warranty: "2 év AppleCare",
      features: ["Face ID", "Apple Pencil támogatás", "MDM felügyelet"],
    },
  },
  {
    id: "prod-samsung-tab-a9",
    categoryId: "pc-tablet",
    name: "Samsung Galaxy Tab A9+ 64GB",
    vendor: "Samsung",
    tier: "alkalmazotti",
    referencePrice: 89000,
    active: true,
    spec: {
      os: "Android (One UI)",
      osVersion: "Android 14 / One UI 6",
      cpu: "Snapdragon 695 (8 mag)",
      ram: "4 GB",
      storage: "64 GB (microSD bővíthető)",
      display: "11\" TFT, 90 Hz",
      battery: "7040 mAh",
      ports: "USB-C, 3,5 mm jack",
      warranty: "2 év gyártói garancia",
      features: ["Wi-Fi 5", "Samsung Knox", "MDM felügyelet", "Oktatási használatra"],
    },
  },
  // Kijelző
  {
    id: "prod-dell-p2725h",
    categoryId: "pc-monitor",
    name: "Dell P2725H 27\" FHD monitor",
    vendor: "Dell",
    tier: "alkalmazotti",
    referencePrice: 78000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "27\" IPS, 1920×1080, 100 Hz, 300 nit",
      ports: "HDMI, DisplayPort, USB-C (65 W), 4× USB-A hub",
      warranty: "3 év csereszolgáltatás",
      features: ["Állítható magasságú talp", "Villódzásmentes", "Kékfény-szűrő", "VESA rögzítés"],
    },
  },
  {
    id: "prod-dell-u3223qe",
    categoryId: "pc-monitor",
    name: "Dell UltraSharp U3223QE 32\" 4K",
    vendor: "Dell",
    tier: "vezetoi",
    referencePrice: 289000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "31,5\" IPS Black, 3840×2160, 400 nit",
      ports: "USB-C (90 W), HDMI, DisplayPort, RJ-45, USB hub",
      warranty: "3 év csereszolgáltatás",
      features: ["Beépített dokkoló", "Hálózati csatlakozás", "KVM funkció", "VESA rögzítés"],
    },
  },
  // Projektor
  {
    id: "prod-epson-eb-l260f",
    categoryId: "pc-projektor",
    name: "Epson EB-L260F lézerprojektor",
    vendor: "Epson",
    tier: "alkalmazotti",
    referencePrice: 549000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "1920×1080 (Full HD), 4600 lumen",
      ports: "2× HDMI, VGA, USB-A, RJ-45",
      warranty: "5 év / 12 000 óra",
      features: ["Lézer fényforrás", "Vezeték nélküli vetítés", "Hálózati felügyelet", "Tantermi rögzítés"],
    },
  },
  // Perifériák
  {
    id: "prod-dell-wd19s-dock",
    categoryId: "pc-periferia",
    name: "Dell WD19S dokkoló (130 W)",
    vendor: "Dell",
    tier: "alkalmazotti",
    referencePrice: 84000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "Legfeljebb 2× 4K 60 Hz",
      ports: "USB-C, 2× DisplayPort, HDMI, RJ-45, 5× USB",
      warranty: "3 év",
      features: ["Notebook-töltés 90 W", "Egykábeles munkahely", "Firmware-frissítés központilag"],
    },
  },
  {
    id: "prod-logitech-mk545",
    categoryId: "pc-periferia",
    name: "Logitech MK545 vezeték nélküli billentyűzet + egér",
    vendor: "Logitech",
    tier: "alkalmazotti",
    referencePrice: 26000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "—",
      ports: "USB-A vevőegység (Unifying)",
      warranty: "3 év",
      features: ["Magyar kiosztás", "Csuklótámasz", "Hosszú elemidő"],
    },
  },
  {
    id: "prod-jabra-evolve2-40",
    categoryId: "pc-periferia",
    name: "Jabra Evolve2 40 headset",
    vendor: "Jabra",
    tier: "alkalmazotti",
    referencePrice: 43000,
    active: true,
    spec: {
      os: "—",
      osVersion: "—",
      cpu: "—",
      ram: "—",
      storage: "—",
      display: "—",
      ports: "USB-C",
      warranty: "2 év",
      features: ["Zajszűrő mikrofon", "Microsoft Teams tanúsítvány", "Online oktatáshoz ajánlott"],
    },
  },
  // Nyomtató
  {
    id: "prod-hp-laserjet-m430",
    categoryId: "pc-nyomtato",
    name: "HP LaserJet MFP M430",
    vendor: "HP",
    tier: "alkalmazotti",
    referencePrice: 215000,
    active: true,
    modelKey: "hp-laserjet-m430",
    spec: {
      os: "HP FutureSmart firmware",
      osVersion: "5.6.0.3",
      cpu: "1,2 GHz beágyazott vezérlő",
      ram: "512 MB",
      storage: "8 GB eMMC",
      display: "2,7\" érintőkijelző",
      ports: "RJ-45, USB-A, USB-B",
      warranty: "3 év helyszíni",
      features: ["Hálózati nyomtatás", "Biztonságos PIN-es nyomtatás", "Duplex", "Szkennelés e-mailbe"],
    },
  },
];

/** Minőségi besorolás magyarázata a beszerzői katalógushoz. */
export const TIER_QUALITY_LABELS: Record<EmployeeTier, string> = {
  alkalmazotti: "basic",
  vezetoi: "átlagos",
  felsovezetoi: "prémium",
};

export const INITIAL_PRODUCTS: Product[] = [
  ...BASE_PRODUCTS,
  ...EXTRA_PRODUCTS_COMPUTING,
  ...EXTRA_PRODUCTS_PERIPHERALS,
];
