import type { MemberImportPlan } from "./member-import";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
  type Context,
} from "react";
import { normalizeLegacyPlanStatus } from "./plan-stage";
import {
  ALL_DOMAINS,
  CATALOG,
  ANNOUNCEMENTS,
  DOMAINS,
  NOTIFICATIONS,
  ORG_UNITS,
  PROJECTS,
  REQUESTS,
  RESPONSIBILITIES,
  TEAMS,
  USERS,
} from "./seed";
import type {
  Announcement,
  AppNotification,
  AssetHandover,
  EmployeeTier,
  InventoryItem,
  Product,
  ProductCategory,
  Project,
  RequestMessage,
  RoleKey,
  RoleAuditEvent,
  MemberImportEvent,
  ServiceRequest,
  StatusKey,
  User,
} from "./types";
import { INITIAL_PRODUCTS, INITIAL_PRODUCT_CATEGORIES } from "./product-catalog";
import {
  isUnknownUser,
  resolveItReferent,
  resolveServiceOwner,
  resolveUnitApprover,
} from "./routing";

import { INVENTORY, specForModel } from "./inventory-data";
import { todayIso } from "./clock";
import { DEMO_REQUESTER_ID } from "./demo-flow";
import {
  canConfirmReceipt,
  canHandOverToUser,
  canMarkDelivered,
  canObjectReceipt,
  canResolveObjection,
  canStartProcurement,
  handoversForItem,
  itemFullyReceived,
  remainingQuantity,
  validateDeliveryQuantity,
  validateOrderInput,
} from "./procurement-rules";
import { OLD_ASSET_DISPOSITION_LABELS } from "./types";
import {
  DEADLINE_STEP_KEYS,
  DEADLINE_STEP_LABELS,
  DEFAULT_PROCESS_SETTINGS,
  normalizeProcessSettings,
  type DeadlineLevel,
  type ProcessSettings,
} from "./deadlines";
import { requestSituation } from "./request-situation";
import {
  budgetCheck,
  canDecideBudgetReview,
  canReportProcurementBlock,
  needsBudgetReview,
} from "./budget-rules";
import { PROCESS_STEPS } from "./process-steps";
import { formatHuDate } from "./clock";
import { handoverPurposeTitle, productForHandover, specFromProduct } from "./handover-products";
import { modelKeyForStandard, standardLabel } from "./handover-mapping";
import { productLockInfo } from "./product-lock";
import type {
  Asset,
  AssetAuditEvent,
  AssetEvent,
  DiscrepancyKind,
  InventoryCheck,
  InventoryDiscrepancy,
  PersonalSoftwareLicence,
  PersonalCheckAnswer,
  PlanApproval,
  ProcurementPlanItem,
  ReplacementDecision,
  ReplacementDecisionKey,
  SharedCheckAnswer,
  ScrapProposal,
} from "./asset-types";
import {
  ASSETS,
  ASSET_ASSIGNMENTS,
  ASSET_EVENTS,
  ASSET_LOCATIONS,
  INITIAL_ASSET_AUDIT,
  INITIAL_CHECKS,
  INITIAL_DISCREPANCIES,
  INITIAL_PROCUREMENT_ITEMS,
  INITIAL_REPLACEMENT_DECISIONS,
  NEXT_FINANCIAL_YEAR,
  PERSONAL_LICENCES,
} from "./asset-data";
import { assetLookup, huf, lifecycleStatus, locationsForUser, yearsSince } from "./asset-logic";
import { needsProcurement, planItemFromRequest } from "./request-procurement";
import { canWithdrawRequest, planApprovalForItem } from "./withdraw";
import { buildPlanApprovals } from "./plan-approvals";

function seedScrapProposals(assets: Asset[]): ScrapProposal[] {
  const candidates = assets
    .filter((a) => a.active)
    .filter((a) => {
      const st = lifecycleStatus(a);
      return (
        st === "selejtezesre_var" ||
        st === "tamogatasbol_kifutott" ||
        st === "cserere_erett" ||
        a.condition === "hibas"
      );
    });
  if (candidates.length < 5) return [];
  const picked = candidates.slice(0, 6);
  return [
    {
      id: "sp-2027-001",
      year: NEXT_FINANCIAL_YEAR,
      title: "2027. évi selejtezési javaslat – 1. ütem",
      reason: "Életciklus végét elért, gazdaságosan nem javítható IT eszközök selejtezése.",
      assetIds: picked.map((a) => a.id),
      status: "jovahagyva",
      createdBy: "u-molnar",
      createdAt: "2026-06-15",
      submittedAt: "2026-06-20",
      decidedBy: "u-szabo",
      decidedAt: "2026-07-05",
      history: [
        { at: "2026-06-15", actorId: "u-molnar", action: "Javaslat összeállítása" },
        {
          at: "2026-06-20",
          actorId: "u-molnar",
          action: "Beküldés gazdasági vezetői jóváhagyásra",
        },
        {
          at: "2026-07-05",
          actorId: "u-szabo",
          action: "Gazdasági vezetői jóváhagyás",
          comment: "Elfogadva, selejtezési jegyzőkönyv készíthető.",
        },
      ],
    },
  ];
}

// v3: a szervezeti egységek a hatályos organogram szerint (új azonosítók);
// a korábbi verziók tárolt állapota a régi egységekre hivatkozna.
const STORAGE_KEY = "aok-portal-state-v3";
const LEGACY_STORAGE_KEYS = ["aok-portal-state-v2", "aok-portal-state-v1", "aok-portal-state"];

interface PersistedState {
  requests: ServiceRequest[];
  notifications: AppNotification[];
  announcements: Announcement[];
  dismissedAnnouncements: string[];
  inventory: InventoryItem[];
  assets: Asset[];
  licences: PersonalSoftwareLicence[];
  assetEvents: AssetEvent[];
  assetAudit: AssetAuditEvent[];
  checks: InventoryCheck[];
  discrepancies: InventoryDiscrepancy[];
  replacementDecisions: ReplacementDecision[];
  planItems: ProcurementPlanItem[];
  planApprovals: PlanApproval[];
  scrapProposals: ScrapProposal[];
  handovers: AssetHandover[];
  currentUserId: string;
  activeRole: RoleKey;
  loggedIn: boolean;
  roleOverrides: Record<string, RoleKey[]>;
  roleAudit: RoleAuditEvent[];
  productCategories: ProductCategory[];
  products: Product[];
  tierOverrides: Record<string, EmployeeTier>;
  /** Admin által a jogosultságkezelésben létrehozott új felhasználók. */
  extraUsers: User[];
  /** Taglista-frissítésből származó mezőfelülírások (seed és extra felhasználókra egyaránt). */
  userOverrides: Record<string, Partial<User>>;
  /** A legutóbbi taglista-frissítésben nem szereplő felhasználók. */
  inactiveUserIds: string[];
  /** Taglista-frissítések naplója. */
  memberImports: MemberImportEvent[];
  /** Lépésenkénti határidők és emlékeztető-szabályok (D3/D6/D7). */
  processSettings: ProcessSettings;
  /** Már kiküldött határidő-jelzések: „igény:lépés:kezdet” → szint. */
  deadlineNotices: Record<string, DeadlineLevel>;
}

const initialState: PersistedState = {
  requests: REQUESTS,
  notifications: NOTIFICATIONS,
  announcements: ANNOUNCEMENTS,
  dismissedAnnouncements: [],
  inventory: INVENTORY,
  assets: ASSETS,
  licences: PERSONAL_LICENCES,
  assetEvents: ASSET_EVENTS,
  assetAudit: INITIAL_ASSET_AUDIT,
  checks: INITIAL_CHECKS,
  discrepancies: INITIAL_DISCREPANCIES,
  replacementDecisions: INITIAL_REPLACEMENT_DECISIONS,
  planItems: INITIAL_PROCUREMENT_ITEMS,
  planApprovals: buildPlanApprovals(),
  processSettings: DEFAULT_PROCESS_SETTINGS,
  deadlineNotices: {},
  scrapProposals: seedScrapProposals(ASSETS),
  handovers: [],
  currentUserId: "u-kovacs",
  activeRole: "igenylo",
  loggedIn: false,
  roleOverrides: {},
  roleAudit: [],
  productCategories: INITIAL_PRODUCT_CATEGORIES,
  products: INITIAL_PRODUCTS,
  tierOverrides: {},
  extraUsers: [],
  userOverrides: {},
  inactiveUserIds: [],
  memberImports: [],
};

interface StoreValue extends PersistedState {
  /** Igaz, ha a localStorage-ban mentett állapot már betöltődött (csak kliensen). */
  hydrated: boolean;
  users: User[];
  /** A választókban használandó lista: az inaktiváltak nélkül. */
  activeUsers: User[];
  projects: Project[];
  currentUser: User;
  login: (userId: string) => void;
  logout: () => void;
  setActiveRole: (role: RoleKey) => void;
  switchUser: (userId: string) => void;
  createRequest: (
    input: Partial<ServiceRequest> & { title: string; domain: ServiceRequest["domain"] },
  ) => string;
  updateRequest: (id: string, patch: Partial<ServiceRequest>, auditLabel?: string) => void;
  setStatus: (id: string, status: StatusKey) => void;
  /** Pontosítás kérése az igénylőtől: kérdés üzenetként, státusz „pontosítás”, értesítés. */
  requestClarification: (id: string, question: string) => void;
  withdrawRequest: (id: string, reason?: string) => void;
  addMessage: (id: string, body: string, internal: boolean) => void;
  decideApproval: (
    id: string,
    approvalId: string,
    decision: "jovahagyva" | "elutasitva",
    comment?: string,
  ) => void;
  markNotificationsRead: () => void;
  rateRequest: (id: string, rating: number) => void;
  addInventoryItem: (
    input: Omit<InventoryItem, "id" | "ownerId" | "status" | "createdAt" | "spec">,
  ) => string;
  removeInventoryItem: (id: string) => void;
  decideInventoryItem: (
    id: string,
    decision: "jovahagyva" | "elutasitva",
    comment?: string,
  ) => void;
  assignments: typeof ASSET_ASSIGNMENTS;
  updateAsset: (id: string, patch: Partial<Asset>, label?: string) => void;
  submitCheck: (
    assetId: string,
    answer: PersonalCheckAnswer | SharedCheckAnswer,
    comment?: string,
  ) => void;
  reportDiscrepancy: (input: {
    kind: DiscrepancyKind;
    assetId?: string | undefined;
    licenceId?: string | undefined;
    description: string;
  }) => void;
  resolveDiscrepancy: (
    id: string,
    status: InventoryDiscrepancy["status"],
    resolution?: string,
  ) => void;
  decideReplacement: (assetId: string, decision: ReplacementDecisionKey, comment?: string) => void;
  markLicenceUnused: (licenceId: string, unused: boolean) => void;
  addPlanItem: (item: Omit<ProcurementPlanItem, "id">) => string;
  /** Elfogadott igényhez utólag beszerzési tervsor létrehozása. */
  createPlanItemFromRequest: (requestId: string) => void;
  updatePlanItem: (id: string, patch: Partial<ProcurementPlanItem>) => void;
  reschedulePlanItem: (
    id: string,
    planYear: number,
    quarter: ProcurementPlanItem["quarter"],
    comment?: string,
  ) => void;
  removePlanItem: (id: string) => void;
  setPlanItemTiming: (id: string, timing: "azonnali" | "negyedeves") => void;
  handPlanItemToPlanner: (id: string) => void;
  createScrapProposal: (input: {
    year: number;
    title: string;
    reason: string;
    assetIds: string[];
  }) => string;
  updateScrapProposal: (id: string, patch: Partial<ScrapProposal>) => void;
  submitScrapProposal: (id: string) => void;
  decideScrapProposal: (
    id: string,
    decision: "jovahagyva" | "visszakuldve",
    comment?: string,
  ) => void;
  submitPlanForFinance: (id: string, comment?: string) => void;
  /** Gazdasági vezetői sürgetés: kéri az eszközmenedzsertől a terv beküldését. */
  nudgePlanSubmission: (id: string) => void;
  financeReviewPlan: (id: string, decision: "tovabb" | "vissza", comment?: string) => void;
  startPlanExecution: (id: string) => void;
  /**
   * Beszerző: a tervsor eszköze fizikailag beérkezett – átadási folyamat indul.
   * Tiltott átmenetnél az állapot változatlan marad, a visszatérési érték a hibaüzenet.
   */
  markPlanItemDelivered: (planItemId: string, input: DeliveryInput) => string | null;
  /** Beszerző: egyetlen tétel beszerzésének indítása jóváhagyott terv alapján, rendelési rekorddal (D12). */
  startItemProcurement: (planItemId: string, order: OrderInput) => string | null;
  /** Szervezeti jóváhagyó: költségkeret-túllépés jóváhagyása vagy elutasítása (D1/D5). */
  decideBudgetReview: (
    planItemId: string,
    reviewId: string,
    decision: "jovahagyva" | "elutasitva",
    comment?: string,
  ) => string | null;
  /** Beszerző: beszerzési akadály jelzése helyettesítő modellel vagy meghiúsulással (D11). */
  reportProcurementBlock: (planItemId: string, input: BlockInput) => string | null;
  /** Kari IT referens: telepítési és azonosító adatok rögzítése. */
  updateHandover: (id: string, patch: Partial<AssetHandover>, label?: string) => void;
  /** Kari IT referens: eszköz átadása az igénylőnek. */
  handOverToUser: (id: string, comment?: string) => void;
  /** Igénylő: átvétel visszaigazolása – az eszköz bekerül a személyi leltárba. */
  confirmHandoverReceipt: (id: string, comment?: string) => void;
  /** Lépésenkénti határidők és emlékeztető-szabályok (D3/D6/D7). */
  processSettings: ProcessSettings;
  /** Admin: a határidő-beállítások módosítása; minden változás naplózva. */
  updateProcessSettings: (next: ProcessSettings) => void;
  /**
   * Igénylő: átvételi kifogás indoklással (D4) – az eszköz visszakerül a kari IT referenshez.
   * Tiltott átmenetnél az állapot változatlan, a visszatérési érték a hibaüzenet.
   */
  objectHandoverReceipt: (id: string, reason: string) => string | null;
  /** Kari IT referens: a kifogás kezelése leírással – az eszköz újra átadásra kész (D4). */
  resolveHandoverObjection: (id: string, resolution: string) => string | null;
  decidePlanApproval: (
    id: string,
    decision: "jovahagyva" | "visszakuldve",
    comment?: string,
  ) => void;

