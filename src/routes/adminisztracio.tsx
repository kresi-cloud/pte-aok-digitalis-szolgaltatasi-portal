import { withRouteAccess } from "@/lib/with-route-access";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CATALOG, ORG_UNITS, TEAMS, USERS, lookup, useStore } from "@/lib/store";
import {
  ANNOUNCEMENT_LEVEL_LABELS,
  INVENTORY_STATUS_LABELS,
  ROLE_LABELS,
  type AnnouncementLevel,
  ORG_UNIT_TYPE_LABELS,
} from "@/lib/types";
import { HARDWARE_MODELS } from "@/lib/inventory-data";
import { SpecGrid } from "@/routes/leltar";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import {
  DEADLINE_STEP_KEYS,
  DEADLINE_STEP_LABELS,
  DEFAULT_PROCESS_SETTINGS,
  normalizeProcessSettings,
  type DeadlineStepKey,
  type ProcessSettings,
} from "@/lib/deadlines";
import { DelegationCard } from "@/components/delegation-card";
import { unitBudgetOf } from "@/lib/unit-budget";

export const Route = createFileRoute("/adminisztracio")({
  head: () => ({
    meta: [
      { title: "Adminisztráció – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Felhasználók, szerepkörök, szervezeti egységek, katalógus és AI-beállítások kezelése.",
      },
      { property: "og:title", content: "Adminisztráció – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Portálbeállítások rendszergazdák számára." },
    ],
  }),
  component: withRouteAccess("/adminisztracio", "Adminisztráció", Admin),
});

