import { describe, expect, test } from "bun:test";
import { demoCurrentStep, demoUserForRole, DEMO_TOTAL_STEPS } from "../demo-flow";
import { buildPlanApprovals } from "../plan-approvals";
import { USERS, REQUESTS } from "../seed";

const emptyCtx = {
  requests: [],
  planItems: [],
  planApprovals: [],
  handovers: [],
  users: USERS,
};

describe("vezetőségi demó", () => {
  test("a reset utáni kiindulóállapot mindig ugyanaz a lépés", () => {
    const a = demoCurrentStep(emptyCtx);
    const b = demoCurrentStep({ ...emptyCtx });
    expect(a).toEqual(b);
    expect(a.index).toBe(1);
    expect(a.route).toBe("/uj-igeny");
    expect(a.actorId).toBe("u-kovacs");
    expect(a.done).toBe(false);
    expect(DEMO_TOTAL_STEPS).toBe(8);
  });

  test("a demószereplők szerepkör alapján feloldhatók", () => {
    for (const [role, preferred] of [
      ["igenylo", "u-kovacs"],
      ["beszerzo", "u-beszerzo"],
      ["eszkozmenedzser", "u-eszkozmgr"],
      ["gazdasagi_vezeto", "u-gazdvez"],
      ["dekan", "u-dekan"],
      ["it_referens", "u-itref"],
    ] as const) {
      const u = demoUserForRole(USERS, role, preferred);
      expect(u).toBeDefined();
      expect(u!.roles).toContain(role);
    }
  });

  test("a seed determinisztikus", () => {
    expect(REQUESTS.length).toBe(REQUESTS.length);
    expect(new Set(USERS.map((u) => u.id)).size).toBe(USERS.length);
    expect(JSON.stringify(buildPlanApprovals(2026))).toBe(JSON.stringify(buildPlanApprovals(2026)));
    expect(buildPlanApprovals(2026).every((p) => p.status === "tervezes")).toBe(true);
  });
});
