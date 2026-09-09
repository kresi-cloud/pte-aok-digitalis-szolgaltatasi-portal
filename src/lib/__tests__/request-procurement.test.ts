import { describe, expect, test } from "bun:test";
import { planItemFromRequest } from "../request-procurement";
import type { ServiceRequest } from "../types";

const request = (patch: Partial<ServiceRequest> = {}): ServiceRequest =>
  ({
    id: "HW-2026-0001",
    title: "Notebook igénylés",
    domain: "hardver",
    goal: "Meghibásodott munkagép cseréje notebookra.",
    requesterId: "u-kovacs",
    orgUnitId: "ou-elettani",
    teamId: "t-hw",
    status: "jovahagyva",
    priority: "magas",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    estimatedCost: 620000,
    quantity: 1,
    effortDays: 5,
    nextStep: "",
    slaRisk: false,
    messages: [],
    approvals: [],
    audit: [],
    ...patch,
  }) as ServiceRequest;

describe("planItemFromRequest – igényelt ütemezés átvitele", () => {
  test("azonnali igényből azonnali bontású tervsor lesz", () => {
    const item = planItemFromRequest(request({ requestedQuarter: "azonnali" }));
    expect(item.timing).toBe("azonnali");
    expect(item.priority).toBe("kritikus");
  });

  test("évszámos negyedév a tervsor negyedévébe kerül", () => {
    const item = planItemFromRequest(request({ requestedQuarter: "2027-Q3" }));
    expect(item.timing).toBe("negyedeves");
    expect(item.quarter).toBe("Q3");
  });

  test("csere igénynél a kivezetendő eszköz átkerül a tervsorra", () => {
    const item = planItemFromRequest(request({ replacedAssetId: "as-1" }));
    expect(item.kind).toBe("csere");
    expect(item.replacedAssetIds).toEqual(["as-1"]);
  });

  test("egységár az igény becsült értékéből származik", () => {
    const item = planItemFromRequest(request({ estimatedCost: 620000, quantity: 2 }));
    expect(item.unitPriceOverride).toBe(310000);
  });
});
