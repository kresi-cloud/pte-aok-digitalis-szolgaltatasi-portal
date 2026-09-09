import { describe, expect, test } from "bun:test";
import { planItemStage } from "../plan-stage";
import type { PlanApproval, ProcurementPlanItem } from "../asset-types";
import type { AssetHandover, User } from "../types";

const users = [
  { id: "u-b", name: "Beszerző B.", roles: ["beszerzo"] },
  { id: "u-e", name: "Eszközmenedzser E.", roles: ["eszkozmenedzser"] },
  { id: "u-g", name: "Gazdasági G.", roles: ["gazdasagi_vezeto"] },
  { id: "u-r", name: "Referens R.", roles: ["it_referens"] },
] as unknown as User[];

const base = {
  id: "pi-1",
  planYear: 2026,
  quarter: "Q3",
  orgUnitId: "ou-1",
  replacedAssetIds: [],
  standardKey: "notebook_business",
  quantity: 1,
  status: "tervezett",
} as unknown as ProcurementPlanItem;

const approval = (status: string) => ({ status }) as unknown as PlanApproval;

describe("planItemStage", () => {
  test("besorolás előtt az IT eszközmenedzserre vár", () => {
    const s = planItemStage(base, undefined, undefined, users);
    expect(s.stepLabel).toBe("IT besorolás");
    expect(s.actorId).toBe("u-e");
  });

  test("eszközmenedzserhez rendelve IT besorolás alatt van", () => {
    const s = planItemStage(
      { ...base, handedToPlannerAt: "2026-09-01" },
      approval("tervezes"),
      undefined,
      users,
    );
    expect(s.label).toBe("IT besorolás alatt");
    expect(s.actorId).toBe("u-e");
  });

  test("gazdasági ellenőrzésnél a gazdasági vezetőre vár", () => {
    const s = planItemStage(
      { ...base, handedToPlannerAt: "2026-09-01" },
      approval("gazdasagi_ellenorzes"),
      undefined,
      users,
    );
    expect(s.label).toBe("Gazdasági vezetői jóváhagyásra vár");
    expect(s.actorId).toBe("u-g");
  });

  test("jóváhagyás után a beszerzés indítható", () => {
    const s = planItemStage(base, approval("jovahagyva"), undefined, users);
    expect(s.stepLabel).toBe("Beszerzés");
    expect(s.nextAction).toBe("Beszerzés indítása");
  });

  test("átadási rekord esetén az IT referensre vár", () => {
    const h = { id: "h1", status: "elokeszites" } as unknown as AssetHandover;
    const s = planItemStage({ ...base, status: "beszerzes_alatt" }, undefined, h, users);
    expect(s.actorId).toBe("u-r");
  });

  test("teljesült tétel lezártként jelenik meg", () => {
    const s = planItemStage({ ...base, status: "teljesult" }, undefined, undefined, users);
    expect(s.done).toBe(true);
  });
});
