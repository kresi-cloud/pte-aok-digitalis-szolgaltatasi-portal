import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATALOG, DOMAINS, lookup } from "@/lib/store";
import { cn } from "@/lib/utils";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/szolgaltatasok")({
  head: () => ({
    meta: [
      { title: "Szolgáltatáskatalógus – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Igényelhető digitális és informatikai szolgáltatások leírással, átfutási idővel és jóváhagyási úttal.",
      },
      { property: "og:title", content: "Szolgáltatáskatalógus – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Böngéssze a kar digitális szolgáltatásait és indítson igényt egy kattintással.",
      },
    ],
  }),
  component: Catalog,
});

function Catalog() {
  const [q, setQ] = useState("");
  const [domain, setDomain] = useState<string>("mind");

  const items = CATALOG.filter((c) => (domain === "mind" ? true : c.domain === domain)).filter((c) =>
    q
      ? `${c.name} ${c.description} ${c.keywords.join(" ")}`.toLowerCase().includes(q.toLowerCase())
      : true,
  );

  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Szolgáltatáskatalógus"
          description="Ha megtalálja a megfelelő szolgáltatást, az igénylés adatai automatikusan kitöltődnek."
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            className="pl-9"
            placeholder="Keresés a szolgáltatások között…"
            aria-label="Keresés a szolgáltatások között"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-md border border-border bg-card p-1">
          {[{ key: "mind", name: "Mind" }, ...DOMAINS.map((d) => ({ key: d.key, name: d.name }))].map(
            (d) => (
              <button
                key={d.key}
                onClick={() => setDomain(d.key)}
                aria-pressed={domain === d.key}
                className={cn(
                  "rounded px-3 py-1.5 text-sm",
                  domain === d.key ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
              >
                {d.name}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((c) => (
          <article key={c.id} className="card-surface flex flex-col p-5">
            <div className="flex items-start justify-between gap-4">
              <h2 className="font-display text-base font-semibold">{c.name}</h2>
              <span className="rounded-md bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                {lookup.domain(c.domain)?.name}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Ki igényelheti</dt>
                <dd className="flex items-start gap-1.5">
                  <Users className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {c.whoCanRequest}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Jellemző átfutási idő</dt>
                <dd className="flex items-center gap-1.5">
                  <Clock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {c.deliveryTime} · SLA {c.sla}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Szükséges jóváhagyások</dt>
                <dd>{c.approvals.join(" → ")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Felelős egység</dt>
                <dd>{lookup.team(c.teamId)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">Szükséges információk</dt>
                <dd>{c.requiredInfo.join(", ")}</dd>
              </div>
            </dl>
            <Button asChild className="mt-5 self-start">
              <Link to="/uj-igeny" search={{ domain: c.domain, service: c.id }}>
                Igény indítása
              </Link>
            </Button>
          </article>
        ))}
      </div>
    </div>
  );
}