import { describe, expect, test } from "bun:test";
import {
  canMarkDelivered,
  deliveredQuantity,
  getProcurementNextAction,
  handoverForItem,
  itemFullyReceived,
  primaryHandover,
  remainingQuantity,
  validateDeliveryQuantity,
  validateOrderInput,
} from "../procurement-rules";
import { planItemStage } from "../plan-stage";
import { requestSituation } from "../request-situation";
import { STEP } from "../process-steps";
import type { ProcurementPlanItem } from "../asset-types";
import type { AssetHandover, ServiceRequest, User } from "../types";

const users = [
  { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
  { id: "u-b", name: "Beszerző B.", roles: ["beszerzo"] },
  { id: "u-r", name: "Referens R.", roles: ["it_referens"] },
] as unknown as User[];

const item = (patch: Partial<ProcurementPlanItem> = {}): ProcurementPlanItem =>
  ({
    id: "pi-1",
    planYear: 2026,
    quarter: "Q3",
    orgUnitId: "ou-1",
    replacedAssetIds: [],
    standardKey: "notebook_business",
    quantity: 3,
    status: "beszerzes_alatt",
    timing: "azonnali",
    handedToPlannerAt: "2026-08-20",
    sourceRequestId: "r-1",
    ...patch,
  }) as unknown as ProcurementPlanItem;

const ho = (patch: Partial<AssetHandover>): AssetHandover =>
  ({
    id: "h",
    planItemId: "pi-1",
    requestId: "r-1",
    recipientId: "u-i",
    orgUnitId: "ou-1",
    deviceName: "Notebook",
    status: "beerkezett",
    createdAt: "2026-09-01",
    history: [],
    ...patch,
  }) as unknown as AssetHandover;

const delivery = (q: number) => ({
  id: `d${q}`,
  at: "2026-09-01",
  actorId: "u-b",
  quantity: q,
  assetIds: [],
});

describe("D12 – rendelési rekord", () => {
  test("szállító, rendelésszám és várható érkezés kötelező", () => {
    expect(
      validateOrderInput({ supplier: "", orderNumber: "PO-1", expectedArrival: "2026-09-20" })
        .allowed,
    ).toBe(false);
    expect(
      validateOrderInput({ supplier: "Kft.", orderNumber: "", expectedArrival: "2026-09-20" })
        .allowed,
    ).toBe(false);
    expect(
      validateOrderInput({ supplier: "Kft.", orderNumber: "PO-1", expectedArrival: "" }).allowed,
    ).toBe(false);
    expect(
      validateOrderInput({ supplier: "Kft.", orderNumber: "PO-1", expectedArrival: "2026-09-20" })
        .allowed,
    ).toBe(true);
  });
});

describe("D12 – részteljesítés", () => {
  test("beérkezett és hátralévő darabszám", () => {
    expect(deliveredQuantity(item())).toBe(0);
    expect(remainingQuantity(item())).toBe(3);
    const partial = item({ deliveries: [delivery(2)] });
    expect(deliveredQuantity(partial)).toBe(2);
    expect(remainingQuantity(partial)).toBe(1);
  });
  test("a beérkezett darabszám 1 és a hátralévő között", () => {
    const partial = item({ deliveries: [delivery(2)] });
    expect(validateDeliveryQuantity(partial, 0).allowed).toBe(false);
    expect(validateDeliveryQuantity(partial, 2).allowed).toBe(false);
    expect(validateDeliveryQuantity(partial, 1).allowed).toBe(true);
    expect(validateDeliveryQuantity(item(), 3).allowed).toBe(true);
  });
  test("részteljesítés után újabb beérkezés rögzíthető, teljes beérkezés után nem", () => {
    const partial = item({ deliveries: [delivery(2)] });
    const ctx = { planApprovals: [], handovers: [ho({ id: "h1" }), ho({ id: "h2" })] };
    expect(canMarkDelivered(partial, ctx, "beszerzo").allowed).toBe(true);
    const next = getProcurementNextAction(partial, ctx, "beszerzo");
    expect(next.key).toBe("deliver");
    expect(next.label).toBe("Beérkezett – átadásra (2/3 db)");
    const full = item({ deliveries: [delivery(2), delivery(1)] });
    const ctxFull = {
      planApprovals: [],
      handovers: [ho({ id: "h1" }), ho({ id: "h2" }), ho({ id: "h3" })],
    };
    expect(canMarkDelivered(full, ctxFull, "beszerzo").allowed).toBe(false);
    expect(getProcurementNextAction(full, ctxFull, "beszerzo").key).toBeNull();
  });
  test("a vezető átadási rekord a legkevésbé előrehaladott darab", () => {
    const list = [
      ho({ id: "h1", status: "atvetel_igazolva" }),
      ho({ id: "h2", status: "atadva" }),
      ho({ id: "h3", status: "kifogasolva" }),
    ];
    expect(primaryHandover(list)?.id).toBe("h3");
    expect(handoverForItem(item(), list)?.id).toBe("h3");
    expect(primaryHandover([list[0]!, list[1]!])?.id).toBe("h2");
  });
  test("a tétel csak minden darab beérkezése és átvétele után teljesül", () => {
    const partial = item({ deliveries: [delivery(2)] });
    const two = [
      ho({ id: "h1", status: "atvetel_igazolva" }),
      ho({ id: "h2", status: "atvetel_igazolva" }),
    ];
    expect(itemFullyReceived(partial, two)).toBe(false);
    const full = item({ deliveries: [delivery(2), delivery(1)] });
    expect(itemFullyReceived(full, two)).toBe(false);
    expect(itemFullyReceived(full, [...two, ho({ id: "h3", status: "atvetel_igazolva" })])).toBe(
      true,
    );
    expect(itemFullyReceived(full, [...two, ho({ id: "h3", status: "atadva" })])).toBe(false);
  });
  test("folyamatjelző: részteljesítésnél a beszerzőre vár, nem zárul", () => {
    const partial = item({ deliveries: [delivery(2)] });
    const confirmed = ho({ id: "h1", status: "atvetel_igazolva" });
    const s = planItemStage(partial, undefined, confirmed, users);
    expect(s.done).toBe(false);
    expect(s.stageIndex).toBe(STEP.beszerzes);
    expect(s.label).toMatch(/Részteljesítés – 2\/3 db átvéve/);
    const inConfig = planItemStage(partial, undefined, ho({ id: "h2" }), users);
    expect(inConfig.stageIndex).toBe(STEP.konfiguralas);
    expect(inConfig.label).toMatch(/2\/3 db beérkezett/);
  });
  test("ügy-helyzet: az igény nyitva marad, amíg van hátralévő darab", () => {
    const request = {
      id: "r-1",
      requesterId: "u-i",
      domain: "hardver",
      orgUnitId: "ou-1",
      status: "megvalositas",
      createdAt: "2026-08-20",
      updatedAt: "2026-08-20",
      approvals: [],
      audit: [],
    } as unknown as ServiceRequest;
    const partial = item({ deliveries: [delivery(2)] });
    const sit = requestSituation(request, {
      planItems: [partial],
      planApprovals: [],
      handovers: [
        ho({ id: "h1", status: "atvetel_igazolva" }),
        ho({ id: "h2", status: "atvetel_igazolva" }),
      ],
      users,
    });
    expect(sit.closed).toBe(false);
    expect(sit.stageIndex).toBe(STEP.beszerzes);
  });
});
