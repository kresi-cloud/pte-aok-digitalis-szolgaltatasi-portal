export type RoleKey =
  | "igenylo"
  | "jovahagyo"
  | "ugyintezo"
  | "szolgaltatasgazda"
  | "vezeto"
  | "dekan"
  | "admin"
  | "beszerzo"
  | "eszkozmenedzser"
  | "gazdasagi_vezeto"
  | "it_referens";

export const ROLE_LABELS: Record<RoleKey, string> = {
  igenylo: "Igénylő",
  jovahagyo: "Szervezeti jóváhagyó",
  ugyintezo: "Szolgáltatási ügyintéző",
  szolgaltatasgazda: "Szolgáltatásgazda",
  vezeto: "Kari vezető",
  dekan: "Dékán",
  admin: "Admin",
  beszerzo: "Beszerző",
  eszkozmenedzser: "IT eszközmenedzser",
  gazdasagi_vezeto: "Gazdasági vezető",
  it_referens: "Kari IT referens",
};

export const ROLE_DESCRIPTIONS: Record<RoleKey, string> = {
  igenylo: "Igényeket nyújt be, követi a saját ügyeit és leltárát.",
  jovahagyo: "Szervezeti egység nevében hagy jóvá igényeket.",
  ugyintezo: "Igényeket dolgoz fel a szolgáltatási munkatérben.",
  szolgaltatasgazda: "Szolgáltatás- és portfóliófelelős, kapacitás és SLA.",
  vezeto: "Kari szintű mutatókat és portfóliót lát.",
  dekan: "Teljes kari rálátás, bármely ügy eset szintre bontható.",
  admin:
    "Rendszerbeállítások, katalógus, leltárjóváhagyás és a felhasználói jogosultságok kiosztása.",
  beszerzo:
    "Megkapja a jóváhagyott eseti beszerzéseket, kezeli a negyedéves és éves beszerzési terveket.",
  eszkozmenedzser:
    "A beszerzőtől érkező új eszközigényekből eseti és negyedéves beszerzési tervet állít össze, valamint éves selejtezési javaslatot készít.",
  gazdasagi_vezeto:
    "Ellenőrzi és jóváhagyja az eszközmenedzser terveit, ezzel lezárja a tervezési folyamatot, és jóváhagyja az éves selejtezési javaslatot.",
  it_referens:
    "A beérkezett eszközt telepíti, beállítja, rögzíti a gyári számot és a leltárkódot, majd átadja az igénylőnek.",
};


/** Jogosultság-kiosztási naplóbejegyzés (ki, kinek, mit, mikor, miért). */
export interface RoleAuditEvent {
  id: string;
  at: string;
  actorId: string;
  targetUserId: string;
  action: "megadva" | "visszavonva";
  role: RoleKey;
  reason: string;
}

export type DomainKey = "szoftver" | "hardver" | "web" | "digitalizacio";

export interface ServiceDomain {
  key: DomainKey;
  name: string;
  short: string;
  description: string;
  examples: string[];
  prefix: string;
}

export interface OrgUnit {
  id: string;
  name: string;
  type: "hivatal" | "intezet" | "oktatas" | "kutatas" | "klinikai";
  approverUserId?: string | undefined;
  /** Helyettes jóváhagyó – akkor dönt, ha a jóváhagyó maga az igénylő. */
  deputyApproverUserId?: string | undefined;
}


export interface User {
  id: string;
  name: string;
  title: string;
  email: string;
  employeeId: string;
  orgUnitId: string;
  roles: RoleKey[];
  managerId?: string | undefined;
  teamId?: string | undefined;
  initials: string;
  /** Munkavállalói besorolás – meghatározza, mely termékcsomagból igényelhet. */
  employeeTier?: EmployeeTier | undefined;
}

/** Munkavállalói kategóriák a termékkatalógus elérhetőségéhez. */
export type EmployeeTier = "alkalmazotti" | "vezetoi" | "felsovezetoi";

/** Beszerző által kezelt termékkör (kategória). */
export interface ProductCategory {
  id: string;
  name: string;
  description: string;
  active: boolean;
  /** Személyi használatú eszközkör – ilyenkor nem kérdezünk célt és felhasználókat. */
  personalUse?: boolean | undefined;
}