function Admin() {
  const { resetDemo, inventory, decideInventoryItem } = useStore();
  const viewOnly = useViewOnly("adminisztracio");
  const [comments, setComments] = useState<Record<string, string>>({});
  const pending = inventory.filter((i) => i.status === "jovahagyasra_var");
  const decided = inventory.filter((i) => i.status !== "jovahagyasra_var");
  return (
    <div className="space-y-6">
      <div>
        <PageHeading
          title="Adminisztráció"
          description="Törzsadatok és a portál működését szabályozó beállítások."
        />
        {viewOnly && <ViewOnlyNotice />}
      </div>

      <fieldset disabled={viewOnly} className="contents">
        <Tabs defaultValue="felhasznalok">
          <TabsList className="flex-wrap">
            <TabsTrigger value="felhasznalok">Felhasználók</TabsTrigger>
            <TabsTrigger value="egysegek">Szervezeti egységek</TabsTrigger>
            <TabsTrigger value="katalogus">Katalógus</TabsTrigger>
            <TabsTrigger value="leltar">
              Leltár jóváhagyás{pending.length > 0 ? ` (${pending.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="kozlemenyek">Közlemények</TabsTrigger>
            <TabsTrigger value="folyamat">Folyamat-beállítások</TabsTrigger>
            <TabsTrigger value="ai">AI-beállítások</TabsTrigger>
          </TabsList>

          <TabsContent value="felhasznalok">
            <p className="mb-3 rounded-md border border-border bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">
              A szerepkörök itt csak megtekinthetők. Jogosultságot kiosztani vagy visszavonni az
              admin tud, a Jogosultságkezelés felületen.
            </p>
            <div className="card-surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Név</TableHead>
                    <TableHead>Munkakör</TableHead>
                    <TableHead>Egység</TableHead>
                    <TableHead>Szerepkörök</TableHead>
                    <TableHead>Csapat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {USERS.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.title}</TableCell>
                      <TableCell>{lookup.unit(u.orgUnitId)}</TableCell>
                      <TableCell>{u.roles.map((r) => ROLE_LABELS[r]).join(", ")}</TableCell>
                      <TableCell>{u.teamId ? lookup.team(u.teamId) : "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="egysegek">
            <div className="card-surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Szervezeti egység</TableHead>
                    <TableHead>Típus</TableHead>
                    <TableHead>Jóváhagyó</TableHead>
                    <TableHead>Éves IT-keret (bruttó Ft)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ORG_UNITS.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {ORG_UNIT_TYPE_LABELS[o.type]}
                      </TableCell>
                      <TableCell>{lookup.userName(o.approverUserId)}</TableCell>
                      <TableCell>
                        <UnitBudgetInput orgUnitId={o.id} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="card-surface mt-4 p-5">
              <h2 className="font-display text-base font-semibold">Szolgáltatási csapatok</h2>
              <ul className="mt-3 space-y-2 text-sm">
                {TEAMS.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap justify-between gap-2 border-b border-border pb-2"
                  >
                    <span className="font-medium">{t.name}</span>
                    <span className="text-muted-foreground">
                      gazda: {lookup.userName(t.ownerUserId)} · {t.members.length} tag
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="katalogus">
            <div className="card-surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Szolgáltatás</TableHead>
                    <TableHead>Terület</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Jóváhagyási út</TableHead>
                    <TableHead>Aktív</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {CATALOG.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>{lookup.domain(c.domain)?.name}</TableCell>
                      <TableCell>{c.sla}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {c.approvals.join(" → ")}
                      </TableCell>
                      <TableCell>
                        <Switch defaultChecked aria-label={`${c.name} aktív`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="leltar" className="space-y-4">
            <section className="card-surface p-5">
              <h2 className="font-display text-base font-semibold">
                Jóváhagyásra váró leltártételek
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A felhasználók által feltöltött személyi hardver- és szoftvertételek. Hardver esetén
                a műszaki adatok automatikusan felismertek – jóváhagyás előtt ellenőrizze őket.
              </p>
              {pending.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">Nincs függőben lévő tétel.</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {pending.map((i) => (
                    <li key={i.id} className="rounded-md border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{i.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {lookup.userName(i.ownerId)} ·{" "}
                            {lookup.unit(lookup.user(i.ownerId)?.orgUnitId)} ·{" "}
                            {i.kind === "hardver"
                              ? (HARDWARE_MODELS.find((m) => m.key === i.modelKey)?.label ??
                                "Egyedi eszköz")
                              : [i.version && `verzió ${i.version}`, i.licenseType]
                                  .filter(Boolean)
                                  .join(" · ")}
                          </p>
                          {i.kind === "hardver" && (
                            <p className="mt-1 text-xs text-muted-foreground">
                              Gyári szám: {i.serial || "—"} · PTE leltárkód: {i.inventoryNo || "—"}{" "}
                              ·{" "}
                              {i.location ??
                                ([i.building, i.room].filter(Boolean).join(" · ") ||
                                  "Személyi használat")}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          beküldve: {i.createdAt}
                        </span>
                      </div>
                      {i.kind === "hardver" && <SpecGrid item={i} />}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Input
                          className="max-w-sm"
                          placeholder="Megjegyzés a döntéshez (opcionális)"
                          value={comments[i.id] ?? ""}
                          onChange={(e) => setComments({ ...comments, [i.id]: e.target.value })}
                          aria-label={`Megjegyzés – ${i.name}`}
                        />
                        <Button
                          onClick={() => {
                            decideInventoryItem(i.id, "jovahagyva", comments[i.id] || undefined);
                            toast.success("Leltártétel jóváhagyva.");
                          }}
                        >
                          Jóváhagyás
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            decideInventoryItem(i.id, "elutasitva", comments[i.id] || undefined);
                            toast.message("Leltártétel elutasítva.");
                          }}
                        >
                          Elutasítás
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="card-surface overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tétel</TableHead>
                    <TableHead>Típus</TableHead>
                    <TableHead>Gyári szám</TableHead>
                    <TableHead>PTE leltárkód</TableHead>
                    <TableHead>Tulajdonos</TableHead>
                    <TableHead>Operációs rendszer</TableHead>
                    <TableHead>Processzor</TableHead>
                    <TableHead>Memória</TableHead>
                    <TableHead>Állapot</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {decided.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-medium">{i.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.kind === "hardver" ? "Hardver" : "Szoftver"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{i.serial ?? "—"}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {i.inventoryNo ?? "—"}
                      </TableCell>
                      <TableCell>{lookup.userName(i.ownerId)}</TableCell>
                      <TableCell>{i.spec ? `${i.spec.os} ${i.spec.osVersion}` : "—"}</TableCell>
                      <TableCell>{i.spec?.cpu ?? "—"}</TableCell>
                      <TableCell>{i.spec?.ram ?? "—"}</TableCell>
                      <TableCell>{INVENTORY_STATUS_LABELS[i.status]}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="kozlemenyek">
            <AnnouncementsAdmin />
          </TabsContent>

          <TabsContent value="folyamat" className="space-y-4">
            <ProcessSettingsAdmin />
            <DelegationsAdmin />
          </TabsContent>

          <TabsContent value="ai">
            <section className="card-surface space-y-5 p-5">
              {/* AI beállítások */}
              <h2 className="font-display text-base font-semibold">AI-támogatás beállításai</h2>
              <p className="text-sm text-muted-foreground">
                Az AI kizárólag javaslatot tesz; minden döntést munkatárs hoz meg, és minden
                javaslat naplózásra kerül.
              </p>
              {[
                ["ai1", "Igényleírás pontosítása az igénylőnél"],
                ["ai2", "Automatikus besorolási javaslat"],
                ["ai3", "Duplikációfigyelés"],
                ["ai4", "Vezetői összefoglalók generálása"],
                ["ai5", "Automatikus döntéshozatal (nem javasolt)"],
              ].map(([id, label], i) => (
                <div key={id} className="flex items-center justify-between gap-4">
                  <Label htmlFor={id} className="font-normal">
                    {label}
                  </Label>
                  <Switch id={id} defaultChecked={i < 4} />
                </div>
              ))}
            </section>

            <section className="card-surface mt-4 p-5">
              <h2 className="font-display text-base font-semibold">Demóadatok</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A prototípus adatai a böngészőben tárolódnak. Visszaállítás után az eredeti
                mintaadatok töltődnek be.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  resetDemo();
                  toast.success("A demóadatok visszaállítva.");
                }}
              >
                Demóadatok visszaállítása
              </Button>
            </section>
          </TabsContent>
        </Tabs>
      </fieldset>
    </div>
  );
}
const todayStr = () => new Date().toISOString().slice(0, 10);
const defaultExpiry = () => {
  const d = new Date();
  d.setDate(d.getDate() + 14);
  return d.toISOString().slice(0, 10);
};

/** D15: egységenkénti éves IT-keret – a jóváhagyó figyelmeztetést lát, ha kimerülne. */
function UnitBudgetInput({ orgUnitId }: { orgUnitId: string }) {
  const store = useStore();
  const [value, setValue] = useState(String(unitBudgetOf(store.unitBudgets, orgUnitId)));
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={0}
      step={100000}
      className="w-40"
      value={value}
      aria-label={`Éves IT-keret: ${lookup.unit(orgUnitId)}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const n = Number(value);
        if (Number.isFinite(n) && n >= 0 && n !== unitBudgetOf(store.unitBudgets, orgUnitId)) {
          store.setUnitBudget(orgUnitId, n);
          toast.success("Egység-keret mentve, naplózva.");
        }
      }}
    />
  );
}

