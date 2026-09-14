import { describe, expect, test } from "bun:test";
import {
  canDecideHold,
  canResubmitHold,
  financeHoldReason,
  holdBlocksProcurement,
  itemTimingKey,
  scheduleChangeAllowed,
  scheduleCheck,
  timingLabel,
} from "../schedule-rules";
import { canStartProcurement } from "../procurement-rules";
import { planItemStage } from "../plan-stage";
import { STEP } from "../process-steps";
import type { ProcurementPlanItem } from "../asset-types";
import type { ServiceRequest, User } from "../types";

const users = [
  { id: "u-e", name: "Eszközmenedzser E.", roles: ["eszkozmenedzser"] },
  { id: "u-g", name: "Gazdasági G.", roles: ["gazdasagi_vezeto"] },
] as unknown as User[];
const req = (requestedQuarter?: string) => ({ requestedQuarter }) as unknown as ServiceRequest;
const item = (patch: Partial<ProcurementPlanItem> = {}) =>
  ({
    id: "pi-1",
    planYear: 2027,
    quarter: "Q1",
    timing: "negyedeves",
    status: "jovahagyva",
    handedToPlannerAt: "2026-09-01",
    ...patch,
  }) as unknown as ProcurementPlanItem;

describe("D9 – ütemezés-eltérés", () => {
  test("ütemezés-kulcs és felirat", () => {
    expect(itemTimingKey(item())).toBe("2027-Q1");
    expect(itemTimingKey(item({ timing: "azonnali" }))).toBe("azonnali");
    expect(timingLabel("azonnali")).toBe("Azonnali beszerzés");
    expect(timingLabel("2027-Q2")).toMatch(/2027\. /);
  });
  test("egyezés és eltérés a kért ütemezéstől", () => {
    expect(scheduleCheck(req("2027-Q1"), item()).deviates).toBe(false);
    expect(scheduleCheck(req("2027-Q2"), item()).deviates).toBe(true);
    expect(scheduleCheck(req("azonnali"), item({ timing: "azonnali" })).deviates).toBe(false);
    expect(scheduleCheck(req("azonnali"), item()).deviates).toBe(true);
    expect(scheduleCheck(req("2027-Q1"), item({ timing: "azonnali" })).deviates).toBe(true);
    // régi, évszám nélküli kérés
    expect(scheduleCheck(req("Q1"), item()).deviates).toBe(false);
    expect(scheduleCheck(req("Q3"), item()).deviates).toBe(true);
    // nincs kérés: sosem eltérés
    expect(scheduleCheck(req(undefined), item({ timing: "azonnali" })).deviates).toBe(false);
  });
  test("eltérésnél az indoklás kötelező", () => {
    const check = scheduleCheck(req("azonnali"), item());
    expect(scheduleChangeAllowed(check, undefined)).toMatch(/indoklás kötelező/);
    expect(scheduleChangeAllowed(check, "rövid")).toBeNull();
    expect(scheduleChangeAllowed(check, "ok")).toMatch(/indoklás kötelező/);
    expect(scheduleChangeAllowed(scheduleCheck(req("2027-Q1"), item()), undefined)).toBeNull();
  });
});

describe("D10 – tételszintű kiemelés", () => {
  const held = (status: "kiemelve" | "atdolgozva" | "jovahagyva") =>
    item({
      financeHold: {
        at: "2026-09-02",
        byId: "u-g",
        reason: "Drága konfiguráció",
        status,
        round: 1,
      },
    });
  test("a kiemelt és az átdolgozott tétel beszerzése áll", () => {
    expect(holdBlocksProcurement(held("kiemelve"))).toBe(true);
    expect(holdBlocksProcurement(held("atdolgozva"))).toBe(true);
    expect(holdBlocksProcurement(held("jovahagyva"))).toBe(false);
    expect(financeHoldReason(held("kiemelve"))).toMatch(/Drága konfiguráció/);
    expect(
      canStartProcurement(held("kiemelve"), { planApprovals: [], handovers: [] }, "beszerzo")
        .allowed,
    ).toBe(false);
  });
  test("újbóli beküldés csak az eszközmenedzser, leírással; döntés csak a gazdasági vezető", () => {
    expect(
      canResubmitHold(held("kiemelve"), "eszkozmenedzser", "Olcsóbb konfiguráció").allowed,
    ).toBe(true);
    expect(canResubmitHold(held("kiemelve"), "beszerzo", "Olcsóbb konfiguráció").allowed).toBe(
      false,
    );
    expect(canResubmitHold(held("kiemelve"), "eszkozmenedzser", "ok").allowed).toBe(false);
    expect(
      canResubmitHold(held("atdolgozva"), "eszkozmenedzser", "Olcsóbb konfiguráció").allowed,
    ).toBe(false);
    expect(canDecideHold(held("atdolgozva"), "gazdasagi_vezeto", "jovahagyva", "").allowed).toBe(
      true,
    );
    expect(canDecideHold(held("atdolgozva"), "gazdasagi_vezeto", "elutasitva", "").allowed).toBe(
      false,
    );
    expect(
      canDecideHold(held("atdolgozva"), "gazdasagi_vezeto", "elutasitva", "Még mindig drága")
        .allowed,
    ).toBe(true);
    expect(canDecideHold(held("kiemelve"), "gazdasagi_vezeto", "jovahagyva", "").allowed).toBe(
      false,
    );
    expect(canDecideHold(held("atdolgozva"), "eszkozmenedzser", "jovahagyva", "").allowed).toBe(
      false,
    );
  });
  test("folyamatjelző: kiemelve az eszközmenedzsernél, átdolgozva a gazdasági vezetőnél", () => {
    const a = planItemStage(held("kiemelve"), undefined, undefined, users);
    expect(a.stageIndex).toBe(STEP.it_besorolas);
    expect(a.actorId).toBe("u-e");
    expect(a.label).toMatch(/Kiemelt tétel \(1\. kör\)/);
    const b = planItemStage(held("atdolgozva"), undefined, undefined, users);
    expect(b.stageIndex).toBe(STEP.gazdasagi_jovahagyas);
    expect(b.actorId).toBe("u-g");
  });
});