/** Termék technikai adatlapja. */
export interface ProductSpec {
  os: string;
  osVersion: string;
  cpu: string;
  ram: string;
  storage: string;
  display?: string | undefined;
  battery?: string | undefined;
  ports?: string | undefined;
  warranty?: string | undefined;
  features: string[];
}

/** Beszerző által kezelt konkrét eszközmodell. */
export interface Product {
  id: string;
  categoryId: string;
  name: string;
  vendor: string;
  /** Ettől a besorolástól felfelé érhető el a termék. */
  tier: EmployeeTier;
  referencePrice: number;
  active: boolean;
  note?: string | undefined;
  /** Kapcsolat a leltári eszközfelismerési modellhez, ha van. */
  modelKey?: string | undefined;
  spec: ProductSpec;
}

export interface ServiceTeam {
  id: string;
  name: string;
  domain: DomainKey;
  ownerUserId: string;
  members: string[];
}

export interface CatalogItem {
  id: string;
  name: string;
  domain: DomainKey;
  description: string;
  whoCanRequest: string;
  deliveryTime: string;
  approvals: string[];
  requiredInfo: string[];
  teamId: string;
  sla: string;
  keywords: string[];
}

export type StatusKey =
  | "piszkozat"
  | "bekuldve"
  | "elso_ertekeles"
  | "pontositas"
  | "jovahagyasra_var"
  | "elfogadva"
  | "tervezes"
  | "megvalositas"
  | "teszteles"
  | "atadasra_var"
  | "lezarva"
  | "elutasitva"
  | "visszavonva";

export const STATUS_ORDER: StatusKey[] = [
  "piszkozat",
  "bekuldve",
  "elso_ertekeles",
  "pontositas",
  "jovahagyasra_var",
  "elfogadva",
  "tervezes",
  "megvalositas",
  "teszteles",
  "atadasra_var",
  "lezarva",
  "elutasitva",
  "visszavonva",
];

export const STATUS_LABELS: Record<StatusKey, string> = {
  piszkozat: "Piszkozat",
  bekuldve: "Beküldve",
  elso_ertekeles: "Első értékelés",
  pontositas: "Pontosítás szükséges",
  jovahagyasra_var: "Jóváhagyásra vár",
  elfogadva: "Elfogadva",
  tervezes: "Tervezés alatt",
  megvalositas: "Megvalósítás alatt",
  teszteles: "Tesztelés",
  atadasra_var: "Átadásra vár",
  lezarva: "Lezárva",
  elutasitva: "Elutasítva",
  visszavonva: "Visszavonva",
};


export type Priority = "alacsony" | "kozepes" | "magas" | "kritikus";

export interface RequestMessage {
  id: string;
  authorId: string;
  createdAt: string;
  body: string;
  internal: boolean;
}

export interface Approval {
  id: string;
  step: number;
  role: string;
  approverId: string;
  decision: "jovahagyva" | "elutasitva" | "fuggoben" | "pontositas";
  decidedAt?: string | undefined;
  comment?: string | undefined;
}

export interface AuditEvent {
  id: string;
  at: string;
  actorId: string;
  action: string;
  detail: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  uploaderId: string;
}

export interface SubTask {
  id: string;
  title: string;
  assigneeId?: string | undefined;
  done: boolean;
}

export interface AiTriage {
  category: string;
  subtype: string;
  team: string;
  complexity: "egyszerű" | "közepes" | "összetett";
  workflow: string;
  approvalNeeded: boolean;
  duplicateOf?: string | undefined;
  projectCandidate: boolean;
  confidence: number;
}

