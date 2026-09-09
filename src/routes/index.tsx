import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Boxes, CircleAlert, Globe, Laptop, Workflow } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { AnnouncementsBanner } from "@/components/announcements-banner";
import { ALL_DOMAINS, DOMAINS, lookup, useStore } from "@/lib/store";
import type { DomainKey } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Kezdőlap – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Indítson digitális vagy informatikai igényt, kövesse a folyamatban lévő ügyeit és intézze a teendőit egy helyen.",
      },
      { property: "og:title", content: "Kezdőlap – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Digitális és informatikai igények egy helyen a PTE ÁOK munkatársai számára.",
      },
    ],
  }),
  component: Home,
});

const DOMAIN_ICONS: Record<DomainKey, typeof Boxes> = {
  szoftver: Boxes,
  hardver: Laptop,
  web: Globe,
  digitalizacio: Workflow,
};

const PRIMARY_DOMAIN = DOMAINS.find((d) => d.key === "hardver");
const SECONDARY_DOMAINS = ALL_DOMAINS.filter((d) => d.key !== "hardver");

function Home() {
  const { currentUser, requests } = useStore();
  const mine = requests.filter((r) => r.requesterId === currentUser.id);
  const active = mine.filter((r) => !["lezarva", "elutasitva"].includes(r.status));
  const todos = mine.filter((r) => r.status === "pontositas");
  const approvals = requests.filter(
    (r) =>
      r.status === "jovahagyasra_var" &&
      r.approvals.some((a) => a.approverId === currentUser.id && a.decision === "fuggoben"),
  );

  return (
    <div className="space-y-10">
      <h1 className="sr-only">Kezdőlap – ÁOK Digitális Szolgáltatási Portál</h1>

      <AnnouncementsBanner />

      {(todos.length > 0 || approvals.length > 0) && (
        <section aria-labelledby="teendoim">
          <h2 id="teendoim" className="mb-3 font-display text-lg font-semibold">
            Teendőim
          </h2>
          <ul className="space-y-2">
            {todos.map((r) => (
              <li key={r.id}>
                <Link
                  to="/igeny/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 transition-colors hover:bg-warning/15"
                >
                  <CircleAlert className="size-5 shrink-0 text-warning-foreground" aria-hidden="true" />
                  <span className="text-sm">
                    <span className="font-medium">{r.id}</span> – további információ szükséges az
                    ügyintéző részéről.
                  </span>
                  <ArrowRight className="ml-auto size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
            {approvals.map((r) => (
              <li key={r.id}>
                <Link
                  to="/igeny/$id"
                  params={{ id: r.id }}
                  className="flex items-center gap-3 rounded-lg border border-info/30 bg-info/5 px-4 py-3 transition-colors hover:bg-info/10"
                >
                  <CircleAlert className="size-5 shrink-0 text-info" aria-hidden="true" />
                  <span className="text-sm">
                    <span className="font-medium">{r.id}</span> – jóváhagyásra vár Öntől: {r.title}
                  </span>
                  <ArrowRight className="ml-auto size-4 shrink-0" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="szolgaltatasok">
        <h2 id="szolgaltatasok" className="mb-1 font-display text-lg font-semibold">
          Mit szeretne igényelni?
        </h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Válasszon területet az igénylés indításához
        </p>

        {PRIMARY_DOMAIN && (
          <Link
            to="/uj-igeny"
            search={{ domain: PRIMARY_DOMAIN.key }}
            className="card-surface group flex flex-col gap-5 border-primary/40 bg-secondary/40 p-6 transition-colors hover:border-primary hover:bg-secondary/70 md:flex-row md:items-center"
          >
            <span className="grid size-14 shrink-0 place-items-center rounded-md bg-accent text-accent-foreground">
              <Laptop className="size-7" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-xl font-semibold">
                {PRIMARY_DOMAIN.name}
              </span>
              <span className="mt-1 block text-sm text-muted-foreground">
                {PRIMARY_DOMAIN.description}
              </span>
              <span className="mt-3 block text-xs text-muted-foreground">
                {"\n"}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground">
              Igénylés indítása <ArrowRight className="size-4" aria-hidden="true" />
            </span>
          </Link>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {SECONDARY_DOMAINS.map((d) => {
            const Icon = DOMAIN_ICONS[d.key];
            return (
              <div
                key={d.key}
                className="card-surface pointer-events-none flex items-start gap-3 p-4 opacity-50"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4.5" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold">{d.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {d.description}
                  </span>
                  <span className="mt-2 inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    Hamarosan elérhető
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </section>



      <section aria-labelledby="folyamatban">
        <div className="mb-3 flex items-end justify-between">
          <h2 id="folyamatban" className="font-display text-lg font-semibold">
            Folyamatban lévő igényeim
          </h2>
          <Link to="/igenyeim" className="text-sm font-medium text-primary hover:underline">
            Összes igényem
          </Link>
        </div>
        {active.length === 0 ? (
          <p className="card-surface p-6 text-sm text-muted-foreground">
            Jelenleg nincs folyamatban lévő igénye.
          </p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-3">
            {active.map((r) => (
              <Link
                key={r.id}
                to="/igeny/$id"
                params={{ id: r.id }}
                className="card-surface flex flex-col gap-3 p-5 transition-colors hover:border-primary/40"
              >
                <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                <span className="font-display font-semibold">{r.title}</span>
                <StatusBadge status={r.status} className="self-start" />
                <dl className="mt-1 space-y-1 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <dt>Felelős:</dt>
                    <dd className="text-foreground">{lookup.team(r.teamId)}</dd>
                  </div>
                  {r.dueDate && (
                    <div className="flex gap-2">
                      <dt>Tervezett befejezés:</dt>
                      <dd className="text-foreground">{r.dueDate}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt>Utolsó frissítés:</dt>
                    <dd className="text-foreground">{r.updatedAt}</dd>
                  </div>
                </dl>
                <p className="mt-auto border-t border-border pt-3 text-sm">
                  <span className="text-muted-foreground">Következő lépés: </span>
                  {r.nextStep}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}