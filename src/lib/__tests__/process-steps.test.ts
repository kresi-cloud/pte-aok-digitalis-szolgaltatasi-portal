import { describe, expect, test } from "bun:test";
import { PROCESS_STEPS, PROCESS_STEP_COUNT } from "../process-steps";
import { planItemStage } from "../plan-stage";
import {
  canConfirmReceipt,
  canHandOverToUser,
  handoverConfigured,
} from "../procurement-rules";
import { HANDOVER_CHECKLIST } from "../types";
import type { ProcurementPlanItem } from "../asset-types";
import type { AssetHandover, User } from "../types";

const users = [
  { id: "u-b", name: "Beszerző B.", roles: ["beszerzo"] },
  { id: "u-e", name: "Eszközmenedzser E.", roles: ["eszkozmenedzser"] },
  { id: "u-g", name: "Gazdasági G.", roles: ["gazdasagi_vezeto"] },
  { id: "u-r", name: "Referens R.", roles: ["it_referens"] },
  { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
] as unknown as User[];

const item = {
  id: "pi-1",
  planYear: 2026,
  quarter: "Q3",
  orgUnitId: "ou-1",
  standardKey: "notebook_business",
  quantity: 1,
  status: "beszerzes_alatt",
  handedToPlannerAt: "2026-09-01",
} as unknown as ProcurementPlanItem;

const fullChecklist = Object.fromEntries(
  HANDOVER_CHECKLIST.filter((c) => c.required).map((c) => [c.key, true]),
);

const handover = (patch: Partial<AssetHandover> = {}): AssetHandover =>
  ({
    id: "h-1",
    planItemId: "pi-1",
    recipientId: "u-i",
    status: "beerkezett",
    serial: "SN-1",
    inventoryNo: "PTE-1",
    productId: "p-1",
    checklist: fullChecklist,
    attachments: [{ id: "a1", kind: "fenykep", name: "foto.jpg" }],
    history: [],
    ...patch,
  }) as unknown as AssetHandover;

describe("nyolclépcsős folyamat", () => {
  test("pontosan nyolc, magyar megnevezésű lépés van", () => {
    expect(PROCESS_STEP_COUNT).toBe(8);
    expect(PROCESS_STEPS[0]).toBe("Igénylés");
    expect(PROCESS_STEPS[7]).toBe("Átvétel és lezárás");
  });

  test("konfigurálás nélkül nincs átadás", () => {
    const h = handover({ checklist: {} });
    expect(handoverConfigured(h)).toBe(false);
    expect(canHandOverToUser(h, "it_referens").allowed).toBe(false);
  });

  test("teljes konfigurálás után a kari IT referens átadhat", () => {
    const h = handover();
    expect(handoverConfigured(h)).toBe(true);
    expect(canHandOverToUser(h, "it_referens").allowed).toBe(true);
    expect(canHandOverToUser(h, "beszerzo").allowed).toBe(false);
  });

  test("átadás nélkül nincs átvétel, és az átvétel nem ismételhető", () => {
    expect(canConfirmReceipt(handover(), "igenylo", "u-i").allowed).toBe(false);
    expect(canConfirmReceipt(handover({ status: "atadva" }), "igenylo", "u-i").allowed).toBe(true);
    expect(canConfirmReceipt(handover({ status: "atadva" }), "igenylo", "u-x").allowed).toBe(false);
    expect(
      canConfirmReceipt(handover({ status: "atvetel_igazolva" }), "igenylo", "u-i").allowed,
    ).toBe(false);
  });

  test("a levezetett lépcső a konfigurálástól az átvételig halad", () => {
    expect(planItemStage(item, undefined, handover({ checklist: {} }), users).stepLabel).toBe(
      "Konfigurálás",
    );
    expect(planItemStage(item, undefined, handover(), users).stepLabel).toBe("Eszközátadás");
    expect(planItemStage(item, undefined, handover({ status: "atadva" }), users).stepLabel).toBe(
      "Átvétel és lezárás",
    );
    const closed = planItemStage(
      item,
      undefined,
      handover({ status: "atvetel_igazolva" }),
      users,
    );
    expect(closed.done).toBe(true);
  });
});
