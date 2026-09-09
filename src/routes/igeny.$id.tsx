import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleDashed,
  Lock,
  MessageSquare,
  Paperclip,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AiBadge, PriorityBadge, StatusBadge } from "@/components/status-badge";
import { lookup, useStore } from "@/lib/store";
import {
  HANDOVER_MODE_LABELS,
  REQUEST_REASON_LABELS,
  requestedTimingLabel,
  ROLE_LABELS,
  STATUS_LABELS,
  STATUS_ORDER,
  type RoleKey,
  type StatusKey,
} from "@/lib/types";
import { PLAN_APPROVAL_STATUS_LABELS, QUARTER_LABELS } from "@/lib/asset-types";
import { canReviewProcurement } from "@/lib/access";
import { daysUntil } from "@/lib/plan-approvals";
import { RequestSituationCard } from "@/components/request-situation-card";
import { requestSituation } from "@/lib/request-situation";
import { ProcurementSummaryCard } from "@/components/procurement-summary-card";
import { ASSET_LOCATIONS, ASSET_MODELS } from "@/lib/asset-data";
import { similarAssetsFor } from "@/lib/similar-assets";
import { SimilarAssetNotice } from "@/components/similar-asset-notice";
import { WithdrawRequestButton } from "@/components/withdraw-request-button";
import { planApprovalForItem, withdrawBlockReason } from "@/lib/withdraw";
import { cn } from "@/lib/utils";
import { ViewOnlyNotice } from "@/components/view-only-notice";

export const Route = createFileRoute("/igeny/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.id} – igény adatlapja | ÁOK Digitális Szolgáltatási Portál` },
      {
        name: "description",
        content: "Az igény állapota, folyamata, kommunikációja, döntései és előzményei egy oldalon.",
      },
      { property: "og:title", content: `${params.id} – igény adatlapja` },
      {
        property: "og:description",
        content: "Igény állapota, felelősei és a következő lépés.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequestDetail,
});

const TIMELINE: StatusKey[] = [
  "bekuldve",
  "elso_ertekeles",
  "jovahagyasra_var",
  "elfogadva",
  "tervezes",
  "megvalositas",
  "teszteles",
  "atadasra_var",
  "lezarva",
];

