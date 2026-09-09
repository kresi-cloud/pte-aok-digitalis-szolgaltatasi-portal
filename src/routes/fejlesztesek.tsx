import { createFileRoute, Link } from "@tanstack/react-router";
import { PROJECTS, lookup } from "@/lib/store";
import { PROJECT_STAGES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { PageHeading } from "@/components/page-heading";

export const Route = createFileRoute("/fejlesztesek")({
  head: () => ({
    meta: [
      { title: "Fejlesztések – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Nyilvános áttekintés a kar futó digitalizációs fejlesztéseiről és azok várható eredményéről.",
      },
      { property: "og:title", content: "Fejlesztések – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Mi készül éppen a karon? Futó digitalizációs kezdeményezések áttekintése.",
      },
    ],
  }),
  component: PublicProjects,
});

function PublicProjects() {
  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Fejlesztések a karon"
          description="Ezek a kezdeményezések több szervezeti egységet érintenek. Ha hasonló igénye van, érdemes jelezni – lehet, hogy már készül rá megoldás."
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROJECTS.map((p) => {
          const stageIndex = PROJECT_STAGES.findIndex((s) => s.key === p.stage);
          return (
            <article key={p.id} className="card-surface p-5">
              <h2 className="font-display text-base font-semibold">{p.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{p.benefit}</p>
              <p className="mt-4 text-sm">
                <span className="text-muted-foreground">Szakasz: </span>
                {PROJECT_STAGES[stageIndex]?.label} ({stageIndex + 1}/{PROJECT_STAGES.length})
              </p>
              <div
                className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                role="progressbar"
                aria-valuenow={stageIndex + 1}
                aria-valuemin={1}
                aria-valuemax={PROJECT_STAGES.length}
                aria-label={`${p.name} előrehaladása`}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${((stageIndex + 1) / PROJECT_STAGES.length) * 100}%` }}
                />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Felelős csapat</dt>
                  <dd>{lookup.team(p.teamId)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Céldátum</dt>
                  <dd>{p.targetDate}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="card-surface flex flex-wrap items-center justify-between gap-4 p-5">
        <p className="text-sm">
          Van olyan folyamat az egységénél, amit érdemes lenne digitalizálni?
        </p>
        <Button asChild>
          <Link to="/uj-igeny" search={{ domain: "digitalizacio", service: "" }}>
            Ötlet vagy igény beküldése
          </Link>
        </Button>
      </div>
    </div>
  );
}