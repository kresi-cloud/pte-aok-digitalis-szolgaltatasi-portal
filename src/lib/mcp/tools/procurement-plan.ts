import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ASSET_CATEGORIES, INITIAL_PROCUREMENT_ITEMS, NEXT_FINANCIAL_YEAR } from "@/lib/asset-data";
import { itemCost } from "@/lib/asset-logic";
import { ORG_UNITS } from "@/lib/seed";

export default defineTool({
  name: "procurement_plan",
  title: "Beszerzési terv",
  description:
    "A következő pénzügyi év beszerzési tervének tételei negyedéves bontásban, becsült nettó/bruttó költséggel és összesítéssel. Szűrhető évre, negyedévre és szervezeti egységre.",
  inputSchema: {
    planYear: z.number().int().optional().describe(`Tervezési év (alapértelmezés: ${NEXT_FINANCIAL_YEAR}).`),
    quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
    orgUnitId: z.string().optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ planYear, quarter, orgUnitId }) => {
    const year = planYear ?? NEXT_FINANCIAL_YEAR;
    const rows = INITIAL_PROCUREMENT_ITEMS.filter(
      (i) =>
        i.planYear === year &&
        (!quarter || i.quarter === quarter) &&
        (!orgUnitId || i.orgUnitId === orgUnitId),
    ).map((i) => {
      const cost = itemCost(i);
      return {
        id: i.id,
        planYear: i.planYear,
        quarter: i.quarter,
        orgUnit: ORG_UNITS.find((u) => u.id === i.orgUnitId)?.name ?? i.orgUnitId,
        category: ASSET_CATEGORIES.find((c) => c.key === i.categoryKey)?.label ?? i.categoryKey,
        standardKey: i.standardKey,
        quantity: i.quantity,
        kind: i.kind,
        priority: i.priority,
        status: i.status,
        reason: i.reason,
        sourceRequestId: i.sourceRequestId,
        cost,
      };
    });
    const totalGross = rows.reduce((s, r) => s + r.cost.grossTotal, 0);
    const totalWithContingency = rows.reduce((s, r) => s + r.cost.withContingency, 0);
    const result = { planYear: year, items: rows, totalItems: rows.length, totalGross, totalWithContingency };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});