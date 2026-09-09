import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { ASSETS, NEXT_FINANCIAL_YEAR } from "@/lib/asset-data";
import { ageDistribution, forecastByYear } from "@/lib/asset-logic";

export default defineTool({
  name: "lifecycle_forecast",
  title: "Életciklus-előrejelzés",
  description:
    "Többéves eszközcsere-előrejelzés: évente hány eszköz életciklusa jár le, becsült költséggel és kategóriabontással, valamint az aktuális korfa.",
  inputSchema: {
    fromYear: z.number().int().optional().describe(`Kezdő év (alapértelmezés: ${NEXT_FINANCIAL_YEAR}).`),
    years: z.number().int().optional().describe("Hány évre előre (1–10, alapértelmezés: 5)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ fromYear, years }) => {
    const span = Math.min(Math.max(years ?? 5, 1), 10);
    const result = {
      fromYear: fromYear ?? NEXT_FINANCIAL_YEAR,
      years: span,
      totalAssets: ASSETS.length,
      forecast: forecastByYear(ASSETS, fromYear ?? NEXT_FINANCIAL_YEAR, span),
      ageDistribution: ageDistribution(ASSETS),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});