export interface ServiceRequest {
  id: string;
  title: string;
  domain: DomainKey;
  catalogItemId?: string | undefined;
  goal: string;
  requesterId: string;
  orgUnitId: string;
  teamId?: string | undefined;
  assigneeId?: string | undefined;
  status: StatusKey;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string | undefined;
  estimatedCost?: number | undefined;
  effortDays?: number | undefined;
  nextStep: string;
  users?: string | undefined;
  userCount?: string | undefined;
  personalData?: boolean | undefined;
  integration?: string | undefined;
  recurring?: string | undefined;
  budget?: string | undefined;
  slaRisk?: boolean | undefined;
  projectId?: string | undefined;
  messages: RequestMessage[];
  approvals: Approval[];
  audit: AuditEvent[];
  attachments: Attachment[];
  subtasks: SubTask[];
  ai?: AiTriage | undefined;
  internal?: {
    classification: string;
    dependencies: string;
    procurement: boolean;
    security: string;
    dataProtection: string;
  } | undefined;
  rating?: number | undefined;
  /** Termékkatalógusból választott termékkör azonosítója. */
  productCategoryId?: string | undefined;
  /** Termékkatalógusból választott konkrét termék azonosítója. */
  productId?: string | undefined;
  /** Igényelt darabszám. */
  quantity?: number | undefined;
  /** Személyi használatú eszközigény indoka. */
  requestReason?: RequestReason | undefined;
  /** Az indok szabadszöveges pontosítása. */
  requestReasonNote?: string | undefined;
  /** Cserére/hibára jelölt meglévő leltári eszköz azonosítója. */
  replacedAssetId?: string | undefined;
  /** Munkavégzés helye (épület · helyiség). */
  workLocationId?: string | undefined;
  /** Kért átvételi hely módja. */
  handoverMode?: HandoverMode | undefined;
  /** Eltérő átvételi hely esetén a helyszín azonosítója. */
  handoverLocationId?: string | undefined;
  /** Az igénylő által kért beszerzési ütemezés (negyedév vagy azonnali). */
  requestedQuarter?: RequestedTiming | undefined;
  /** Azonnali beszerzés kérésének indoklása. */
  urgencyReason?: string | undefined;
}

/**
 * Igényelt beszerzési ütemezés: évszámos negyedév (pl. "2027-Q1") vagy azonnali.
 * Visszafelé kompatibilisen a régi, csupasz "Q1".."Q4" értékek is elfogadottak.
 */
export type RequestedTiming = `${number}-${"Q1" | "Q2" | "Q3" | "Q4"}` | "Q1" | "Q2" | "Q3" | "Q4" | "azonnali";

const ROMAN_QUARTER: Record<string, string> = { Q1: "I", Q2: "II", Q3: "III", Q4: "IV" };

/** Az ütemezés megjelenített felirata, pl. "2027. I. negyedév". */
export function requestedTimingLabel(value: string): string {
  if (value === "azonnali") return "Azonnali beszerzés (indoklás szükséges)";
  const [year, q] = value.split("-");
  const roman = q ? ROMAN_QUARTER[q] : undefined;
  if (year && roman) return `${year}. ${roman}. negyedév`;
  // Régi, évszám nélküli érték.
  const legacy = ROMAN_QUARTER[value];
  return legacy ? `${legacy}. negyedév` : value;
}


export type RequestReason =
  | "uj_belepo"
  | "csere"
  | "meghibasodas"
  | "kiegeszito"
  | "nincs_ilyen_eszkoz";

export const REQUEST_REASON_LABELS: Record<RequestReason, string> = {
  uj_belepo: "Új belépő / új munkakör",
  csere: "Meglévő eszköz cseréje (elavult)",
  meghibasodas: "Meghibásodás",
  kiegeszito: "Kiegészítő eszköz meglévő mellé",
  nincs_ilyen_eszkoz: "Jelenleg nincs ilyen eszköze",
};

export type HandoverMode = "munkavegzes" | "eltero" | "ugyfelszolgalat";

export const HANDOVER_MODE_LABELS: Record<HandoverMode, string> = {
  munkavegzes: "A munkavégzés helyén",
  eltero: "Eltérő helyszínen",
  ugyfelszolgalat: "IT ügyfélszolgálaton veszem át",
};

export type ProjectStage =
  | "otlet"
  | "eloszures"
  | "koncepcio"
  | "prioritas"
  | "tervezes"
  | "fejlesztes"
  | "teszteles"
  | "bevezetes"
  | "lezaras";

export const PROJECT_STAGES: { key: ProjectStage; label: string }[] = [
  { key: "otlet", label: "Ötlet" },
  { key: "eloszures", label: "Előszűrés" },
  { key: "koncepcio", label: "Koncepció" },
  { key: "prioritas", label: "Prioritási döntés" },
  { key: "tervezes", label: "Tervezés" },
  { key: "fejlesztes", label: "Fejlesztés" },
  { key: "teszteles", label: "Tesztelés" },
  { key: "bevezetes", label: "Bevezetés" },
  { key: "lezaras", label: "Lezárás" },
];

