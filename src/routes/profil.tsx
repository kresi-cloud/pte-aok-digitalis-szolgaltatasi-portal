import { createFileRoute, Link } from "@tanstack/react-router";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { lookup, useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";

export const Route = createFileRoute("/profil")({
  head: () => ({
    meta: [
      { title: "Saját profil – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content: "Intézményi azonosítóból származó profiladatok és értesítési beállítások.",
      },
      { property: "og:title", content: "Saját profil – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Profiladatok és értesítési beállítások." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { currentUser, requests, activeRole, logout } = useStore();
  const mine = requests.filter((r) => r.requesterId === currentUser.id);
  const manager = lookup.user(
    currentUser.managerId ?? lookup.user(currentUser.id)?.managerId ?? undefined,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <h1 className="font-display text-2xl font-semibold">Saját profil</h1>

      <dl className="card-surface divide-y divide-border">
        {[
          ["Név", currentUser.name],
          ["Munkakör", currentUser.title],
          ["Egyetemi e-mail", currentUser.email],
          ["Munkavállalói azonosító", currentUser.employeeId],
          ["Szervezeti egység", lookup.unit(currentUser.orgUnitId)],
          ["Szervezeti jóváhagyó", manager?.name ?? "Dékáni Hivatal"],
          ["Aktív szerepkör", ROLE_LABELS[activeRole]],
          ["Saját igények száma", String(mine.length)],
        ].map(([k, v]) => (
          <div key={k} className="grid gap-1 px-5 py-3 sm:grid-cols-[240px_1fr]">
            <dt className="text-sm text-muted-foreground">{k}</dt>
            <dd className="text-sm">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">
        Ezek az adatok az intézményi azonosítóból származnak, a portálon nem szerkeszthetők.
      </p>

      <section className="card-surface p-5">
        <h2 className="font-display text-base font-semibold">Értesítési beállítások</h2>
        <div className="mt-4 space-y-4">
          {[
            ["n1", "Állapotváltozás e-mailben"],
            ["n2", "Új üzenet az ügyintézőtől"],
            ["n3", "Jóváhagyási teendő emlékeztető"],
            ["n4", "Heti összefoglaló"],
          ].map(([id, label], i) => (
            <div key={id} className="flex items-center justify-between gap-4">
              <Label htmlFor={id} className="font-normal">
                {label}
              </Label>
              <Switch id={id} defaultChecked={i < 3} />
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link to="/igenyeim">Saját igényeim</Link>
        </Button>
        <Button variant="outline" onClick={logout}>
          Kijelentkezés
        </Button>
      </div>
    </div>
  );
}