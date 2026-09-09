import { Building2, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { ROLE_LABELS } from "@/lib/types";
import { lookup } from "@/lib/store";
import { DEMO_USER_IDS } from "@/lib/demo-users";

const DEMO_USERS = DEMO_USER_IDS;

export function LoginScreen() {
  const { login, extraUsers } = useStore();
  const extraIds = (extraUsers ?? []).map((u) => u.id);

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col justify-between bg-primary px-8 py-12 text-primary-foreground lg:px-16">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-md bg-primary-foreground/15 font-display font-bold">
            ÁOK
          </span>
          <span className="text-sm font-medium opacity-90">
            Pécsi Tudományegyetem · Általános Orvostudományi Kar
          </span>
        </div>
        <div className="max-w-lg py-16">
          <h1 className="font-display text-4xl leading-tight font-semibold">
            ÁOK Digitális Szolgáltatási Portál
          </h1>
          <p className="mt-3 text-lg opacity-90">Digitális és informatikai igények egy helyen</p>
          <ul className="mt-10 space-y-4 text-sm opacity-90">
            <li className="flex gap-3">
              <Building2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              Egy belépési pont minden szoftver-, hardver-, web- és digitalizációs igényhez.
            </li>
            <li className="flex gap-3">
              <ShieldCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              Átlátható folyamatok, világos felelősségek, követhető jóváhagyások.
            </li>
            <li className="flex gap-3">
              <Sparkles className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              Nem kell tudnia, melyik egység illetékes – a rendszer belül irányítja az igényt.
            </li>
          </ul>
        </div>
        <p className="text-xs opacity-70">Belső prototípus – demonstrációs adatokkal.</p>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md">
          <h2 className="font-display text-2xl font-semibold">Belépés</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A portál az egyetemi azonosítót használja. Belépés után a rendszer ismeri a nevét,
            szervezeti egységét, munkakörét és jóváhagyóját.
          </p>
          <Button className="mt-6 w-full" size="lg" onClick={() => login("u-kovacs")}>
            Belépés PTE azonosítóval
          </Button>

          <div className="mt-10">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Demó belépés más szerepkörrel
            </p>
            <ul className="mt-3 space-y-2">
              {[...DEMO_USERS, ...extraIds].map((id) => {
                const u = lookup.user(id)!;
                return (
                  <li key={id}>
                    <button
                      onClick={() => login(id)}
                      className="flex w-full items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-secondary"
                    >
                      <span data-no-i18n className="grid size-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                        {u.initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{u.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {ROLE_LABELS[u.roles[0]!]} · {lookup.unit(u.orgUnitId)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}