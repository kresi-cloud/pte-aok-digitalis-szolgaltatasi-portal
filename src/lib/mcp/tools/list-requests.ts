import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DOMAINS, ORG_UNITS, REQUESTS } from "@/lib/seed";
import { STATUS_LABELS } from "@/lib/types";

export default defineTool({
  name: "list_requests",
  title: "Szolgáltatási igények listázása",
  description:
    "A demó szolgáltatási igények listázása és szűrése domain, státusz, prioritás vagy szabadszavas keresés alapján. Összefoglaló adatokat ad vissza (cím, cél, státusz, határidő, szervezeti egység).",
  inputSchema: {
    query: z.string().optional().describe("Szabadszavas keresés a címben és a célban."),
    domain: z.enum(["szoftver", "hardver", "web", "digitalizacio"]).optional(),
    status: z.string().optional().describe("Státuszkulcs, pl. bekuldve, elfogadva, lezarva."),
    priority: z.enum(["alacsony", "normal", "magas", "kritikus"]).optional(),
    limit: z.number().int().optional().describe("Maximális találatszám (alapértelmezés: 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ query, domain, status, priority, limit }) => {
    const q = (query ?? "").trim().toLowerCase();
    const max = Math.min(Math.max(limit ?? 25, 1), 100);
    const items = REQUESTS.filter((r) => {
      if (domain && r.domain !== domain) return false;
      if (status && r.status !== status) return false;
      if (priority && r.priority !== priority) return false;
      if (!q) return true;
      return `${r.title} ${r.goal}`.toLowerCase().includes(q);
    })
      .slice(0, max)
      .map((r) => ({
        id: r.id,
        title: r.title,
        domain: DOMAINS.find((d) => d.key === r.domain)?.name ?? r.domain,
        status: STATUS_LABELS[r.status] ?? r.status,
        statusKey: r.status,
        priority: r.priority,
        orgUnit: ORG_UNITS.find((u) => u.id === r.orgUnitId)?.name ?? r.orgUnitId,
        createdAt: r.createdAt,
        dueDate: r.dueDate,
        nextStep: r.nextStep,
      }));

    return {
      content: [{ type: "text", text: JSON.stringify({ total: items.length, items }, null, 2) }],
      structuredContent: { total: items.length, items },
    };
  },
});