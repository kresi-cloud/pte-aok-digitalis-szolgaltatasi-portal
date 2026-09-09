import type {
  Announcement,
  AppNotification,
  Approval,
  AuditEvent,
  CatalogItem,
  DomainKey,
  HandoverMode,
  OrgUnit,
  Priority,
  Project,
  RequestMessage,
  RequestReason,
  ResponsibilityRow,
  ServiceDomain,
  ServiceRequest,
  ServiceTeam,
  StatusKey,
  User,
} from "./types";
import { HANDOVER_MODE_LABELS, REQUEST_REASON_LABELS } from "./types";
import { INITIAL_PRODUCTS, INITIAL_PRODUCT_CATEGORIES } from "./product-catalog";
import { ASSET_LOCATIONS } from "./asset-data";


const ALL_DOMAINS: ServiceDomain[] = [
  {
    key: "szoftver",
    name: "Szoftver",
    short: "Szoftver és licenc",
    description:
      "Új szoftver igénylése, hozzáférés meglévő rendszerhez, licenc, telepítés, szakmai alkalmazás.",
    examples: [
      "új szoftver igénylése",
      "hozzáférés meglévő szoftverhez",
      "licencigény",
      "telepítés",
      "rendszerintegráció",
      "szakmai alkalmazás",
    ],
    prefix: "SW",
  },
  {
    key: "hardver",
    name: "Informatikai eszköz",
    short: "Informatikai eszközök és perifériák",
    description:
      "Számítógép, notebook, okostelefon, mobiltelefon, periféria, eszközcsere vagy bővítés.",
    examples: [
      "számítógép",
      "notebook",
      "okostelefon",
      "mobiltelefon",
      "periféria",
      "eszközcsere",
      "bővítés",
    ],
    prefix: "HW",
  },
  {
    key: "web",
    name: "Honlap és webes megjelenés",
    short: "Weboldalak és tartalom",
    description:
      "Új weboldal, meglévő oldal módosítása, tartalom vagy funkció, űrlap, landing page, technikai hiba.",
    examples: [
      "új weboldal",
      "oldal módosítása",
      "új tartalom vagy funkció",
      "tanszéki oldal",
      "űrlap",
      "landing page",
      "technikai probléma",
    ],
    prefix: "WEB",
  },
  {
    key: "digitalizacio",
    name: "Szolgáltatásdigitalizáció és fejlesztés",
    short: "Folyamatok digitalizálása",
    description:
      "Manuális folyamat digitalizálása, belső alkalmazás, workflow, automatizálás, dashboard, riport, AI-megoldás.",
    examples: [
      "manuális folyamat digitalizálása",
      "belső alkalmazás",
      "workflow",
      "automatizálás",
      "adatgyűjtés",
      "dashboard és riport",
      "AI-alapú megoldás",
    ],
    prefix: "DIG",
  },
];

export const ORG_UNITS: OrgUnit[] = [
  {
    id: "ou-dekani",
    name: "Dékáni Hivatal",
    type: "hivatal",
    approverUserId: "u-nagy",
    deputyApproverUserId: "u-feher",
  },
  {
    id: "ou-elettani",
    name: "Élettani Intézet",
    type: "intezet",
    approverUserId: "u-szabo",
    deputyApproverUserId: "u-elettani-h",
  },
  {
    id: "ou-anatomiai",
    name: "Anatómiai Intézet",
    type: "intezet",
    approverUserId: "u-fekete",
    deputyApproverUserId: "u-anatomiai-h",
  },
  {
    id: "ou-biokemiai",
    name: "Biokémiai és Orvosi Kémiai Intézet",
    type: "intezet",
    approverUserId: "u-varga",
    deputyApproverUserId: "u-biokemiai-h",
  },
  {
    id: "ou-farmakologiai",
    name: "Farmakológiai és Farmakoterápiai Intézet",
    type: "intezet",
    approverUserId: "u-toth",
    deputyApproverUserId: "u-farmakologiai-h",
  },
  {
    id: "ou-oktatas",
    name: "Oktatásszervezési Egység",
    type: "oktatas",
    approverUserId: "u-nagy",
    deputyApproverUserId: "u-oktatas-h",
  },
  {
    id: "ou-kutatas",
    name: "Kutatástámogatási Egység",
    type: "kutatas",
    approverUserId: "u-nagy",
    deputyApproverUserId: "u-kutatas-h",
  },
  {
    id: "ou-klinikai",
    name: "Klinikai Központtal együttműködő egységek",
    type: "klinikai",
    approverUserId: "u-fekete",
    deputyApproverUserId: "u-klinikai-h",
  },
  {
    id: "ou-it",
    name: "IT Szolgáltatási Egység",
    type: "hivatal",
    approverUserId: "u-nagy",
    deputyApproverUserId: "u-molnar",
  },
];