/** D8: helyettesítések adminisztrátori áttekintése és felülírása. */
function DelegationsAdmin() {
  const store = useStore();
  const [userId, setUserId] = useState("");
  return (
    <div className="space-y-4">
      <section className="card-surface space-y-3 p-5">
        <h2 className="font-display text-base font-semibold">Helyettesítések</h2>
        {store.delegations.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nincs beállított helyettesítés.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {store.delegations.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3"
              >
                <span>
                  {`${lookup.user(d.userId)?.name ?? d.userId} → ${lookup.user(d.substituteId)?.name ?? d.substituteId} · ${d.from} – ${d.to}`}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const err = store.setDelegation(d.userId, null);
                    if (err) toast.error(err);
                    else toast.success("Helyettesítés törölve.");
                  }}
                >
                  Törlés
                </Button>
              </li>
            ))}
          </ul>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="dg-user">Helyettesítés beállítása másnak</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="dg-user" className="w-full sm:w-96" aria-label="Felhasználó">
              <SelectValue placeholder="Válasszon felhasználót" />
            </SelectTrigger>
            <SelectContent>
              {store.activeUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} – {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>
      {userId && <DelegationCard key={userId} userId={userId} title="Helyettesítés (admin)" />}
    </div>
  );
}

/** D3/D6/D7: lépésenkénti határidők – szabadon állítható, minden módosítás naplózva. */
function ProcessSettingsAdmin() {
  const store = useStore();
  const [draft, setDraft] = useState<ProcessSettings>(store.processSettings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(store.processSettings);
  const log = store.assetAudit.filter((a) => a.entity === "beallitas").slice(0, 20);
  const setDeadline = (k: DeadlineStepKey, v: string) =>
    setDraft((d) => ({ ...d, deadlines: { ...d.deadlines, [k]: Number(v) } }));
  return (
    <div className="space-y-4">
      <section className="card-surface space-y-4 p-5">
        <div>
          <h2 className="font-display text-base font-semibold">Lépésenkénti döntési határidők</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Munkanapban, hétvége nélkül. Állami fenntartású intézménynél az átfutások erősen
            ingadoznak, ezért minden érték szabadon állítható; a folyamat sehol nem kódol be fix
            napszámot. A beszerzési lépésnél a beszerző által rögzített várható érkezés a határidő,
            ha van; egyébként az itt megadott érték.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DEADLINE_STEP_KEYS.map((k) => (
            <div key={k} className="space-y-1.5">
              <Label htmlFor={`dl-${k}`}>{DEADLINE_STEP_LABELS[k]}</Label>
              <Input
                id={`dl-${k}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={365}
                value={draft.deadlines[k]}
                onChange={(e) => setDeadline(k, e.target.value)}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label htmlFor="dl-reminder">Emlékeztető a határidő százalékánál</Label>
            <Input
              id="dl-reminder"
              type="number"
              inputMode="numeric"
              min={10}
              max={100}
              value={draft.reminderPct}
              onChange={(e) => setDraft((d) => ({ ...d, reminderPct: Number(e.target.value) }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dl-tolerance">Költségkeret-küszöb (%)</Label>
            <Input
              id="dl-tolerance"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={draft.budgetTolerancePct}
              onChange={(e) =>
                setDraft((d) => ({ ...d, budgetTolerancePct: Number(e.target.value) }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Eddig léphető túl a jóváhagyott bruttó keret újra-jóváhagyás nélkül (D5).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="dl-autoclose">Átvétel automatikus lezárása (munkanap)</Label>
            <Input
              id="dl-autoclose"
              type="number"
              inputMode="numeric"
              min={1}
              max={365}
              value={draft.receiptAutoCloseDays}
              onChange={(e) =>
                setDraft((d) => ({ ...d, receiptAutoCloseDays: Number(e.target.value) }))
              }
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Lejárt határidőnél az ügy piros jelzést kap a vezetői és a saját munkatéri nézetben, a
          felelős és a szakmai felügyelet értesítést kap, de a felelős marad – senki nem veszi át
          automatikusan a döntést.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={!dirty}
            onClick={() => {
              store.updateProcessSettings(draft);
              setDraft(normalizeProcessSettings(draft));
              toast.success("Folyamat-beállítások mentve, a változás naplózva.");
            }}
          >
            Beállítások mentése
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft(DEFAULT_PROCESS_SETTINGS);
            }}
          >
            Alapértékek betöltése
          </Button>
        </div>
      </section>
      <section className="card-surface p-5">
        <h2 className="font-display text-base font-semibold">Módosítások naplója</h2>
        {log.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Még nem történt módosítás.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
            {log.map((a) => (
              <li key={a.id}>
                {a.at} · {lookup.user(a.actorId)?.name ?? a.actorId} – {a.detail}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function AnnouncementsAdmin() {
  const { announcements, addAnnouncement, updateAnnouncement, removeAnnouncement } = useStore();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState<AnnouncementLevel>("info");
  const [expiresAt, setExpiresAt] = useState(defaultExpiry());

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error("A cím és a szöveg megadása kötelező.");
      return;
    }
    if (expiresAt < todayStr()) {
      toast.error("A lejárat dátuma nem lehet a mai napnál korábbi.");
      return;
    }
    addAnnouncement({ title: title.trim(), body: body.trim(), level, expiresAt, active: true });
    setTitle("");
    setBody("");
    setLevel("info");
    setExpiresAt(defaultExpiry());
    toast.success("A közlemény megjelenik minden felhasználó kezdőlapján.");
  };

  return (
    <div className="space-y-4">
      <section className="card-surface space-y-4 p-5">
        <div>
          <h2 className="font-display text-base font-semibold">
            Új közlemény minden felhasználónak
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A közzétett hír a portál kezdőlapján jelenik meg minden bejelentkezett felhasználónak, a
            megadott lejárat napjáig. Ha nincs érvényes közlemény, a blokk nem látszik.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">Cím</Label>
            <Input
              id="ann-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pl. Tervezett karbantartás a kari hálózaton"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ann-level">Fontosság</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as AnnouncementLevel)}>
                <SelectTrigger id="ann-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ANNOUNCEMENT_LEVEL_LABELS) as AnnouncementLevel[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {ANNOUNCEMENT_LEVEL_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-exp">Lejárat</Label>
              <Input
                id="ann-exp"
                type="date"
                min={todayStr()}
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ann-body">Szöveg</Label>
          <Textarea
            id="ann-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="A közlemény részletei…"
          />
        </div>
        <Button onClick={submit}>Közzététel</Button>
      </section>

      <section className="card-surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cím</TableHead>
              <TableHead>Fontosság</TableHead>
              <TableHead>Közzétéve</TableHead>
              <TableHead>Lejárat</TableHead>
              <TableHead>Állapot</TableHead>
              <TableHead className="text-right">Műveletek</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {announcements.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  Még nincs közlemény.
                </TableCell>
              </TableRow>
            )}
            {announcements.map((a) => {
              const expired = a.expiresAt < todayStr();
              return (
                <TableRow key={a.id}>
                  <TableCell className="max-w-sm">
                    <span className="block font-medium">{a.title}</span>
                    <span className="block text-xs text-muted-foreground">{a.body}</span>
                  </TableCell>
                  <TableCell>{ANNOUNCEMENT_LEVEL_LABELS[a.level]}</TableCell>
                  <TableCell>{a.publishedAt}</TableCell>
                  <TableCell>
                    <Input
                      type="date"
                      className="w-40"
                      value={a.expiresAt}
                      onChange={(e) => updateAnnouncement(a.id, { expiresAt: e.target.value })}
                    />
                  </TableCell>
                  <TableCell>{expired ? "Lejárt" : a.active ? "Aktív" : "Visszavonva"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateAnnouncement(a.id, { active: !a.active })}
                    >
                      {a.active ? "Visszavonás" : "Újraaktiválás"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-2"
                      onClick={() => {
                        removeAnnouncement(a.id);
                        toast.success("Közlemény törölve.");
                      }}
                    >
                      Törlés
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
