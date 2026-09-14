import { describe, expect, test } from "bun:test";
import {
  actingFor,
  actsAs,
  enrichNotification,
  notificationsFor,
  substituteOf,
  validateDelegation,
} from "../delegation";
import { unitBudgetCheck, unitUsage, unitBudgetOf, DEFAULT_UNIT_BUDGET } from "../unit-budget";
import { canDecideBudgetReview } from "../budget-rules";
import type { AppNotification, Delegation, ServiceRequest, User } from "../types";
import type { BudgetReview } from "../asset-types";

const users = [
  { id: "u-a", name: "A", roles: ["jovahagyo"], active: true },
  { id: "u-b", name: "B", roles: ["jovahagyo"], active: true },
  { id: "u-c", name: "C", roles: ["igenylo"], active: false },
  { id: "u-e", name: "E", roles: ["eszkozmenedzser"], active: true },
] as unknown as User[];
const dg: Delegation = {
  id: "dg-1",
  userId: "u-a",
  substituteId: "u-b",
  from: "2026-09-01",
  to: "2026-09-10",
  createdAt: "2026-08-30",
  createdBy: "u-a",
};

describe("D8 – időszakos helyettesítés", () => {
  test("csak az időszakban aktív", () => {
    expect(actingFor([dg], "u-b", "2026-09-05")).toEqual(["u-a"]);
    expect(actingFor([dg], "u-b", "2026-09-11")).toEqual([]);
    expect(actingFor([dg], "u-b", "2026-08-31")).toEqual([]);
    expect(substituteOf([dg], "u-a", "2026-09-01")?.substituteId).toBe("u-b");
    expect(actsAs([dg], "u-b", "u-a", "2026-09-05")).toBe(true);
    expect(actsAs([dg], "u-b", "u-a", "2026-09-12")).toBe(false);
    expect(actsAs([dg], "u-a", "u-a", "2026-09-12")).toBe(true);
  });
  test("érvényesítés: aktív helyettes, nem saját maga, helyes időszak", () => {
    expect(
      validateDelegation(
        "u-a",
        { substituteId: "u-a", from: "2026-09-01", to: "2026-09-02" },
        users,
      ),
    ).toMatch(/saját maga/);
    expect(
      validateDelegation(
        "u-a",
        { substituteId: "u-c", from: "2026-09-01", to: "2026-09-02" },
        users,
      ),
    ).toMatch(/aktív/);
    expect(
      validateDelegation(
        "u-a",
        { substituteId: "u-b", from: "2026-09-05", to: "2026-09-02" },
        users,
      ),
    ).toMatch(/vége/);
    expect(
      validateDelegation(
        "u-a",
        { substituteId: "u-b", from: "2026-09-01", to: "2026-09-02" },
        users,
      ),
    ).toBeNull();
  });
  test("a helyettes dönthet a kerettúllépésről a helyettesített nevében", () => {
    const request = {
      approvals: [
        { id: "a1", step: 1, role: "jovahagyo", approverId: "u-a", decision: "jovahagyva" },
      ],
    } as unknown as ServiceRequest;
    const review = { id: "br", status: "fuggoben" } as BudgetReview;
    expect(
      canDecideBudgetReview(request, review, "jovahagyo", "u-b", "jovahagyva", "").allowed,
    ).toBe(false);
    expect(
      canDecideBudgetReview(request, review, "jovahagyo", "u-b", "jovahagyva", "", ["u-a"]).allowed,
    ).toBe(true);
  });
});

