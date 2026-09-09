import { describe, expect, test } from "bun:test";
import {
  canMarkDelivered,
  canStartProcurement,
  getProcurementNextAction,
} from "../procurement-rules";
import { daysBetween, formatHuDate, toIsoDate, todayIso, DEMO_DATE } from "../clock";
import type { PlanApproval, ProcurementPlanItem } from "../asset-types";
import type { AssetHandover } from "../types";

const item = (patch: Partial<ProcurementPlanItem> = {}): ProcurementPlanItem =>
  ({
    id: "pi-1",
    planYear: 2026,
    quarter: "Q1",
    orgUnitId: "ou-1",
    replacedAssetIds: [],
    reason: "teszt",
    categoryKey: "notebook",
    standardKey: "std-office-notebook",
    quantity: 1,
    referencePriceId: "rp-1",
    priceChangePct: 0,
    contingencyPct: 0,
    quantityDiscountPct: 0,
    inflationPct: 0,
    priority: "kozepes",
    fundingSourceId: "fs-kari",
    status: "jovahagyasra_var",
    kind: "csere",
    timing: "azonnali",
    handedToPlannerAt: "2026-09-01",
    ...patch,
  }) as ProcurementPlanItem;

const approval = (status: PlanApproval["status"]): PlanApproval => ({
  id: "pa-2026-azonnali",
  scope: "azonnali",
  planYear: 2026,
  periodStart: "2026-01-01",
  dueAt: "2026-01-01",
  status,
});

const handover = (patch: Partial<AssetHandover> = {}): AssetHandover =>
  ({
    id: "h-1",
    planItemId: "pi-1",
    recipientId: "u-kovacs",
    deviceName: "Teszt notebook",
    status: "elokeszites",
    createdAt: "2026-09-01",
    ...patch,
  }) as AssetHandover;

describe("beszerzési szabályok", () => {
  test("jóváhagyás nélkül nem indítható beszerzés", () => {
    const r = canStartProcurement(
      item(),
      { planApprovals: [approval("tervezes")], handovers: [] },
      "beszerzo",
    );
    expect(r.allowed).toBe(false);
    expect(r.reason).toBeTruthy();
  });

  test("jóváhagyott tervciklussal indítható a beszerzés", () => {
    const r = canStartProcurement(
      item(),
      { planApprovals: [approval("jovahagyva")], handovers: [] },
      "beszerzo",
    );
    expect(r.allowed).toBe(true);
  });

  test("beszerzes_alatt előtt nem rögzíthető beérkezés", () => {
    expect(
      canMarkDelivered(
        item({ status: "jovahagyva" }),
        { planApprovals: [], handovers: [] },
        "beszerzo",
      ).allowed,
    ).toBe(false);
    expect(
      canMarkDelivered(
        item({ status: "beszerzes_alatt" }),
        { planApprovals: [], handovers: [] },
        "beszerzo",
      ).allowed,
    ).toBe(true);
  });

  test("egy tételhez csak egy átadási rekord keletkezhet", () => {
    const r = canMarkDelivered(
      item({ status: "beszerzes_alatt" }),
      { planApprovals: [], handovers: [handover()] },
      "beszerzo",
    );
    expect(r.allowed).toBe(false);
  });

  test("jogosulatlan szerepkör nem hajthat végre átmenetet", () => {
    for (const role of ["dekan", "vezeto", "igenylo", "gazdasagi_vezeto"] as const) {
      expect(
        canStartProcurement(
          item(),
          { planApprovals: [approval("jovahagyva")], handovers: [] },
          role,
        ).allowed,
      ).toBe(false);
      expect(
        canMarkDelivered(
          item({ status: "beszerzes_alatt" }),
          { planApprovals: [], handovers: [] },
          role,
        ).allowed,
      ).toBe(false);
    }
  });

  test("állapotonként pontosan egy elsődleges művelet", () => {
    const ctx = { planApprovals: [approval("jovahagyva")], handovers: [] };
    expect(
      getProcurementNextAction(item({ handedToPlannerAt: undefined }), ctx, "beszerzo").key,
    ).toBe(null);
    expect(getProcurementNextAction(item(), ctx, "beszerzo").key).toBe("start");
    expect(getProcurementNextAction(item({ status: "beszerzes_alatt" }), ctx, "beszerzo").key).toBe(
      "deliver",
    );
    expect(
      getProcurementNextAction(
        item({ status: "beszerzes_alatt" }),
        { ...ctx, handovers: [handover()] },
        "beszerzo",
      ).key,
    ).toBeNull();
  });

  test("ismételt kattintás nem visz újabb megengedett átmenetet", () => {
    const ctx = { planApprovals: [approval("jovahagyva")], handovers: [] };
    const started = item({ status: "beszerzes_alatt" });
    expect(canStartProcurement(started, ctx, "beszerzo").allowed).toBe(false);
  });
});

describe("dátumkezelés", () => {
  test("helyi dátum időzóna-eltolódás nélkül", () => {
    expect(toIsoDate(new Date(2026, 8, 1, 23, 30))).toBe("2026-09-01");
    expect(toIsoDate(new Date(2026, 0, 1, 0, 15))).toBe("2026-01-01");
  });

  test("a demódátum determinisztikus és következetes", () => {
    expect(DEMO_DATE).toBe("2026-09-01");
    expect(formatHuDate(DEMO_DATE)).toBe("2026. szeptember 1.");
    expect(daysBetween(DEMO_DATE, "2026-09-15")).toBe(14);
    expect(todayIso(new Date(2026, 8, 1))).toBe("2026-09-01");
  });
});