export const USERS: User[] = [
  {
    id: "u-kovacs",
    name: "Dr. Csergő A.",
    title: "egyetemi adjunktus",
    email: "csergo.a@aok.pte.hu",
    employeeId: "PTE-104582",
    orgUnitId: "ou-elettani",
    roles: ["igenylo"],
    managerId: "u-szabo",
    initials: "CSA",
  },
  {
    id: "u-szabo",
    name: "Prof. Dr. Vajkai G.",
    title: "intézetigazgató",
    email: "vajkai.g@aok.pte.hu",
    employeeId: "PTE-100211",
    orgUnitId: "ou-elettani",
    roles: ["igenylo", "jovahagyo"],
    initials: "VG",
  },
  {
    id: "u-horvath",
    name: "Zilahi P.",
    title: "szolgáltatási ügyintéző",
    email: "zilahi.p@aok.pte.hu",
    employeeId: "PTE-118904",
    orgUnitId: "ou-dekani",
    roles: ["ugyintezo"],
    teamId: "t-it",
    initials: "ZP",
  },
  {
    id: "u-balogh",
    name: "Bihari E.",
    title: "webfejlesztési munkatárs",
    email: "bihari.e@aok.pte.hu",
    employeeId: "PTE-120334",
    orgUnitId: "ou-dekani",
    roles: ["ugyintezo"],
    teamId: "t-web",
    initials: "BE",
  },
  {
    id: "u-nemeth",
    name: "Dobrossy T.",
    title: "digitalizációs szakértő",
    email: "dobrossy.t@aok.pte.hu",
    employeeId: "PTE-121887",
    orgUnitId: "ou-dekani",
    roles: ["ugyintezo", "szolgaltatasgazda"],
    teamId: "t-dig",
    initials: "DT",
  },
  {
    id: "u-nagy",
    name: "Dr. Ecsedi K.",
    title: "hivatalvezető",
    email: "ecsedi.k@aok.pte.hu",
    employeeId: "PTE-100034",
    orgUnitId: "ou-dekani",
    roles: ["jovahagyo", "vezeto"],
    initials: "EK",
  },
  {
    id: "u-feher",
    name: "Prof. Dr. Rónaszéki L.",
    title: "dékánhelyettes",
    email: "ronaszeki.l@aok.pte.hu",
    employeeId: "PTE-100002",
    orgUnitId: "ou-dekani",
    roles: ["vezeto"],
    initials: "RL",
  },
  {
    id: "u-molnar",
    name: "Tarczali J.",
    title: "admin",
    email: "tarczali.j@aok.pte.hu",
    employeeId: "PTE-115502",
    orgUnitId: "ou-dekani",
    roles: ["admin", "szolgaltatasgazda"],
    teamId: "t-it",
    initials: "TJ",
  },
  {
    id: "u-fekete",
    name: "Dr. Perneczky Zs.",
    title: "intézetigazgató",
    email: "perneczky.zs@aok.pte.hu",
    employeeId: "PTE-100455",
    orgUnitId: "ou-anatomiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "PZS",
  },
  {
    id: "u-varga",
    name: "Dr. Hollósy I.",
    title: "intézetigazgató",
    email: "hollosy.i@aok.pte.hu",
    employeeId: "PTE-100678",
    orgUnitId: "ou-biokemiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "HI",
  },
  {
    id: "u-toth",
    name: "Dr. Kaposvári M.",
    title: "intézetigazgató",
    email: "kaposvari.m@aok.pte.hu",
    employeeId: "PTE-100781",
    orgUnitId: "ou-farmakologiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "KM",
  },
  {
    id: "u-simon",
    name: "Szemerey N.",
    title: "oktatásszervező",
    email: "szemerey.n@aok.pte.hu",
    employeeId: "PTE-119003",
    orgUnitId: "ou-oktatas",
    roles: ["igenylo"],
    managerId: "u-nagy",
    initials: "SZN",
  },
  {
    id: "u-lukacs",
    name: "Bethlendi B.",
    title: "kutatási referens",
    email: "bethlendi.b@aok.pte.hu",
    employeeId: "PTE-119874",
    orgUnitId: "ou-kutatas",
    roles: ["igenylo"],
    managerId: "u-nagy",
    initials: "BB",
  },
  {
    id: "u-farkas",
    name: "Görömbei D.",
    title: "beszerzési referens",
    email: "gorombei.d@aok.pte.hu",
    employeeId: "PTE-117220",
    orgUnitId: "ou-dekani",
    roles: ["ugyintezo", "jovahagyo"],
    teamId: "t-beszerzes",
    initials: "GD",
  },
  {
    id: "u-kiss",
    name: "Vasadi Á.",
    title: "eszközmenedzsment munkatárs",
    email: "vasadi.a@aok.pte.hu",
    employeeId: "PTE-116001",
    orgUnitId: "ou-dekani",
    roles: ["ugyintezo"],
    teamId: "t-hw",
    initials: "VÁ",
  },
  {
    id: "u-dekan",
    name: "Prof. Dr. Malatinszky Á.",
    title: "dékán",
    email: "malatinszky.a@aok.pte.hu",
    employeeId: "PTE-100001",
    orgUnitId: "ou-dekani",
    roles: ["dekan", "vezeto"],
    initials: "MÁ",
  },
  {
    id: "u-beszerzo",
    name: "Csanaki G.",
    title: "beszerzési referens",
    email: "csanaki.g@aok.pte.hu",
    employeeId: "PTE-100006",
    orgUnitId: "ou-dekani",
    roles: ["beszerzo"],
    initials: "CSG",
  },
  {
    id: "u-eszkozmgr",
    name: "Vajkó T.",
    title: "IT eszközmenedzser",
    email: "vajko.t@aok.pte.hu",
    employeeId: "PTE-100004",
    orgUnitId: "ou-it",
    roles: ["eszkozmenedzser"],
    teamId: "t-it",
    initials: "VT",
  },
  {
    id: "u-gazdvez",
    name: "Rákosfalvi I.",
    title: "gazdasági vezető",
    email: "rakosfalvi.i@aok.pte.hu",
    employeeId: "PTE-100003",
    orgUnitId: "ou-dekani",
    roles: ["gazdasagi_vezeto"],
    initials: "RI",
  },
  {
    id: "u-itref",
    name: "Bercsényi L.",
    title: "kari IT referens",
    email: "bercsenyi.l@aok.pte.hu",
    employeeId: "PTE-100005",
    orgUnitId: "ou-it",
    roles: ["it_referens"],
    teamId: "t-it",
    initials: "BL",
  },
  // Helyettes jóváhagyók – az intézetigazgató saját igényéről ők döntenek.
  {
    id: "u-elettani-h",
    name: "Dr. Barlahidai R.",
    title: "igazgatóhelyettes",
    email: "barlahidai.r@aok.pte.hu",
    employeeId: "PTE-100212",
    orgUnitId: "ou-elettani",
    roles: ["igenylo", "jovahagyo"],
    initials: "BR",
  },
  {
    id: "u-anatomiai-h",
    name: "Dr. Somlyai K.",
    title: "igazgatóhelyettes",
    email: "somlyai.k@aok.pte.hu",
    employeeId: "PTE-100456",
    orgUnitId: "ou-anatomiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "SK",
  },
  {
    id: "u-biokemiai-h",
    name: "Dr. Rédei T.",
    title: "igazgatóhelyettes",
    email: "redei.t@aok.pte.hu",
    employeeId: "PTE-100679",
    orgUnitId: "ou-biokemiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "RT",
  },
  {
    id: "u-farmakologiai-h",
    name: "Dr. Ligeti B.",
    title: "igazgatóhelyettes",
    email: "ligeti.b@aok.pte.hu",
    employeeId: "PTE-100782",
    orgUnitId: "ou-farmakologiai",
    roles: ["igenylo", "jovahagyo"],
    initials: "LB",
  },
  {
    id: "u-oktatas-h",
    name: "Dr. Halmágyi É.",
    title: "oktatásszervezési vezető",
    email: "halmagyi.e@aok.pte.hu",
    employeeId: "PTE-119004",
    orgUnitId: "ou-oktatas",
    roles: ["igenylo", "jovahagyo"],
    initials: "HÉ",
  },
  {
    id: "u-kutatas-h",
    name: "Dr. Tabajdi Cs.",
    title: "kutatástámogatási vezető",
    email: "tabajdi.cs@aok.pte.hu",
    employeeId: "PTE-119875",
    orgUnitId: "ou-kutatas",
    roles: ["igenylo", "jovahagyo"],
    initials: "TCS",
  },
  {
    id: "u-klinikai-h",
    name: "Dr. Vörösmarti A.",
    title: "klinikai koordinátor",
    email: "vorosmarti.a@aok.pte.hu",
    employeeId: "PTE-118220",
    orgUnitId: "ou-klinikai",
    roles: ["igenylo", "jovahagyo"],
    initials: "VA",
  },
];


// A portál kizárólag informatikai eszközbeszerzést kezel aktívan;
// a többi terület inaktív csempeként, nem kattinthatóan jelenik meg.
export const DOMAINS: ServiceDomain[] = ALL_DOMAINS.filter((d) => d.key === "hardver");
export { ALL_DOMAINS };

const ALL_TEAMS: ServiceTeam[] = [
  {
    id: "t-it",
    name: "IT szolgáltatások",
    domain: "szoftver",
    ownerUserId: "u-molnar",
    members: ["u-horvath", "u-molnar"],
  },
  {
    id: "t-hw",
    name: "Eszközmenedzsment",
    domain: "hardver",
    ownerUserId: "u-molnar",
    members: ["u-kiss"],
  },
  {
    id: "t-web",
    name: "Web és digitális kommunikáció",
    domain: "web",
    ownerUserId: "u-nemeth",
    members: ["u-balogh"],
  },
  {
    id: "t-dig",
    name: "Digitalizációs csoport",
    domain: "digitalizacio",
    ownerUserId: "u-nemeth",
    members: ["u-nemeth"],
  },
  {
    id: "t-beszerzes",
    name: "Beszerzési támogatás",
    domain: "hardver",
    ownerUserId: "u-nagy",
    members: ["u-farkas"],
  },
];

export const TEAMS: ServiceTeam[] = ALL_TEAMS.filter((t) => t.domain === "hardver");

