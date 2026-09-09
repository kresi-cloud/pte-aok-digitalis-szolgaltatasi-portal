/**
 * Eszközkataszter és személyi leltár adatmodell.
 * A relációs modell entitásai: AssetCategories, AssetModels, Assets, AssetAssignments,
 * AssetLocations, AssetTechnicalSpecifications, AssetLifecyclePolicies, AssetLifecycleEvents,
 * AssetWarranties, AssetMaintenanceEvents, AssetInventoryChecks, AssetInventoryDiscrepancies,
 * SoftwareProducts, PersonalSoftwareLicences, SoftwareRenewals, HardwareStandards,
 * ReplacementCandidates/Decisions, ProcurementPlans, ProcurementPlanItems, ReferencePrices,
 * FundingSources, AssetAuditEvents.
 */

export type AssetCategoryKey =
  | "notebook"
  | "asztali"
  | "munkaallomas"
  | "monitor"
  | "tablet"
  | "mobil"
  | "dokkolo"
  | "nyomtato"
  | "periferia"
  | "kutatasi"
  | "egyeb";

export interface AssetCategory {
  key: AssetCategoryKey;
  label: string;
  computerClass: boolean;
  /** Alapértelmezett életciklus-politika kulcsa */
  policyKey: string;
}

/** AssetLifecyclePolicies – szervezeti szinten konfigurálható, nem beégetett szabály */
export interface LifecyclePolicy {
  key: string;
  label: string;
  categoryKey: AssetCategoryKey;
  minYears: number;
  maxYears: number;
  /** tervezéshez használt évszám */
  plannedYears: number;
  note: string;
}

export interface AssetProcessor {
  vendor: string;
  name: string;
  generation: string;
  releaseYear: number;
  cores: number;
}

export interface AssetMemory {
  capacityGb: number;
  type: string;
  generation: string;
  speed: string;
  configuration: string;
}

export interface AssetStorage {
  type: string;
  capacity: string;
  configuration: string;
}

/** AssetTechnicalSpecifications */
export interface AssetTechnicalSpec {
  processor?: AssetProcessor | undefined;
  memory?: AssetMemory | undefined;
  storage?: AssetStorage | undefined;
  os?: string | undefined;
  osVersion?: string | undefined;
  architecture?: string | undefined;
  gpu?: string | undefined;
  display?: string | undefined;
  network?: string | undefined;
  features: string[];
}

/** AssetModels */
export interface AssetModel {
  key: string;
  manufacturer: string;
  model: string;
  categoryKey: AssetCategoryKey;
  standardKey?: string | undefined;
  spec: AssetTechnicalSpec;
  referenceNewPrice: number;
}

export type LifecycleStatus =
  | "uj"
  | "normal"
  | "kozep"
  | "cserere_tervezendo"
  | "cserere_erett"
  | "tamogatasbol_kifutott"
  | "selejtezesre_var"
  | "selejtezett";

export const LIFECYCLE_LABELS: Record<LifecycleStatus, string> = {
  uj: "Új",
  normal: "Normál használat",
  kozep: "Életciklus közepe",
  cserere_tervezendo: "Cserére tervezendő",
  cserere_erett: "Cserére érett",
  tamogatasbol_kifutott: "Támogatásból kifutott",
  selejtezesre_var: "Selejtezésre vár",
  selejtezett: "Selejtezett",
};

export type ReplacementPriority = "kritikus" | "magas" | "kozepes" | "alacsony";

export const PRIORITY_LABELS: Record<ReplacementPriority, string> = {
  kritikus: "Kritikus",
  magas: "Magas",
  kozepes: "Közepes",
  alacsony: "Alacsony",
};

export type AssetUsageType = "szemelyi" | "kozos";

/** AssetLocations */
export type LocationKind = "iroda" | "muhely" | "labor";

export const LOCATION_KIND_LABELS: Record<LocationKind, string> = {
  iroda: "Iroda",
  muhely: "Műhely",
  labor: "Labor",
};

