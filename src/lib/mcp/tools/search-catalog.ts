import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { CATALOG, DOMAINS, TEAMS } from "@/lib/seed";

export default defineTool({
  name: "search_catalog",
  title: "Szolgáltatáskatalógus keresés",
  description:
    "Keresés a PTE ÁOK IT szolgáltatáskatalógusában (szoftver, hardver, web, digitalizáció). Visszaadja a szolgáltatás nevét, leírását, igénylési feltételeit, jóváhagyási lépcsőit és SLA-ját.",
  inputSchema: {
    query: z.string().optional().describe("Keresőkifejezés a névben, leírásban vagy kulcsszavakban."),
    domain: z
      .enum(["szoftver", "hardver", "web", "digitalizacio"])
      .optional()
      .describe("Szolgáltatási domain szűrő."),
    limit: z.number().int().optional().describe("Maximális találatszám (alapértelmezés: 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, domain, limit }) => {
    const q = (query ?? "").trim().toLowerCase();
    const max = Math.min(Math.max(limit ?? 20, 1), 100);
    const items = CATALOG.filter((c) => {
      if (domain && c.domain !== domain) return false;
      if (!q) return true;
      return [c.name, c.description, c.whoCanRequest, ...c.keywords]
        .join(" ")
        .toLowerCase()
        .includes(q);
    })
      .slice(0, max)
      .map((c) => ({
        id: c.id,
        name: c.name,
        domain: DOMAINS.find((d) => d.key === c.domain)?.name ?? c.domain,
        description: c.description,
        whoCanRequest: c.whoCanRequest,
        deliveryTime: c.deliveryTime,
        sla: c.sla,
        approvals: c.approvals,
        requiredInfo: c.requiredInfo,
        team: TEAMS.find((t) => t.id === c.teamId)?.name ?? c.teamId,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ total: items.length, items }, null, 2) }],
      structuredContent: { total: items.length, items },
    };
  },
});