const ALL_CATALOG: CatalogItem[] = [
  {
    id: "c-m365",
    name: "Microsoft 365 hozzáférés",
    domain: "szoftver",
    description:
      "Egyetemi Microsoft 365 fiók, Teams, OneDrive és Office alkalmazások aktiválása munkatársak részére.",
    whoCanRequest: "Minden aktív munkaviszonyban álló munkatárs",
    deliveryTime: "1–2 munkanap",
    approvals: ["Szervezeti jóváhagyó"],
    requiredInfo: ["Érintett munkatárs neve", "Szervezeti egység", "Szükséges alkalmazások"],
    teamId: "t-it",
    sla: "2 munkanap",
    keywords: ["office", "teams", "onedrive", "email"],
  },
  {
    id: "c-spec-sw",
    name: "Speciális szoftver igénylése",
    domain: "szoftver",
    description:
      "Kutatási vagy oktatási célú szakmai szoftver beszerzése, licenckezeléssel és telepítéssel együtt.",
    whoCanRequest: "Oktatók, kutatók, adminisztratív munkatársak",
    deliveryTime: "5–15 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Beszerzés", "IT szolgáltatásgazda"],
    requiredInfo: ["Szoftver neve", "Felhasználók száma", "Költségkeret", "Felhasználási cél"],
    teamId: "t-it",
    sla: "10 munkanap",
    keywords: ["licenc", "prism", "spss", "kutatás"],
  },
  {
    id: "c-workstation",
    name: "Új munkaállomás",
    domain: "hardver",
    description: "Asztali számítógép igénylése új vagy meglévő munkakörhöz, alapszoftverekkel.",
    whoCanRequest: "Szervezeti egység vezetője vagy megbízottja",
    deliveryTime: "10–25 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Költségkeret-gazda", "IT"],
    requiredInfo: ["Felhasználó", "Munkakör", "Költséghely"],
    teamId: "t-hw",
    sla: "20 munkanap",
    keywords: ["pc", "számítógép", "asztali"],
  },
  {
    id: "c-notebook",
    name: "Notebook igénylés",
    domain: "hardver",
    description: "Hordozható munkaállomás oktatási, kutatási vagy mobilis adminisztratív munkához.",
    whoCanRequest: "Szervezeti egység vezetője vagy megbízottja",
    deliveryTime: "10–25 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Költségkeret-gazda", "IT"],
    requiredInfo: ["Felhasználó", "Használati cél", "Költséghely"],
    teamId: "t-hw",
    sla: "20 munkanap",
    keywords: ["laptop", "hordozható"],
  },
  {
    id: "c-monitor",
    name: "Monitorcsere",
    domain: "hardver",
    description: "Meghibásodott vagy elavult monitor cseréje, illetve második kijelző igénylése.",
    whoCanRequest: "Minden munkatárs",
    deliveryTime: "3–8 munkanap",
    approvals: ["Szervezeti jóváhagyó"],
    requiredInfo: ["Jelenlegi eszköz azonosítója", "Helyszín"],
    teamId: "t-hw",
    sla: "8 munkanap",
    keywords: ["kijelző", "periféria"],
  },
  {
    id: "c-web-mod",
    name: "Tanszéki honlap módosítása",
    domain: "web",
    description: "Meglévő intézeti vagy tanszéki oldal tartalmi, szerkezeti módosítása.",
    whoCanRequest: "Intézeti kommunikációs felelős vagy vezető által megbízott munkatárs",
    deliveryTime: "3–10 munkanap",
    approvals: ["Szervezeti jóváhagyó"],
    requiredInfo: ["Oldal URL", "Kívánt módosítás", "Határidő"],
    teamId: "t-web",
    sla: "10 munkanap",
    keywords: ["honlap", "tartalom", "aloldal"],
  },
  {
    id: "c-web-form",
    name: "Új webes űrlap",
    domain: "web",
    description: "Online jelentkezési, regisztrációs vagy adatbekérő űrlap készítése.",
    whoCanRequest: "Minden munkatárs",
    deliveryTime: "5–12 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Adatvédelmi ellenőrzés"],
    requiredInfo: ["Adatkörök", "Címzettek", "Publikálás helye"],
    teamId: "t-web",
    sla: "12 munkanap",
    keywords: ["űrlap", "regisztráció", "jelentkezés"],
  },
  {
    id: "c-dashboard",
    name: "Dashboard készítése",
    domain: "digitalizacio",
    description: "Vezetői vagy operatív riportfelület kialakítása meglévő adatforrásokból.",
    whoCanRequest: "Vezetők és szervezeti egységek megbízott munkatársai",
    deliveryTime: "15–40 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Szolgáltatásgazda"],
    requiredInfo: ["Adatforrások", "Mutatók", "Felhasználói kör"],
    teamId: "t-dig",
    sla: "30 munkanap",
    keywords: ["riport", "power bi", "kimutatás"],
  },
  {
    id: "c-workflow",
    name: "Automatizált workflow",
    domain: "digitalizacio",
    description: "Jóváhagyási vagy adminisztratív folyamat automatizálása, e-mail helyett rendszerben.",
    whoCanRequest: "Minden munkatárs",
    deliveryTime: "15–35 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Szolgáltatásgazda"],
    requiredInfo: ["Jelenlegi folyamat leírása", "Résztvevők", "Döntési pontok"],
    teamId: "t-dig",
    sla: "30 munkanap",
    keywords: ["automatizálás", "jóváhagyás", "folyamat"],
  },
  {
    id: "c-app",
    name: "Új belső alkalmazás",
    domain: "digitalizacio",
    description: "Egyedi belső alkalmazás fejlesztése, ha meglévő rendszer nem támogatja a folyamatot.",
    whoCanRequest: "Szervezeti egység vezetője",
    deliveryTime: "2–6 hónap",
    approvals: ["Szervezeti jóváhagyó", "Szolgáltatásgazda", "Dékáni Hivatal"],
    requiredInfo: ["Cél", "Felhasználói kör", "Adatkezelés", "Integrációk"],
    teamId: "t-dig",
    sla: "egyedi",
    keywords: ["fejlesztés", "alkalmazás", "projekt"],
  },
  {
    id: "c-adat",
    name: "Adatgyűjtési rendszer",
    domain: "digitalizacio",
    description: "Strukturált adatgyűjtés kialakítása oktatási vagy kutatási célra.",
    whoCanRequest: "Oktatási és kutatási egységek",
    deliveryTime: "20–45 munkanap",
    approvals: ["Szervezeti jóváhagyó", "Adatvédelmi ellenőrzés"],
    requiredInfo: ["Adatkörök", "Jogalap", "Megőrzési idő"],
    teamId: "t-dig",
    sla: "35 munkanap",
    keywords: ["adat", "kérdőív", "gyűjtés"],
  },
  {
    id: "c-ai",
    name: "AI-megoldás vizsgálata",
    domain: "digitalizacio",
    description:
      "Mesterséges intelligenciára épülő megoldás megvalósíthatóságának előzetes vizsgálata.",
    whoCanRequest: "Minden munkatárs",
    deliveryTime: "10–30 munkanap",
    approvals: ["Szolgáltatásgazda", "IT biztonsági ellenőrzés"],
    requiredInfo: ["Felhasználási eset", "Adatérintettség", "Várt haszon"],
    teamId: "t-dig",
    sla: "20 munkanap",
    keywords: ["ai", "mesterséges intelligencia", "gépi tanulás"],
  },
];

let seq = 0;
const uid = (p: string) => `${p}-${++seq}`;

const msg = (
  authorId: string,
  createdAt: string,
  body: string,
  internal = false,
): RequestMessage => ({ id: uid("m"), authorId, createdAt, body, internal });

const audit = (at: string, actorId: string, action: string, detail: string): AuditEvent => ({
  id: uid("a"),
  at,
  actorId,
  action,
  detail,
});