export interface AssetLocation {
  id: string;
  building: string;
  room: string;
  kind: LocationKind;
  orgUnitId: string;
  /** a helyiséghez tartósan rendelt munkatársak */
  primaryUserIds?: string[] | undefined;
}

/** AssetAssignments – hozzárendelés-történet */
export interface AssetAssignment {
  id: string;
  assetId: string;
  userId?: string | undefined;
  orgUnitId: string;
  from: string;
  to?: string | undefined;
  role: "hasznalo" | "leltarfelelos" | "custodian";
  note?: string | undefined;
}

/** AssetLifecycleEvents / AssetMaintenanceEvents */
export interface AssetEvent {
  id: string;
  assetId: string;
  at: string;
  type:
    | "letrehozas"
    | "hozzarendeles"
    | "atadas"
    | "helyvaltozas"
    | "muszaki_adat"
    | "eletciklus"
    | "karbantartas"
    | "javitas"
    | "leltar_ellenorzes"
    | "elteres"
    | "csere_dontes";
  actorId: string;
  title: string;
  detail: string;
  cost?: number | undefined;
}

/** Assets + AssetWarranties (beágyazva) */
export interface Asset {
  id: string;
  /** Leltári szám, pl. PTE-AOK-IT-004582 */
  inventoryNo: string;
  /** Eszközazonosító (hostname / címke) */
  deviceId: string;
  categoryKey: AssetCategoryKey;
  modelKey: string;
  /** a beszerzői katalógus tétele, ha onnan érkezett az eszköz */
  productId?: string | undefined;
  serial: string;
  usage: AssetUsageType;
  /** személyhez rendelt eszköz használója */
  assignedUserId?: string | undefined;
  /** közös eszköz felelőse (leltárfelelős / custodian) */
  custodianUserId?: string | undefined;
  inventoryResponsibleId: string;
  orgUnitId: string;
  locationId: string;
  purpose: string;
  purchaseDate: string;
  commissionDate: string;
  purchaseValue: number;
  fundingSourceId: string;
  costCenter: string;
  warrantyEnd: string;
  /** felülírható életciklus-politika */
  policyKey?: string | undefined;
  /** kézzel felülírt életciklus-vég */
  lifecycleEndOverride?: string | undefined;
  lifecycleStatusOverride?: LifecycleStatus | undefined;
  condition: "kifogastalan" | "jo" | "kopott" | "hibas";
  active: boolean;
  reportedIssues: number;
  repairCount: number;
  businessCritical: boolean;
  note?: string | undefined;
}

/** SoftwareProducts + PersonalSoftwareLicences + SoftwarePurchases + SoftwareRenewals */
export type LicenceStatus =
  | "aktiv"
  | "nem_hasznalt"
  | "lejarathoz_kozel"
  | "lejart"
  | "megujitas_szukseges"
  | "kivezetes_alatt";

export const LICENCE_STATUS_LABELS: Record<LicenceStatus, string> = {
  aktiv: "Aktív",
  nem_hasznalt: "Nem használt",
  lejarathoz_kozel: "Lejárathoz közel",
  lejart: "Lejárt",
  megujitas_szukseges: "Megújítás szükséges",
  kivezetes_alatt: "Kivezetés alatt",
};

export interface SoftwareProduct {
  key: string;
  name: string;
  manufacturer: string;
  category: string;
  /** verzió → támogatás vége */
  supportEnd: Record<string, string>;
}

export interface PersonalSoftwareLicence {
  id: string;
  productKey: string;
  purpose: string;
  version: string;
  licenceType: string;
  assignedUserId: string;
  orgUnitId: string;
  /** érintett munkaállomás (asset id) */
  assetId?: string | undefined;
  purchaseDate: string;
  purchaseValue: number;
  licenceStart: string;
  licenceEnd?: string | undefined;
  renewalDate?: string | undefined;
  annualCost: number;
  fundingSourceId: string;
  costCenter: string;
  statusOverride?: LicenceStatus | undefined;
  reportedUnused?: boolean | undefined;
  softwareOwnerId: string;
  note?: string | undefined;
}

