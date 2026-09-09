import { describe, expect, test } from "bun:test";
import { isOverdue, normalizeLegacyPlanStatus, planItemStage, quarterEndIso } from "../plan-stage";
import { responsibleForStep, STEP_RESPONSIBLE } from "../process-roles";
import { requestSituation } from "../request-situation";
import { PROCESS_STEPS } from "../process-steps";
import type { ProcurementPlanItem } from "../asset-types";
import type { AssetHandover, ServiceRequest, User } from "../types";

const users = [
  { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
  { id: "u-j", name: "Jóváhagyó J.", roles: ["jovahagyo"] },
  { id: "u-b", name: "Beszerző B.", roles: ["beszerzo"] },
  { id: "u-e", name: "Eszközmenedzser E.", roles: ["eszkozmenedzser"] },
  { id: "u-g", name: "Gazdasági G.", roles: ["gazdasagi_vezeto"] },
  { id: "u-r", name: "Referens R.", roles: ["it_referens"] },
] as unknown as User[];

const item = {
  id: "pi-1",
  planYear: 2026,
  quarter: "Q1",
  orgUnitId: "ou-1",
  replacedAssetIds: [],
  standardKey: "notebook_business",
  quantity: 1,
  status: "tervezett",
} as unknown as ProcurementPlanItem;

const request = (patch: Partial<ServiceRequest>) =>
  ({
    id: "r-1",
    requesterId: "u-i",
    domain: "hardver",
    orgUnitId: "ou-1",
    status: "bekuldve",
    approvals: [],
    audit: [],
    ...patch,
  }) as unknown as ServiceRequest;

const ctx = { planItems: [], planApprovals: [], handovers: [], users };

describe("zsákutca-ágak", () => {
  test("elutasított igény megszakadt folyamatot mutat", () => {
    const s = requestSituation(
      request({
        status: "elutasitva",
        approvals: [
          {
            id: "a1",
            role: "jovahagyo",
            approverId: "u-j",
            decision: "elutasitva",
            comment: "Nincs keret",
          },
        ],
      } as Partial<ServiceRequest>),
      ctx,
    );
    expect(s.terminated).toBe(true);
    expect(s.closed).toBe(true);
    expect(s.waitingOn).toBe("Nincs nyitott teendő.");
    expect(s.nextAction).toContain("Jóváhagyó J.");
    expect(s.track.some((t) => t.current)).toBe(false);
  });

  test("visszavont igénynek nincs felelőse", () => {
    const s = requestSituation(request({ status: "visszavonva" }), ctx);
    expect(s.terminated).toBe(true);
    expect(s.statusLabel).toBe("Visszavonva az igénylő által");
  });
});

describe("beérkezés → konfigurálás", () => {
  test("konfigurálatlan beérkezett tétel a referensre vár", () => {
    const handover = { id: "h1", planItemId: "pi-1", status: "beerkezett" } as AssetHandover;
    const s = planItemStage(item, undefined, handover, users);
    expect(s.label).toBe("Beérkezett – konfigurálásra vár");
    expect(s.stepLabel).toBe("Konfigurálás");
    expect(s.actorId).toBe("u-r");
  });

  test("megkezdett konfigurálás külön állapot", () => {
    const handover = {
      id: "h1",
      planItemId: "pi-1",
      status: "beerkezett",
      serial: "SN-1",
    } as AssetHandover;
    expect(planItemStage(item, undefined, handover, users).label).toBe("Konfigurálás alatt");
  });
});

describe("késedelem", () => {
  test("a negyedév vége utáni nyitott tétel késedelmes", () => {
    expect(quarterEndIso(item)).toBe("2026-03-31");
    expect(isOverdue(item, "2026-09-01")).toBe(true);
    expect(isOverdue(item, "2026-02-01")).toBe(false);
  });

  test("teljesült és azonnali tétel nem késedelmes", () => {
    expect(isOverdue({ ...item, status: "teljesult" }, "2026-09-01")).toBe(false);
    expect(isOverdue({ ...item, timing: "azonnali" }, "2026-09-01")).toBe(false);
  });
});

describe("lépésfelelősök", () => {
  test("minden lépés létező felhasználóra oldódik", () => {
    PROCESS_STEPS.forEach((_, i) => {
      const r = responsibleForStep(users, i);
      expect(r.actorId).toBeDefined();
      expect(STEP_RESPONSIBLE[i]).toBeDefined();
    });
  });
});

describe("legacy státusz normalizálás", () => {
  test("a régi dékáni lépcső gazdasági ellenőrzés lesz", () => {
    expect(normalizeLegacyPlanStatus("dekani_jovahagyas")).toBe("gazdasagi_ellenorzes");
    expect(normalizeLegacyPlanStatus("jovahagyasra_var")).toBe("gazdasagi_ellenorzes");
    expect(normalizeLegacyPlanStatus("tervezes")).toBe("tervezes");
  });
});