const appr = (
  step: number,
  role: string,
  approverId: string,
  decision: Approval["decision"],
  decidedAt?: string,
  comment?: string,
): Approval => ({ id: uid("ap"), step, role, approverId, decision, decidedAt, comment });

interface Seed {
  id: string;
  title: string;
  domain: DomainKey;
  goal: string;
  requesterId: string;
  orgUnitId: string;
  teamId: string;
  assigneeId?: string;
  status: StatusKey;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  dueDate?: string;
  cost?: number;
  next: string;
  slaRisk?: boolean;
  projectId?: string;
  catalogItemId?: string;
  /** Termékkatalógusból választott eszköz (eszközigénylésnél). */
  productId?: string;
  quantity?: number;
  reason?: RequestReason;
  reasonNote?: string;
  workLocationId?: string;
  handoverMode?: HandoverMode;
}


const seeds: Seed[] = [
  {
    id: "WEB-2026-0142",
    title: "Tanszéki honlap új kutatási aloldala",
    domain: "web",
    goal: "Az Élettani Intézet kutatócsoportjainak bemutatására szeretnénk egy önálló aloldalt, publikációs listával és munkatársi profilokkal.",
    requesterId: "u-kovacs",
    orgUnitId: "ou-elettani",
    teamId: "t-web",
    assigneeId: "u-balogh",
    status: "pontositas",
    priority: "kozepes",
    createdAt: "2026-07-21",
    updatedAt: "2026-08-08",
    dueDate: "2026-09-05",
    cost: 0,
    next: "Az ügyintéző további információt kért a tartalomszerkezetről.",
    catalogItemId: "c-web-mod",
  },
  {
    id: "SW-2026-0087",
    title: "GraphPad Prism licenc",
    domain: "szoftver",
    goal: "Két kutatói munkaállomásra szeretnénk statisztikai elemző szoftvert a publikációs ábrák elkészítéséhez.",
    requesterId: "u-kovacs",
    orgUnitId: "ou-elettani",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "jovahagyasra_var",
    priority: "kozepes",
    createdAt: "2026-07-30",
    updatedAt: "2026-08-06",
    dueDate: "2026-08-28",
    cost: 420000,
    next: "Tanszékvezetői jóváhagyásra vár.",
    catalogItemId: "c-spec-sw",
  },
  {
    id: "DIG-2026-0031",
    title: "Hallgatói jelentkezési folyamat digitalizálása",
    domain: "digitalizacio",
    goal: "A tanszéki továbbképzésekre a jelentkezés jelenleg e-mailben történik. Szeretnénk online felületet, ahol automatikusan készül a résztvevői lista.",
    requesterId: "u-kovacs",
    orgUnitId: "ou-elettani",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "megvalositas",
    priority: "magas",
    createdAt: "2026-04-14",
    updatedAt: "2026-08-09",
    dueDate: "2026-09-15",
    cost: 2400000,
    next: "Fejlesztés folyamatban, első demó 2026. augusztus 25-én.",
    projectId: "p-jelentkezes",
    catalogItemId: "c-workflow",
  },
  {
    id: "HW-2026-0210",
    title: "",
    domain: "hardver",
    goal: "",
    requesterId: "u-szabo",
    orgUnitId: "ou-elettani",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "elfogadva",
    priority: "kozepes",
    createdAt: "2026-07-12",
    updatedAt: "2026-08-04",
    next: "Beszerzési tervsor összeállítása.",
    productId: "prod-dell-latitude-5540",
    reason: "uj_belepo",
    reasonNote: "Az új oktatói munkakör betöltése augusztus végén esedékes.",
    workLocationId: "loc-elettani-1",
    handoverMode: "munkavegzes",
  },
  {
    id: "SW-2026-0091",
    title: "SPSS hozzáférés hallgatói kurzushoz",
    domain: "szoftver",
    goal: "A statisztika kurzus gyakorlati óráihoz 25 gépen szeretnénk elérhetővé tenni az SPSS-t.",
    requesterId: "u-simon",
    orgUnitId: "ou-oktatas",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "megvalositas",
    priority: "magas",
    createdAt: "2026-07-02",
    updatedAt: "2026-08-07",
    dueDate: "2026-08-25",
    cost: 1150000,
    next: "Telepítés ütemezése a géptermekben.",
    slaRisk: true,
    catalogItemId: "c-spec-sw",
  },
  {
    id: "WEB-2026-0151",
    title: "Kari rendezvény landing page",
    domain: "web",
    goal: "Az őszi kari tudományos nap számára önálló bemutató oldalt szeretnénk regisztrációs lehetőséggel.",
    requesterId: "u-lukacs",
    orgUnitId: "ou-kutatas",
    teamId: "t-web",
    assigneeId: "u-balogh",
    status: "tervezes",
    priority: "magas",
    createdAt: "2026-08-01",
    updatedAt: "2026-08-09",
    dueDate: "2026-09-01",
    cost: 0,
    next: "Tartalmi vázlat egyeztetése a szervezőkkel.",
    catalogItemId: "c-web-form",
  },
  {
    id: "HW-2026-0198",
    title: "",
    domain: "hardver",
    goal: "Két elavult, villódzó monitor cseréje az intézeti oktatói szobában.",
    requesterId: "u-fekete",
    orgUnitId: "ou-anatomiai",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "lezarva",
    priority: "alacsony",
    createdAt: "2026-06-11",
    updatedAt: "2026-06-28",
    next: "Lezárva, eszközök átadva.",
    productId: "prod-dell-p2725h",
    quantity: 2,
  },
  {
    id: "DIG-2026-0034",
    title: "Kutatási eszköznyilvántartás",
    domain: "digitalizacio",
    goal: "Szeretnénk látni, hol vannak a nagy értékű kutatási eszközök és mikor esedékes a következő kalibrálásuk.",
    requesterId: "u-lukacs",
    orgUnitId: "ou-kutatas",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "tervezes",
    priority: "kozepes",
    createdAt: "2026-05-20",
    updatedAt: "2026-08-05",
    dueDate: "2026-11-30",
    cost: 3800000,
    next: "Koncepció véglegesítése, adatgazdák kijelölése.",
    projectId: "p-eszkoz",
    catalogItemId: "c-app",
  },
  {
    id: "SW-2026-0102",
    title: "Laborinformatikai rendszer integrációja",
    domain: "szoftver",
    goal: "A laboreredmények jelenleg kézzel kerülnek át a kutatási adatbázisba, ezt szeretnénk automatikussá tenni.",
    requesterId: "u-varga",
    orgUnitId: "ou-biokemiai",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "elso_ertekeles",
    priority: "magas",
    createdAt: "2026-08-05",
    updatedAt: "2026-08-09",
    dueDate: "2026-10-15",
    cost: 0,
    next: "Szolgáltatási besorolás és felelős kijelölése.",
  },
  {
    id: "HW-2026-0221",
    title: "",
    domain: "hardver",
    goal: "A hivatali iroda jelenlegi nyomtatója nem bírja a féléves adminisztrációs terhelést.",
    requesterId: "u-simon",
    orgUnitId: "ou-oktatas",
    teamId: "t-hw",
    status: "bekuldve",
    priority: "alacsony",
    createdAt: "2026-08-08",
    updatedAt: "2026-08-08",
    next: "Beérkezett igény feldolgozásra vár.",
    productId: "prod-hp-laserjet-m430",
  },
  {
    id: "WEB-2026-0156",
    title: "Intézeti oldal technikai hibája",
    domain: "web",
    goal: "Az intézeti oldal munkatársi listája mobilon nem jelenik meg helyesen.",
    requesterId: "u-toth",
    orgUnitId: "ou-farmakologiai",
    teamId: "t-web",
    assigneeId: "u-balogh",
    status: "teszteles",
    priority: "kozepes",
    createdAt: "2026-07-28",
    updatedAt: "2026-08-08",
    dueDate: "2026-08-14",
    cost: 0,
    next: "Javítás tesztelés alatt.",
  },
  {
    id: "DIG-2026-0038",
    title: "Tanszéki dokumentumjóváhagyási workflow",
    domain: "digitalizacio",
    goal: "A belső szabályzatok jóváhagyása papíron zajlik, szeretnénk elektronikus jóváhagyási utat.",
    requesterId: "u-fekete",
    orgUnitId: "ou-anatomiai",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "jovahagyasra_var",
    priority: "kozepes",
    createdAt: "2026-07-15",
    updatedAt: "2026-08-03",
    dueDate: "2026-12-01",
    cost: 2900000,
    next: "Szolgáltatásgazdai jóváhagyásra vár.",
    projectId: "p-dokumentum",
  },
  {
    id: "SW-2026-0110",
    title: "Microsoft 365 hozzáférés új munkatársnak",
    domain: "szoftver",
    goal: "Új adminisztratív kollégának szükséges a levelezés és a Teams elérése.",
    requesterId: "u-simon",
    orgUnitId: "ou-oktatas",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "lezarva",
    priority: "kozepes",
    createdAt: "2026-07-24",
    updatedAt: "2026-07-26",
    dueDate: "2026-07-28",
    cost: 0,
    next: "Lezárva.",
    catalogItemId: "c-m365",
  },
  {
    id: "HW-2026-0233",
    title: "",
    domain: "hardver",
    goal: "A titkársági gép hét éves, lassú, a napi ügyintézést akadályozza.",
    requesterId: "u-varga",
    orgUnitId: "ou-biokemiai",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "jovahagyasra_var",
    priority: "kozepes",
    createdAt: "2026-08-02",
    updatedAt: "2026-08-07",
    next: "Szervezeti jóváhagyásra vár.",
    productId: "prod-hp-elitedesk-800-g9",
  },
  {
    id: "DIG-2026-0041",
    title: "Oktatási dashboard a dékánhelyettesi területnek",
    domain: "digitalizacio",
    goal: "Szeretnénk egy helyen látni a kurzuslétszámokat, vizsgaeredményeket és oktatói terhelést.",
    requesterId: "u-nagy",
    orgUnitId: "ou-dekani",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "megvalositas",
    priority: "magas",
    createdAt: "2026-03-10",
    updatedAt: "2026-08-06",
    dueDate: "2026-10-01",
    cost: 4200000,
    next: "Adatforrások összekötése folyamatban.",
    projectId: "p-oktatasi-dashboard",
    catalogItemId: "c-dashboard",
  },
  {
    id: "WEB-2026-0160",
    title: "Új webes űrlap kutatási együttműködésekhez",
    domain: "web",
    goal: "A külső partnerek jelenleg e-mailben jeleznek együttműködési szándékot, ezt szeretnénk strukturáltan gyűjteni.",
    requesterId: "u-lukacs",
    orgUnitId: "ou-kutatas",
    teamId: "t-web",
    status: "bekuldve",
    priority: "kozepes",
    createdAt: "2026-08-09",
    updatedAt: "2026-08-09",
    next: "Beérkezett igény feldolgozásra vár.",
    catalogItemId: "c-web-form",
  },
  {
    id: "SW-2026-0115",
    title: "Kutatási adatbázis hozzáférés bővítése",
    domain: "szoftver",
    goal: "Három doktorandusz számára kérünk hozzáférést a meglévő kutatási adatbázishoz.",
    requesterId: "u-varga",
    orgUnitId: "ou-biokemiai",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "atadasra_var",
    priority: "kozepes",
    createdAt: "2026-07-19",
    updatedAt: "2026-08-08",
    dueDate: "2026-08-12",
    cost: 0,
    next: "Hozzáférések elkészültek, átvételre várnak.",
  },
  {
    id: "HW-2026-0240",
    title: "Prezentációs eszköz a szemináriumi terembe",
    domain: "hardver",
    goal: "A szemináriumi teremben nincs megfelelő vetítési lehetőség a kiscsoportos oktatáshoz.",
    requesterId: "u-toth",
    orgUnitId: "ou-farmakologiai",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "pontositas",
    priority: "kozepes",
    createdAt: "2026-07-27",
    updatedAt: "2026-08-05",
    dueDate: "2026-09-10",
    cost: 350000,
    next: "Terem paramétereinek pontosítása szükséges.",
    slaRisk: true,
  },
  {
    id: "DIG-2026-0044",
    title: "Kari rendezvény-regisztrációs rendszer",
    domain: "digitalizacio",
    goal: "Egységes regisztrációs és jelenléti rendszert szeretnénk a kari rendezvényekhez.",
    requesterId: "u-nagy",
    orgUnitId: "ou-dekani",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "elso_ertekeles",
    priority: "kozepes",
    createdAt: "2026-08-04",
    updatedAt: "2026-08-08",
    cost: 0,
    next: "Előszűrés és portfólióba emelés vizsgálata.",
    projectId: "p-rendezveny",
  },
  {
    id: "SW-2026-0120",
    title: "Elektronikus aláírás bevezetése a hivatalban",
    domain: "szoftver",
    goal: "A belső dokumentumok aláírását szeretnénk elektronikusan intézni.",
    requesterId: "u-nagy",
    orgUnitId: "ou-dekani",
    teamId: "t-it",
    status: "bekuldve",
    priority: "magas",
    createdAt: "2026-08-09",
    updatedAt: "2026-08-09",
    next: "Beérkezett igény feldolgozásra vár.",
  },
  {
    id: "WEB-2026-0133",
    title: "Intézeti oldal arculati frissítése",
    domain: "web",
    goal: "Az intézeti oldal megjelenése eltér az új kari arculattól.",
    requesterId: "u-fekete",
    orgUnitId: "ou-anatomiai",
    teamId: "t-web",
    assigneeId: "u-balogh",
    status: "lezarva",
    priority: "alacsony",
    createdAt: "2026-05-06",
    updatedAt: "2026-06-18",
    dueDate: "2026-06-20",
    cost: 0,
    next: "Lezárva, átadva.",
  },
  {
    id: "HW-2026-0180",
    title: "",
    domain: "hardver",
    goal: "Billentyűzet- és egérkészletek pótlása az oktatási gépteremben.",
    requesterId: "u-simon",
    orgUnitId: "ou-oktatas",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "lezarva",
    priority: "alacsony",
    createdAt: "2026-04-22",
    updatedAt: "2026-05-14",
    next: "Lezárva.",
    productId: "prod-logitech-mk545",
    quantity: 8,
  },
  {
    id: "DIG-2026-0026",
    title: "Klinikai oktatási adatgyűjtés",
    domain: "digitalizacio",
    goal: "A klinikai gyakorlatok visszajelzéseit strukturáltan szeretnénk gyűjteni és elemezni.",
    requesterId: "u-toth",
    orgUnitId: "ou-klinikai",
    teamId: "t-dig",
    assigneeId: "u-nemeth",
    status: "teszteles",
    priority: "magas",
    createdAt: "2026-02-18",
    updatedAt: "2026-08-07",
    dueDate: "2026-08-31",
    cost: 3100000,
    next: "Felhasználói tesztelés a klinikai oktatókkal.",
    projectId: "p-klinikai",
    catalogItemId: "c-adat",
  },
  {
    id: "SW-2026-0075",
    title: "Nem támogatott szoftver telepítési kérelme",
    domain: "szoftver",
    goal: "Egy régi, gyártói támogatás nélküli elemzőprogram telepítését kértük.",
    requesterId: "u-fekete",
    orgUnitId: "ou-anatomiai",
    teamId: "t-it",
    assigneeId: "u-horvath",
    status: "elutasitva",
    priority: "alacsony",
    createdAt: "2026-06-02",
    updatedAt: "2026-06-12",
    cost: 0,
    next: "Elutasítva IT biztonsági okból, alternatíva javasolva.",
  },
  {
    id: "DIG-2026-0048",
    title: "AI-alapú kurzusvisszajelzés összegzés",
    domain: "digitalizacio",
    goal: "A szöveges hallgatói visszajelzések feldolgozása hetekig tart, gépi összegzést szeretnénk.",
    requesterId: "u-simon",
    orgUnitId: "ou-oktatas",
    teamId: "t-dig",
    status: "bekuldve",
    priority: "kozepes",
    createdAt: "2026-08-10",
    updatedAt: "2026-08-10",
    next: "Beérkezett igény feldolgozásra vár.",
    catalogItemId: "c-ai",
  },
  {
    id: "HW-2026-0245",
    title: "",
    domain: "hardver",
    goal: "A kutatási képelemzéshez nagy memóriájú, dedikált GPU-val szerelt munkaállomásra van szükség.",
    requesterId: "u-lukacs",
    orgUnitId: "ou-kutatas",
    teamId: "t-hw",
    assigneeId: "u-kiss",
    status: "tervezes",
    priority: "magas",
    createdAt: "2026-07-31",
    updatedAt: "2026-08-09",
    next: "Beszerzési tervsor gazdasági ellenőrzése.",
    productId: "prod-lenovo-p3-linux",
  },
  {
    id: "HW-2026-0252",
    title: "",
    domain: "hardver",
    goal: "",
    requesterId: "u-toth",
    orgUnitId: "ou-farmakologiai",
    teamId: "t-hw",
    status: "bekuldve",
    priority: "kozepes",
    createdAt: "2026-08-11",
    updatedAt: "2026-08-11",
    next: "Beérkezett igény feldolgozásra vár.",
    productId: "prod-samsung-a56",
    reason: "nincs_ilyen_eszkoz",
    workLocationId: "loc-farmakologiai-1",
    handoverMode: "ugyfelszolgalat",
  },
];