  /** Admin: új felhasználó létrehozása a jogosultságkezelésben. */
  addUser: (input: Omit<User, "id" | "initials">, reason: string) => string;
  /** Teljes taglista frissítése CSV-tervből (member-import.ts). */
  applyMemberImport: (
    plan: MemberImportPlan,
    reason: string,
    fileName: string,
  ) => MemberImportEvent;
  setUserRoles: (userId: string, roles: RoleKey[], reason: string) => void;
  /** Munkavállalói besorolás módosítása (jogosultságkezelés). */
  setUserTier: (userId: string, tier: EmployeeTier, reason?: string) => void;
  addProductCategory: (input: Omit<ProductCategory, "id">) => string;
  updateProductCategory: (id: string, patch: Partial<ProductCategory>) => void;
  removeProductCategory: (id: string) => void;
  addProduct: (input: Omit<Product, "id">) => string;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  activeAnnouncements: Announcement[];
  addAnnouncement: (input: Omit<Announcement, "id" | "publishedAt" | "createdBy">) => string;
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void;
  removeAnnouncement: (id: string) => void;
  dismissAnnouncement: (id: string) => void;
  resetDemo: (options?: { leadershipDemo?: boolean }) => void;
}

// Keep a single context instance across HMR module reloads, otherwise an
// already-rendered provider and a freshly-imported useStore use different
// contexts and the hook throws "must be used inside StoreProvider".
const globalScope = globalThis as unknown as {
  __dszpStoreContext?: Context<StoreValue | null>;
};
const StoreContext =
  globalScope.__dszpStoreContext ??
  (globalScope.__dszpStoreContext = createContext<StoreValue | null>(null));

const today = () => todayIso();

/** Alapértelmezett munkavállalói besorolás a szerepkörök alapján. */
function defaultTierFor(u: User): EmployeeTier {
  if (u.roles.includes("dekan")) return "felsovezetoi";
  if (u.roles.some((r) => ["vezeto", "gazdasagi_vezeto", "szolgaltatasgazda"].includes(r)))
    return "vezetoi";
  return "alkalmazotti";
}

/**
 * 3. lépés – IT besorolás. A szervezeti jóváhagyás után a tervsor
 * automatikusan létrejön, és azonnal az IT eszközmenedzserhez kerül
 * besorolásra; kézi beszerzői átadás nincs.
 */
function applyProcurementLink(
  s: PersistedState,
  requests: ServiceRequest[],
  request: ServiceRequest,
): PersistedState {
  const already = s.planItems.some((p) => p.sourceRequestId === request.id);
  if (already || !needsProcurement(request)) return { ...s, requests };
  const planner = [...USERS, ...(s.extraUsers ?? [])].find((u) =>
    (s.roleOverrides[u.id] ?? u.roles).includes("eszkozmenedzser"),
  );
  const item: ProcurementPlanItem = {
    ...planItemFromRequest(request, {
      products: s.products ?? [],
      categories: s.productCategories ?? [],
    }),
    id: `pp-req-${request.id}-${Date.now()}`,
    status: "tervezett",
    handedToPlannerAt: today(),
    ...(planner ? { handedToPlannerBy: planner.id } : {}),
  };
  return {
    ...s,
    requests,
    planItems: [item, ...s.planItems],
    notifications: [
      {
        id: `n-${Date.now()}`,
        requestId: request.id,
        at: today(),
        text: `A(z) „${request.title}” igény szervezeti jóváhagyás után IT besorolásra került (${item.planYear}. évi terv, ${item.quarter}).`,
        read: false,
      },
      ...s.notifications,
    ],
  };
}

/**
 * 8. lépés – átvétel visszaigazolása és teljes lezárás (közös a kézi és az
 * automatikus lezárásnál, D4/D6: a határidő után a rendszer zárja le).
 */
function confirmReceiptState(
  s: PersistedState,
  id: string,
  actorId: string,
  comment: string | undefined,
  auto: boolean,
): PersistedState {
  const h = (s.handovers ?? []).find((x) => x.id === id);
  if (!h) return s;
  // Idempotens: ismételt kattintás nem duplikál leltártételt vagy előzményt.
  if (h.status === "atvetel_igazolva") return s;
  // 8. lépés: csak megtörtént átadás után, csak a címzett igazolhatja vissza.
  if (!auto && !canConfirmReceipt(h, s.activeRole, actorId).allowed) return s;
  const catalogCtx = {
    products: s.products ?? [],
    categories: s.productCategories ?? [],
    requests: s.requests,
  };
  const catalogProduct = productForHandover(h, catalogCtx);
  // Ha a tétel már az átadáskor létrejött („Átvételre vár”), csak státuszt váltunk.
  const invId = h.inventoryItemId ?? `inv-${Date.now()}`;
  const item: InventoryItem = {
    id: invId,
    ownerId: h.recipientId,
    kind: "hardver",
    name: handoverPurposeTitle(h, catalogCtx),
    modelKey: h.modelKey,
    productId: catalogProduct?.id,
    serial: h.serial,
    inventoryNo: h.inventoryNo,
    building: h.building,
    room: h.room,
    note: `Beszerzési folyamatból átvéve (${h.planItemId})${h.note ? ` · ${h.note}` : ""}`,
    spec: catalogProduct ? specFromProduct(catalogProduct) : specForModel(h.modelKey),
    status: "jovahagyva",
    createdAt: today(),
    decidedAt: today(),
    decidedBy: h.referentId ?? actorId,
    decisionComment: "Intézményi beszerzés és átadás-átvétel alapján automatikusan jóváhagyva.",
  };
  // Az átvett eszköz az intézményi eszközkataszterbe is bekerül,
  // különben a „Rám rendelt eszközök” nézetben nem jelenne meg.
  const planItem = s.planItems.find((p) => p.id === h.planItemId);
  // D12/D16: a tétel és az igény csak akkor zárul, ha minden darab beérkezett és átvéve.
  const confirmedNow = (s.handovers ?? []).map((x) =>
    x.id === id ? { ...x, status: "atvetel_igazolva" as const } : x,
  );
  const allPiecesDone = planItem ? itemFullyReceived(planItem, confirmedNow) : true;
  const pieceInfo =
    h.pieceCount && h.pieceCount > 1 ? ` (${h.pieceIndex ?? "?"}/${h.pieceCount}. darab)` : "";
  const location = resolveAssetLocation(h) ?? ASSET_LOCATIONS[0]!;
  const alreadyRegistered =
    Boolean(h.assetId && s.assets.some((a) => a.id === h.assetId)) ||
    s.assets.some((a) => a.note?.includes(h.id));
  const assetId = `as-${Date.now()}`;
  const newAsset: Asset = {
    id: assetId,
    inventoryNo: h.inventoryNo ?? `PTE-AOK-IT-${Date.now().toString().slice(-6)}`,
    deviceId: h.serial ?? assetId,
    categoryKey: planItem?.categoryKey ?? "egyeb",
    modelKey: h.modelKey ?? "",
    productId: catalogProduct?.id,
    serial: h.serial ?? "",
    usage: "szemelyi",
    assignedUserId: h.recipientId,
    inventoryResponsibleId: h.referentId ?? h.recipientId,
    orgUnitId: h.orgUnitId,
    locationId: location.id,
    purpose: item.name,
    purchaseDate: today(),
    commissionDate: today(),
    purchaseValue: planItem?.unitPriceOverride ?? 0,
    fundingSourceId: planItem?.fundingSourceId ?? "fs-kari",
    costCenter: h.orgUnitId,
    warrantyEnd: `${new Date().getUTCFullYear() + 3}-12-31`,
    condition: "kifogastalan",
    active: true,
    reportedIssues: 0,
    repairCount: 0,
    businessCritical: false,
    note: `Beszerzési átadásból (${h.id})`,
  };
  return {
    ...s,
    inventory: h.inventoryItemId
      ? s.inventory.map((i) =>
          i.id === h.inventoryItemId
            ? {
                ...i,
                status: "jovahagyva",
                decidedAt: today(),
                decidedBy: h.referentId ?? actorId,
                decisionComment:
                  "Intézményi beszerzés és átadás-átvétel alapján automatikusan jóváhagyva.",
              }
            : i,
        )
      : [item, ...s.inventory],
    assets: alreadyRegistered
      ? s.assets.map((a) =>
          h.assetId && a.id === h.assetId
            ? {
                ...a,
                holding: "hasznalatban" as const,
                assignedUserId: h.recipientId,
                serial: h.serial ?? a.serial,
                inventoryNo: h.inventoryNo ?? a.inventoryNo,
              }
            : a,
        )
      : [newAsset, ...s.assets],
    planItems: s.planItems.map((p) =>
      planItem && p.id === planItem.id && allPiecesDone ? { ...p, status: "teljesult" } : p,
    ),

    handovers: (s.handovers ?? []).map((x) =>
      x.id === id
        ? {
            ...x,
            status: "atvetel_igazolva",
            confirmedAt: today(),
            inventoryItemId: invId,
            history: [
              ...x.history,
              {
                at: today(),
                actorId: actorId,
                action: auto
                  ? "Automatikus lezárás – az igénylő a határidőn belül nem igazolta vissza az átvételt"
                  : "Átvétel visszaigazolva – eszköz a személyi leltárba került",
                comment,
              },
            ],
          }
        : x,
    ),
    requests: s.requests.map((r) =>
      r.id === h.requestId
        ? {
            ...r,
            status: allPiecesDone ? "lezarva" : "megvalositas",
            updatedAt: today(),
            nextStep: !allPiecesDone
              ? `${h.deviceName}${pieceInfo} átvéve – a további darabok beszerzés vagy átadás alatt.`
              : auto
                ? "Az átvétel visszaigazolása a határidőn belül elmaradt, az ügy automatikusan lezárult."
                : "Az eszköz átadva és átvéve, az igény lezárult.",
            audit: [
              ...r.audit,
              {
                id: `a-${Date.now()}`,
                at: today(),
                actorId: actorId,
                action: auto ? "Automatikus lezárás" : "Átvétel visszaigazolása",
                detail: `${h.deviceName} bekerült a személyi leltárba`,
              },
            ],
          }
        : r,
    ),
    notifications: [
      {
        id: `n-${Date.now()}`,
        at: today(),
        read: false,
        requestId: h.requestId,
        text: auto
          ? `${h.deviceName}: az átvétel visszaigazolása a határidőn belül elmaradt, az ügy automatikusan lezárult – az eszköz a személyi leltárba került.`
          : `${h.deviceName} átvétele visszaigazolva – az eszköz bekerült a személyi leltárba.`,
      },
      ...s.notifications,
    ],
    assetAudit: [
      {
        id: `aud-${Date.now()}`,
        at: today(),
        actorId: actorId,
        entity: "leltar",
        entityId: invId,
        action: auto
          ? "Átvétel automatikus lezárása (határidő lejárt)"
          : "Átvétel visszaigazolva, személyi leltártétel létrehozva",
        detail: `${h.deviceName}${h.inventoryNo ? ` · leltárkód: ${h.inventoryNo}` : ""}`,
      },
      ...s.assetAudit,
    ],
  };
}

/** A beszerző rendelési adatai a beszerzés indításakor (D12). */
export interface OrderInput {
  supplier: string;
  orderNumber: string;
  expectedArrival: string;
  actualUnitNet?: number | undefined;
  actualUnitGross?: number | undefined;
  note?: string | undefined;
}

/** Beérkezés rögzítése darabszámmal (rész- vagy teljes teljesítés, D12). */
export interface DeliveryInput {
  quantity: number;
  note?: string | undefined;
}

/** Következő szabad PTE leltári szám a kataszter alapján (D16). */
function nextInventoryNo(assets: Asset[], offset = 0): string {
  const max = assets.reduce((m, a) => {
    const n = /^PTE-AOK-IT-(\d+)$/.exec(a.inventoryNo)?.[1];
    return n ? Math.max(m, Number(n)) : m;
  }, 0);
  return `PTE-AOK-IT-${String(max + 1 + offset).padStart(6, "0")}`;
}

/**
 * Az átadott eszköz helyszíne a kataszterben: a rögzített épület/helyiség, különben az
 * átvevő saját munkahelye, különben az egység első helyisége – raktár sosem.
 */
function resolveAssetLocation(h: AssetHandover) {
  const usable = ASSET_LOCATIONS.filter((l) => l.kind !== "raktar");
  if (h.building || h.room) {
    const exact = usable.find(
      (l) => (!h.building || l.building === h.building) && (!h.room || l.room === h.room),
    );
    if (exact) return exact;
  }
  return (
    locationsForUser(h.recipientId).find((l) => l.kind !== "raktar") ??
    usable.find((l) => l.orgUnitId === h.orgUnitId)
  );
}

/** Beszerzési akadály (D11): indoklás és opcionális helyettesítő modell. */
export interface BlockInput {
  reason: string;
  substitute?:
    | {
        productId?: string | undefined;
        deviceName: string;
        modelKey?: string | undefined;
        unitGross: number;
      }
    | undefined;
}

/**
 * D1/D5: küszöbellenőrzés egy tervsoron. Túllépésnél felülvizsgálatot nyit a szervezeti
 * jóváhagyónál és értesíti az igénylőt; ha a túllépés megszűnt, a nyitott kört lezárja.
 */
