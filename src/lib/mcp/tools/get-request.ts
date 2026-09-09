import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { DOMAINS, ORG_UNITS, REQUESTS, TEAMS } from "@/lib/seed";
import { STATUS_LABELS } from "@/lib/types";

export default defineTool({
  name: "get_request",
  title: "Igény részletei",
  description:
    "Egy szolgáltatási igény részletes adatai azonosító alapján: cél, státusz, jóváhagyási lépések, részfeladatok és audit napló.",
  inputSchema: { id: z.string().describe("Az igény azonosítója, pl. SW-2026-0012.") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ id }) => {
    const r = REQUESTS.find((x) => x.id.toLowerCase() === id.trim().toLowerCase());
    if (!r) throw new ToolError(`Nem található igény ezzel az azonosítóval: ${id}`);
    const detail = {
      id: r.id,
      title: r.title,
      goal: r.goal,
      domain: DOMAINS.find((d) => d.key === r.domain)?.name ?? r.domain,
      status: STATUS_LABELS[r.status] ?? r.status,
      priority: r.priority,
      orgUnit: ORG_UNITS.find((u) => u.id === r.orgUnitId)?.name ?? r.orgUnitId,
      team: TEAMS.find((t) => t.id === r.teamId)?.name,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      dueDate: r.dueDate,
      estimatedCost: r.estimatedCost,
      effortDays: r.effortDays,
      nextStep: r.nextStep,
      approvals: r.approvals.map((a) => ({ step: a.step, role: a.role, decision: a.decision, decidedAt: a.decidedAt, comment: a.comment })),
      subtasks: r.subtasks.map((s) => ({ title: s.title, done: s.done })),
      audit: r.audit.map((a) => ({ at: a.at, action: a.action, detail: a.detail })),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(detail, null, 2) }],
      structuredContent: detail,
    };
  },
});