/** HardwareStandards / StandardHardwareProfiles */
export interface HardwareStandard {
  key: string;
  label: string;
  categoryKey: AssetCategoryKey;
  minSpec: { cpuGeneration: number; cores: number; ramGb: number; storage: string };
  preferredSpec: { cpu: string; cores: number; ramGb: number; storage: string };
  lifecycleYears: number;
  referencePriceId: string;
  approvedModels: string[];
  userProfile: string;
  intendedUse: string;
}

/** ReferencePrices + PriceSources */
export type PriceSourceKind = "intezmenyi_beszerzes" | "keretszerzodes" | "tervezoi_ar" | "piaci_becsles";

export const PRICE_SOURCE_LABELS: Record<PriceSourceKind, string> = {
  intezmenyi_beszerzes: "Tényleges intézményi beszerzési ár",
  keretszerzodes: "Keretszerződéses ár",
  tervezoi_ar: "Kézzel rögzített tervezési ár",
  piaci_becsles: "Külső piaci becslés",
};

export interface ReferencePrice {
  id: string;
  label: string;
  categoryKey: AssetCategoryKey;
  netPrice: number;
  vatRate: number;
  priceDate: string;
  validUntil: string;
  source: PriceSourceKind;
  supplier: string;
  note?: string | undefined;
}

export interface FundingSource {
  id: string;
  name: string;
  type: "kari_keret" | "palyazat" | "intezeti" | "kozponti";
}

/** ReplacementDecisions */
export type ReplacementDecisionKey =
  | "csere_szukseges"
  | "csere_javasolt"
  | "felulvizsgalando"
  | "tovabb_hasznalhato"
  | "atcsoportosithato"
  | "selejtezendo";

export const REPLACEMENT_DECISION_LABELS: Record<ReplacementDecisionKey, string> = {
  csere_szukseges: "Csere szükséges",
  csere_javasolt: "Csere javasolt",
  felulvizsgalando: "Felülvizsgálandó",
  tovabb_hasznalhato: "Tovább használható",
  atcsoportosithato: "Átcsoportosítható",
  selejtezendo: "Selejtezendő",
};

export interface ReplacementDecision {
  assetId: string;
  decision: ReplacementDecisionKey;
  decidedBy: string;
  decidedAt: string;
  comment?: string | undefined;
}

/** ProcurementPlans / ProcurementPlanItems / ProcurementQuarters / ProcurementStatuses */
export type Quarter = "Q1" | "Q2" | "Q3" | "Q4";

export const QUARTER_LABELS: Record<Quarter, string> = {
  Q1: "I. negyedév",
  Q2: "II. negyedév",
  Q3: "III. negyedév",
  Q4: "IV. negyedév",
};

export type ProcurementStatus =
  | "tervezett"
  | "jovahagyasra_var"
  | "jovahagyva"
  | "beszerzes_alatt"
  | "teljesult"
  | "elhalasztva";

export const PROCUREMENT_STATUS_LABELS: Record<ProcurementStatus, string> = {
  tervezett: "Tervezett",
  jovahagyasra_var: "Gazdasági jóváhagyásra vár",
  jovahagyva: "Jóváhagyva",
  beszerzes_alatt: "Beszerzés alatt",
  teljesult: "Teljesült",
  elhalasztva: "Elhalasztva",
};