export interface Project {
  id: string;
  name: string;
  strategicRelevance: "alacsony" | "közepes" | "magas" | "kiemelt";
  ownerId: string;
  sponsorId: string;
  teamId: string;
  stage: ProjectStage;
  benefit: string;
  estimatedCost: number;
  effortDays: number;
  dependencies: string[];
  targetDate: string;
  risk: "alacsony" | "közepes" | "magas";
  orgUnitId: string;
  linkedRequestIds: string[];
}

export interface ResponsibilityRow {
  service: string;
  unit: string;
  ownerId: string;
  team: string;
  approver: string;
  supporting: string;
  sla: string;
  escalation: string;
}

export interface AppNotification {
  id: string;
  requestId?: string | undefined;
  text: string;
  at: string;
  read: boolean;
}

export type InventoryKind = "hardver" | "szoftver";

export type InventoryStatus = "atvetelre_var" | "jovahagyasra_var" | "jovahagyva" | "elutasitva";

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, string> = {
  atvetelre_var: "Átvételre vár",
  jovahagyasra_var: "Jóváhagyásra vár",
  jovahagyva: "Jóváhagyva",
  elutasitva: "Elutasítva",
};

export interface HardwareSpec {
  os: string;
  osVersion: string;
  cpu: string;
  cpuCores: number;
  ram: string;
  storage: string;
  features: string[];
}

export interface InventoryItem {
  id: string;
  ownerId: string;
  kind: InventoryKind;
  name: string;
  /** hardver: modellkulcs a felismerési adatbázisból; szoftver: verzió */
  modelKey?: string | undefined;
  /** hardver: a beszerzői katalógus tétele, ha onnan érkezett az eszköz */
  productId?: string | undefined;
  serial?: string | undefined;
  /** PTE intézményi leltárkód (leltári szám) */
  inventoryNo?: string | undefined;
  location?: string | undefined;
  /** nem mobil eszköz esetén kötelező elhelyezés */
  building?: string | undefined;
  room?: string | undefined;
  note?: string | undefined;
  /** szoftver mezők */
  version?: string | undefined;
  licenseType?: string | undefined;
  licenseKey?: string | undefined;
  installedOn?: string | undefined;
  /** hardver: automatikusan hozzárendelt műszaki adatok */
  spec?: HardwareSpec | undefined;
  status: InventoryStatus;
  createdAt: string;
  decidedAt?: string | undefined;
  decidedBy?: string | undefined;
  decisionComment?: string | undefined;
}

export type AnnouncementLevel = "info" | "figyelmeztetes" | "fontos";

export const ANNOUNCEMENT_LEVEL_LABELS: Record<AnnouncementLevel, string> = {
  info: "Információ",
  figyelmeztetes: "Figyelmeztetés",
  fontos: "Fontos",
};

/** Minden felhasználónak szóló portálhír, lejárati idővel. */
export interface Announcement {
  id: string;
  title: string;
  body: string;
  level: AnnouncementLevel;
  publishedAt: string;
  /** ISO dátum (YYYY-MM-DD); a lejárat napjának végéig látszik */
  expiresAt: string;
  active: boolean;
  createdBy: string;
}

/** Eszközátadás: a beszerzett eszköz útja a beérkezéstől az igénylői átvételig. */
export type HandoverStatus =
  | "beerkezett"
  | "elokeszites_alatt"
  | "atadasra_kesz"
  | "atadva"
  | "atvetel_igazolva";

export const HANDOVER_STATUS_LABELS: Record<HandoverStatus, string> = {
  beerkezett: "Beérkezett a beszerzésből",
  elokeszites_alatt: "Telepítés és beállítás alatt",
  atadasra_kesz: "Átadásra kész",
  atadva: "Átadva – átvételi visszaigazolásra vár",
  atvetel_igazolva: "Átvétel visszaigazolva",
};

export interface HandoverEvent {
  at: string;
  actorId: string;
  action: string;
  comment?: string | undefined;
}

