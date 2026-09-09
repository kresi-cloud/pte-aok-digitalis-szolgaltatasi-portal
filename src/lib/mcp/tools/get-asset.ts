import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ASSETS, ASSET_CATEGORIES, ASSET_LOCATIONS, ASSET_MODELS, FUNDING_SOURCES } from "@/lib/asset-data";
import { lifecycleEnd, lifecycleStatus, meetsStandard, osSupportEnd, policyFor, replacementPriority } from "@/lib/asset-logic";
import { ORG_UNITS } from "@/lib/seed";

export default defineTool({
  name: "get_asset",
  title: "Eszköz adatlap",
  description:
    "Egy eszköz teljes adatlapja leltári szám, eszközazonosító vagy belső id alapján: műszaki specifikáció, életciklus-számítás, standardmegfelelés és pénzügyi adatok.",
  inputSchema: { id: z.string().describe("Leltári szám, eszközazonosító vagy belső azonosító.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const key = id.trim().toLowerCase();
    const a = ASSETS.find(
      (x) =>
        x.id.toLowerCase() === key ||
        x.inventoryNo.toLowerCase() === key ||
        x.deviceId.toLowerCase() === key,
    );
    if (!a) throw new ToolError(`Nem található eszköz: ${id}`);
    const model = ASSET_MODELS.find((m) => m.key === a.modelKey);
    const std = meetsStandard(a);
    const detail = {
      id: a.id,
      inventoryNo: a.inventoryNo,
      deviceId: a.deviceId,
      serial: a.serial,
      category: ASSET_CATEGORIES.find((c) => c.key === a.categoryKey)?.label ?? a.categoryKey,
      model: model ? `${model.manufacturer} ${model.model}` : a.modelKey,
      spec: model?.spec,
      orgUnit: ORG_UNITS.find((u) => u.id === a.orgUnitId)?.name ?? a.orgUnitId,
      location: (() => { const l = ASSET_LOCATIONS.find((x) => x.id === a.locationId); return l ? `${l.building} ${l.room}` : a.locationId; })(),
      usage: a.usage,
      purpose: a.purpose,
      purchaseDate: a.purchaseDate,
      commissionDate: a.commissionDate,
      purchaseValue: a.purchaseValue,
      fundingSource: FUNDING_SOURCES.find((f) => f.id === a.fundingSourceId)?.name ?? a.fundingSourceId,
      warrantyEnd: a.warrantyEnd,
      condition: a.condition,
      repairCount: a.repairCount,
      reportedIssues: a.reportedIssues,
      businessCritical: a.businessCritical,
      policy: policyFor(a).label,
      lifecycleEnd: lifecycleEnd(a),
      osSupportEnd: osSupportEnd(a),
      lifecycleStatus: lifecycleStatus(a),
      replacementPriority: replacementPriority(a),
      meetsStandard: std.ok,
      standardIssues: std.reasons,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});