/** Eszközigénylés szövegei a termékkatalógus alapján – az űrlappal azonos formátumban. */
function hwDetails(s: Seed) {
  const product = INITIAL_PRODUCTS.find((p) => p.id === s.productId);
  if (!product) return null;
  const category = INITIAL_PRODUCT_CATEGORIES.find((c) => c.id === product.categoryId);
  const personalUse = category?.personalUse === true;
  const qty = personalUse ? 1 : Math.max(1, s.quantity ?? 1);
  const loc = (id?: string) => {
    const l = ASSET_LOCATIONS.find((x) => x.id === id);
    return l ? `${l.building} · ${l.room}` : "Nincs megadva";
  };
  const handoverLabel =
    s.handoverMode === "ugyfelszolgalat"
      ? HANDOVER_MODE_LABELS.ugyfelszolgalat
      : `${HANDOVER_MODE_LABELS.munkavegzes} – ${loc(s.workLocationId)}`;
  const title = `${category?.name ?? "Eszköz"} igénylés – ${product.name}${qty > 1 ? ` (${qty} db)` : ""}`;
  const goal = [
    `Igényelt eszköz: ${product.name} (${product.vendor}), ${qty} db.`,
    `Termékkör: ${category?.name ?? "—"}.`,
    `Konfiguráció: ${product.spec.cpu} · ${product.spec.ram} · ${product.spec.storage} · ${product.spec.os} ${product.spec.osVersion}.`,
    ...(personalUse
      ? [
          s.reason ? `Igénylés indoka: ${REQUEST_REASON_LABELS[s.reason]}` : "",
          s.reasonNote ? `Kiegészítés: ${s.reasonNote}` : "",
          s.workLocationId ? `Munkavégzés helye: ${loc(s.workLocationId)}` : "",
          `Kért átvételi hely: ${handoverLabel}`,
        ]
      : [s.goal ? `Indoklás: ${s.goal}` : ""]),
  ]
    .filter(Boolean)
    .join("\n");
  return { product, category, personalUse, qty, title, goal, cost: product.referencePrice * qty };
}

