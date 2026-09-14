import { describe, expect, test } from "bun:test";
import {
  budgetCheck,
  budgetOf,
  canDecideBudgetReview,
  canReportProcurementBlock,
  currentGross,
  needsBudgetReview,
  plannedGross,
} from "../budget-rules";
import { budgetHoldReason, canStartProcurement, canMarkDelivered } from "../procurement-rules";
import { planItemStage } from "../plan-stage";
import { requestSituation } from "../request-situation";
import { STEP } from "../process-steps";
import type { BudgetReview, PlanApproval, ProcurementPlanItem } from "../asset-types";
import type { ServiceRequest, User } from "../types";

const users = [
  { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
  { id: "u-j", name: "Jóváhagyó J.", roles: ["jovahagyo"] },
  { id: "u-b", name: "Beszerző B.", roles: ["beszerzo"] },
] as unknown as User[];

const request = (patch: Partial<ServiceRequest> = {}): ServiceRequest =>
  ({
    id: "r-1",
    title: "Notebook",
    requesterId: "u-i",
    domain: "hardver",
    orgUnitId: "ou-1",
    status: "elfogadva",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    estimatedCost: 500000,
    approvedBudgetGross: 500000,
    approvals: [
      { id: "a1", step: 1, role: "jovahagyo", approverId: "u-j", decision: "jovahagyva" },
    ],
    audit: [],
    ...patch,
  }) as unknown as ServiceRequest;

const item = (patch: Partial<ProcurementPlanItem> = {}): ProcurementPlanItem =>
  ({
    id: "pi-1",
    planYear: 2026,
    quarter: "Q3",
    orgUnitId: "ou-1",
    replacedAssetIds: [],
    standardKey: "notebook_business",
    quantity: 1,
    unitPriceOverride: 500000,
    referencePriceId: "rp-x",
    status: "jovahagyva",
    timing: "azonnali",
    handedToPlannerAt: "2026-09-01",
    sourceRequestId: "r-1",
    ...patch,
  }) as unknown as ProcurementPlanItem;

const review = (patch: Partial<BudgetReview> = {}): BudgetReview => ({
  id: "br-1",
  stage: "tervezes",
  at: "2026-09-02",
  triggeredBy: "u-e",
  trigger: "teszt",
  budgetGross: 500000,
  newGross: 600000,
  deltaPct: 20,
  status: "fuggoben",
  ...patch,
});

describe("D1/D5 – költségkeret-küszöb", () => {
  test("a keret a jóváhagyáskori pillanatkép, különben a becsült költség", () => {
    expect(budgetOf(request())).toBe(500000);
    expect(budgetOf(request({ approvedBudgetGross: undefined, estimatedCost: 420000 }))).toBe(
      420000,
    );
  });
  test("tervezett és tényleges összeg", () => {
    expect(plannedGross(item({ quantity: 2 }))).toBe(1000000);
    expect(currentGross(item())).toBe(500000);
    expect(currentGross(item({ order: { actualUnitGross: 560000 } as never }))).toBe(560000);
  });
  test("10%-ig nincs túllépés, felette igen", () => {
    expect(budgetCheck(request(), item({ unitPriceOverride: 550000 }), 10).exceeded).toBe(false);
    const c = budgetCheck(request(), item({ unitPriceOverride: 551000 }), 10);
    expect(c.exceeded).toBe(true);
    expect(c.deltaPct).toBe(10);
    expect(budgetCheck(request(), item({ unitPriceOverride: 600000 }), 10).deltaPct).toBe(20);
    expect(budgetCheck(request(), item({ unitPriceOverride: 600000 }), 25).exceeded).toBe(false);
  });
  test("túllépésnél felülvizsgálat kell, függő vagy ugyanarra elutasított körnél nem", () => {
    const over = item({ unitPriceOverride: 600000 });
    expect(needsBudgetReview(budgetCheck(request(), over, 10), over)).toBe(true);
    const pending = item({ unitPriceOverride: 600000, budgetReviews: [review()] });
    expect(needsBudgetReview(budgetCheck(request(), pending, 10), pending)).toBe(false);
    const rejectedSame = item({
      unitPriceOverride: 600000,
      budgetReviews: [review({ status: "elutasitva" })],
    });
    expect(needsBudgetReview(budgetCheck(request(), rejectedSame, 10), rejectedSame)).toBe(false);
    const rejectedOther = item({
      unitPriceOverride: 620000,
      budgetReviews: [review({ status: "elutasitva" })],
    });
    expect(needsBudgetReview(budgetCheck(request(), rejectedOther, 10), rejectedOther)).toBe(true);
  });
  test("függő vagy elutasított felülvizsgálat megállítja a beszerzést és a beérkezést", () => {
    const approval = { status: "jovahagyva" } as unknown as PlanApproval;
    const pending = item({ unitPriceOverride: 600000, budgetReviews: [review()] });
    expect(budgetHoldReason(pending)).toMatch(/döntésére vár/);
    expect(
      canStartProcurement(pending, { planApprovals: [approval], handovers: [] }, "beszerzo")
        .allowed,
    ).toBe(false);
    const rejected = item({
      unitPriceOverride: 600000,
      status: "beszerzes_alatt",
      budgetReviews: [review({ status: "elutasitva", comment: "Nincs keret" })],
    });
    expect(
      canMarkDelivered(rejected, { planApprovals: [], handovers: [] }, "beszerzo").allowed,
    ).toBe(false);
    const approved = item({
      unitPriceOverride: 600000,
      budgetReviews: [review({ status: "jovahagyva" })],
    });
    expect(budgetHoldReason(approved)).toBeUndefined();
    expect(
      canStartProcurement(approved, { planApprovals: [approval], handovers: [] }, "beszerzo")
        .reason ?? "",
    ).not.toMatch(/keret/i);
  });
  test("a döntést csak az igény szervezeti jóváhagyója (vagy admin) hozhatja, elutasításhoz indoklás", () => {
    expect(
      canDecideBudgetReview(request(), review(), "jovahagyo", "u-j", "jovahagyva", "").allowed,
    ).toBe(true);
    expect(
      canDecideBudgetReview(request(), review(), "jovahagyo", "u-x", "jovahagyva", "").allowed,
    ).toBe(false);
    expect(
      canDecideBudgetReview(request(), review(), "admin", "u-x", "jovahagyva", "").allowed,
    ).toBe(true);
    expect(
      canDecideBudgetReview(request(), review(), "jovahagyo", "u-j", "elutasitva", "").allowed,
    ).toBe(false);
    expect(
      canDecideBudgetReview(request(), review(), "jovahagyo", "u-j", "elutasitva", "Nincs keret")
        .allowed,
    ).toBe(true);
    expect(
      canDecideBudgetReview(
        request(),
        review({ status: "jovahagyva" }),
        "jovahagyo",
        "u-j",
        "jovahagyva",
        "",
      ).allowed,
    ).toBe(false);
  });
  test("folyamatjelző és ügy-helyzet: a jóváhagyóra vár, a határidő a felülvizsgálat kezdetétől", () => {
    const pending = item({ unitPriceOverride: 600000, budgetReviews: [review()] });
    const stage = planItemStage(pending, undefined, undefined, users);
    expect(stage.actorId).toBe("u-j");
    expect(stage.label).toMatch(/Kerettúllépés \(\+20%\)/);
    expect(stage.stageIndex).toBe(STEP.it_besorolas);
    const sit = requestSituation(request(), {
      planItems: [pending],
      planApprovals: [],
      handovers: [],
      users,
      today: "2026-09-03",
    });
    expect(sit.nextActorId).toBe("u-j");
    expect(sit.deadline?.key).toBe("szervezeti_jovahagyas");
    expect(sit.deadline?.since).toBe("2026-09-02");
  });
});

describe("D11 – beszerzési akadály", () => {
  test("csak a beszerző, indoklással, beérkezett darab nélkül", () => {
    expect(canReportProcurementBlock(item(), "beszerzo", "A modell kifutott.", 0).allowed).toBe(
      true,
    );
    expect(
      canReportProcurementBlock(item(), "eszkozmenedzser", "A modell kifutott.", 0).allowed,
    ).toBe(false);
    expect(canReportProcurementBlock(item(), "beszerzo", "hib", 0).allowed).toBe(false);
    expect(canReportProcurementBlock(item(), "beszerzo", "A modell kifutott.", 1).allowed).toBe(
      false,
    );
    expect(
      canReportProcurementBlock(item({ status: "meghiusult" }), "beszerzo", "A modell kifutott.", 0)
        .allowed,
    ).toBe(false);
  });
  test("meghiúsult tétel és igény: lezárt, megszakadt folyamat", () => {
    const failed = item({
      status: "meghiusult",
      failure: { at: "2026-09-02", byId: "u-b", reason: "Nem szállítható." },
    });
    expect(planItemStage(failed, undefined, undefined, users).done).toBe(true);
    expect(planItemStage(failed, undefined, undefined, users).label).toMatch(/meghiúsult/);
    const sit = requestSituation(request({ status: "meghiusult" }), {
      planItems: [failed],
      planApprovals: [],
      handovers: [],
      users,
    });
    expect(sit.terminated).toBe(true);
    expect(sit.closed).toBe(true);
    expect(sit.nextAction).toMatch(/Nem szállítható/);
    expect(sit.deadline).toBeUndefined();
  });
});
