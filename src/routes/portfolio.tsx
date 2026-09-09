import { createFileRoute, Link } from "@tanstack/react-router";
import { PROJECTS, lookup } from "@/lib/store";
import { PROJECT_STAGES } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/portfolio")({
  head: () => ({
    meta: [
      { title: "Fejlesztési portfólió – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content: "Digitalizációs kezdeményezések szakaszok szerint, stratégiai súllyal és kockázattal.",
      },
      { property: "og:title", content: "Fejlesztési portfólió – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Kezdeményezések pipeline nézetben." },
    ],
  }),
  component: Portfolio,
});

function Portfolio() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Fejlesztési portfólió"
          description="Ötlettől a bevezetésig – a kar digitalizációs kezdeményezéseinek egységes nyilvántartása."
        />
      </div>

      <div className="grid gap-4 overflow-x-auto lg:grid-flow-col lg:auto-cols-[minmax(260px,1fr)]">
        {PROJECT_STAGES.map((stage) => {
          const items = PROJECTS.filter((p) => p.stage === stage.key);
          if (items.length === 0) return null;
          return (
            <section key={stage.key} className="card-surface p-4">
              <h2 className="font-display text-sm font-semibold tracking-wide uppercase">
                {stage.label} <span className="text-muted-foreground">({items.length})</span>
              </h2>
              <ul className="mt-3 space-y-3">
                {items.map((p) => (
                  <li key={p.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{p.benefit}</p>
                    <dl className="mt-3 space-y-1 text-xs">
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Gazda</dt>
                        <dd>{lookup.userName(p.ownerId)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Ráfordítás</dt>
                        <dd>
                          {p.effortDays} nap · {(p.estimatedCost / 1000).toLocaleString("hu-HU")} eFt
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-muted-foreground">Céldátum</dt>
                        <dd>{p.targetDate}</dd>
                      </div>
                    </dl>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <span className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[11px]">
                        Stratégiai: {p.strategicRelevance}
                      </span>
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[11px]",
                          p.risk === "magas"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : p.risk === "közepes"
                              ? "border-warning/40 bg-warning/10 text-warning-foreground"
                              : "border-success/40 bg-success/10 text-success",
                        )}
                      >
                        Kockázat: {p.risk}
                      </span>
                    </div>
                    {p.linkedRequestIds.length > 0 && (
                      <p className="mt-3 text-[11px] text-muted-foreground">
                        Kapcsolódó igények:{" "}
                        {p.linkedRequestIds.map((id, i) => (
                          <span key={id}>
                            {i > 0 && ", "}
                            <Link to="/igeny/$id" params={{ id }} className="text-primary hover:underline">
                              {id}
                            </Link>
                          </span>
                        ))}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}