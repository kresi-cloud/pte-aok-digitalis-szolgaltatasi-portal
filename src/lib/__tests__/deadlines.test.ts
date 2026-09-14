import { describe, expect, test } from "bun:test";
import { addWorkdays, workdaysBetween } from "../clock";
import {
  DEFAULT_PROCESS_SETTINGS,
  deadlineInfo,
  deadlineKeyForStage,
  normalizeProcessSettings,
  stepSince,
} from "../deadlines";
import { requestSituation } from "../request-situation";
import { STEP } from "../process-steps";
import type { AssetHandover, ServiceRequest, User } from "../types";
import type { PlanApproval, ProcurementPlanItem } from "../asset-types";

describe("munkanap-számítás", () => {
  test("hétvégét átugorja", () => {
    // 2026-09-04 péntek + 1 munkanap = hétfő
    expect(addWorkdays("2026-09-04", 1)).toBe("2026-09-07");
    expect(addWorkdays("2026-09-01", 5)).toBe("2026-09-08");
    expect(addWorkdays("2026-09-01", 0)).toBe("2026-09-01");
  });
  test("eltelt munkanapok", () => {
    expect(workdaysBetween("2026-09-01", "2026-09-01")).toBe(0);
    expect(workdaysBetween("2026-09-01", "2026-09-08")).toBe(5);
    expect(workdaysBetween("2026-09-04", "2026-09-07")).toBe(1);
    expect(workdaysBetween("2026-09-08", "2026-09-01")).toBe(0);
  });
});

describe("határidő-szintek (D3/D6/D7)", () => {
  const S = DEFAULT_PROCESS_SETTINGS;
  test("határidőn belül, emlékeztető 80%-nál, lejárt a határidő után", () => {
    const since = "2026-09-01";
    expect(deadlineInfo("szervezeti_jovahagyas", since, S, "2026-09-03").level).toBe("ok");
    // 5 munkanap · 80% = 4 munkanap eltelte után emlékeztető
    expect(deadlineInfo("szervezeti_jovahagyas", since, S, "2026-09-07").level).toBe("reminder");
    expect(deadlineInfo("szervezeti_jovahagyas", since, S, "2026-09-08").level).toBe("reminder");
    const late = deadlineInfo("szervezeti_jovahagyas", since, S, "2026-09-10");
    expect(late.level).toBe("overdue");
    expect(late.dueDate).toBe("2026-09-08");
    expect(late.remainingWorkdays).toBe(-2);
  });
  test("a beszerzésnél a várható érkezés felülírja a beállított határidőt", () => {
    const d = deadlineInfo("beszerzes", "2026-09-01", S, "2026-09-02", "2026-09-04");
    expect(d.dueDate).toBe("2026-09-04");
    expect(d.level).toBe("ok");
    expect(deadlineInfo("beszerzes", "2026-09-01", S, "2026-09-07", "2026-09-04").level).toBe(
      "overdue",
    );
  });
  test("a beállítás megváltoztatása módosítja a határidőt", () => {
    const custom = normalizeProcessSettings({ deadlines: { szervezeti_jovahagyas: 2 } });
    expect(custom.deadlines.szervezeti_jovahagyas).toBe(2);
    expect(custom.deadlines.it_besorolas).toBe(10);
    expect(deadlineInfo("szervezeti_jovahagyas", "2026-09-01", custom, "2026-09-04").level).toBe(
      "overdue",
    );
  });
  test("hibás tárolt beállításnál az alapértékek", () => {
    const n = normalizeProcessSettings({ deadlines: { atvetel: -3 }, reminderPct: 500 });
    expect(n.deadlines.atvetel).toBe(5);
    expect(n.reminderPct).toBe(80);
    expect(n.receiptAutoCloseDays).toBe(10);
  });
  test("lépésindex → kulcs: az igénylésnek nincs határideje, a 6–7. lépés közös", () => {
    expect(deadlineKeyForStage(STEP.igenyles)).toBeUndefined();
    expect(deadlineKeyForStage(STEP.konfiguralas)).toBe("konfiguralas");
    expect(deadlineKeyForStage(STEP.eszkozatadas)).toBe("konfiguralas");
    expect(deadlineKeyForStage(STEP.atvetel)).toBe("atvetel");
  });
});

describe("mióta vár – lépés kezdete", () => {
  const req = { updatedAt: "2026-08-20", createdAt: "2026-08-18" } as ServiceRequest;
  test("a legpontosabb naplózott dátumot használja", () => {
    expect(stepSince(req, STEP.szervezeti_jovahagyas, {})).toBe("2026-08-20");
    expect(
      stepSince(req, STEP.it_besorolas, {
        planItem: { handedToPlannerAt: "2026-08-22" } as ProcurementPlanItem,
      }),
    ).toBe("2026-08-22");
    expect(
      stepSince(req, STEP.gazdasagi_jovahagyas, {
        approval: { submittedAt: "2026-08-25" } as PlanApproval,
      }),
    ).toBe("2026-08-25");
    expect(
      stepSince(req, STEP.atvetel, {
        handover: { createdAt: "2026-08-26", handedOverAt: "2026-08-28" } as AssetHandover,
      }),
    ).toBe("2026-08-28");
    expect(stepSince(req, STEP.igenyles, {})).toBeUndefined();
  });
});

describe("ügy-helyzet határidővel", () => {
  const users = [
    { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
    { id: "u-j", name: "Jóváhagyó J.", roles: ["jovahagyo"] },
  ] as unknown as User[];
  const request = {
    id: "r-1",
    title: "Notebook",
    requesterId: "u-i",
    domain: "hardver",
    orgUnitId: "ou-1",
    status: "jovahagyasra_var",
    createdAt: "2026-08-20",
    updatedAt: "2026-08-20",
    approvals: [{ id: "a1", role: "jovahagyo", approverId: "u-j", decision: "fuggoben" }],
    audit: [],
  } as unknown as ServiceRequest;
  const ctx = { planItems: [], planApprovals: [], handovers: [], users };
  test("a szervezeti jóváhagyásnál a határidő az igény beküldésétől számít", () => {
    const s = requestSituation(request, { ...ctx, today: "2026-09-01" });
    expect(s.stageIndex).toBe(STEP.szervezeti_jovahagyas);
    expect(s.deadline?.key).toBe("szervezeti_jovahagyas");
    expect(s.deadline?.since).toBe("2026-08-20");
    expect(s.deadline?.dueDate).toBe("2026-08-27");
    expect(s.deadline?.level).toBe("overdue");
  });
  test("lezárt vagy megszakadt ügynek nincs határideje", () => {
    expect(
      requestSituation({ ...request, status: "elutasitva", approvals: [] }, ctx).deadline,
    ).toBeUndefined();
    expect(
      requestSituation({ ...request, status: "lezarva", approvals: [] }, ctx).deadline,
    ).toBeUndefined();
  });
});