function applyBudgetCheck(
  s: PersistedState,
  planItemId: string,
  stage: "tervezes" | "beszerzes",
  trigger: string,
  actorId: string,
): PersistedState {
  const item = s.planItems.find((p) => p.id === planItemId);
  if (!item || !item.sourceRequestId) return s;
  const request = s.requests.find((r) => r.id === item.sourceRequestId);
  if (!request) return s;
  const settings = s.processSettings ?? DEFAULT_PROCESS_SETTINGS;
  const check = budgetCheck(request, item, settings.budgetTolerancePct);
  const now = todayIso();
  if (!check.exceeded) {
    // Megszűnt túllépés: a függő / elutasított kör megoldva.
    const open = (item.budgetReviews ?? []).some(
      (r) => r.status === "fuggoben" || r.status === "elutasitva",
    );
    if (!open) return s;
    return {
      ...s,
      planItems: s.planItems.map((p) =>
        p.id === planItemId
          ? {
              ...p,
              budgetReviews: (p.budgetReviews ?? []).map((r) =>
                r.status === "fuggoben" || r.status === "elutasitva"
                  ? { ...r, status: "megoldva" as const, decidedAt: now, comment: r.comment }
                  : r,
              ),
            }
          : p,
      ),
      notifications: [
        {
          id: `n-${Date.now()}-bres`,
          at: now,
          read: false,
          requestId: request.id,
          text: `${request.title}: az összeg (${check.currentGross.toLocaleString("hu-HU")} Ft) ismét a jóváhagyott kereten belül van, a felülvizsgálat lezárult.`,
        },
        ...s.notifications,
      ],
    };
  }
  if (!needsBudgetReview(check, item)) return s;
  const approverId = request.approvals.find(
    (a) => a.role === "jovahagyo" || a.step === 1,
  )?.approverId;
  const review = {
    id: `br-${Date.now()}`,
    stage,
    at: now,
    triggeredBy: actorId,
    trigger,
    budgetGross: check.budgetGross,
    newGross: check.currentGross,
    deltaPct: check.deltaPct,
    status: "fuggoben" as const,
  };
  return {
    ...s,
    planItems: s.planItems.map((p) =>
      p.id === planItemId ? { ...p, budgetReviews: [...(p.budgetReviews ?? []), review] } : p,
    ),
    requests: s.requests.map((r) =>
      r.id === request.id
        ? {
            ...r,
            updatedAt: now,
            nextStep: `Költségkeret-túllépés (+${check.deltaPct}%): ${check.currentGross.toLocaleString("hu-HU")} Ft a jóváhagyott ${check.budgetGross.toLocaleString("hu-HU")} Ft helyett – a szervezeti jóváhagyó újra dönt.`,
            audit: [
              ...r.audit,
              {
                id: `a-${Date.now()}-br`,
                at: now,
                actorId,
                action: "Költségkeret-túllépés",
                detail: `${trigger} · ${check.budgetGross.toLocaleString("hu-HU")} Ft → ${check.currentGross.toLocaleString("hu-HU")} Ft (+${check.deltaPct}%)`,
              },
            ],
          }
        : r,
    ),
    notifications: [
      {
        id: `n-${Date.now()}-br`,
        at: now,
        read: false,
        requestId: request.id,
        text: `${request.title}: a ${stage === "beszerzes" ? "tényleges" : "tervezett"} ár ${check.currentGross.toLocaleString("hu-HU")} Ft, a jóváhagyott keret ${check.budgetGross.toLocaleString("hu-HU")} Ft (+${check.deltaPct}%, küszöb ${settings.budgetTolerancePct}%). ${approverId ? `${lookup.user(approverId)?.name ?? "A szervezeti jóváhagyó"} újra dönt` : "A szervezeti jóváhagyó újra dönt"}; az igénylő tájékoztatást kapott.`,
      },
      ...s.notifications,
    ],
    assetAudit: [
      {
        id: `aud-${Date.now()}-br`,
        at: now,
        actorId,
        entity: "beszerzes" as const,
        entityId: planItemId,
        action: "Költségkeret-túllépés – felülvizsgálat nyitva",
        detail: `${trigger} · +${check.deltaPct}% (${check.currentGross.toLocaleString("hu-HU")} Ft / ${check.budgetGross.toLocaleString("hu-HU")} Ft)`,
      },
      ...s.assetAudit,
    ],
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PersistedState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      for (const k of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(k);
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PersistedState>;
        const merged = { ...initialState } as PersistedState;
        for (const [key, value] of Object.entries(saved)) {
          if (value === undefined || value === null) continue;
          const fallback = (initialState as unknown as Record<string, unknown>)[key];
          if (Array.isArray(fallback) && !Array.isArray(value)) continue;
          (merged as unknown as Record<string, unknown>)[key] = value;
        }
        merged.processSettings = normalizeProcessSettings(saved.processSettings);
        merged.deadlineNotices = saved.deadlineNotices ?? {};
        // A megszűnt superuser szerepkör / demó felhasználó kitisztítása a mentett állapotból.
        const legacyRole = (merged.activeRole as string) === "superuser";
        if (legacyRole || merged.currentUserId === "u-superuser") {
          merged.currentUserId = "u-molnar";
          merged.activeRole = "admin";
        }
        if (merged.roleOverrides) {
          merged.roleOverrides = Object.fromEntries(
            Object.entries(merged.roleOverrides)
              .filter(([userId]) => userId !== "u-superuser")
              .map(([userId, roles]) => [
                userId,
                (roles as RoleKey[]).filter((r) => (r as string) !== "superuser"),
              ]),
          );
        }
        // A „személyi használat” jelölés bevezetése előtt mentett termékkörök pótlása.
        if (Array.isArray(merged.productCategories)) {
          merged.productCategories = merged.productCategories.map((c) =>
            c.personalUse === undefined
              ? {
                  ...c,
                  personalUse:
                    INITIAL_PRODUCT_CATEGORIES.find((i) => i.id === c.id)?.personalUse ?? false,
                }
              : c,
          );
        }
        // Új katalógustételek pótlása a mentett állapotban (id alapján, meglévők érintetlenül).
        if (Array.isArray(merged.products)) {
          const known = new Set(merged.products.map((p) => p.id));
          const missing = INITIAL_PRODUCTS.filter((p) => !known.has(p.id));
          if (missing.length) merged.products = [...merged.products, ...missing];
        }

        // Hiányzó tervciklusok pótlása minden olyan évre, amelyre van tervsor,
        // valamint a régi „jovahagyasra_var” státusz átvezetése a mai folyamatra.
        if (Array.isArray(merged.planApprovals)) {
          const years = new Set<number>([
            ...(merged.planItems ?? []).map((i) => i.planYear),
            ...merged.planApprovals.map((a) => a.planYear),
          ]);
          const knownApprovals = new Set(merged.planApprovals.map((a) => a.id));
          const missingCycles = [...years]
            .flatMap((y) => buildPlanApprovals(y))
            .filter((a) => !knownApprovals.has(a.id));
          merged.planApprovals = [...merged.planApprovals, ...missingCycles].map((a) => ({
            ...a,
            status: normalizeLegacyPlanStatus(a.status),
          }));
        }

        // Nem létező vagy önmagát jóváhagyó döntéshozók javítása a mentett állapotban.
        const known = [...USERS, ...(merged.extraUsers ?? [])];
        if (Array.isArray(merged.requests)) {
          merged.requests = merged.requests.map((r) => {
            const approvals = r.approvals.map((a) => {
              if (a.decision !== "fuggoben") return a;
              const broken = isUnknownUser(known, a.approverId) || a.approverId === r.requesterId;
              if (!broken) return a;
              const approverId =
                a.step === 1
                  ? resolveUnitApprover(known, r.orgUnitId, r.requesterId)
                  : resolveServiceOwner(known, r.teamId);
              return { ...a, approverId };
            });
            return { ...r, approvals };
          });
        }
        if (Array.isArray(merged.handovers)) {
          merged.handovers = merged.handovers.map((h) =>
            isUnknownUser(known, h.referentId)
              ? { ...h, referentId: resolveItReferent(known, h.orgUnitId) }
              : h,
          );
        }

        setState(merged);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, hydrated]);

  const effectiveUsers = useMemo(() => {
    const all = [...USERS, ...(state.extraUsers ?? [])];
    const overrides = state.userOverrides ?? {};
    const inactive = new Set(state.inactiveUserIds ?? []);
    const mapped = all.map((base) => {
      const u = { ...base, ...(overrides[base.id] ?? {}) };
      const roles = state.roleOverrides[u.id];
      const tier = (state.tierOverrides ?? {})[u.id] ?? u.employeeTier ?? defaultTierFor(u);
      return { ...u, ...(roles ? { roles } : {}), employeeTier: tier, active: !inactive.has(u.id) };
    });
    syncExtraUsers(state.extraUsers ?? [], overrides);
    return mapped;
  }, [
    state.roleOverrides,
    state.tierOverrides,
    state.extraUsers,
    state.userOverrides,
    state.inactiveUserIds,
  ]);
  const activeUsers = useMemo(
    () => effectiveUsers.filter((u) => u.active !== false),
    [effectiveUsers],
  );

  const currentUser = useMemo(
    () => effectiveUsers.find((u) => u.id === state.currentUserId) ?? effectiveUsers[0]!,
    [effectiveUsers, state.currentUserId],
  );

  const patchRequest = useCallback((id: string, fn: (r: ServiceRequest) => ServiceRequest) => {
    setState((s) => ({
      ...s,
      requests: s.requests.map((r) => (r.id === id ? fn(r) : r)),
    }));
  }, []);

  // D3/D7: határidő-söprés. Emlékeztető a határidő adott százalékánál, jelzés
  // lejáratkor (a felelős marad), az átvétel visszaigazolása a beállított
  // munkanap után automatikusan lezárul. Csak új eseménynél ír állapotot.
  useEffect(() => {
    if (!hydrated) return;
    const settings = state.processSettings ?? DEFAULT_PROCESS_SETTINGS;
    const notices = state.deadlineNotices ?? {};
    const newNotices: Record<string, DeadlineLevel> = {};
    const newNotifications: AppNotification[] = [];
    const autoClose: string[] = [];
    for (const r of state.requests) {
      if (r.domain !== "hardver") continue;
      const sit = requestSituation(r, {
        planItems: state.planItems,
        planApprovals: state.planApprovals ?? [],
        handovers: state.handovers ?? [],
        users: effectiveUsers,
        settings,
      });
      const d = sit.deadline;
      if (!d || d.level === "ok") continue;
      if (d.key === "atvetel" && d.waitingWorkdays >= settings.receiptAutoCloseDays) {
        const h = (state.handovers ?? []).find(
          (x) => x.requestId === r.id && x.status === "atadva",
        );
        if (h) autoClose.push(h.id);
        continue;
      }
      const key = `${r.id}:${sit.stageIndex}:${d.since}`;
      if (notices[key] === d.level || (notices[key] === "overdue" && d.level === "reminder"))
        continue;
      newNotices[key] = d.level;
      const who = sit.owner;
      const step = PROCESS_STEPS[sit.stageIndex] ?? "";
      newNotifications.push({
        id: `n-${Date.now()}-${newNotifications.length}`,
        at: today(),
        read: false,
        requestId: r.id,
        text:
          d.level === "overdue"
            ? `Lejárt határidő: „${r.title}” – ${step}, felelős: ${who}. A határidő ${formatHuDate(d.dueDate)} volt, ${d.waitingWorkdays} munkanapja vár. A szakmai felügyelet jelzést kapott, a döntés a felelősnél marad.`
            : `Emlékeztető: „${r.title}” – ${step}, felelős: ${who}. Határidő: ${formatHuDate(d.dueDate)} (${Math.max(0, d.remainingWorkdays)} munkanap van hátra).`,
      });
    }
    if (Object.keys(newNotices).length === 0 && autoClose.length === 0) return;
    setState((s) => {
      let next: PersistedState = {
        ...s,
        deadlineNotices: { ...(s.deadlineNotices ?? {}), ...newNotices },
        notifications: [...newNotifications, ...s.notifications],
      };
      for (const id of autoClose) next = confirmReceiptState(next, id, "u-system", undefined, true);
      return next;
    });
  }, [
    hydrated,
    state.requests,
    state.planItems,
    state.planApprovals,
    state.handovers,
    state.processSettings,
    state.deadlineNotices,
    effectiveUsers,
  ]);

  const value: StoreValue = {
    hydrated,
    ...state,
    users: effectiveUsers,
    activeUsers,
    projects: PROJECTS,
    currentUser,
    login: (userId) =>
      setState((s) => {
        const u = effectiveUsers.find((x) => x.id === userId) ?? effectiveUsers[0]!;
        return { ...s, loggedIn: true, currentUserId: u.id, activeRole: u.roles[0]! };
      }),
    logout: () => setState((s) => ({ ...s, loggedIn: false })),
    setActiveRole: (role) => setState((s) => ({ ...s, activeRole: role })),
    switchUser: (userId) =>
      setState((s) => {
        const u = effectiveUsers.find((x) => x.id === userId) ?? effectiveUsers[0]!;
        return { ...s, currentUserId: u.id, activeRole: u.roles[0]! };
      }),
    createRequest: (input) => {
      const domain = DOMAINS.find((d) => d.key === input.domain)!;
      const seqNo = 300 + Math.floor(Math.random() * 600);
      const id = `${domain.prefix}-2026-0${seqNo}`;
      const team = TEAMS.find((t) => t.domain === domain.key)!;
      const draft = input.status === "piszkozat";
      const req: ServiceRequest = {
        id,
        title: input.title,
        domain: domain.key,
        catalogItemId: input.catalogItemId,
        goal: input.goal ?? "",
        requesterId: currentUser.id,
        orgUnitId: currentUser.orgUnitId,
        teamId: team.id,
        assigneeId: undefined,
        status: input.status ?? "bekuldve",
        priority: input.priority ?? "kozepes",
        createdAt: today(),
        updatedAt: today(),
        dueDate: input.dueDate,
        estimatedCost: input.estimatedCost ?? 0,
        productCategoryId: input.productCategoryId,
        productId: input.productId,
        quantity: input.quantity,
        requestReason: input.requestReason,
        requestReasonNote: input.requestReasonNote,
        replacedAssetId: input.replacedAssetId,
        workLocationId: input.workLocationId,
        handoverMode: input.handoverMode,
        handoverLocationId: input.handoverLocationId,
        requestedQuarter: input.requestedQuarter,
        urgencyReason: input.urgencyReason,
        effortDays: 5,
        nextStep: draft ? "Piszkozat – beküldésre vár." : "Beérkezett igény első értékelésre vár.",
        users: input.users,
        userCount: input.userCount,
        personalData: input.personalData,
        integration: input.integration,
        recurring: input.recurring,
        budget: input.budget,
        slaRisk: false,
        projectId: undefined,
        messages: input.goal
          ? [
              {
                id: `m-${Date.now()}`,
                authorId: currentUser.id,
                createdAt: today(),
                body: input.goal,
                internal: false,
              },
            ]
          : [],
        approvals: draft
          ? []
          : [
              {
                id: `ap-${Date.now()}`,
                step: 1,
                role: "Szervezeti jóváhagyó",
                approverId: resolveUnitApprover(
                  effectiveUsers,
                  currentUser.orgUnitId,
                  currentUser.id,
                ),
                decision: "fuggoben",
              },
            ],
        audit: [
          {
            id: `a-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            action: draft ? "Piszkozat mentése" : "Igény beküldése",
            detail: `${id} létrehozva`,
          },
        ],
        attachments: [],
        subtasks: [],
        ai: input.ai,
        internal: {
          classification: `${domain.name} / új igény`,
          dependencies: "Még nem vizsgált.",
          procurement: (input.estimatedCost ?? 0) > 300000,
          security: "Ellenőrzés szükséges",
          dataProtection: input.personalData ? "Adatvédelmi vizsgálat szükséges" : "Nem érintett",
        },
        rating: undefined,
      };
      setState((s) => ({
        ...s,
        requests: [req, ...s.requests],
        notifications: draft
          ? s.notifications
          : [
              {
                id: `n-${Date.now()}`,
                requestId: id,
                text: `${id} – az igény beérkezett, első értékelés folyamatban`,
                at: today(),
                read: false,
              },
              ...s.notifications,
            ],
      }));
      return id;
    },
    updateRequest: (id, patch, auditLabel) =>
      patchRequest(id, (r) => ({
        ...r,
        ...patch,
        updatedAt: today(),
        audit: auditLabel
          ? [
              ...r.audit,
              {
                id: `a-${Date.now()}`,
                at: today(),
                actorId: currentUser.id,
                action: auditLabel,
                detail: Object.keys(patch).join(", "),
              },
            ]
          : r.audit,
      })),
    setStatus: (id, status) =>
      setState((s) => {
        const requests = s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status,
                updatedAt: today(),
                audit: [
                  ...r.audit,
                  {
                    id: `a-${Date.now()}`,
                    at: today(),
                    actorId: currentUser.id,
                    action: "Státuszváltás",
                    detail: status,
                  },
                ],
              }
            : r,
        );
        const updated = requests.find((r) => r.id === id);
        return status === "elfogadva" && updated
          ? applyProcurementLink(s, requests, updated)
          : { ...s, requests };
      }),
    withdrawRequest: (id, reason) =>
      setState((s) => {
        const request = s.requests.find((r) => r.id === id);
        if (!request) return s;
        if (
          !canWithdrawRequest(request, {
            planItems: s.planItems,
            planApprovals: s.planApprovals ?? [],
            handovers: s.handovers ?? [],
          })
        )
          return s;
        const item = s.planItems.find((p) => p.sourceRequestId === id);
        return {
          ...s,
          requests: s.requests.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status: "visszavonva" as StatusKey,
                  nextStep: "Az igénylő visszavonta az igényt.",
                  updatedAt: today(),
                  approvals: r.approvals.map((a) =>
                    a.decision === "fuggoben"
                      ? {
                          ...a,
                          decision: "elutasitva" as const,
                          decidedAt: today(),
                          comment: "Tárgytalan – az igénylő visszavonta az igényt.",
                        }
                      : a,
                  ),
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: "Igény visszavonása",
                      detail: reason ?? "",
                    },
                  ],
                }
              : r,
          ),
          planItems: item ? s.planItems.filter((p) => p.id !== item.id) : s.planItems,
          notifications: [
            {
              id: `n-${Date.now()}`,
              requestId: id,
              at: today(),
              text: `${id} – az igénylő visszavonta az igényt${item ? ", a beszerzési tervsor törlésre került" : ""}.`,
              read: false,
            },
            ...s.notifications,
          ],
          assetAudit: item
            ? [
                {
                  id: `aud-${Date.now()}`,
                  at: today(),
                  actorId: currentUser.id,
                  entity: "beszerzes" as const,
                  entityId: item.id,
                  action: "Tervsor törlése visszavont igény miatt",
                  detail: reason ?? "",
                },
                ...s.assetAudit,
              ]
            : s.assetAudit,
        };
      }),

    addMessage: (id, body, internal) => {
      const message: RequestMessage = {
        id: `m-${Date.now()}`,
        authorId: currentUser.id,
        createdAt: today(),
        body,
        internal,
      };
      setState((s) => {
        const target = s.requests.find((r) => r.id === id);
        if (!target) return s;
        // Az igénylő nyilvános válasza lezárja a pontosítás-kört: az ügy oda tér
        // vissza, ahonnan a pontosítást kérték (függő jóváhagyásnál jóváhagyásra).
        const answersClarification =
          !internal && target.requesterId === currentUser.id && target.status === "pontositas";
        const returnStatus: StatusKey = answersClarification
          ? (target.clarificationReturnStatus ??
            (target.approvals.some((a) => a.decision === "fuggoben")
              ? "jovahagyasra_var"
              : "elso_ertekeles"))
          : target.status;
        const requests = s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                updatedAt: today(),
                status: returnStatus,
                ...(answersClarification
                  ? {
                      clarificationReturnStatus: undefined,
                      nextStep:
                        returnStatus === "jovahagyasra_var"
                          ? "Pontosítás megválaszolva – jóváhagyásra vár."
                          : "Pontosítás megválaszolva – értékelés folytatódik.",
                    }
                  : {}),
                messages: [...r.messages, message],
                audit: [
                  ...r.audit,
                  {
                    id: `a-${Date.now()}`,
                    at: today(),
                    actorId: currentUser.id,
                    action: internal
                      ? "Belső megjegyzés"
                      : answersClarification
                        ? "Pontosítás megválaszolva"
                        : "Üzenet az igénylőnek",
                    detail: body.slice(0, 60),
                  },
                ],
              }
            : r,
        );
        return {
          ...s,
          requests,
          notifications: answersClarification
            ? [
                {
                  id: `n-${Date.now()}`,
                  requestId: id,
                  at: today(),
                  text: `${id} – az igénylő megválaszolta a pontosítást, az ügy folytatódik.`,
                  read: false,
                },
                ...s.notifications,
              ]
            : s.notifications,
        };
      });
    },
    requestClarification: (id, question) =>
      setState((s) => {
        const target = s.requests.find((r) => r.id === id);
        if (!target || target.status === "pontositas") return s;
        const stamp = Date.now();
        const requests = s.requests.map((r) =>
          r.id === id
            ? {
                ...r,
                status: "pontositas" as StatusKey,
                clarificationReturnStatus: r.status,
                nextStep: "Pontosítás szükséges az igénylő részéről.",
                updatedAt: today(),
                messages: [
                  ...r.messages,
                  {
                    id: `m-${stamp}`,
                    authorId: currentUser.id,
                    createdAt: today(),
                    body: `Pontosítást kérünk: ${question}`,
                    internal: false,
                  },
                ],
                audit: [
                  ...r.audit,
                  {
                    id: `a-${stamp}`,
                    at: today(),
                    actorId: currentUser.id,
                    action: "Pontosítás kérése",
                    detail: question.slice(0, 60),
                  },
                ],
              }
            : r,
        );
        return {
          ...s,
          requests,
          notifications: [
            {
              id: `n-${stamp}`,
              requestId: id,
              at: today(),
              text: `${id} – pontosítást kértek: ${question.slice(0, 80)}`,
              read: false,
            },
            ...s.notifications,
          ],
        };
      }),
    decideApproval: (id, approvalId, decision, comment) =>
      setState((s) => {
        let approvedNow = false;
        const requests = s.requests.map((r) => {
          if (r.id !== id) return r;
          const approvals = r.approvals.map((a) =>
            a.id === approvalId ? { ...a, decision, decidedAt: today(), comment } : a,
          );
          const rejected = decision === "elutasitva";
          const allDone = approvals.every((a) => a.decision === "jovahagyva");
          approvedNow = !rejected && allDone;
          return {
            ...r,
            approvals,
            // D1: a jóváhagyáskori bruttó keret pillanatképe a későbbi küszöbellenőrzéshez.
            ...(approvedNow && !rejected
              ? { approvedBudgetGross: Math.round(r.estimatedCost ?? 0) }
              : {}),
            status: (rejected ? "elutasitva" : allDone ? "elfogadva" : r.status) as StatusKey,
            nextStep: rejected
              ? "Elutasítva."
              : allDone
                ? "Jóváhagyva, végrehajtás tervezése következik."
                : "További jóváhagyásra vár.",
            updatedAt: today(),
            audit: [
              ...r.audit,
              {
                id: `a-${Date.now()}`,
                at: today(),
                actorId: currentUser.id,
                action: rejected ? "Elutasítás" : "Jóváhagyás",
                detail: comment ?? "",
              },
            ],
          };
        });
        const updated = requests.find((r) => r.id === id);
        const next =
          approvedNow && updated ? applyProcurementLink(s, requests, updated) : { ...s, requests };
        const rejected = decision === "elutasitva";
        const text = rejected
          ? `${id} – az igényt elutasították${comment ? `: ${comment}` : "."}`
          : approvedNow
            ? `${id} – az igényt jóváhagyták, a végrehajtás tervezése következik.`
            : null;
        return text
          ? {
              ...next,
              notifications: [
                { id: `n-${Date.now()}`, requestId: id, at: today(), text, read: false },
                ...next.notifications,
              ],
            }
          : next;
      }),
    markNotificationsRead: () =>
      setState((s) => ({
        ...s,
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),
    rateRequest: (id, rating) => patchRequest(id, (r) => ({ ...r, rating })),
    addInventoryItem: (input) => {
      const id = `inv-${Date.now()}`;
      const item: InventoryItem = {
        ...input,
        id,
        ownerId: currentUser.id,
        status: "jovahagyasra_var",
        createdAt: today(),
        spec: input.kind === "hardver" ? specForModel(input.modelKey) : undefined,
      };
      setState((s) => ({
        ...s,
        inventory: [item, ...s.inventory],
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: `${item.name} felvéve a személyi leltárba – rendszergazdai jóváhagyásra vár`,
            at: today(),
            read: false,
          },
          ...s.notifications,
        ],
      }));
      return id;
    },
    removeInventoryItem: (id) =>
      setState((s) => ({ ...s, inventory: s.inventory.filter((i) => i.id !== id) })),
    decideInventoryItem: (id, decision, comment) =>
      setState((s) => {
        const item = s.inventory.find((i) => i.id === id);
        const label = decision === "jovahagyva" ? "jóváhagyva" : "elutasítva";
        return {
          ...s,
          inventory: s.inventory.map((i) =>
            i.id === id
              ? {
                  ...i,
                  status: decision,
                  decidedAt: today(),
                  decidedBy: currentUser.id,
                  decisionComment: comment,
                }
              : i,
          ),
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "leltar",
              entityId: id,
              action: `Személyi leltártétel ${label}`,
              detail: `${item?.name ?? id}${comment ? ` · ${comment}` : ""}`,
            },
            ...s.assetAudit,
          ],
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              text: `„${item?.name ?? "Leltártétel"}” személyi leltártétel ${label}${comment ? ` – ${comment}` : ""}`,
            },
            ...s.notifications,
          ],
        };
      }),
    assignments: ASSET_ASSIGNMENTS,
    updateAsset: (id, patch, label) =>
      setState((s) => ({
        ...s,
        assets: s.assets.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        assetEvents: [
          ...s.assetEvents,
          {
            id: `ae-${Date.now()}`,
            assetId: id,
            at: today(),
            type: "muszaki_adat",
            actorId: currentUser.id,
            title: label ?? "Eszközadat módosítása",
            detail: Object.keys(patch).join(", "),
          },
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "asset",
            entityId: id,
            action: label ?? "Eszközadat módosítása",
            detail: Object.keys(patch).join(", "),
          },
          ...s.assetAudit,
        ],
      })),
    submitCheck: (assetId, answer, comment) =>
      setState((s) => ({
        ...s,
        checks: [
          {
            id: `chk-${Date.now()}`,
            assetId,
            cycle: "2026. évi leltár",
            userId: currentUser.id,
            answer,
            at: today(),
            comment,
            stage: "leltarfelelos_ellenorzes",
          },
          ...s.checks.filter((c) => !(c.assetId === assetId && c.userId === currentUser.id)),
        ],
        assetEvents: [
          ...s.assetEvents,
          {
            id: `ae-${Date.now()}`,
            assetId,
            at: today(),
            type: "leltar_ellenorzes",
            actorId: currentUser.id,
            title: "Leltárellenőrzés visszaigazolása",
            detail: answer,
          },
        ],
      })),
    reportDiscrepancy: (input) =>
      setState((s) => ({
        ...s,
        discrepancies: [
          {
            id: `dis-${Date.now()}`,
            kind: input.kind,
            assetId: input.assetId,
            licenceId: input.licenceId,
            reportedBy: currentUser.id,
            at: today(),
            description: input.description,
            status: "nyitott",
          },
          ...s.discrepancies,
        ],
        notifications: [
          {
            id: `n-${Date.now()}`,
            text: "Leltári eltérés bejelentve – leltárfelelős ellenőrzésére vár",
            at: today(),
            read: false,
          },
          ...s.notifications,
        ],
      })),
    resolveDiscrepancy: (id, status, resolution) =>
      setState((s) => ({
        ...s,
        discrepancies: s.discrepancies.map((d) =>
          d.id === id ? { ...d, status, resolution, handledBy: currentUser.id } : d,
        ),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "leltar",
            entityId: id,
            action: `Leltári eltérés státusza: ${status}`,
            detail: resolution ?? "",
          },
          ...s.assetAudit,
        ],
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            read: false,
            text: `Leltári eltérés lezárva (${status})${resolution ? ` – ${resolution}` : ""}`,
          },
          ...s.notifications,
        ],
      })),
    decideReplacement: (assetId, decision, comment) =>
      setState((s) => ({
        ...s,
        replacementDecisions: [
          { assetId, decision, decidedBy: currentUser.id, decidedAt: today(), comment },
          ...s.replacementDecisions.filter((d) => d.assetId !== assetId),
        ],
        assetEvents: [
          ...s.assetEvents,
          {
            id: `ae-${Date.now()}`,
            assetId,
            at: today(),
            type: "csere_dontes",
            actorId: currentUser.id,
            title: "Csereigény döntés",
            detail: decision,
          },
        ],
      })),
    markLicenceUnused: (licenceId, unused) =>
      setState((s) => ({
        ...s,
        licences: s.licences.map((l) =>
          l.id === licenceId ? { ...l, reportedUnused: unused } : l,
        ),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "licenc",
            entityId: licenceId,
            action: unused ? "Licenc nem használtnak jelölve" : "Licenc újra használatban",
            detail: "",
          },
          ...s.assetAudit,
        ],
      })),
    createPlanItemFromRequest: (requestId) =>
      setState((s) => {
        const request = s.requests.find((r) => r.id === requestId);
        if (!request) return s;
        if (s.planItems.some((p) => p.sourceRequestId === requestId)) return s;
        const item: ProcurementPlanItem = {
          ...planItemFromRequest(request, {
            products: s.products ?? [],
            categories: s.productCategories ?? [],
          }),
          id: `pp-req-${requestId}-${Date.now()}`,
        };
        return {
          ...s,
          planItems: [item, ...s.planItems],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: item.id,
              action: "Beszerzési tervsor létrehozása igényből",
              detail: `${requestId} · ${item.planYear} ${item.quarter}`,
            },
            ...s.assetAudit,
          ],
          notifications: [
            {
              id: `n-${Date.now()}`,
              requestId,
              at: today(),
              read: false,
              text: `${requestId} – az igény bekerült a ${item.planYear}. évi beszerzési tervbe (${item.quarter}).`,
            },
            ...s.notifications,
          ],
        };
      }),
    addPlanItem: (item) => {
      const id = `pp-${Date.now()}`;
      setState((s) => ({
        ...s,
        planItems: [...s.planItems, { ...item, id }],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Beszerzési terv tétel létrehozása",
            detail: `${item.planYear} ${item.quarter} · ${item.quantity} db`,
          },
          ...s.assetAudit,
        ],
      }));
      return id;
    },
    updatePlanItem: (id, patch) =>
      setState((s) => {
        const priceKeys = [
          "unitPriceOverride",
          "quantity",
          "priceChangePct",
          "inflationPct",
          "quantityDiscountPct",
          "productId",
        ];
        const touchesPrice = Object.keys(patch).some((k) => priceKeys.includes(k));
        const next: PersistedState = {
          ...s,
          planItems: s.planItems.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: id,
              action: "Beszerzési terv tétel módosítása",
              detail: Object.keys(patch).join(", "),
            },
            ...s.assetAudit,
          ],
        };
        return touchesPrice
          ? applyBudgetCheck(
              next,
              id,
              "tervezes",
              "Tervsor módosítása (ár/darabszám)",
              currentUser.id,
            )
          : next;
      }),
    reschedulePlanItem: (id, planYear, quarter, comment) =>
      setState((s) => {
        const prev = s.planItems.find((p) => p.id === id);
        return {
          ...s,
          planItems: s.planItems.map((p) =>
            p.id === id
              ? {
                  ...p,
                  planYear,
                  quarter,
                  rescheduledBy: currentUser.id,
                  rescheduledAt: today(),
                  comment: comment?.trim() ? comment.trim() : p.comment,
                }
              : p,
          ),
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: id,
              action: "Beszerzési tétel átütemezése (gazdasági vezető)",
              detail: `${prev ? `${prev.planYear} ${prev.quarter}` : "?"} → ${planYear} ${quarter}${comment?.trim() ? ` · ${comment.trim()}` : ""}`,
            },
            ...s.assetAudit,
          ],
        };
      }),
    removePlanItem: (id) =>
      setState((s) => ({
        ...s,
        planItems: s.planItems.filter((p) => p.id !== id),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Beszerzési terv tétel törlése",
            detail: "",
          },
          ...s.assetAudit,
        ],
      })),
    handPlanItemToPlanner: (id) =>
      setState((s) => ({
        ...s,
        planItems: s.planItems.map((p) =>
          p.id === id ? { ...p, handedToPlannerBy: currentUser.id, handedToPlannerAt: today() } : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text: "Új eszközigény érkezett tervezésre az IT eszközmenedzserhez.",
            read: false,
          },
          ...s.notifications,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Eszközigény átadása IT eszközmenedzsernek",
            detail: "",
          },
          ...s.assetAudit,
        ],
      })),
    createScrapProposal: (input) => {
      const id = `sc-${Date.now()}`;
      setState((s) => ({
        ...s,
        scrapProposals: [
          {
            id,
            year: input.year,
            title: input.title,
            reason: input.reason,
            assetIds: input.assetIds,
            status: "tervezes",
            createdBy: currentUser.id,
            createdAt: today(),
            history: [
              { at: today(), actorId: currentUser.id, action: "Selejtezési javaslat létrehozva" },
            ],
          },
          ...(s.scrapProposals ?? []),
        ],
      }));
      return id;
    },
    updateScrapProposal: (id, patch) =>
      setState((s) => ({
        ...s,
        scrapProposals: (s.scrapProposals ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
      })),
    submitScrapProposal: (id) =>
      setState((s) => ({
        ...s,
        scrapProposals: (s.scrapProposals ?? []).map((p) =>
          p.id === id
            ? {
                ...p,
                status: "gazdasagi_jovahagyasra_var",
                submittedAt: today(),
                history: [
                  ...(p.history ?? []),
                  {
                    at: today(),
                    actorId: currentUser.id,
                    action: "Beküldve gazdasági vezetői jóváhagyásra",
                  },
                ],
              }
            : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text: "Éves selejtezési javaslat érkezett gazdasági vezetői jóváhagyásra.",
            read: false,
          },
          ...s.notifications,
        ],
      })),
    decideScrapProposal: (id, decision, comment) =>
      setState((s) => ({
        ...s,
        scrapProposals: (s.scrapProposals ?? []).map((p) =>
          p.id === id
            ? {
                ...p,
                status: decision,
                decidedBy: currentUser.id,
                decidedAt: today(),
                comment,
                history: [
                  ...(p.history ?? []),
                  {
                    at: today(),
                    actorId: currentUser.id,
                    action:
                      decision === "jovahagyva"
                        ? "Gazdasági vezetői jóváhagyás"
                        : "Gazdasági vezető átdolgozásra visszaküldte",
                    comment,
                  },
                ],
              }
            : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text:
              decision === "jovahagyva"
                ? "A selejtezési javaslatot a gazdasági vezető jóváhagyta."
                : "A selejtezési javaslat átdolgozásra visszakerült.",
            read: false,
          },
          ...s.notifications,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action:
              decision === "jovahagyva"
                ? "Selejtezési javaslat jóváhagyása"
                : "Selejtezési javaslat visszaküldése",
            detail: comment ?? "",
          },
          ...s.assetAudit,
        ],
      })),
    setPlanItemTiming: (id, timing) =>
      setState((s) => ({
        ...s,
        planItems: s.planItems.map((p) => (p.id === id ? { ...p, timing } : p)),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Beszerzési bontás módosítása",
            detail: timing === "azonnali" ? "Azonnali beszerzés" : "Negyedéves terv",
          },
          ...s.assetAudit,
        ],
      })),
    nudgePlanSubmission: (id) =>
      setState((s) => ({
        ...s,
        planApprovals: (s.planApprovals ?? []).map((p) =>
          p.id === id
            ? {
                ...p,
                history: [
                  ...(p.history ?? []),
                  {
                    at: today(),
                    actorId: currentUser.id,
                    action: "Gazdasági vezetői sürgetés: terv beküldése ellenőrzésre",
                  },
                ],
              }
            : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text: "A gazdasági vezető kéri a beszerzési terv beküldését ellenőrzésre.",
            read: false,
          },
          ...s.notifications,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Terv beküldésének sürgetése",
            detail: "Gazdasági vezetői jelzés az IT eszközmenedzsernek.",
          },
          ...s.assetAudit,
        ],
      })),
    submitPlanForFinance: (id, comment) =>
      setState((s) => ({
        ...s,
        planApprovals: (s.planApprovals ?? []).map((p) =>
          p.id === id
            ? {
                ...p,
                status: "gazdasagi_ellenorzes",
                submittedBy: currentUser.id,
                submittedAt: today(),
                comment,
                history: [
                  ...(p.history ?? []),
                  {
                    at: today(),
                    actorId: currentUser.id,
                    action: "Terv beküldve gazdasági ellenőrzésre",
                    comment,
                  },
                ],
              }
            : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text: "Beszerzési terv gazdasági vezetői ellenőrzésre érkezett.",
            read: false,
          },
          ...s.notifications,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action: "Terv beküldése gazdasági ellenőrzésre",
            detail: comment ?? "",
          },
          ...s.assetAudit,
        ],
      })),
    financeReviewPlan: (id, decision, comment) =>
      setState((s) => ({
        ...s,
        planApprovals: (s.planApprovals ?? []).map((p) =>
          p.id === id
            ? {
                ...p,
                status: decision === "tovabb" ? "jovahagyva" : "visszakuldve",
                reviewedBy: currentUser.id,
                reviewedAt: today(),
                comment,
                history: [
                  ...(p.history ?? []),
                  {
                    at: today(),
                    actorId: currentUser.id,
                    action:
                      decision === "tovabb"
                        ? "Gazdasági vezetői jóváhagyás – a terv visszakerült a beszerzőhöz"
                        : "Gazdasági vezető átdolgozásra visszaküldte a beszerzőnek",
                    comment,
                  },
                ],
              }
            : p,
        ),
        notifications: [
          {
            id: `n-${Date.now()}`,
            at: today(),
            text:
              decision === "tovabb"
                ? "Beszerzési terv jóváhagyva – a beszerzés indítható."
                : "Beszerzési terv átdolgozásra visszakerült a beszerzőhöz.",
            read: false,
          },
          ...s.notifications,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "beszerzes",
            entityId: id,
            action:
              decision === "tovabb"
                ? "Beszerzési terv jóváhagyása"
                : "Terv visszaküldése a beszerzőnek",
            detail: comment ?? "",
          },
          ...s.assetAudit,
        ],
      })),
    startPlanExecution: (id) =>
      setState((s) => {
        const target = (s.planApprovals ?? []).find((p) => p.id === id);
        const inScope = (p: (typeof s.planItems)[number]) => {
          if (!target) return false;
          if (p.planYear !== target.planYear) return false;
          if (target.scope === "eves") return true;
          // A tételhez ténylegesen tartozó jóváhagyási ciklus dönt, hogy a
          // jóváhagyás után beszerzésbe kerül-e.
          const own = planApprovalForItem(p, s.planApprovals ?? []);
          if (own) return own.id === target.id;
          // Ütemezés nélküli tétel a saját negyedévének ciklusához tartozik.
          return target.scope === "negyedeves" && p.quarter === target.quarter;
        };
        return {
          ...s,
          // D12: a tételek beszerzése egyenként, rendelési rekorddal indul; a csomag
          // indítása csak a végrehajtási szakaszt nyitja meg.
          planItems: s.planItems,
          planApprovals: (s.planApprovals ?? []).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: "vegrehajtas",
                  executionStartedBy: currentUser.id,
                  executionStartedAt: today(),
                  history: [
                    ...(p.history ?? []),
                    {
                      at: today(),
                      actorId: currentUser.id,
                      action: "Beszerzés elindítva a jóváhagyott terv alapján",
                    },
                  ],
                }
              : p,
          ),
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: id,
              action: "Beszerzés indítása jóváhagyott terv alapján",
              detail: "",
            },
            ...s.assetAudit,
          ],
        };
      }),
    decidePlanApproval: (id, decision, comment) =>
      setState((s) => {
        const target = (s.planApprovals ?? []).find((p) => p.id === id);
        return {
          ...s,
          planApprovals: (s.planApprovals ?? []).map((p) =>
            p.id === id
              ? {
                  ...p,
                  status: decision,
                  decidedBy: currentUser.id,
                  decidedAt: today(),
                  comment,
                  history: [
                    ...(p.history ?? []),
                    {
                      at: today(),
                      actorId: currentUser.id,
                      action:
                        decision === "jovahagyva"
                          ? "Gazdasági vezetői jóváhagyás – a terv visszakerült a beszerzőhöz"
                          : "Gazdasági vezető átdolgozásra visszaküldte",
                      comment,
                    },
                  ],
                }
              : p,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              text: target
                ? `${target.planYear}. évi ${target.quarter ? `${target.quarter} negyedéves` : target.scope === "azonnali" ? "azonnali" : "éves"} beszerzési terv: ${
                    decision === "jovahagyva"
                      ? "a gazdasági vezetői jóváhagyás megtörtént, indítható a beszerzés"
                      : "átdolgozásra visszaküldve"
                  }.`
                : "Beszerzési terv döntés rögzítve.",
              read: false,
            },
            ...s.notifications,
          ],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: id,
              action:
                decision === "jovahagyva"
                  ? "Terv gazdasági vezetői jóváhagyása"
                  : "Terv visszaküldése átdolgozásra",
              detail: comment ?? "",
            },
            ...s.assetAudit,
          ],
        };
      }),

    startItemProcurement: (planItemId, orderInput) => {
      const item = state.planItems.find((p) => p.id === planItemId);
      if (!item) return "A beszerzési tétel nem található.";
      const rule = canStartProcurement(
        item,
        { planApprovals: state.planApprovals ?? [], handovers: state.handovers ?? [] },
        state.activeRole,
      );
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      const orderRule = validateOrderInput(orderInput);
      if (!orderRule.allowed) return orderRule.reason ?? "A rendelési adatok hiányosak.";
      const order = {
        supplier: orderInput.supplier.trim(),
        orderNumber: orderInput.orderNumber.trim(),
        orderedAt: today(),
        expectedArrival: orderInput.expectedArrival,
        actualUnitNet: orderInput.actualUnitNet,
        actualUnitGross: orderInput.actualUnitGross,
        note: orderInput.note?.trim() || undefined,
      };
      setState((s) =>
        applyBudgetCheck(
          {
            ...s,
            planItems: s.planItems.map((p) =>
              p.id === planItemId
                ? { ...p, status: "beszerzes_alatt", order, expectedArrival: order.expectedArrival }
                : p,
            ),
            notifications: item.sourceRequestId
              ? [
                  {
                    id: `n-${Date.now()}`,
                    at: today(),
                    read: false,
                    requestId: item.sourceRequestId,
                    text: `${item.deviceName ?? standardLabel(item.standardKey)}: a beszerzés elindult – szállító: ${order.supplier}, rendelésszám: ${order.orderNumber}, várható érkezés: ${formatHuDate(order.expectedArrival)}.`,
                  },
                  ...s.notifications,
                ]
              : s.notifications,
            assetAudit: [
              {
                id: `aud-${Date.now()}`,
                at: today(),
                actorId: currentUser.id,
                entity: "beszerzes",
                entityId: planItemId,
                action: "Beszerzés indítva – rendelés rögzítve",
                detail: `${item.deviceName ?? standardLabel(item.standardKey)} · ${order.supplier} · ${order.orderNumber} · várható érkezés: ${order.expectedArrival}${order.actualUnitGross ? ` · bruttó egységár: ${order.actualUnitGross.toLocaleString("hu-HU")} Ft` : ""}`,
              },
              ...s.assetAudit,
            ],
          },
          planItemId,
          "beszerzes",
          "Tényleges ár a rendelésben",
          currentUser.id,
        ),
      );
      return null;
    },

    markPlanItemDelivered: (planItemId, input) => {
      const current = state.planItems.find((p) => p.id === planItemId);
      if (!current) return "A beszerzési tétel nem található.";
      const rule = canMarkDelivered(
        current,
        { planApprovals: state.planApprovals ?? [], handovers: state.handovers ?? [] },
        state.activeRole,
      );
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      const qtyRule = validateDeliveryQuantity(current, input.quantity);
      if (!qtyRule.allowed) return qtyRule.reason ?? "Érvénytelen darabszám.";
      setState((s) => {
        const item = s.planItems.find((p) => p.id === planItemId);
        if (
          !item ||
          remainingQuantity(item, handoversForItem(item, s.handovers ?? []).length) < input.quantity
        )
          return s;
        const request = item.sourceRequestId
          ? s.requests.find((r) => r.id === item.sourceRequestId)
          : undefined;
        const recipientId = request?.requesterId ?? currentUser.id;
        const orgUnitId = request?.orgUnitId ?? item.orgUnitId;
        const referentId = resolveItReferent(effectiveUsers, orgUnitId);
        const deviceName = item.deviceName ?? standardLabel(item.standardKey);
        const modelKey = item.modelKey ?? modelKeyForStandard(item.standardKey) ?? "";
        const productId = item.productId ?? request?.productId;
        const alreadyDelivered = handoversForItem(item, s.handovers ?? []).length;
        const total = item.quantity || 1;
        const unitGross = item.order?.actualUnitGross ?? item.unitPriceOverride ?? 0;
        const stamp = Date.now();
        const deliveryId = `dl-${stamp}`;

        // D16: minden beérkezett darab azonnal leltári számot kap, raktári állapottal.
        const newAssets: Asset[] = [];
        const newHandovers: AssetHandover[] = [];
        for (let i = 0; i < input.quantity; i += 1) {
          const pieceIndex = alreadyDelivered + i + 1;
          const assetId = `as-${stamp}-${pieceIndex}`;
          const inventoryNo = nextInventoryNo([...s.assets, ...newAssets]);
          newAssets.push({
            id: assetId,
            inventoryNo,
            deviceId: assetId,
            categoryKey: item.categoryKey,
            modelKey,
            productId,
            serial: "",
            usage: "szemelyi",
            custodianUserId: referentId,
            inventoryResponsibleId: referentId ?? currentUser.id,
            orgUnitId: item.orgUnitId,
            locationId: "loc-it-raktar",
            holding: "raktar",
            purpose: deviceName,
            purchaseDate: today(),
            commissionDate: today(),
            purchaseValue: unitGross,
            fundingSourceId: item.fundingSourceId,
            costCenter: item.orgUnitId,
            warrantyEnd: `${new Date().getUTCFullYear() + 3}-12-31`,
            condition: "kifogastalan",
            active: true,
            reportedIssues: 0,
            repairCount: 0,
            businessCritical: false,
            note: `Beérkezés a beszerzésből (${planItemId}${item.order ? ` · ${item.order.supplier} · ${item.order.orderNumber}` : ""}) – ${pieceIndex}/${total}. darab, raktáron`,
          });
          newHandovers.push({
            id: `ho-${stamp}-${pieceIndex}`,
            planItemId,
            requestId: item.sourceRequestId,
            recipientId,
            orgUnitId,
            referentId,
            deviceName,
            productId,
            modelKey: modelKey || undefined,
            inventoryNo,
            assetId,
            pieceIndex,
            pieceCount: total,
            replacedAssetId:
              pieceIndex === 1
                ? (request?.replacedAssetId ?? item.replacedAssetIds?.[0])
                : undefined,
            status: "beerkezett",
            createdAt: today(),
            history: [
              {
                at: today(),
                actorId: currentUser.id,
                action:
                  total > 1
                    ? `Eszköz beérkezett a beszerzésből (${pieceIndex}/${total}. darab) – leltárba véve, raktáron`
                    : "Eszköz beérkezett a beszerzésből – leltárba véve, raktáron",
                comment: input.note?.trim() || undefined,
              },
            ],
          });
        }
        const delivered = alreadyDelivered + input.quantity;
        const partial = delivered < total;
        return {
          ...s,
          assets: [...newAssets, ...s.assets],
          handovers: [...newHandovers, ...(s.handovers ?? [])],
          planItems: s.planItems.map((p) =>
            p.id === planItemId
              ? {
                  ...p,
                  status: "beszerzes_alatt",
                  deliveries: [
                    ...(p.deliveries ?? []),
                    {
                      id: deliveryId,
                      at: today(),
                      actorId: currentUser.id,
                      quantity: input.quantity,
                      note: input.note?.trim() || undefined,
                      assetIds: newAssets.map((a) => a.id),
                    },
                  ],
                }
              : p,
          ),
          notifications: [
            {
              id: `n-${stamp}`,
              at: today(),
              read: false,
              requestId: item.sourceRequestId,
              text: partial
                ? `${deviceName}: ${delivered}/${total} db beérkezett (részteljesítés) – a kari IT referens telepítésre átvette, a többi darab beszerzés alatt.`
                : total > 1
                  ? `${deviceName}: mind a ${total} db beérkezett – a kari IT referens telepítésre és átadásra átvette.`
                  : `${deviceName} beérkezett – a kari IT referens telepítésre és átadásra átvette.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            ...newAssets.map((a, i) => ({
              id: `aud-${stamp}-a${i}`,
              at: today(),
              actorId: currentUser.id,
              entity: "asset" as const,
              entityId: a.id,
              action: "Leltárba vétel beérkezéskor (raktáron)",
              detail: `${a.purpose} · ${a.inventoryNo}`,
            })),
            {
              id: `aud-${stamp}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: planItemId,
              action: partial ? "Részteljesítés rögzítve" : "Beszerzett eszköz beérkezése rögzítve",
              detail: `${deviceName} · ${input.quantity} db (${delivered}/${total})${input.note ? ` · ${input.note.trim()}` : ""}`,
            },
            ...s.assetAudit,
          ],
        };
      });
      return null;
    },
    updateHandover: (id, patch, label) =>
      setState((s) => ({
        ...s,
        handovers: (s.handovers ?? []).map((h) =>
          h.id === id
            ? {
                ...h,
                ...patch,
                history: label
                  ? [...h.history, { at: today(), actorId: currentUser.id, action: label }]
                  : h.history,
              }
            : h,
        ),
        assetAudit: label
          ? [
              {
                id: `aud-${Date.now()}`,
                at: today(),
                actorId: currentUser.id,
                entity: "leltar",
                entityId: id,
                action: label,
                detail: Object.keys(patch).join(", "),
              },
              ...s.assetAudit,
            ]
          : s.assetAudit,
      })),
    handOverToUser: (id, comment) =>
      setState((s) => {
        const h = (s.handovers ?? []).find((x) => x.id === id);
        if (!h) return s;
        // 7. lépés: csak befejezett konfigurálás után, csak a kari IT referens.
        if (!canHandOverToUser(h, s.activeRole).allowed) return s;
        // A leltártétel már az átadáskor létrejön „Átvételre vár” státusszal,
        // hogy az eszköz azonnal megjelenjen a címzett leltárában.
        const catalogCtx = {
          products: s.products ?? [],
          categories: s.productCategories ?? [],
          requests: s.requests,
        };
        const catalogProduct = productForHandover(h, catalogCtx);
        const invId = h.inventoryItemId ?? `inv-${Date.now()}`;
        const item: InventoryItem = {
          id: invId,
          ownerId: h.recipientId,
          kind: "hardver",
          name: handoverPurposeTitle(h, catalogCtx),
          modelKey: h.modelKey,
          productId: catalogProduct?.id,
          serial: h.serial,
          inventoryNo: h.inventoryNo,
          building: h.building,
          room: h.room,
          note: `Beszerzési folyamatból átadva (${h.planItemId})${h.note ? ` · ${h.note}` : ""}`,
          spec: catalogProduct ? specFromProduct(catalogProduct) : specForModel(h.modelKey),
          status: "atvetelre_var",
          createdAt: today(),
        };
        const alreadyInInventory = s.inventory.some((i) => i.id === invId);
        // D13: csere esetén a régi eszköz sorsa az átadással együtt rögzül a kataszterben.
        const oldAsset = h.replacedAssetId
          ? s.assets.find((a) => a.id === h.replacedAssetId)
          : undefined;
        const disposition = h.oldAssetDisposition;
        const dispositionLabel =
          oldAsset && disposition
            ? `Régi eszköz (${oldAsset.inventoryNo}): ${OLD_ASSET_DISPOSITION_LABELS[disposition]}${
                h.oldAssetNote ? ` – ${h.oldAssetNote}` : ""
              }`
            : undefined;
        const assets =
          oldAsset && disposition
            ? s.assets.map((a) => {
                if (a.id !== oldAsset.id) return a;
                const tag = `Csere átadásakor (${h.id}): ${OLD_ASSET_DISPOSITION_LABELS[disposition]}`;
                const note = a.note ? `${a.note} · ${tag}` : tag;
                if (disposition === "raktar")
                  return {
                    ...a,
                    assignedUserId: undefined,
                    custodianUserId: currentUser.id,
                    inventoryResponsibleId: currentUser.id,
                    note,
                  };
                if (disposition === "selejt")
                  return { ...a, lifecycleStatusOverride: "selejtezesre_var" as const, note };
                return { ...a, note };
              })
            : s.assets;
        const repeated = (h.objections ?? []).length > 0;
        // D16: átadáskor a beérkezéskor leltárba vett eszköz a személyhez kerül.
        const recipientLoc = resolveAssetLocation(h);
        const assetsWithHandover = h.assetId
          ? assets.map((a) =>
              a.id === h.assetId
                ? {
                    ...a,
                    holding: "hasznalatban" as const,
                    assignedUserId: h.recipientId,
                    custodianUserId: undefined,
                    inventoryResponsibleId: h.referentId ?? currentUser.id,
                    orgUnitId: h.orgUnitId,
                    locationId: recipientLoc?.id ?? a.locationId,
                    serial: h.serial ?? a.serial,
                    deviceId: h.serial ?? a.deviceId,
                    inventoryNo: h.inventoryNo ?? a.inventoryNo,
                    commissionDate: today(),
                    note: `${a.note ?? ""}${a.note ? " · " : ""}Átadva: ${lookup.user(h.recipientId)?.name ?? h.recipientId}`,
                  }
                : a,
            )
          : assets;
        return {
          ...s,
          assets: assetsWithHandover,
          inventory: alreadyInInventory ? s.inventory : [item, ...s.inventory],
          handovers: (s.handovers ?? []).map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "atadva",
                  handedOverAt: today(),
                  referentId: x.referentId ?? currentUser.id,
                  inventoryItemId: invId,
                  history: [
                    ...x.history,
                    {
                      at: today(),
                      actorId: currentUser.id,
                      action: repeated
                        ? "Eszköz a kifogás kezelése után ismét átadva az igénylőnek"
                        : "Eszköz telepítve, beállítva és átadva az igénylőnek",
                      comment: [comment, dispositionLabel].filter(Boolean).join(" · ") || undefined,
                    },
                  ],
                }
              : x,
          ),
          requests: s.requests.map((r) =>
            r.id === h.requestId
              ? {
                  ...r,
                  status: "atadasra_var",
                  updatedAt: today(),
                  nextStep: "Az eszköz átadva, átvételi visszaigazolásra vár.",
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: "Eszközátadás",
                      detail: `${h.deviceName}${h.serial ? ` · gyári szám: ${h.serial}` : ""}`,
                    },
                  ],
                }
              : r,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              requestId: h.requestId,
              text: `${h.deviceName} átadásra került – kérjük, igazolja vissza az átvételt a Személyi leltár oldalon.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            ...(oldAsset && disposition
              ? [
                  {
                    id: `aud-${Date.now()}-old`,
                    at: today(),
                    actorId: currentUser.id,
                    entity: "asset" as const,
                    entityId: oldAsset.id,
                    action: "Lecserélt eszköz sorsa rögzítve",
                    detail: dispositionLabel ?? "",
                  },
                ]
              : []),
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "leltar",
              entityId: id,
              action: "Eszköz átadása az igénylőnek",
              detail: `${h.deviceName}${comment ? ` · ${comment}` : ""}`,
            },
            ...s.assetAudit,
          ],
        };
      }),
    decideBudgetReview: (planItemId, reviewId, decision, comment) => {
      const item = state.planItems.find((p) => p.id === planItemId);
      const request = item?.sourceRequestId
        ? state.requests.find((r) => r.id === item.sourceRequestId)
        : undefined;
      const review = item?.budgetReviews?.find((r) => r.id === reviewId);
      const rule = canDecideBudgetReview(
        request,
        review,
        state.activeRole,
        currentUser.id,
        decision,
        comment ?? "",
      );
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      const text = comment?.trim() || undefined;
      setState((s) => {
        const cur = s.planItems.find((p) => p.id === planItemId);
        const rv = cur?.budgetReviews?.find((r) => r.id === reviewId);
        if (!cur || !rv || rv.status !== "fuggoben" || !cur.sourceRequestId) return s;
        const approved = decision === "jovahagyva";
        return {
          ...s,
          planItems: s.planItems.map((p) =>
            p.id === planItemId
              ? {
                  ...p,
                  budgetReviews: (p.budgetReviews ?? []).map((r) =>
                    r.id === reviewId
                      ? {
                          ...r,
                          status: decision,
                          decidedBy: currentUser.id,
                          decidedAt: today(),
                          comment: text,
                        }
                      : r,
                  ),
                }
              : p,
          ),
          requests: s.requests.map((r) =>
            r.id === cur.sourceRequestId
              ? {
                  ...r,
                  ...(approved
                    ? {
                        approvedBudgetGross: rv.newGross,
                        estimatedCost: rv.newGross,
                        budget: `${rv.newGross.toLocaleString("hu-HU")} Ft`,
                      }
                    : {}),
                  updatedAt: today(),
                  nextStep: approved
                    ? `A kerettúllépést a szervezeti jóváhagyó jóváhagyta, az új keret ${rv.newGross.toLocaleString("hu-HU")} Ft – a folyamat folytatódik.`
                    : `A kerettúllépést a szervezeti jóváhagyó elutasította${text ? `: ${text}` : "."} Olcsóbb modell vagy helyettesítés szükséges.`,
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: approved ? "Kerettúllépés jóváhagyása" : "Kerettúllépés elutasítása",
                      detail: `${rv.budgetGross.toLocaleString("hu-HU")} Ft → ${rv.newGross.toLocaleString("hu-HU")} Ft (+${rv.deltaPct}%)${text ? ` · ${text}` : ""}`,
                    },
                  ],
                }
              : r,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              requestId: cur.sourceRequestId,
              text: approved
                ? `${cur.deviceName ?? standardLabel(cur.standardKey)}: a kerettúllépés jóváhagyva, az új bruttó keret ${rv.newGross.toLocaleString("hu-HU")} Ft.`
                : `${cur.deviceName ?? standardLabel(cur.standardKey)}: a kerettúllépést elutasították${text ? ` („${text}”)` : ""} – az IT eszközmenedzser / a beszerző olcsóbb megoldást keres.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: planItemId,
              action: approved ? "Kerettúllépés jóváhagyva" : "Kerettúllépés elutasítva",
              detail: `+${rv.deltaPct}%${text ? ` · ${text}` : ""}`,
            },
            ...s.assetAudit,
          ],
        };
      });
      return null;
    },
    reportProcurementBlock: (planItemId, input) => {
      const item = state.planItems.find((p) => p.id === planItemId);
      if (!item) return "A beszerzési tétel nem található.";
      const rule = canReportProcurementBlock(
        item,
        state.activeRole,
        input.reason,
        handoversForItem(item, state.handovers ?? []).length,
      );
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      if (input.substitute && (!input.substitute.deviceName || input.substitute.unitGross <= 0))
        return "A helyettesítő modell neve és bruttó egységára kötelező.";
      const reason = input.reason.trim();
      setState((s) => {
        const cur = s.planItems.find((p) => p.id === planItemId);
        if (!cur) return s;
        const name = cur.deviceName ?? standardLabel(cur.standardKey);
        const sub = input.substitute;
        if (!sub) {
          // Nincs helyettesítő: a beszerzés meghiúsul, az igény lezárul, új igény adható be.
          return {
            ...s,
            planItems: s.planItems.map((p) =>
              p.id === planItemId
                ? {
                    ...p,
                    status: "meghiusult",
                    failure: { at: today(), byId: currentUser.id, reason },
                  }
                : p,
            ),
            requests: s.requests.map((r) =>
              r.id === cur.sourceRequestId
                ? {
                    ...r,
                    status: "meghiusult",
                    updatedAt: today(),
                    nextStep: `A beszerzés meghiúsult: ${reason} Új igény adható be.`,
                    audit: [
                      ...r.audit,
                      {
                        id: `a-${Date.now()}`,
                        at: today(),
                        actorId: currentUser.id,
                        action: "Beszerzés meghiúsult",
                        detail: reason,
                      },
                    ],
                  }
                : r,
            ),
            notifications: [
              {
                id: `n-${Date.now()}`,
                at: today(),
                read: false,
                requestId: cur.sourceRequestId,
                text: `${name}: a beszerzés meghiúsult („${reason}”), nincs helyettesítő modell – az ügy lezárult, új igény adható be.`,
              },
              ...s.notifications,
            ],
            assetAudit: [
              {
                id: `aud-${Date.now()}`,
                at: today(),
                actorId: currentUser.id,
                entity: "beszerzes",
                entityId: planItemId,
                action: "Beszerzés meghiúsult",
                detail: `${name} · ${reason}`,
              },
              ...s.assetAudit,
            ],
          };
        }
        const fromUnit = cur.order?.actualUnitGross ?? cur.unitPriceOverride ?? 0;
        const next: PersistedState = {
          ...s,
          planItems: s.planItems.map((p) =>
            p.id === planItemId
              ? {
                  ...p,
                  deviceName: sub.deviceName,
                  productId: sub.productId ?? p.productId,
                  modelKey: sub.modelKey ?? p.modelKey,
                  unitPriceOverride: sub.unitGross,
                  order: p.order ? { ...p.order, actualUnitGross: sub.unitGross } : p.order,
                  substitution: {
                    at: today(),
                    byId: currentUser.id,
                    reason,
                    fromDeviceName: name,
                    toDeviceName: sub.deviceName,
                    fromProductId: p.productId,
                    toProductId: sub.productId,
                    fromUnitGross: fromUnit,
                    toUnitGross: sub.unitGross,
                  },
                }
              : p,
          ),
          requests: s.requests.map((r) =>
            r.id === cur.sourceRequestId
              ? {
                  ...r,
                  updatedAt: today(),
                  nextStep: `Beszerzési akadály: ${reason} Helyettesítő modell: ${sub.deviceName} (${sub.unitGross.toLocaleString("hu-HU")} Ft/db).`,
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: "Helyettesítő modell",
                      detail: `${name} → ${sub.deviceName} · ${reason}`,
                    },
                  ],
                }
              : r,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              requestId: cur.sourceRequestId,
              text: `${name}: beszerzési akadály („${reason}”) – helyettesítő modell: ${sub.deviceName}, bruttó ${sub.unitGross.toLocaleString("hu-HU")} Ft/db.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beszerzes",
              entityId: planItemId,
              action: "Beszerzési akadály – helyettesítő modell",
              detail: `${name} → ${sub.deviceName} · ${fromUnit.toLocaleString("hu-HU")} Ft → ${sub.unitGross.toLocaleString("hu-HU")} Ft/db · ${reason}`,
            },
            ...s.assetAudit,
          ],
        };
        return applyBudgetCheck(
          next,
          planItemId,
          cur.order ? "beszerzes" : "tervezes",
          `Helyettesítő modell: ${sub.deviceName}`,
          currentUser.id,
        );
      });
      return null;
    },
    objectHandoverReceipt: (id, reason) => {
      const h = (state.handovers ?? []).find((x) => x.id === id);
      const rule = canObjectReceipt(h, state.activeRole, currentUser.id, reason);
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      const text = reason.trim();
      setState((s) => {
        const cur = (s.handovers ?? []).find((x) => x.id === id);
        if (!cur || cur.status !== "atadva") return s;
        return {
          ...s,
          // Az átadáskor „Átvételre vár” státusszal létrejött leltártétel visszakerül,
          // az eszköz fizikailag a referensnél van, amíg a kifogást kezeli.
          inventory: cur.inventoryItemId
            ? s.inventory.filter((i) => i.id !== cur.inventoryItemId)
            : s.inventory,
          handovers: (s.handovers ?? []).map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "kifogasolva",
                  handedOverAt: undefined,
                  inventoryItemId: undefined,
                  objections: [
                    ...(x.objections ?? []),
                    { at: today(), byId: currentUser.id, reason: text },
                  ],
                  history: [
                    ...x.history,
                    {
                      at: today(),
                      actorId: currentUser.id,
                      action: "Átvételi kifogás – az eszköz visszakerült a kari IT referenshez",
                      comment: text,
                    },
                  ],
                }
              : x,
          ),
          requests: s.requests.map((r) =>
            r.id === cur.requestId
              ? {
                  ...r,
                  status: "megvalositas",
                  updatedAt: today(),
                  nextStep: `Átvételi kifogás: „${text}” – a kari IT referens kezeli, majd ismét átadja az eszközt.`,
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: "Átvételi kifogás",
                      detail: text,
                    },
                  ],
                }
              : r,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              requestId: cur.requestId,
              text: `${cur.deviceName}: az igénylő átvételi kifogást jelzett („${text}”) – a kari IT referens teendője a kezelése.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "leltar",
              entityId: id,
              action: "Átvételi kifogás rögzítve",
              detail: `${cur.deviceName} · ${text}`,
            },
            ...s.assetAudit,
          ],
        };
      });
      return null;
    },
    resolveHandoverObjection: (id, resolution) => {
      const h = (state.handovers ?? []).find((x) => x.id === id);
      const rule = canResolveObjection(h, state.activeRole, resolution);
      if (!rule.allowed) return rule.reason ?? "A művelet jelenleg nem végezhető el.";
      const text = resolution.trim();
      setState((s) => {
        const cur = (s.handovers ?? []).find((x) => x.id === id);
        if (!cur || cur.status !== "kifogasolva") return s;
        const objections = (cur.objections ?? []).map((o, i, arr) =>
          i === arr.length - 1 && !o.resolvedAt
            ? { ...o, resolvedAt: today(), resolvedBy: currentUser.id, resolution: text }
            : o,
        );
        return {
          ...s,
          handovers: (s.handovers ?? []).map((x) =>
            x.id === id
              ? {
                  ...x,
                  status: "atadasra_kesz",
                  referentId: x.referentId ?? currentUser.id,
                  objections,
                  history: [
                    ...x.history,
                    {
                      at: today(),
                      actorId: currentUser.id,
                      action: "Kifogás kezelve – az eszköz ismét átadásra kész",
                      comment: text,
                    },
                  ],
                }
              : x,
          ),
          requests: s.requests.map((r) =>
            r.id === cur.requestId
              ? {
                  ...r,
                  updatedAt: today(),
                  nextStep: "A kifogás kezelve, az eszköz ismételt átadásra kész.",
                  audit: [
                    ...r.audit,
                    {
                      id: `a-${Date.now()}`,
                      at: today(),
                      actorId: currentUser.id,
                      action: "Kifogás kezelése",
                      detail: text,
                    },
                  ],
                }
              : r,
          ),
          notifications: [
            {
              id: `n-${Date.now()}`,
              at: today(),
              read: false,
              requestId: cur.requestId,
              text: `${cur.deviceName}: a kari IT referens kezelte a kifogást („${text}”) – az eszközt ismét átadja.`,
            },
            ...s.notifications,
          ],
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: currentUser.id,
              entity: "leltar",
              entityId: id,
              action: "Átvételi kifogás kezelve",
              detail: `${cur.deviceName} · ${text}`,
            },
            ...s.assetAudit,
          ],
        };
      });
      return null;
    },
    processSettings: state.processSettings ?? DEFAULT_PROCESS_SETTINGS,
    updateProcessSettings: (next) =>
      setState((s) => {
        const prev = s.processSettings ?? DEFAULT_PROCESS_SETTINGS;
        const clean = normalizeProcessSettings(next);
        const changes: { label: string; from: number; to: number }[] = [];
        for (const k of DEADLINE_STEP_KEYS)
          if (prev.deadlines[k] !== clean.deadlines[k])
            changes.push({
              label: `${DEADLINE_STEP_LABELS[k]} határideje (munkanap)`,
              from: prev.deadlines[k],
              to: clean.deadlines[k],
            });
        if (prev.reminderPct !== clean.reminderPct)
          changes.push({
            label: "Emlékeztető a határidő százalékánál",
            from: prev.reminderPct,
            to: clean.reminderPct,
          });
        if (prev.budgetTolerancePct !== clean.budgetTolerancePct)
          changes.push({
            label: "Költségkeret-küszöb (%)",
            from: prev.budgetTolerancePct,
            to: clean.budgetTolerancePct,
          });
        if (prev.receiptAutoCloseDays !== clean.receiptAutoCloseDays)
          changes.push({
            label: "Átvétel automatikus lezárása (munkanap)",
            from: prev.receiptAutoCloseDays,
            to: clean.receiptAutoCloseDays,
          });
        if (changes.length === 0) return s;
        return {
          ...s,
          processSettings: clean,
          assetAudit: [
            ...changes.map((c, i) => ({
              id: `aud-${Date.now()}-${i}`,
              at: today(),
              actorId: currentUser.id,
              entity: "beallitas" as const,
              entityId: "folyamat",
              action: "Folyamat-beállítás módosítva",
              detail: `${c.label}: ${c.from} → ${c.to}`,
            })),
            ...s.assetAudit,
          ],
        };
      }),
    confirmHandoverReceipt: (id, comment) =>
      setState((s) => confirmReceiptState(s, id, currentUser.id, comment, false)),

    resetDemo: (options) => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* tárolóhiba nem akadályozhatja az újraindítást */
      }
      // Determinisztikus kiindulóállapot: friss seed, korábbi demófutás nélkül.
      const base: PersistedState = { ...initialState, loggedIn: true };
      if (options?.leadershipDemo) {
        setState({ ...base, currentUserId: DEMO_REQUESTER_ID, activeRole: "igenylo" });
      } else {
        setState(base);
      }
    },
    activeAnnouncements: (state.announcements ?? []).filter(
      (a) =>
        a.active &&
        a.expiresAt >= today() &&
        (a.level === "fontos" || !(state.dismissedAnnouncements ?? []).includes(a.id)),
    ),
    addAnnouncement: (input) => {
      const id = `ann-${Date.now()}`;
      setState((s) => ({
        ...s,
        announcements: [
          { ...input, id, publishedAt: today(), createdBy: s.currentUserId },
          ...s.announcements,
        ],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "kozlemeny",
            entityId: id,
            action: "Közlemény közzététele",
            detail: `${input.title} · lejárat: ${input.expiresAt}`,
          },
          ...s.assetAudit,
        ],
      }));
      return id;
    },
    updateAnnouncement: (id, patch) =>
      setState((s) => ({
        ...s,
        announcements: s.announcements.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "kozlemeny",
            entityId: id,
            action: "Közlemény módosítása",
            detail: Object.keys(patch).join(", "),
          },
          ...s.assetAudit,
        ],
      })),
    removeAnnouncement: (id) =>
      setState((s) => ({
        ...s,
        announcements: s.announcements.filter((a) => a.id !== id),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: currentUser.id,
            entity: "kozlemeny",
            entityId: id,
            action: "Közlemény törlése",
            detail: "",
          },
          ...s.assetAudit,
        ],
      })),
    dismissAnnouncement: (id) =>
      setState((s) => ({
        ...s,
        dismissedAnnouncements: s.dismissedAnnouncements.includes(id)
          ? s.dismissedAnnouncements
          : [...s.dismissedAnnouncements, id],
      })),
    addUser: (input, reason) => {
      const id = `u-${Date.now().toString(36)}${Math.floor(Math.random() * 1000)}`;
      const initials = input.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]!.toUpperCase())
        .join("");
      const user: User = {
        ...input,
        id,
        initials,
        roles: input.roles.length > 0 ? input.roles : ["igenylo"],
      };
      setState((s) => ({
        ...s,
        extraUsers: [...(s.extraUsers ?? []), user],
        roleAudit: [
          ...user.roles.map((role, i) => ({
            id: `ra-${Date.now()}-n${i}`,
            at: today(),
            actorId: s.currentUserId,
            targetUserId: id,
            action: "megadva" as const,
            role,
            reason: `Új felhasználó létrehozása – ${reason}`,
          })),
          ...s.roleAudit,
        ],
      }));
      return id;
    },
    applyMemberImport: (plan, reason, fileName) => {
      const stamp = Date.now();
      const event: MemberImportEvent = {
        id: `mi-${stamp}`,
        at: today(),
        actorId: state.currentUserId,
        fileName,
        created: plan.creates.length,
        updated: plan.updates.filter((u) => u.changes.length > 0).length,
        deactivated: plan.deactivate.length,
        reactivated: plan.updates.filter((u) => u.reactivate).length,
        reason,
      };
      setState((s) => {
        // 1) új felhasználók (a fájlon belüli vezető-hivatkozások ideiglenes azonosítóit feloldva)
        const idOf = new Map<string, string>();
        const created: User[] = plan.creates.map((c, i) => {
          const id = `u-${stamp.toString(36)}${i}`;
          idOf.set(c.tempId, id);
          const initials = c.input.name
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((w) => w[0]!.toUpperCase())
            .join("");
          return { ...c.input, id, initials };
        });
        const fix = (m?: string) => (m && idOf.has(m) ? idOf.get(m) : m);
        for (const u of created) u.managerId = fix(u.managerId);
        // 2) felülírások a meglévőkre
        const userOverrides = { ...(s.userOverrides ?? {}) };
        const roleOverrides = { ...s.roleOverrides };
        const audit: RoleAuditEvent[] = [];
        const known = [...USERS, ...(s.extraUsers ?? [])];
        for (const up of plan.updates) {
          const { managerId: rawManager, ...rest } = up.patch;
          const fixedManager = fix(rawManager);
          const patch = fixedManager === undefined ? rest : { ...rest, managerId: fixedManager };
          userOverrides[up.userId] = { ...(userOverrides[up.userId] ?? {}), ...patch };
          if (up.roles) {
            const base = known.find((u) => u.id === up.userId);
            const prev = roleOverrides[up.userId] ?? base?.roles ?? [];
            up.roles
              .filter((r) => !prev.includes(r))
              .forEach((role, i) =>
                audit.push({
                  id: `ra-${stamp}-${up.userId}-a${i}`,
                  at: today(),
                  actorId: s.currentUserId,
                  targetUserId: up.userId,
                  action: "megadva",
                  role,
                  reason: `Taglista-frissítés (${fileName}) – ${reason}`,
                }),
              );
            prev
              .filter((r) => !up.roles!.includes(r))
              .forEach((role, i) =>
                audit.push({
                  id: `ra-${stamp}-${up.userId}-r${i}`,
                  at: today(),
                  actorId: s.currentUserId,
                  targetUserId: up.userId,
                  action: "visszavonva",
                  role,
                  reason: `Taglista-frissítés (${fileName}) – ${reason}`,
                }),
              );
            roleOverrides[up.userId] = up.roles;
          }
        }
        created.forEach((u) =>
          u.roles.forEach((role, i) =>
            audit.push({
              id: `ra-${stamp}-${u.id}-n${i}`,
              at: today(),
              actorId: s.currentUserId,
              targetUserId: u.id,
              action: "megadva",
              role,
              reason: `Taglista-frissítés (${fileName}) – új felhasználó – ${reason}`,
            }),
          ),
        );
        // 3) inaktiválás / újraaktiválás
        const reactivated = new Set(plan.updates.filter((u) => u.reactivate).map((u) => u.userId));
        const inactiveUserIds = Array.from(
          new Set([
            ...(s.inactiveUserIds ?? []).filter((id) => !reactivated.has(id)),
            ...plan.deactivate.map((d) => d.userId),
          ]),
        );
        return {
          ...s,
          extraUsers: [...(s.extraUsers ?? []), ...created],
          userOverrides,
          roleOverrides,
          inactiveUserIds,
          roleAudit: [...audit, ...s.roleAudit],
          memberImports: [event, ...(s.memberImports ?? [])],
        };
      });
      return event;
    },
    setUserRoles: (userId, roles, reason) =>
      setState((s) => {
        const base =
          USERS.find((u) => u.id === userId) ?? (s.extraUsers ?? []).find((u) => u.id === userId);
        if (!base) return s;
        const prev = s.roleOverrides[userId] ?? base.roles;
        const added = roles.filter((r) => !prev.includes(r));
        const removed = prev.filter((r) => !roles.includes(r));
        if (added.length === 0 && removed.length === 0) return s;
        const stamp = Date.now();
        const events: RoleAuditEvent[] = [
          ...added.map((role, i) => ({
            id: `ra-${stamp}-a${i}`,
            at: today(),
            actorId: s.currentUserId,
            targetUserId: userId,
            action: "megadva" as const,
            role,
            reason,
          })),
          ...removed.map((role, i) => ({
            id: `ra-${stamp}-r${i}`,
            at: today(),
            actorId: s.currentUserId,
            targetUserId: userId,
            action: "visszavonva" as const,
            role,
            reason,
          })),
        ];
        return {
          ...s,
          roleOverrides: { ...s.roleOverrides, [userId]: roles },
          roleAudit: [...events, ...s.roleAudit],
        };
      }),

    setUserTier: (userId, tier, reason) =>
      setState((s) => ({
        ...s,
        tierOverrides: { ...(s.tierOverrides ?? {}), [userId]: tier },
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: s.currentUserId,
            entity: "jogosultsag",
            entityId: userId,
            action: "Munkavállalói besorolás módosítása",
            detail: `${tier}${reason ? ` · ${reason}` : ""}`,
          },
          ...s.assetAudit,
        ],
      })),

    addProductCategory: (input) => {
      const id = `pc-${Date.now()}`;
      setState((s) => ({
        ...s,
        productCategories: [...(s.productCategories ?? []), { ...input, id }],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: s.currentUserId,
            entity: "termekkor",
            entityId: id,
            action: "Termékkör létrehozása",
            detail: input.name,
          },
          ...s.assetAudit,
        ],
      }));
      return id;
    },
    updateProductCategory: (id, patch) =>
      setState((s) => ({
        ...s,
        productCategories: (s.productCategories ?? []).map((c) =>
          c.id === id ? { ...c, ...patch } : c,
        ),
      })),
    removeProductCategory: (id) =>
      setState((s) => ({
        ...s,
        productCategories: (s.productCategories ?? []).filter((c) => c.id !== id),
        products: (s.products ?? []).filter((p) => p.categoryId !== id),
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: s.currentUserId,
            entity: "termekkor",
            entityId: id,
            action: "Termékkör törlése",
            detail: "A termékkör és a hozzá tartozó modellek törölve.",
          },
          ...s.assetAudit,
        ],
      })),
    addProduct: (input) => {
      const id = `prod-${Date.now()}`;
      setState((s) => ({
        ...s,
        products: [...(s.products ?? []), { ...input, id }],
        assetAudit: [
          {
            id: `aud-${Date.now()}`,
            at: today(),
            actorId: s.currentUserId,
            entity: "termek",
            entityId: id,
            action: "Termék felvétele a katalógusba",
            detail: `${input.name} · ${input.tier}`,
          },
          ...s.assetAudit,
        ],
      }));
      return id;
    },
    updateProduct: (id, patch) =>
      setState((s) => {
        // Aktív beszerzési folyamat mellett a tétel nem vehető ki a beszerezhetők közül.
        const deactivating = patch.active === false;
        if (
          deactivating &&
          productLockInfo(id, {
            requests: s.requests,
            planItems: s.planItems,
            handovers: s.handovers ?? [],
          }).locked
        ) {
          const { active: _ignored, ...rest } = patch;
          return {
            ...s,
            products: (s.products ?? []).map((p) => (p.id === id ? { ...p, ...rest } : p)),
          };
        }
        return {
          ...s,
          products: (s.products ?? []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
        };
      }),
    removeProduct: (id) =>
      setState((s) => {
        if (
          productLockInfo(id, {
            requests: s.requests,
            planItems: s.planItems,
            handovers: s.handovers ?? [],
          }).locked
        ) {
          return s;
        }
        return {
          ...s,
          products: (s.products ?? []).filter((p) => p.id !== id),
          assetAudit: [
            {
              id: `aud-${Date.now()}`,
              at: today(),
              actorId: s.currentUserId,
              entity: "termek",
              entityId: id,
              action: "Termék törlése a katalógusból",
              detail: "A korábbi igényeken az adatok megmaradnak.",
            },
            ...s.assetAudit,
          ],
        };
      }),
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

// Admin által létrehozott felhasználók modul-szintű tükre, hogy a statikus
// `lookup` segédfüggvények is feloldják őket (demó, egy fület feltételez).
const EXTRA_USERS: User[] = [];
let USER_OVERRIDES: Record<string, Partial<User>> = {};
function syncExtraUsers(users: User[], overrides: Record<string, Partial<User>> = {}) {
  EXTRA_USERS.length = 0;
  EXTRA_USERS.push(...users);
  USER_OVERRIDES = overrides;
}
function withOverrides(u: User | undefined): User | undefined {
  return u ? { ...u, ...(USER_OVERRIDES[u.id] ?? {}) } : undefined;
}

export const lookup = {
  user: (id?: string) =>
    withOverrides(USERS.find((u) => u.id === id) ?? EXTRA_USERS.find((u) => u.id === id)),
  userName: (id?: string) =>
    id === "u-system"
      ? "Rendszer"
      : (withOverrides(USERS.find((u) => u.id === id) ?? EXTRA_USERS.find((u) => u.id === id))
          ?.name ?? "Ismeretlen"),
  unit: (id?: string) => ORG_UNITS.find((o) => o.id === id)?.name ?? "—",
  team: (id?: string) => TEAMS.find((t) => t.id === id)?.name ?? "—",
  catalog: (id?: string) => CATALOG.find((c) => c.id === id),
  domain: (key?: string) => DOMAINS.find((d) => d.key === key),
  project: (id?: string) => PROJECTS.find((p) => p.id === id),
};

export { ALL_DOMAINS, CATALOG, DOMAINS, ORG_UNITS, PROJECTS, RESPONSIBILITIES, TEAMS, USERS };
