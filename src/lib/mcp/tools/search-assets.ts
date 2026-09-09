import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ASSETS, ASSET_CATEGORIES, ASSET_MODELS } from "@/lib/asset-data";
import { lifecycleStatus, replacementPriority } from "@/lib/asset-logic";
import { ORG_UNITS } from "@/lib/seed";

export default defineTool({
  name: "search_assets",
  title: "Eszközkataszter keresés",
  description:
    "Keresés az intézményi eszközkataszterben leltári szám, eszközazonosító, modell vagy szervezeti egység alapján, életciklus-státusz és csereprioritás szűréssel.",
  inputSchema: {
    query: z.string().optional().describe("Leltári szám, hostname, sorozatszám vagy modellnév töredéke."),
    categoryKey: z.string().optional().describe("Eszközkategória kulcsa, pl. notebook, monitor, munkaallomas."),
    orgUnitId: z.string().optional().describe("Szervezeti egység azonosítója."),
    lifecycle: z.string().optional().describe("Életciklus-státusz kulcs, pl. cserere_erett, tervezendo."),
    limit: z.number().int().optional().describe("Maximális találatszám (alapértelmezés: 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, categoryKey, orgUnitId, lifecycle, limit }) => {
    const q = (query ?? "").trim().toLowerCase();
    const max = Math.min(Math.max(limit ?? 25, 1), 100);
    const items = ASSETS.filter((a) => {
      const model = ASSET_MODELS.find((m) => m.key === a.modelKey);
      if (categoryKey && a.categoryKey !== categoryKey) return false;
      if (orgUnitId && a.orgUnitId !== orgUnitId) return false;
      if (lifecycle && lifecycleStatus(a) !== lifecycle) return false;
      if (!q) return true;
      return `${a.inventoryNo} ${a.deviceId} ${a.serial} ${model?.model ?? ""} ${model?.manufacturer ?? ""}`
        .toLowerCase()
        .includes(q);
    })
      .slice(0, max)
      .map((a) => {
        const model = ASSET_MODELS.find((m) => m.key === a.modelKey);
        return {
          id: a.id,
          inventoryNo: a.inventoryNo,
          deviceId: a.deviceId,
          category: ASSET_CATEGORIES.find((c) => c.key === a.categoryKey)?.label ?? a.categoryKey,
          model: model ? `${model.manufacturer} ${model.model}` : a.modelKey,
          orgUnit: ORG_UNITS.find((u) => u.id === a.orgUnitId)?.name ?? a.orgUnitId,
          usage: a.usage,
          purchaseDate: a.purchaseDate,
          condition: a.condition,
          lifecycleStatus: lifecycleStatus(a),
          replacementPriority: replacementPriority(a),
        };
      });

    return {
      content: [{ type: "text", text: JSON.stringify({ total: items.length, items }, null, 2) }],
      structuredContent: { total: items.length, items },
    };
  },
});