describe("D14 – személyre szóló értesítések", () => {
  const request = {
    id: "r-1",
    title: "Notebook",
    requesterId: "u-c",
    domain: "hardver",
    orgUnitId: "ou-1",
    status: "jovahagyasra_var",
    createdAt: "2026-09-01",
    updatedAt: "2026-09-01",
    approvals: [{ id: "a1", step: 1, role: "jovahagyo", approverId: "u-a", decision: "fuggoben" }],
    audit: [],
  } as unknown as ServiceRequest;
  const ctx = { requests: [request], planItems: [], planApprovals: [], handovers: [], users };
  test("az ügyhöz kötött értesítés az igénylőnek és a felelősnek szól, teendővel", () => {
    const n: AppNotification = {
      id: "n1",
      requestId: "r-1",
      text: "x",
      at: "2026-09-01",
      read: false,
    };
    const e = enrichNotification(n, ctx);
    expect(e.recipientIds?.sort()).toEqual(["u-a", "u-c"]);
    expect(e.todoActorId).toBe("u-a");
    expect(e.todo).toMatch(/jóváhagyás/);
    expect(e.step).toBe("Szervezeti jóváhagyás");
  });
  test("általános értesítés szerepkör szerint, ügy nélkül", () => {
    const n: AppNotification = {
      id: "n2",
      text: "Beszerzési terv döntés rögzítve.",
      at: "2026-09-01",
      read: false,
    };
    expect(enrichNotification(n, ctx).recipientIds).toEqual(["u-e"]);
  });
  test("a harang csak a sajátot és a helyettesítettét mutatja", () => {
    const list: AppNotification[] = [
      { id: "1", text: "a", at: "", read: false, recipientIds: ["u-a"] },
      { id: "2", text: "b", at: "", read: false, recipientIds: ["u-c"] },
      { id: "3", text: "c", at: "", read: false, recipientIds: [] },
    ];
    expect(notificationsFor(list, "u-b", [dg], "2026-09-05").map((n) => n.id)).toEqual(["1"]);
    expect(notificationsFor(list, "u-b", [dg], "2026-09-12").map((n) => n.id)).toEqual([]);
    expect(notificationsFor(list, "u-c", [], "2026-09-05").map((n) => n.id)).toEqual(["2"]);
    expect(notificationsFor(list, "u-x", [], "2026-09-05", true).map((n) => n.id)).toEqual(["3"]);
  });
});

describe("D15 – egység-keret", () => {
  const req = (id: string, status: string, cost: number, unit = "ou-1"): ServiceRequest =>
    ({
      id,
      orgUnitId: unit,
      domain: "hardver",
      status,
      createdAt: "2026-05-01",
      estimatedCost: cost,
      approvals: [],
      audit: [],
    }) as unknown as ServiceRequest;
  test("alapérték és felhasználás csak a jóváhagyott/folyó igényekből", () => {
    expect(unitBudgetOf({}, "ou-1")).toBe(DEFAULT_UNIT_BUDGET);
    expect(unitBudgetOf({ "ou-1": 2_000_000 }, "ou-1")).toBe(2_000_000);
    const reqs = [
      req("a", "elfogadva", 1_000_000),
      req("b", "jovahagyasra_var", 900_000),
      req("c", "lezarva", 500_000),
      req("d", "elutasitva", 800_000),
      req("e", "lezarva", 700_000, "ou-2"),
    ];
    expect(unitUsage(reqs, "ou-1", 2026)).toBe(1_500_000);
    expect(unitUsage(reqs, "ou-1", 2026, "a")).toBe(500_000);
  });
  test("kimerülő keretnél figyelmeztetés (nincs tiltás)", () => {
    const reqs = [req("a", "elfogadva", 4_000_000), req("b", "jovahagyasra_var", 1_500_000)];
    const c = unitBudgetCheck(reqs[1]!, reqs, {}, "2026-09-01");
    expect(c.usedBefore).toBe(4_000_000);
    expect(c.amount).toBe(1_500_000);
    expect(c.remainingAfter).toBe(-500_000);
    expect(c.exceeded).toBe(true);
    expect(unitBudgetCheck(reqs[1]!, reqs, { "ou-1": 6_000_000 }, "2026-09-01").exceeded).toBe(
      false,
    );
  });
});