export interface AssetHandover {
  id: string;
  /** a beszerzési tervsor, amelyből az eszköz érkezett */
  planItemId: string;
  /** az eredeti szolgáltatási igény azonosítója, ha volt */
  requestId?: string | undefined;
  /** az átvevő munkatárs */
  recipientId: string;
  orgUnitId: string;
  /** a kari IT referens, aki telepíti és átadja */
  referentId?: string | undefined;
  deviceName: string;
  /** a beszerzői katalógus tétele, amelyből a műszaki adatok származnak */
  productId?: string | undefined;
  /** eszközfelismerési modellkulcs (a műszaki adatok forrása) */
  modelKey?: string | undefined;
  serial?: string | undefined;
  inventoryNo?: string | undefined;
  building?: string | undefined;
  room?: string | undefined;
  installedOs?: string | undefined;
  note?: string | undefined;
  status: HandoverStatus;
  createdAt: string;
  handedOverAt?: string | undefined;
  confirmedAt?: string | undefined;
  /** a létrejött személyi leltártétel azonosítója */
  inventoryItemId?: string | undefined;
  history: HandoverEvent[];
  /** telepítési checklist: lépéskulcs → teljesítve */
  checklist?: Record<string, boolean> | undefined;
  /** csatolt fényképek és dokumentumok (átvételi jegyzőkönyv, számla, fotó) */
  attachments?: HandoverAttachment[] | undefined;
}

/** Kari IT referens telepítési checklist lépése. */
export interface ChecklistStep {
  key: string;
  label: string;
  hint: string;
  /** kötelező-e az átadáshoz */
  required: boolean;
}

export const HANDOVER_CHECKLIST: ChecklistStep[] = [
  {
    key: "kicsomagolas",
    label: "Kicsomagolás és sértetlenség ellenőrzése",
    hint: "Fizikai sérülés, hiányzó tartozék, szállítási kár ellenőrzése.",
    required: true,
  },
  {
    key: "gyari_szam",
    label: "Gyári szám egyeztetése a szállítólevéllel",
    hint: "A készüléken lévő szériaszám megegyezik a beszerzési dokumentummal.",
    required: true,
  },
  {
    key: "leltarkod",
    label: "PTE leltárkód felragasztása",
    hint: "Az intézményi vonalkódos leltárcímke felhelyezve és leolvasható.",
    required: true,
  },
  {
    key: "os_telepites",
    label: "Operációs rendszer telepítése és frissítése",
    hint: "Kari image telepítve, minden elérhető frissítés telepítve.",
    required: true,
  },
  {
    key: "domain",
    label: "Tartományba léptetés és felhasználói profil beállítása",
    hint: "AD-csatlakozás, felhasználói fiók és jogosultságok beállítva.",
    required: true,
  },
  {
    key: "halozat",
    label: "Hálózati hozzáférés ellenőrzése (vezetékes/Wi-Fi/VPN)",
    hint: "Kari hálózat, eduroam és szükség esetén VPN-kapcsolat tesztelve.",
    required: true,
  },
  {
    key: "vedelem",
    label: "Végpontvédelem és titkosítás bekapcsolása",
    hint: "Vírusvédelem aktív, lemeztitkosítás (BitLocker/FileVault) engedélyezve.",
    required: true,
  },
  {
    key: "mentes",
    label: "Mentés és felhőszolgáltatás beállítása",
    hint: "OneDrive/hálózati meghajtó és mentési házirend beállítva.",
    required: false,
  },
  {
    key: "szoftverek",
    label: "Munkakörhöz szükséges szoftverek telepítése",
    hint: "Office, szakmai és licencelt alkalmazások telepítve, licenc rögzítve.",
    required: false,
  },
  {
    key: "adatatvitel",
    label: "Adatátvitel a korábbi eszközről",
    hint: "Felhasználói adatok, profil és beállítások átmásolva, ellenőrizve.",
    required: false,
  },
  {
    key: "oktatas",
    label: "Rövid felhasználói tájékoztatás",
    hint: "Bejelentkezés, mentés, támogatási csatorna ismertetve az átvevővel.",
    required: false,
  },
];

export type HandoverAttachmentKind = "fenykep" | "jegyzokonyv" | "szallitolevel" | "egyeb";

export const ATTACHMENT_KIND_LABELS: Record<HandoverAttachmentKind, string> = {
  fenykep: "Fénykép az eszközről / leltárcímkéről",
  jegyzokonyv: "Átadás-átvételi jegyzőkönyv",
  szallitolevel: "Szállítólevél / számla",
  egyeb: "Egyéb dokumentum",
};

export interface HandoverAttachment {
  id: string;
  kind: HandoverAttachmentKind;
  name: string;
  mimeType: string;
  sizeBytes: number;
  /** data URL (prototípus: böngészőben tárolva) */
  dataUrl: string;
  uploadedBy: string;
  uploadedAt: string;
}