export interface ProcurementPlanItem {
  id: string;
  planYear: number;
  quarter: Quarter;
  orgUnitId: string;
  /** lecserélendő eszközök */
  replacedAssetIds: string[];
  reason: string;
  categoryKey: AssetCategoryKey;
  standardKey: string;
  quantity: number;
  referencePriceId: string;
  /** manuálisan felülírt nettó egységár */
  unitPriceOverride?: number | undefined;
  priceChangePct: number;
  contingencyPct: number;
  quantityDiscountPct: number;
  inflationPct: number;
  priority: ReplacementPriority;
  fundingSourceId: string;
  status: ProcurementStatus;
  comment?: string | undefined;
  /** új kapacitás vagy csere */
  kind: "csere" | "uj_kapacitas";
  /** ha jóváhagyott szolgáltatási igényből keletkezett */
  sourceRequestId?: string | undefined;
  /** a katalógusból igényelt konkrét termék, ha van */
  productId?: string | undefined;
  /** a konkrét eszköz megnevezése (katalógustermék), ha ismert */
  deviceName?: string | undefined;
  /** eszközfelismerési modellkulcs a leltári műszaki adatokhoz */
  modelKey?: string | undefined;
  /** gazdasági vezetői átütemezés nyoma */
  rescheduledBy?: string | undefined;
  rescheduledAt?: string | undefined;
  /** bontás: azonnali vagy negyedéves tervtétel (IT eszközmenedzser állítja be) */
  timing?: "azonnali" | "negyedeves" | undefined;
  /** a beszerző továbbadta az IT eszközmenedzsernek tervezésre */
  handedToPlannerBy?: string | undefined;
  handedToPlannerAt?: string | undefined;
}

/** Terv-jóváhagyási ciklus: azonnali, negyedéves és éves beszerzési terv. */
export type PlanScope = "eves" | "negyedeves" | "azonnali";

export const PLAN_SCOPE_LABELS: Record<PlanScope, string> = {
  eves: "Éves beszerzési terv",
  negyedeves: "Negyedéves beszerzési terv",
  azonnali: "Azonnali beszerzési csomag",
};

/** Jóváhagyási határidő az esedékesség előtt (nap). */
export const PLAN_APPROVAL_LEAD_DAYS: Record<PlanScope, number> = {
  eves: 60,
  negyedeves: 30,
  azonnali: 0,
};

/** A beszerzési terv életútja: eszközmenedzser → gazdasági vezető → beszerző (végrehajtás). */
export type PlanApprovalStatus =
  | "tervezes"
  | "gazdasagi_ellenorzes"
  | "dekani_jovahagyas"
  | "jovahagyva"
  | "visszakuldve"
  | "vegrehajtas"
  /** régi adatokból származó állapot, a gazdasági vezetői jóváhagyással egyenértékű */
  | "jovahagyasra_var";

export const PLAN_APPROVAL_STATUS_LABELS: Record<PlanApprovalStatus, string> = {
  tervezes: "Beszerzői tervezés alatt",
  gazdasagi_ellenorzes: "Gazdasági vezetői ellenőrzés alatt",
  dekani_jovahagyas: "Gazdasági vezetői jóváhagyásra vár",
  jovahagyva: "Jóváhagyva – beszerzőnél",
  visszakuldve: "Átdolgozásra visszaküldve",
  vegrehajtas: "Beszerzés folyamatban",
  jovahagyasra_var: "Gazdasági vezetői jóváhagyásra vár",
};

export interface PlanApprovalEvent {
  at: string;
  actorId: string;
  action: string;
  comment?: string | undefined;
}

export interface PlanApproval {
  id: string;
  scope: PlanScope;
  planYear: number;
  /** csak negyedéves ciklusnál */
  quarter?: Quarter | undefined;
  /** az időszak kezdete (esedékesség) */
  periodStart: string;
  /** jóváhagyási határidő: esedékesség - 30/60 nap */
  dueAt: string;
  status: PlanApprovalStatus;
  submittedBy?: string | undefined;
  submittedAt?: string | undefined;
  reviewedBy?: string | undefined;
  reviewedAt?: string | undefined;
  decidedBy?: string | undefined;
  decidedAt?: string | undefined;
  executionStartedBy?: string | undefined;
  executionStartedAt?: string | undefined;
  comment?: string | undefined;
  history?: PlanApprovalEvent[] | undefined;
}


/** AssetInventoryChecks / AssetInventoryDiscrepancies */
export type PersonalCheckAnswer =
  | "nalam_van_hasznalom"
  | "nalam_van_nem_hasznalom"
  | "nincs_nalam"
  | "adat_hibas"
  | "masik_munkatars"
  | "selejtezesre";