function buildRequest(s: Seed): ServiceRequest {
  const hw = hwDetails(s);
  const cost = hw ? hw.cost : s.cost;
  const goalText = hw ? hw.goal : s.goal;
  const unit = ORG_UNITS.find((o) => o.id === s.orgUnitId)!;
  // Önjóváhagyás elkerülése: ha az egység jóváhagyója maga az igénylő, a helyettes dönt.
  const approverId =
    (unit.approverUserId === s.requesterId
      ? (unit.deputyApproverUserId ?? "u-nagy")
      : unit.approverUserId) ?? "u-nagy";

  const approvals: Approval[] = [];
  const closedish = ["elfogadva", "tervezes", "megvalositas", "teszteles", "atadasra_var", "lezarva"];
  if (s.status === "jovahagyasra_var") {
    approvals.push(appr(1, "Szervezeti jóváhagyó", approverId, "fuggoben"));
    approvals.push(appr(2, "Szolgáltatásgazda", "u-nemeth", "fuggoben"));
  } else if (closedish.includes(s.status)) {
    approvals.push(
      appr(1, "Szervezeti jóváhagyó", approverId, "jovahagyva", s.createdAt, "Támogatom."),
    );
    approvals.push(appr(2, "Szolgáltatásgazda", "u-nemeth", "jovahagyva", s.updatedAt));
    if ((cost ?? 0) > 500000) {
      approvals.push(appr(3, "Költségkeret-gazda", "u-farkas", "jovahagyva", s.updatedAt));
    }
  } else if (s.status === "elutasitva") {
    approvals.push(
      appr(1, "Szervezeti jóváhagyó", approverId, "jovahagyva", s.createdAt),
      appr(2, "IT szolgáltatásgazda", "u-molnar", "elutasitva", s.updatedAt, "Biztonsági kockázat."),
    );
  }

  const messages: RequestMessage[] = [
    msg(s.requesterId, s.createdAt, goalText),
  ];
  if (s.assigneeId) {
    messages.push(
      msg(
        s.assigneeId,
        s.updatedAt,
        s.status === "pontositas"
          ? "Köszönjük az igényt. Kérjük, pontosítsa a szükséges részleteket, hogy pontos becslést tudjunk adni."
          : `Az igényt átvettük, jelenlegi állapot: ${s.next}`,
      ),
      msg(
        s.assigneeId,
        s.updatedAt,
        "Belső: hasonló igény érkezett korábban ugyanettől a szervezeti egységtől, érdemes összevonni a megvalósítást.",
        true,
      ),
    );
  }

  const auditTrail: AuditEvent[] = [
    audit(s.createdAt, s.requesterId, "Igény beküldése", `${s.id} létrehozva`),
    audit(s.createdAt, "u-system", "Besorolás", `AI javaslat: ${s.domain} szolgáltatási terület`),
  ];
  if (s.assigneeId)
    auditTrail.push(audit(s.updatedAt, "u-horvath", "Felelős kijelölése", `Felelős: ${s.assigneeId}`));
  auditTrail.push(audit(s.updatedAt, s.assigneeId ?? "u-horvath", "Státuszváltás", s.status));

  return {
    id: s.id,
    title: hw ? hw.title : s.title,
    domain: s.domain,
    catalogItemId: s.catalogItemId,
    goal: goalText,
    productCategoryId: hw?.category?.id,
    productId: hw?.product.id,
    quantity: hw?.qty,
    requestReason: hw?.personalUse ? s.reason : undefined,
    requestReasonNote: hw?.personalUse ? s.reasonNote : undefined,
    workLocationId: hw?.personalUse ? s.workLocationId : undefined,
    handoverMode: hw?.personalUse ? s.handoverMode : undefined,
    requesterId: s.requesterId,
    orgUnitId: s.orgUnitId,
    teamId: s.teamId,
    assigneeId: s.assigneeId,
    status: s.status,
    priority: s.priority,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
    dueDate: s.dueDate,
    estimatedCost: cost,
    effortDays: cost ? Math.max(2, Math.round(cost / 150000)) : 3,
    nextStep: s.next,
    users: hw?.personalUse ? "Igénylő személyes használat" : "Intézeti munkatársak",
    userCount: hw?.personalUse ? "1 fő" : "1–10 fő",
    personalData: false,
    integration: "Nem szükséges",
    recurring: "Egyszeri igény",
    budget: cost ? `${(cost / 1000).toLocaleString("hu-HU")} eFt keret` : "Nincs megadva",
    slaRisk: s.slaRisk,
    projectId: s.projectId,
    messages,
    approvals,
    audit: auditTrail,
    attachments:
      s.domain === "hardver"
        ? [
            {
              id: uid("f"),
              name: "arajanlat.pdf",
              size: "218 KB",
              uploadedAt: s.updatedAt,
              uploaderId: s.requesterId,
            },
          ]
        : [],
    subtasks: s.assigneeId
      ? [
          { id: uid("st"), title: "Igény felmérése", assigneeId: s.assigneeId, done: true },
          {
            id: uid("st"),
            title: "Megoldási javaslat elkészítése",
            assigneeId: s.assigneeId,
            done: ["megvalositas", "teszteles", "atadasra_var", "lezarva"].includes(s.status),
          },
          { id: uid("st"), title: "Átadás és dokumentálás", done: s.status === "lezarva" },
        ]
      : [],
    ai: {
      category: DOMAINS.find((d) => d.key === s.domain)!.name,
      subtype:
        s.domain === "digitalizacio"
          ? "Folyamatdigitalizáció"
          : s.domain === "web"
            ? "Tartalmi módosítás"
            : s.domain === "hardver"
              ? "Eszközigény"
              : "Licenc és hozzáférés",
      team: TEAMS.find((t) => t.id === s.teamId)!.name,
      complexity:
        (cost ?? 0) > 2000000 ? "összetett" : (cost ?? 0) > 300000 ? "közepes" : "egyszerű",
      workflow:
        (cost ?? 0) > 500000
          ? "Igénylő → szervezeti jóváhagyó → költségkeret-gazda → szolgáltatásgazda"
          : "Igénylő → szervezeti jóváhagyó → szolgáltatási csapat",
      approvalNeeded: (cost ?? 0) > 0,
      projectCandidate: (cost ?? 0) > 2000000,
      confidence: 0.72 + ((s.id.length * 7) % 20) / 100,
    },
    internal: {
      classification: `${DOMAINS.find((d) => d.key === s.domain)!.name} / ${s.priority}`,
      dependencies:
        s.projectId ? "Kapcsolódik egy futó fejlesztési kezdeményezéshez." : "Nincs ismert függőség.",
      procurement: (cost ?? 0) > 300000,
      security: s.domain === "szoftver" ? "IT biztonsági ellenőrzés szükséges" : "Nem érintett",
      dataProtection:
        s.domain === "digitalizacio" || s.domain === "web"
          ? "Adatvédelmi hatásvizsgálat mérlegelendő"
          : "Nem érintett",
    },
    rating: s.status === "lezarva" ? 4 + (s.id.charCodeAt(5) % 2) : undefined,
  };
}

