import { describe, expect, test } from "bun:test";
import {
  canConfirmReceipt,
  canHandOverToUser,
  canObjectReceipt,
  canResolveObjection,
  handoverNeedsOldAssetDecision,
  oldAssetDecisionComplete,
} from "../procurement-rules";
import { planItemStage } from "../plan-stage";
import { demoCurrentStep, DEMO_REQUESTER_ID } from "../demo-flow";
import { STEP } from "../process-steps";
import { HANDOVER_CHECKLIST, type AssetHandover, type ServiceRequest, type User } from "../types";
import type { ProcurementPlanItem } from "../asset-types";
import { USERS } from "../seed";

const users = [
  { id: "u-i", name: "Igénylő I.", roles: ["igenylo"] },
  { id: "u-r", name: "Referens R.", roles: ["it_referens"] },
] as unknown as User[];

const configured = (patch: Partial<AssetHandover> = {}): AssetHandover =>
  ({
    id: "h1",
    planItemId: "pi-1",
    requestId: "r-1",
    recipientId: "u-i",
    orgUnitId: "ou-1",
    referentId: "u-r",
    deviceName: "Notebook",
    productId: "p-1",
    serial: "SN-1",
    inventoryNo: "PTE-1",
    status: "atadasra_kesz",
    createdAt: "2026-09-01",
    history: [],
    checklist: Object.fromEntries(HANDOVER_CHECKLIST.map((c) => [c.key, true])),
    attachments: [{ kind: "fenykep", id: "a", name: "x", mimeType: "image/png" }],
    ...patch,
  }) as unknown as AssetHandover;

describe("D4 – átvételi kifogás", () => {
  test("csak a címzett, csak átadott eszközre, indoklással", () => {
    const h = configured({ status: "atadva" });
    expect(canObjectReceipt(h, "igenylo", "u-i", "A dokkoló hiányzik").allowed).toBe(true);
    expect(canObjectReceipt(h, "igenylo", "u-mas", "A dokkoló hiányzik").allowed).toBe(false);
    expect(canObjectReceipt(h, "igenylo", "u-i", "hib").allowed).toBe(false);
    expect(canObjectReceipt(configured(), "igenylo", "u-i", "A dokkoló hiányzik").allowed).toBe(
      false,
    );
    expect(
      canObjectReceipt(configured({ status: "kifogasolva" }), "igenylo", "u-i", "Még mindig")
        .allowed,
    ).toBe(false);
  });

  test("kifogásolt eszköz nem igazolható vissza és nem adható át kezelés nélkül", () => {
    const h = configured({ status: "kifogasolva" });
    expect(canConfirmReceipt(h, "igenylo", "u-i").allowed).toBe(false);
    expect(canHandOverToUser(h, "it_referens").allowed).toBe(false);
    expect(canHandOverToUser(h, "it_referens").reason).toMatch(/kifogás/);
  });

  test("a kezelést csak a referens rögzítheti, leírással", () => {
    const h = configured({ status: "kifogasolva" });
    expect(canResolveObjection(h, "it_referens", "Dokkoló pótolva").allowed).toBe(true);
    expect(canResolveObjection(h, "igenylo", "Dokkoló pótolva").allowed).toBe(false);
    expect(canResolveObjection(h, "it_referens", "ok").allowed).toBe(false);
    expect(canResolveObjection(configured(), "it_referens", "Dokkoló pótolva").allowed).toBe(false);
  });

  test("a folyamatjelző a kifogást az átadási lépésnél, a referensnél mutatja", () => {
    const item = { id: "pi-1", status: "beszerzes_alatt", quantity: 1 } as ProcurementPlanItem;
    const s = planItemStage(item, undefined, configured({ status: "kifogasolva" }), users);
    expect(s.stageIndex).toBe(STEP.eszkozatadas);
    expect(s.actorId).toBe("u-r");
    expect(s.label).toMatch(/kifogás/i);
    expect(s.done).toBe(false);
  });

  test("a demóvezérlő a kifogásnál a 7. lépésre, a referenshez lép vissza", () => {
    const request = {
      id: "r-1",
      requesterId: DEMO_REQUESTER_ID,
      domain: "hardver",
      status: "megvalositas",
      approvals: [],
      audit: [],
    } as unknown as ServiceRequest;
    const item = { id: "pi-1", sourceRequestId: "r-1", status: "beszerzes_alatt" };
    const ctx = {
      requests: [request],
      planItems: [item as unknown as ProcurementPlanItem],
      planApprovals: [],
      users: USERS,
    };
    const objected = demoCurrentStep({
      ...ctx,
      handovers: [configured({ status: "kifogasolva" })],
    });
    expect(objected.index).toBe(7);
    expect(objected.role).toBe("it_referens");
    expect(objected.route).toBe("/eszkozatadas");
    const handedOver = demoCurrentStep({ ...ctx, handovers: [configured({ status: "atadva" })] });
    expect(handedOver.index).toBe(8);
    expect(handedOver.role).toBe("igenylo");
  });
});

describe("D13 – a régi eszköz sorsa", () => {
  test("csere nélkül nincs teendő", () => {
    expect(handoverNeedsOldAssetDecision(configured())).toBe(false);
    expect(oldAssetDecisionComplete(configured())).toBe(true);
    expect(canHandOverToUser(configured(), "it_referens").allowed).toBe(true);
  });

  test("csere esetén döntés nélkül nem adható át", () => {
    const h = configured({ replacedAssetId: "as-1" });
    expect(handoverNeedsOldAssetDecision(h)).toBe(true);
    expect(oldAssetDecisionComplete(h)).toBe(false);
    const rule = canHandOverToUser(h, "it_referens");
    expect(rule.allowed).toBe(false);
    expect(rule.reason).toMatch(/régi eszköz/);
  });

  test("raktár és selejt indoklás nélkül is érvényes, a „marad” csak indoklással", () => {
    const base = configured({ replacedAssetId: "as-1" });
    expect(oldAssetDecisionComplete({ ...base, oldAssetDisposition: "raktar" })).toBe(true);
    expect(oldAssetDecisionComplete({ ...base, oldAssetDisposition: "selejt" })).toBe(true);
    expect(oldAssetDecisionComplete({ ...base, oldAssetDisposition: "marad" })).toBe(false);
    expect(
      oldAssetDecisionComplete({
        ...base,
        oldAssetDisposition: "marad",
        oldAssetNote: "Másodlagos munkaállomásként marad",
      }),
    ).toBe(true);
    expect(
      canHandOverToUser({ ...base, oldAssetDisposition: "raktar" }, "it_referens").allowed,
    ).toBe(true);
  });

  test("a folyamatjelző jelzi a hiányzó döntést", () => {
    const item = { id: "pi-1", status: "beszerzes_alatt", quantity: 1 } as ProcurementPlanItem;
    const pending = planItemStage(item, undefined, configured({ replacedAssetId: "as-1" }), users);
    expect(pending.label).toMatch(/régi eszköz/);
    const done = planItemStage(
      item,
      undefined,
      configured({ replacedAssetId: "as-1", oldAssetDisposition: "selejt" }),
      users,
    );
    expect(done.label).toBe("Konfigurálva – átadásra kész");
  });
});