export const PERSONAL_CHECK_LABELS: Record<PersonalCheckAnswer, string> = {
  nalam_van_hasznalom: "Nálam van és használom",
  nalam_van_nem_hasznalom: "Nálam van, de nem használom",
  nincs_nalam: "Nincs nálam",
  adat_hibas: "Az adat hibás",
  masik_munkatars: "Másik munkatárs használja",
  selejtezesre: "Selejtezésre javaslom",
};

export type SharedCheckAnswer =
  | "megtalalhato"
  | "nem_talalhato"
  | "mas_helyen"
  | "nem_mukodik"
  | "selejtezesre_javasolt";

export const SHARED_CHECK_LABELS: Record<SharedCheckAnswer, string> = {
  megtalalhato: "Megtalálható",
  nem_talalhato: "Nem található",
  mas_helyen: "Más helyen található",
  nem_mukodik: "Nem működik",
  selejtezesre_javasolt: "Selejtezésre javasolt",
};

export interface InventoryCheck {
  id: string;
  assetId: string;
  cycle: string;
  userId: string;
  answer: PersonalCheckAnswer | SharedCheckAnswer;
  at: string;
  comment?: string | undefined;
  /** Központi adat → felhasználói ellenőrzés → leltárfelelős → eltéréskezelés → lezárás */
  stage: "felhasznaloi_ellenorzes" | "leltarfelelos_ellenorzes" | "elteres_kezeles" | "lezarva";
}

export type DiscrepancyKind =
  | "hibas_adat"
  | "nincs_nalam"
  | "uj_eszkoz"
  | "szoftver_nem_hasznalt"
  | "eszkoz_hiba";

export const DISCREPANCY_LABELS: Record<DiscrepancyKind, string> = {
  hibas_adat: "Hibás adat jelzése",
  nincs_nalam: "Eszköz nincs nálam",
  uj_eszkoz: "Új eszköz került hozzám",
  szoftver_nem_hasznalt: "Szoftver már nincs használatban",
  eszkoz_hiba: "Eszközhiba bejelentése",
};

export interface InventoryDiscrepancy {
  id: string;
  kind: DiscrepancyKind;
  assetId?: string | undefined;
  licenceId?: string | undefined;
  reportedBy: string;
  at: string;
  description: string;
  status: "nyitott" | "vizsgalat_alatt" | "lezarva" | "elutasitva";
  handledBy?: string | undefined;
  resolution?: string | undefined;
}

/** Eszközfelelősségek – nem összevonhatók egyetlen admin szerepbe */
export interface AssetResponsibilityRow {
  key: string;
  label: string;
  description: string;
  userIds: string[];
}

export interface AssetAuditEvent {
  id: string;
  at: string;
  actorId: string;
  entity:
    | "asset"
    | "licenc"
    | "beszerzes"
    | "leltar"
    | "dontes"
    | "kozlemeny"
    | "termekkor"
    | "termek"
    | "jogosultsag";
  entityId: string;
  action: string;
  detail: string;
}

/** Éves selejtezési javaslat: IT eszközmenedzser készíti, gazdasági vezető hagyja jóvá. */
export type ScrapProposalStatus =
  | "tervezes"
  | "gazdasagi_jovahagyasra_var"
  | "jovahagyva"
  | "visszakuldve";

export const SCRAP_STATUS_LABELS: Record<ScrapProposalStatus, string> = {
  tervezes: "Összeállítás alatt",
  gazdasagi_jovahagyasra_var: "Gazdasági vezetői jóváhagyásra vár",
  jovahagyva: "Gazdasági vezető jóváhagyta",
  visszakuldve: "Átdolgozásra visszaküldve",
};

export interface ScrapProposal {
  id: string;
  year: number;
  title: string;
  reason: string;
  assetIds: string[];
  status: ScrapProposalStatus;
  createdBy: string;
  createdAt: string;
  submittedAt?: string | undefined;
  decidedBy?: string | undefined;
  decidedAt?: string | undefined;
  comment?: string | undefined;
  history?: PlanApprovalEvent[] | undefined;
}