export const CATALOG: CatalogItem[] = ALL_CATALOG.filter((c) => c.domain === "hardver");

export const REQUESTS: ServiceRequest[] = seeds
  .filter((s) => s.domain === "hardver")
  .map(buildRequest);

const ALL_PROJECTS: Project[] = [
  {
    id: "p-jelentkezes",
    name: "Hallgatói jelentkezési folyamat digitalizálása",
    strategicRelevance: "kiemelt",
    ownerId: "u-nemeth",
    sponsorId: "u-feher",
    teamId: "t-dig",
    stage: "fejlesztes",
    benefit: "Évi kb. 400 munkaóra megtakarítás, átlátható jelentkezői adatok.",
    estimatedCost: 2400000,
    effortDays: 45,
    dependencies: ["Microsoft 365", "Neptun adatkapcsolat"],
    targetDate: "2026-09-15",
    risk: "közepes",
    orgUnitId: "ou-elettani",
    linkedRequestIds: ["DIG-2026-0031"],
  },
  {
    id: "p-eszkoz",
    name: "Kutatási eszköznyilvántartás",
    strategicRelevance: "magas",
    ownerId: "u-nemeth",
    sponsorId: "u-nagy",
    teamId: "t-dig",
    stage: "koncepcio",
    benefit: "Nagy értékű eszközök kihasználtságának és kalibrálásának követése.",
    estimatedCost: 3800000,
    effortDays: 70,
    dependencies: ["Gazdasági rendszer", "Leltár adatok"],
    targetDate: "2026-11-30",
    risk: "magas",
    orgUnitId: "ou-kutatas",
    linkedRequestIds: ["DIG-2026-0034"],
  },
  {
    id: "p-dokumentum",
    name: "Tanszéki dokumentumjóváhagyási workflow",
    strategicRelevance: "közepes",
    ownerId: "u-nemeth",
    sponsorId: "u-nagy",
    teamId: "t-dig",
    stage: "prioritas",
    benefit: "Papírmentes belső jóváhagyás, követhető döntések.",
    estimatedCost: 2900000,
    effortDays: 55,
    dependencies: ["Dokumentumkezelés", "Elektronikus aláírás"],
    targetDate: "2026-12-01",
    risk: "közepes",
    orgUnitId: "ou-anatomiai",
    linkedRequestIds: ["DIG-2026-0038"],
  },
  {
    id: "p-rendezveny",
    name: "Kari rendezvény-regisztráció",
    strategicRelevance: "közepes",
    ownerId: "u-balogh",
    sponsorId: "u-nagy",
    teamId: "t-web",
    stage: "eloszures",
    benefit: "Egységes regisztráció és jelenléti kimutatás kari rendezvényekre.",
    estimatedCost: 1600000,
    effortDays: 30,
    dependencies: ["Kari honlap"],
    targetDate: "2027-02-28",
    risk: "alacsony",
    orgUnitId: "ou-dekani",
    linkedRequestIds: ["DIG-2026-0044"],
  },
  {
    id: "p-oktatasi-dashboard",
    name: "Oktatási dashboard",
    strategicRelevance: "kiemelt",
    ownerId: "u-nemeth",
    sponsorId: "u-feher",
    teamId: "t-dig",
    stage: "fejlesztes",
    benefit: "Vezetői döntéstámogatás kurzus- és terhelési adatokból.",
    estimatedCost: 4200000,
    effortDays: 80,
    dependencies: ["Neptun", "Power BI"],
    targetDate: "2026-10-01",
    risk: "közepes",
    orgUnitId: "ou-dekani",
    linkedRequestIds: ["DIG-2026-0041"],
  },
  {
    id: "p-klinikai",
    name: "Klinikai oktatási adatgyűjtés",
    strategicRelevance: "magas",
    ownerId: "u-nemeth",
    sponsorId: "u-feher",
    teamId: "t-dig",
    stage: "teszteles",
    benefit: "Gyakorlati oktatás minőségének mérhetővé tétele.",
    estimatedCost: 3100000,
    effortDays: 60,
    dependencies: ["Klinikai Központ", "Adatvédelmi jóváhagyás"],
    targetDate: "2026-08-31",
    risk: "közepes",
    orgUnitId: "ou-klinikai",
    linkedRequestIds: ["DIG-2026-0026"],
  },
  {
    id: "p-onboarding",
    name: "Munkatársi belépési folyamat automatizálása",
    strategicRelevance: "magas",
    ownerId: "u-molnar",
    sponsorId: "u-nagy",
    teamId: "t-it",
    stage: "otlet",
    benefit: "Új munkatárs első napjára minden hozzáférés készen áll.",
    estimatedCost: 2200000,
    effortDays: 40,
    dependencies: ["HR rendszer", "Entra ID"],
    targetDate: "2027-03-31",
    risk: "közepes",
    orgUnitId: "ou-dekani",
    linkedRequestIds: [],
  },
];