function RequestDetail() {
  const { id } = Route.useParams();
  const store = useStore();
  const request = store.requests.find((r) => r.id === id);
  const [message, setMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [budget, setBudget] = useState(String(
    store.requests.find((r) => r.id === id)?.estimatedCost || "",
  ));

  if (!request) {
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <h1 className="font-display text-xl font-semibold">Az igény nem található</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Lehet, hogy az azonosító hibás, vagy nincs jogosultsága megtekinteni.
        </p>
        <Button asChild className="mt-6">
          <Link to="/igenyeim">Vissza az igényeimhez</Link>
        </Button>
      </div>
    );
  }

  const staff = ["ugyintezo", "szolgaltatasgazda", "admin"].includes(store.activeRole);
  /** Döntéshozók: teljes rálátás az ügy belső adataira, de módosítás nélkül. */
  const leader = ["vezeto", "dekan"].includes(store.activeRole);
  const fullView = staff || leader;
  const isRequester = request.requesterId === store.currentUser.id;
  const planItem = store.planItems.find((p) => p.sourceRequestId === request.id);
  const pendingApproval = request.approvals.find(
    (a) => a.decision === "fuggoben" && a.approverId === store.currentUser.id,
  );
  /** Az igény elsődleges (szervezeti) jóváhagyója rögzíti a költségkeretet. */
  const isPrimaryApprover =
    !!pendingApproval && request.approvals[0]?.id === pendingApproval.id;
  /** Az igénylő leltárában lévő, a kért termékkörhöz illeszkedő eszközök. */
  const requestCategory = store.productCategories.find((c) => c.id === request.productCategoryId);
  const similarAssets = similarAssetsFor(
    store.assets,
    request.requesterId,
    request.productCategoryId,
    requestCategory?.personalUse === true,
  );
  const visibleMessages = request.messages.filter((m) => fullView || !m.internal);
  const currentIndex = TIMELINE.indexOf(request.status);

  /** A beszerzési szakasz állapota: tervsor → tervjóváhagyás → beszerzés → átadás. */
  const handover = (store.handovers ?? []).find(
    (h) => h.requestId === request.id || (planItem && h.planItemId === planItem.id),
  );
  const planApproval = planItem
    ? planApprovalForItem(planItem, store.planApprovals ?? [])
    : undefined;
  /** Ha a visszavonás már nem lehetséges, ezt a rövid indoklást írjuk ki. */
  const withdrawBlocked = withdrawBlockReason(request, {
    planItems: store.planItems,
    planApprovals: store.planApprovals ?? [],
    handovers: store.handovers ?? [],
  });
  const planApproved =
    !!planApproval && ["jovahagyva", "vegrehajtas", "lezarva"].includes(planApproval.status);
  const pendingApprovers = request.approvals
    .filter((a) => a.decision === "fuggoben")
    .map((a) => `${a.step}. ${a.role} – ${lookup.userName(a.approverId)}`);
  const buyerUser = store.users.find((u) => u.roles.includes("beszerzo"));
  const procurementTrack: { label: string; done: boolean; detail: string; sensitive?: boolean }[] = [
    {
      label: "Jóváhagyási lánc lezárva",
      done: request.approvals.length > 0 && pendingApprovers.length === 0,
      detail: pendingApprovers.length
        ? `Döntésre vár: ${pendingApprovers.join(" · ")}`
        : request.approvals.length > 0
          ? "Minden jóváhagyó döntött."
          : "Még nincs jóváhagyási döntés.",
      sensitive: pendingApprovers.length > 0,
    },
    {
      label: "Beszerzési tervsor létrehozva",
      done: !!planItem,
      detail: planItem ? `${planItem.planYear} ${planItem.quarter} · ${planItem.quantity} db` : "",
    },
    {
      label: "Beszerzési terv jóváhagyva (gazdasági vezető)",
      done: planApproved || !!planItem?.status.match(/beszerzes_alatt|teljesult/),
      detail: planApproval ? PLAN_APPROVAL_STATUS_LABELS[planApproval.status] : "",
    },
    {
      label: "Beszerzés folyamatban",
      done: planItem ? ["beszerzes_alatt", "teljesult"].includes(planItem.status) : false,
      detail: planItem && ["beszerzes_alatt"].includes(planItem.status) && buyerUser
        ? `Felelős: ${buyerUser.name} – ${ROLE_LABELS.beszerzo}`
        : "",
      sensitive: true,
    },
    {
      label: "Eszköz beérkezett, telepítés és átadás",
      done: !!handover,
      detail: handover
        ? [
            handover.deviceName,
            handover.referentId
              ? `Felelős: ${lookup.userName(handover.referentId)} – ${ROLE_LABELS.it_referens}`
              : "",
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
      sensitive: !!handover?.referentId,
    },
    {
      label: "Átvétel visszaigazolva, leltárba került",
      done: handover?.status === "atvetel_igazolva",
      detail:
        handover?.status === "atadva"
          ? `Visszaigazolásra vár: ${lookup.userName(handover.recipientId)}`
          : "",
      sensitive: true,
    },
  ];
  const canCreatePlanItem =
    ["ugyintezo", "szolgaltatasgazda", "admin", "beszerzo", "eszkozmenedzser"].includes(
      store.activeRole,
    ) && ["elfogadva", "folyamatban", "jovahagyasra_var"].includes(request.status);

  /** Az aktuális felelőst csak az ügy kezelésében érintett szerepkörök és vezetők láthatják. */
  const canSeeOwner =
    fullView ||
    ["beszerzo", "eszkozmenedzser", "gazdasagi_vezeto", "it_referens"].includes(
      store.activeRole,
    ) ||
    request.approvals.some((a) => a.approverId === store.currentUser.id);

  /** Az ügy aktuális gazdája a folyamat szakaszától függően. */
  type OwnerInfo =
    | { kind: "people"; people: { name: string; role: string; note?: string }[] }
    | { kind: "message"; text: string }
    | { kind: "closed" };
  const roleUser = (role: RoleKey) => store.users.find((u) => u.roles.includes(role));
  const ownerInfo: OwnerInfo = (() => {
    if (["lezarva", "elutasitva", "visszavonva"].includes(request.status)) {
      return { kind: "closed" };
    }
    const pending = request.approvals.filter((a) => a.decision === "fuggoben");
    if (pending.length > 0) {
      return {
        kind: "people",
        people: pending.map((a) => ({
          name: lookup.userName(a.approverId),
          role: ROLE_LABELS[a.role as RoleKey] ?? a.role,
          note: "Döntésre vár",
        })),
      };
    }
    if (!planItem) {
      if (request.status === "piszkozat") return { kind: "message", text: "Az igény még nincs beküldve." };
      return {
        kind: "message",
        text: "Szolgáltatási ügyintéző / beszerző – beszerzési tervsor létrehozására vár.",
      };
    }
    if (!planApproved && planItem.status !== "beszerzes_alatt" && planItem.status !== "teljesult") {
      if (!planApproval) {
        const planner = roleUser("eszkozmenedzser");
        return planner
          ? { kind: "people", people: [{ name: planner.name, role: ROLE_LABELS.eszkozmenedzser, note: "Ütemezésre vár" }] }
          : { kind: "message", text: "IT eszközmenedzser – ütemezésre vár." };
      }
      const st = planApproval.status;
      if (st === "gazdasagi_ellenorzes") {
        const u = roleUser("gazdasagi_vezeto");
        return u
          ? { kind: "people", people: [{ name: u.name, role: ROLE_LABELS.gazdasagi_vezeto, note: "Ellenőrzésre vár" }] }
          : { kind: "message", text: "Gazdasági vezetői ellenőrzésre vár." };
      }
      if (st === "dekani_jovahagyas" || st === "jovahagyasra_var") {
        const u = roleUser("gazdasagi_vezeto");
        const days = daysUntil(planApproval.dueAt);
        const note = days >= 0 ? `Jóváhagyási határidő: ${planApproval.dueAt} (még ${days} nap)` : `Jóváhagyási határidő lejárt: ${planApproval.dueAt}`;
        return u
          ? { kind: "people", people: [{ name: u.name, role: ROLE_LABELS.gazdasagi_vezeto, note }] }
          : { kind: "message", text: `Gazdasági vezetői jóváhagyásra vár. ${note}` };
      }
      // tervezes / visszakuldve: beszerzőnél van
      return buyerUser
        ? { kind: "people", people: [{ name: buyerUser.name, role: ROLE_LABELS.beszerzo, note: PLAN_APPROVAL_STATUS_LABELS[st] }] }
        : { kind: "message", text: PLAN_APPROVAL_STATUS_LABELS[st] };
    }
    if (planItem.status === "beszerzes_alatt" && !handover) {
      return buyerUser
        ? { kind: "people", people: [{ name: buyerUser.name, role: ROLE_LABELS.beszerzo, note: "Beszerzés folyamatban" }] }
        : { kind: "message", text: "Beszerzés folyamatban a beszerzőnél." };
    }
    if (handover && handover.status !== "atvetel_igazolva") {
      if (handover.status === "atadva") {
        return {
          kind: "people",
          people: [
            {
              name: lookup.userName(handover.recipientId),
              role: "Igénylő",
              note: "Átvételi visszaigazolásra vár",
            },
          ],
        };
      }
      if (handover.referentId) {
        return {
          kind: "people",
          people: [
            {
              name: lookup.userName(handover.referentId),
              role: ROLE_LABELS.it_referens,
              note: "Telepítés és átadás folyamatban",
            },
          ],
        };
      }
      return { kind: "message", text: "IT referens kijelölésére vár." };
    }
    return { kind: "closed" };
  })();

  const headerSituation = requestSituation(request, {
    planItems: store.planItems ?? [],
    planApprovals: store.planApprovals ?? [],
    handovers: store.handovers ?? [],
    users: store.users,
  });

  return (
    <div className="space-y-6">
      <Link
        to={staff ? "/munkater" : leader ? "/vezetoi-attekintes" : "/igenyeim"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Vissza
      </Link>

      <header className="card-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-sm text-muted-foreground">{request.id}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">{request.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={request.status} />
              <span className="rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium text-foreground">
                Folyamatlépcső: {headerSituation.statusLabel}
              </span>
              <PriorityBadge priority={request.priority} />
              {request.slaRisk && (
                <span className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                  SLA-kockázat
                </span>
              )}
            </div>
          </div>
          {staff && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="status-select" className="text-xs">
                  Státusz módosítása
                </Label>
                <Select
                  value={request.status}
                  onValueChange={(v) => {
                    store.setStatus(request.id, v as StatusKey);
                    toast.success(`Új státusz: ${STATUS_LABELS[v as StatusKey]}`);
                  }}
                >
                  <SelectTrigger id="status-select" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <dl className="mt-6 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {[
            ["Felelős csapat", lookup.team(request.teamId)],
            ["Felelős munkatárs", request.assigneeId ? lookup.userName(request.assigneeId) : "Kijelölés alatt"],
            ["Igénylő", lookup.userName(request.requesterId)],
            ["Szervezeti egység", lookup.unit(request.orgUnitId)],
            ["Beküldés", request.createdAt],
            [
              "Katalógus szerinti referenciaérték",
              request.estimatedCost
                ? `${request.estimatedCost.toLocaleString("hu-HU")} Ft`
                : "Nincs költségvonzat",
            ],
            ["Utolsó frissítés", request.updatedAt],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-muted-foreground">{k}</dt>
              <dd className="mt-0.5 font-medium">{v}</dd>
            </div>
          ))}
        </dl>

        <RequestSituationCard request={request} />
        <ProcurementSummaryCard request={request} />

        <p className="mt-5 rounded-md bg-secondary px-4 py-3 text-sm">
          <span className="font-medium">Következő lépés: </span>
          {request.nextStep}
        </p>

        {isRequester && handover?.status === "atadva" && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-md border-l-4 border-l-primary border border-border bg-secondary/40 p-4">
            <div>
              <p className="text-sm font-semibold">Átvételre váró eszköz: {handover.deviceName}</p>
              <p className="text-xs text-muted-foreground">
                {handover.serial ? `Gyári szám: ${handover.serial}` : ""}
                {handover.serial && handover.inventoryNo ? " · " : ""}
                {handover.inventoryNo ? `PTE leltárkód: ${handover.inventoryNo}` : ""}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Az átvétel visszaigazolásával az eszköz bekerül a személyi leltárába.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                store.confirmHandoverReceipt(handover.id);
                toast.success("Átvétel visszaigazolva – az eszköz bekerült a leltárába");
              }}
            >
              Átvétel visszaigazolása
            </Button>
          </div>
        )}

        {isRequester && request.status !== "piszkozat" && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-border bg-secondary/40 p-4">
            <p className="text-sm">
              {withdrawBlocked
                ? withdrawBlocked
                : "Igényét a beszerzés gazdasági vezetői jóváhagyásáig bármikor visszavonhatja."}
            </p>
            <div className="ml-auto">
              <WithdrawRequestButton request={request} showBlockReason={false} />
            </div>
          </div>
        )}


        {planItem && (
          <p className="mt-4 rounded-md border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
            <span className="font-medium">Beszerzési besorolás: </span>
            {planItem.timing === "azonnali"
              ? `az igény azonnali beszerzési csomagba került (${planItem.quantity} db).`
              : `az igény a ${planItem.planYear}. évi terv ${QUARTER_LABELS[planItem.quarter]}ébe került (${planItem.quantity} db).`}{" "}
            {canReviewProcurement(store.activeRole) && (
              <Link to="/beszerzesi-terv" className="underline">
                Beszerzési terv megnyitása
              </Link>
            )}
          </p>
        )}

        {pendingApproval && isPrimaryApprover && similarAssets.length > 0 && (
          <div className="mt-4">
            <SimilarAssetNotice
              items={similarAssets}
              audience="jovahagyo"
              requesterName={lookup.userName(request.requesterId)}
              tone={
                request.requestReason === "csere" || request.requestReason === "meghibasodas"
                  ? "tajekoztatas"
                  : "figyelmeztetes"
              }
            />

          </div>
        )}

        {pendingApproval && isPrimaryApprover && (
          <div className="mt-4 space-y-2 rounded-md border border-border bg-secondary/40 p-4">
            <Label htmlFor="budget-input" className="text-sm">
              Költségkeret (bruttó Ft) – az elsődleges jóváhagyó adja meg
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="budget-input"
                inputMode="numeric"
                className="w-56"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="Pl. 450000"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const amount = Number(budget) || 0;
                  store.updateRequest(
                    request.id,
                    {
                      estimatedCost: amount,
                      budget: amount ? `${amount.toLocaleString("hu-HU")} Ft` : undefined,
                    },
                    "Költségkeret rögzítése",
                  );
                  toast.success("Költségkeret mentve.");
                }}
              >
                Mentés
              </Button>
            </div>
          </div>
        )}

        {pendingApproval && (
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-md border border-info/30 bg-info/5 p-4">
            <p className="text-sm">
              Az igény az Ön jóváhagyására vár ({pendingApproval.role}).
            </p>
            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  store.decideApproval(request.id, pendingApproval.id, "jovahagyva", "Támogatom.");
                  toast.success("Az igényt jóváhagyta.");
                }}
              >
                <Check className="size-4" /> Jóváhagyás
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  store.decideApproval(request.id, pendingApproval.id, "elutasitva", "Jelenleg nem támogatott.");
                  toast.error("Az igényt elutasította.");
                }}
              >
                <X className="size-4" /> Elutasítás
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  store.setStatus(request.id, "pontositas");
                  toast.info("Pontosítást kért az igénylőtől.");
                }}
              >
                Pontosítás kérése
              </Button>
            </div>
          </div>
        )}
      </header>

      {store.activeRole === "dekan" && !pendingApproval && <ViewOnlyNotice />}

      <Tabs defaultValue="attekintes">
        <TabsList className="flex-wrap">
          <TabsTrigger value="attekintes">Áttekintés</TabsTrigger>
          <TabsTrigger value="folyamat">Folyamat</TabsTrigger>
          <TabsTrigger value="kommunikacio">Kommunikáció</TabsTrigger>
          <TabsTrigger value="dokumentumok">Dokumentumok</TabsTrigger>
          <TabsTrigger value="feladatok">Kapcsolódó feladatok</TabsTrigger>
          <TabsTrigger value="dontesek">Döntések</TabsTrigger>
          <TabsTrigger value="elozmenyek">Előzmények</TabsTrigger>
        </TabsList>

        <TabsContent value="attekintes" className="space-y-4">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Cél és igény</h2>
            <p className="mt-2 text-sm whitespace-pre-line">{request.goal}</p>
            <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
              {[
                ...(request.requestReason
                  ? [
                      ["Igénylés indoka", REQUEST_REASON_LABELS[request.requestReason]],
                      ...(request.replacedAssetId
                        ? [["Érintett meglévő eszköz", assetLabelOf(store.assets, request.replacedAssetId)]]
                        : []),
                      ...(request.requestReasonNote
                        ? [["Kiegészítés az indokhoz", request.requestReasonNote]]
                        : []),
                      ["Munkavégzés helye", locationLabelOf(request.workLocationId)],
                      [
                        "Kért átvételi hely",
                        request.handoverMode === "eltero"
                          ? `${HANDOVER_MODE_LABELS.eltero} – ${locationLabelOf(request.handoverLocationId)}`
                          : request.handoverMode === "ugyfelszolgalat"
                            ? HANDOVER_MODE_LABELS.ugyfelszolgalat
                            : `${HANDOVER_MODE_LABELS.munkavegzes} – ${locationLabelOf(request.workLocationId)}`,
                      ],
                    ]
                  : [
                      ["Felhasználók", request.users ?? "Nincs megadva"],
                      ["Érintett felhasználószám", request.userCount ?? "Nincs megadva"],
                    ]),
                ...(request.requestedQuarter
                  ? [
                      [
                        "Igényelt beszerzési ütemezés",
                        request.requestedQuarter === "azonnali"
                          ? "Azonnali beszerzés"
                          : requestedTimingLabel(request.requestedQuarter),
                      ],
                      ...(request.urgencyReason
                        ? [["Az azonnali beszerzés indoka", request.urgencyReason]]
                        : []),
                    ]
                  : []),
                ["Adatkezelési érintettség", request.personalData ? "Igen" : "Nem"],
                ["Integráció", request.integration ?? "Nem szükséges"],
                [
                  "Költségkeret (jóváhagyó által rögzítve)",
                  request.budget ?? "Nincs megadva",
                ],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs text-muted-foreground">{k}</dt>
                  <dd className="mt-0.5">{v}</dd>
                </div>
              ))}
            </dl>
          </section>

          {fullView && request.ai && (
            <AiBadge>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                {[
                  ["Javasolt kategória", request.ai.category],
                  ["Javasolt altípus", request.ai.subtype],
                  ["Javasolt felelős csapat", request.ai.team],
                  ["Becsült összetettség", request.ai.complexity],
                  ["Valószínű folyamat", request.ai.workflow],
                  ["Jóváhagyás szükséges", request.ai.approvalNeeded ? "Igen" : "Nem"],
                  [
                    "Lehetséges duplikáció",
                    request.ai.duplicateOf ?? "Nem található hasonló nyitott igény",
                  ],
                  [
                    "Projektjelölt",
                    request.ai.projectCandidate
                      ? "Igen – nagyobb fejlesztésként javasolt kezelni"
                      : "Nem – egyszerű szolgáltatási igény",
                  ],
                  ["Megbízhatóság", `${Math.round(request.ai.confidence * 100)}%`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
              {staff && (
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    store.updateRequest(request.id, {}, "AI-besorolás megerősítése");
                    toast.success("Besorolás megerősítve.");
                  }}
                >
                  Javaslat elfogadása
                </Button>
                <Button size="sm" variant="outline">
                  Módosítás kézzel
                </Button>
              </div>
              )}
            </AiBadge>
          )}

          {fullView && request.internal && (
            <section className="card-surface p-6">
              <h2 className="flex items-center gap-2 font-display text-base font-semibold">
                <Lock className="size-4" aria-hidden="true" /> Belső szolgáltatási adatok
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Szolgáltatási munkatársak és kari döntéshozók számára látható.
              </p>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                {[
                  ["Belső besorolás", request.internal.classification],
                  ["Függőségek", request.internal.dependencies],
                  ["Becsült ráfordítás", `${request.effortDays ?? 0} munkanap`],
                  [
                    "Költséghatás",
                    request.estimatedCost
                      ? `${request.estimatedCost.toLocaleString("hu-HU")} Ft`
                      : "Nincs",
                  ],
                  ["Beszerzési igény", request.internal.procurement ? "Igen" : "Nem"],
                  ["IT biztonsági követelmény", request.internal.security],
                  ["Adatvédelmi követelmény", request.internal.dataProtection],
                  ["Integrációs követelmény", request.integration ?? "Nem szükséges"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-muted-foreground">{k}</dt>
                    <dd className="mt-0.5">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {isRequester && request.status === "lezarva" && (
            <section className="card-surface p-6">
              <h2 className="font-display text-base font-semibold">Elégedettség</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Mennyire volt elégedett a szolgáltatással?
              </p>
              <div className="mt-3 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    aria-label={`${n} csillag`}
                    onClick={() => {
                      store.rateRequest(request.id, n);
                      toast.success("Köszönjük az értékelést!");
                    }}
                    className="rounded p-1 hover:bg-secondary"
                  >
                    <Star
                      className={cn(
                        "size-6",
                        (request.rating ?? 0) >= n ? "fill-warning text-warning" : "text-border",
                      )}
                    />
                  </button>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        <TabsContent value="folyamat">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Az igény útja</h2>
            {canSeeOwner && (
              <div
                className={cn(
                  "mt-4 rounded-md border p-4",
                  ownerInfo.kind === "closed"
                    ? "border-border bg-secondary/50"
                    : "border-primary/30 bg-primary/5",
                )}
              >
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <UserRound className="size-3.5" aria-hidden="true" />
                  {ownerInfo.kind === "closed" ? "Az ügy lezárult" : "Az ügy jelenleg nála van"}
                </p>
                {ownerInfo.kind === "people" && (
                  <ul className="mt-2 space-y-2">
                    {ownerInfo.people.map((p) => (
                      <li key={`${p.name}-${p.role}`} className="text-sm">
                        <span className="font-semibold">{p.name}</span>
                        <span className="text-muted-foreground"> – {p.role}</span>
                        {p.note && (
                          <span className="block text-xs text-muted-foreground">{p.note}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {ownerInfo.kind === "message" && (
                  <p className="mt-2 text-sm">{ownerInfo.text}</p>
                )}
                {ownerInfo.kind === "closed" && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nincs aktív felelőse, a folyamat befejeződött.
                  </p>
                )}
              </div>
            )}
            <ol className="mt-6 space-y-0">
              {TIMELINE.map((s, i) => {
                const done = currentIndex >= 0 && i < currentIndex;
                const active = request.status === s;
                return (
                  <li key={s} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "grid size-7 place-items-center rounded-full border",
                          done
                            ? "border-success bg-success text-success-foreground"
                            : active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground",
                        )}
                      >
                        {done ? (
                          <CheckCircle2 className="size-4" aria-hidden="true" />
                        ) : (
                          <CircleDashed className="size-4" aria-hidden="true" />
                        )}
                      </span>
                      {i < TIMELINE.length - 1 && (
                        <span className={cn("w-px flex-1", done ? "bg-success" : "bg-border")} />
                      )}
                    </div>
                    <div className="pb-6">
                      <p className={cn("text-sm", active ? "font-semibold" : done ? "" : "text-muted-foreground")}>
                        {STATUS_LABELS[s]}
                        {active && <span className="ml-2 text-xs text-primary">– jelenlegi állapot</span>}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {request.status === "elutasitva" && (
              <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                Az igény elutasításra került, a folyamat lezárult.
              </p>
            )}

            <h3 className="mt-8 font-display text-base font-semibold">Beszerzési szakasz</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              A jóváhagyás után az igény beszerzési tervsorrá válik, majd a terv gazdasági vezetői
              jóváhagyását követően indul a beszerzés, a telepítés és az átadás-átvétel.
            </p>
            <ol className="mt-4 space-y-2">
              {procurementTrack.map((s) => (
                <li key={s.label} className="flex items-start gap-3 text-sm">
                  <span
                    className={cn(
                      "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border",
                      s.done
                        ? "border-success bg-success text-success-foreground"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {s.done ? (
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                    ) : (
                      <CircleDashed className="size-3.5" aria-hidden="true" />
                    )}
                  </span>
                  <span>
                    <span className={s.done ? "font-medium" : "text-muted-foreground"}>{s.label}</span>
                    {s.detail && (!s.sensitive || canSeeOwner) && (
                      <span className="block text-xs text-muted-foreground">{s.detail}</span>
                    )}
                  </span>
                </li>
              ))}
            </ol>
            {!planItem && canCreatePlanItem && (
              <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-4">
                <p className="text-sm">
                  Az IT besorolás a szervezeti jóváhagyás után automatikusan megtörténik. Ehhez az
                  igényhez még nem jött létre tervsor – ezt az IT eszközmenedzser tudja rendezni a
                  Beszerzések felületen.
                </p>
              </div>
            )}
          </section>
        </TabsContent>


        <TabsContent value="kommunikacio">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Kommunikáció</h2>
            <ul className="mt-5 space-y-4">
              {visibleMessages.map((m) => (
                <li
                  key={m.id}
                  className={cn(
                    "rounded-lg border p-4",
                    m.internal ? "border-warning/40 bg-warning/10" : "border-border bg-card",
                  )}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{lookup.userName(m.authorId)}</span>
                    <span>{m.createdAt}</span>
                    {m.internal && (
                      <span className="inline-flex items-center gap-1 rounded border border-warning/50 px-1.5 py-0.5 font-medium text-warning-foreground">
                        <Lock className="size-3" aria-hidden="true" /> Belső megjegyzés
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm whitespace-pre-line">{m.body}</p>
                </li>
              ))}
            </ul>

            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <Label htmlFor="uzenet">
                {staff ? "Üzenet az igénylőnek" : "Üzenet a szolgáltatási csapatnak"}
              </Label>
              <Textarea
                id="uzenet"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Írja ide az üzenetét…"
              />
              <Button
                disabled={!message.trim()}
                onClick={() => {
                  store.addMessage(request.id, message.trim(), false);
                  setMessage("");
                  toast.success("Üzenet elküldve.");
                }}
              >
                <MessageSquare className="size-4" /> Üzenet küldése
              </Button>
            </div>

            {staff && (
              <div className="mt-6 space-y-3 rounded-lg border border-warning/40 bg-warning/5 p-4">
                <Label htmlFor="belso">Belső megjegyzés (az igénylő nem látja)</Label>
                <Textarea
                  id="belso"
                  rows={3}
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                  placeholder="Belső egyeztetés, besorolási megjegyzés…"
                />
                <Button
                  variant="outline"
                  disabled={!internalNote.trim()}
                  onClick={() => {
                    store.addMessage(request.id, internalNote.trim(), true);
                    setInternalNote("");
                    toast.success("Belső megjegyzés rögzítve.");
                  }}
                >
                  <Lock className="size-4" /> Belső megjegyzés hozzáadása
                </Button>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="dokumentumok">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Dokumentumok</h2>
            {request.attachments.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nincs csatolt dokumentum.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {request.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-3 text-sm">
                    <Paperclip className="size-4 text-muted-foreground" aria-hidden="true" />
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">{a.size}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {lookup.userName(a.uploaderId)} · {a.uploadedAt}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="mt-5" onClick={() => toast.info("A prototípusban a feltöltés szimulált.")}>
              Dokumentum feltöltése
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="feladatok">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Kapcsolódó feladatok</h2>
            {request.subtasks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Még nincs részfeladat rögzítve.</p>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {request.subtasks.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 py-3 text-sm">
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full border",
                        t.done ? "border-success bg-success text-success-foreground" : "border-border",
                      )}
                      aria-hidden="true"
                    >
                      {t.done && <Check className="size-3" />}
                    </span>
                    <span className={cn(t.done && "text-muted-foreground line-through")}>{t.title}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {t.assigneeId ? lookup.userName(t.assigneeId) : "Nincs felelős"}
                      <span className="sr-only">{t.done ? " – kész" : " – folyamatban"}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {request.projectId && (
              <p className="mt-5 rounded-md bg-secondary p-3 text-sm">
                Ez az igény a(z) <strong>{lookup.project(request.projectId)?.name}</strong> fejlesztési
                kezdeményezés része.{" "}
                <Link to="/portfolio" className="text-primary underline">
                  Megnyitás a portfólióban
                </Link>
              </p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="dontesek">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Jóváhagyási út</h2>
            {request.approvals.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Ehhez az igényhez nem szükséges jóváhagyás.
              </p>
            ) : (
              <ol className="mt-5 space-y-3">
                {request.approvals.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-3 rounded-lg border border-border p-4 text-sm"
                  >
                    <span className="grid size-7 place-items-center rounded-full bg-secondary text-xs font-semibold">
                      {a.step}
                    </span>
                    <span>
                      <span className="block font-medium">{a.role}</span>
                      <span className="block text-xs text-muted-foreground">
                        {lookup.userName(a.approverId)}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "ml-auto rounded-md border px-2 py-1 text-xs font-medium",
                        a.decision === "jovahagyva"
                          ? "border-success/40 bg-success/10 text-success"
                          : a.decision === "elutasitva"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-secondary text-muted-foreground",
                      )}
                    >
                      {a.decision === "jovahagyva"
                        ? `Jóváhagyva${a.decidedAt ? ` · ${a.decidedAt}` : ""}`
                        : a.decision === "elutasitva"
                          ? "Elutasítva"
                          : "Döntésre vár"}
                    </span>
                    {a.comment && <p className="w-full text-xs text-muted-foreground">„{a.comment}”</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </TabsContent>

        <TabsContent value="elozmenyek">
          <section className="card-surface p-6">
            <h2 className="font-display text-base font-semibold">Előzmények (audit napló)</h2>
            <ul className="mt-4 divide-y divide-border">
              {request.audit.map((e) => (
                <li key={e.id} className="grid gap-1 py-3 text-sm sm:grid-cols-[110px_180px_1fr]">
                  <span className="text-muted-foreground">{e.at}</span>
                  <span className="font-medium">{e.action}</span>
                  <span className="text-muted-foreground">
                    {lookup.userName(e.actorId)} · {e.detail}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}
/** Helyszín címke a leltári helyszínlistából. */
function locationLabelOf(id?: string | undefined) {
  const l = ASSET_LOCATIONS.find((x) => x.id === id);
  return l ? `${l.building} · ${l.room}` : "Nincs megadva";
}

/** Cserére jelölt eszköz olvasható megnevezése. */
function assetLabelOf(assets: { id: string; modelKey: string; deviceId: string; inventoryNo: string; serial?: string | undefined }[], id: string) {
  const a = assets.find((x) => x.id === id);
  if (!a) return "Nincs megadva";
  const m = ASSET_MODELS.find((x) => x.key === a.modelKey);
  return `${m ? `${m.manufacturer} ${m.model}` : a.deviceId} · ${a.inventoryNo}${a.serial ? ` · ${a.serial}` : ""}`;
}