// A portál jelenleg csak informatikai eszközbeszerzést kezel,
// ezért nem informatikai fejlesztési projektek nem jelennek meg.
export const PROJECTS: Project[] = ALL_PROJECTS.filter(() => false);

const ALL_RESPONSIBILITIES: ResponsibilityRow[] = [
  {
    service: "Microsoft 365 hozzáférés",
    unit: "Dékáni Hivatal",
    ownerId: "u-molnar",
    team: "IT szolgáltatások",
    approver: "Szervezeti jóváhagyó",
    supporting: "HR adminisztráció",
    sla: "2 munkanap",
    escalation: "IT szolgáltatásgazda",
  },
  {
    service: "Speciális szoftver és licenc",
    unit: "Dékáni Hivatal",
    ownerId: "u-molnar",
    team: "IT szolgáltatások",
    approver: "Szervezeti jóváhagyó + Beszerzés",
    supporting: "Beszerzési támogatás",
    sla: "10 munkanap",
    escalation: "Hivatalvezető",
  },
  {
    service: "Munkaállomás és notebook",
    unit: "Dékáni Hivatal",
    ownerId: "u-molnar",
    team: "Eszközmenedzsment",
    approver: "Költségkeret-gazda",
    supporting: "Beszerzési támogatás",
    sla: "20 munkanap",
    escalation: "Hivatalvezető",
  },
  {
    service: "Periféria és eszközcsere",
    unit: "Dékáni Hivatal",
    ownerId: "u-molnar",
    team: "Eszközmenedzsment",
    approver: "Szervezeti jóváhagyó",
    supporting: "—",
    sla: "8 munkanap",
    escalation: "Eszközmenedzsment vezető",
  },
  {
    service: "Honlap módosítás",
    unit: "Dékáni Hivatal",
    ownerId: "u-nemeth",
    team: "Web és digitális kommunikáció",
    approver: "Szervezeti jóváhagyó",
    supporting: "Kommunikáció",
    sla: "10 munkanap",
    escalation: "Szolgáltatásgazda",
  },
  {
    service: "Webes űrlap és regisztráció",
    unit: "Dékáni Hivatal",
    ownerId: "u-nemeth",
    team: "Web és digitális kommunikáció",
    approver: "Szervezeti jóváhagyó + Adatvédelem",
    supporting: "Adatvédelmi tisztviselő",
    sla: "12 munkanap",
    escalation: "Szolgáltatásgazda",
  },
  {
    service: "Folyamatdigitalizáció és workflow",
    unit: "Dékáni Hivatal",
    ownerId: "u-nemeth",
    team: "Digitalizációs csoport",
    approver: "Szolgáltatásgazda",
    supporting: "Érintett szervezeti egység",
    sla: "30 munkanap",
    escalation: "Dékánhelyettes",
  },
  {
    service: "Dashboard és riport",
    unit: "Dékáni Hivatal",
    ownerId: "u-nemeth",
    team: "Digitalizációs csoport",
    approver: "Szolgáltatásgazda",
    supporting: "Adatgazdák",
    sla: "30 munkanap",
    escalation: "Dékánhelyettes",
  },
  {
    service: "AI-megoldás vizsgálata",
    unit: "Dékáni Hivatal",
    ownerId: "u-nemeth",
    team: "Digitalizációs csoport",
    approver: "Szolgáltatásgazda + IT biztonság",
    supporting: "Adatvédelmi tisztviselő",
    sla: "20 munkanap",
    escalation: "Dékánhelyettes",
  },
];

// Csak az eszközbeszerzéshez kapcsolódó felelősségi sorok láthatók.
const DEVICE_TEAMS = new Set(TEAMS.map((t) => t.name));
export const RESPONSIBILITIES: ResponsibilityRow[] = ALL_RESPONSIBILITIES.filter((r) =>
  DEVICE_TEAMS.has(r.team),
);



const ALL_NOTIFICATIONS: AppNotification[] = [
  {
    id: "n-1",
    requestId: "HW-2026-0210",
    text: "HW-2026-0210 – új ügyintézői üzenet",
    at: "2026-08-09",
    read: false,
  },
  {
    id: "n-2",
    requestId: "HW-2026-0233",
    text: "HW-2026-0233 – vezetői jóváhagyás szükséges",
    at: "2026-08-06",
    read: false,
  },
  {
    id: "n-3",
    requestId: "HW-2026-0198",
    text: "HW-2026-0198 – az ügyintéző további információt kért",
    at: "2026-08-08",
    read: false,
  },
  {
    id: "n-4",
    requestId: "HW-2026-0221",
    text: "HW-2026-0221 – a feladat elkészült, átvételre vár",
    at: "2026-08-08",
    read: true,
  },
];

// Csak létező eszközigényhez tartozó értesítés maradhat.
const REQUEST_IDS = new Set(REQUESTS.map((r) => r.id));
export const NOTIFICATIONS: AppNotification[] = ALL_NOTIFICATIONS.filter(
  (n) => !!n.requestId && REQUEST_IDS.has(n.requestId),
);



export const MONTHLY_VOLUME = [
  { month: "Márc", igenyek: 28, lezart: 24 },
  { month: "Ápr", igenyek: 34, lezart: 30 },
  { month: "Máj", igenyek: 31, lezart: 29 },
  { month: "Jún", igenyek: 42, lezart: 33 },
  { month: "Júl", igenyek: 47, lezart: 38 },
  { month: "Aug", igenyek: 39, lezart: 26 },
];

export const LEADTIME_TREND = [
  { month: "Márc", nap: 11.2 },
  { month: "Ápr", nap: 10.4 },
  { month: "Máj", nap: 12.1 },
  { month: "Jún", nap: 13.6 },
  { month: "Júl", nap: 14.8 },
  { month: "Aug", nap: 15.3 },
];

export const INSIGHTS = [
  "Az eszközigények átlagos átfutási ideje 18%-kal nőtt az előző hónaphoz képest.",
  "Az öt legrégebbi nyitott eszközigényből három beszerzési jóváhagyásra vár.",
  "A pontosításra váró eszközigények átlagosan 4,2 napot töltenek válaszra várva.",
];
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: "ann-1",
    title: "Tervezett karbantartás a Neptun és a kari hálózat egyes szolgáltatásain",
    body: "A hétvégi karbantartás ideje alatt (szombat 08:00–14:00) a Neptun és a kari VPN időszakosan nem lesz elérhető. A portálon beadott igények feldolgozása a karbantartás után folytatódik.",
    level: "figyelmeztetes",
    publishedAt: inDays(-2),
    expiresAt: inDays(10),
    active: true,
    createdBy: "u-nemeth",
  },
];
