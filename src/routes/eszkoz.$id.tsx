import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookup, useStore } from "@/lib/store";
import { TODAY } from "@/lib/asset-data";
import {
  assetLookup,
  huf,
  lifecycleEnd,
  lifecycleStatus,
  meetsStandard,
  osSupportEnd,
  policyFor,
  replacementPriority,
  yearsSince,
} from "@/lib/asset-logic";
import { Field, LifecycleBadge, PriorityBadge } from "@/components/asset-bits";
import { REPLACEMENT_DECISION_LABELS, type ReplacementDecisionKey } from "@/lib/asset-types";

export const Route = createFileRoute("/eszkoz/$id")({
  head: () => ({
    meta: [
      { title: "Eszközadatlap – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Eszközadatlap: műszaki adatok, hozzárendelés-történet, életciklus, garancia, karbantartás és csereigény-döntés.",
      },
      { property: "og:title", content: "Eszközadatlap – ÁOK Digitális Szolgáltatási Portál" },
      { property: "og:description", content: "Egy eszköz teljes életútja és műszaki adatai." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AssetDetail,
});

function AssetDetail() {
  const { id } = useParams({ from: "/eszkoz/$id" });
  const store = useStore();
  const asset = store.assets.find((a) => a.id === id);
  const [decision, setDecision] = useState<ReplacementDecisionKey>("csere_javasolt");
  const [comment, setComment] = useState("");

  if (!asset) {
    return (
      <div className="card-surface p-6">
        <h1 className="font-display text-xl font-semibold">Az eszköz nem található</h1>
        <p className="mt-2 text-muted-foreground">
          Lehet, hogy törölték a kataszterből.{" "}
          <Link to="/eszkozkataszter" className="text-primary hover:underline">
            Vissza a kataszterhez
          </Link>
        </p>
      </div>
    );
  }

  const model = assetLookup.model(asset.modelKey);
  const spec = model?.spec;
  const std = assetLookup.standard(model?.standardKey);
  const compliance = meetsStandard(asset);
  const policy = policyFor(asset);
  const osEnd = osSupportEnd(asset);
  const events = store.assetEvents.filter((e) => e.assetId === asset.id).sort((a, b) => a.at.localeCompare(b.at));
  const assignments = store.assignments.filter((a) => a.assetId === asset.id);
  const licences = store.licences.filter((l) => l.assetId === asset.id);
  const existing = store.replacementDecisions.find((d) => d.assetId === asset.id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            <Link to="/eszkozkataszter" className="hover:underline">
              Eszközkataszter
            </Link>{" "}
            / {asset.inventoryNo}
          </p>
          <h1 className="font-display text-2xl font-semibold">{assetLookup.modelLabel(asset.modelKey)}</h1>
          <p className="mt-1 text-muted-foreground">
            {assetLookup.categoryLabel(asset.categoryKey)} · {asset.deviceId} · gyári szám: {asset.serial}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LifecycleBadge status={lifecycleStatus(asset)} />
          <PriorityBadge priority={replacementPriority(asset)} />
          <Badge variant="secondary">{asset.usage === "kozos" ? "Közös használatú" : "Személyi használatú"}</Badge>
        </div>
      </div>

      {!compliance.ok && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive">Nem felel meg az aktuális hardverstandardnak</p>
          <ul className="mt-1 list-disc pl-5 text-muted-foreground">
            {compliance.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <Tabs defaultValue="adatok">
        <TabsList className="flex-wrap">
          <TabsTrigger value="adatok">Alapadatok</TabsTrigger>
          <TabsTrigger value="muszaki">Műszaki adatok</TabsTrigger>
          <TabsTrigger value="eletciklus">Életciklus</TabsTrigger>
          <TabsTrigger value="tortenet">Történet</TabsTrigger>
          <TabsTrigger value="szoftver">Szoftverek</TabsTrigger>
          <TabsTrigger value="dontes">Csereigény</TabsTrigger>
        </TabsList>

        <TabsContent value="adatok">
          <section className="card-surface p-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Leltári szám">{asset.inventoryNo}</Field>
              <Field label="Eszközazonosító">{asset.deviceId}</Field>
              <Field label="Gyári szám">{asset.serial}</Field>
              <Field label="Szervezeti egység">{lookup.unit(asset.orgUnitId)}</Field>
              <Field label="Elhelyezés">{assetLookup.locationLabel(asset.locationId)}</Field>
              <Field label={asset.usage === "kozos" ? "Eszközfelelős" : "Használó"}>
                {lookup.userName(asset.assignedUserId ?? asset.custodianUserId)}
              </Field>
              <Field label="Leltárfelelős">{lookup.userName(asset.inventoryResponsibleId)}</Field>
              <Field label="Felhasználás célja">{asset.purpose}</Field>
              <Field label="Üzletmenet szempontjából kritikus">{asset.businessCritical ? "Igen" : "Nem"}</Field>
              <Field label="Beszerzés dátuma">{asset.purchaseDate}</Field>
              <Field label="Üzembe helyezés">{asset.commissionDate}</Field>
              <Field label="Beszerzési érték">{huf(asset.purchaseValue)}</Field>
              <Field label="Finanszírozási forrás">{assetLookup.funding(asset.fundingSourceId)}</Field>
              <Field label="Költséghely">{asset.costCenter}</Field>
              <Field label="Garancia vége">
                {asset.warrantyEnd}
                {Date.parse(asset.warrantyEnd) < Date.parse(TODAY) && (
                  <span className="ml-2 text-xs text-destructive">lejárt</span>
                )}
              </Field>
              <Field label="Állapot">{asset.condition}</Field>
              <Field label="Hibabejelentések">{asset.reportedIssues} db</Field>
              <Field label="Javítások">{asset.repairCount} db</Field>
            </dl>
          </section>
        </TabsContent>

        <TabsContent value="muszaki">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Modellhez rendelt műszaki adatok</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Gyártó és modell">{assetLookup.modelLabel(asset.modelKey)}</Field>
              <Field label="Operációs rendszer">{spec?.os ?? "—"}</Field>
              <Field label="OS verzió / build">{spec?.osVersion ?? "—"}</Field>
              <Field label="Architektúra">{spec?.architecture ?? "—"}</Field>
              <Field label="Processzor">{spec?.processor?.name ?? "—"}</Field>
              <Field label="Processzorgeneráció">
                {spec?.processor ? `${spec.processor.generation} · ${spec.processor.releaseYear}` : "—"}
              </Field>
              <Field label="Magszám">{spec?.processor?.cores ?? "—"}</Field>
              <Field label="Memória">
                {spec?.memory ? `${spec.memory.capacityGb} GB ${spec.memory.type} ${spec.memory.speed}` : "—"}
              </Field>
              <Field label="Memóriakonfiguráció">{spec?.memory?.configuration ?? "—"}</Field>
              <Field label="Tároló">
                {spec?.storage ? `${spec.storage.capacity} ${spec.storage.type}` : "—"}
              </Field>
              <Field label="Tárolókonfiguráció">{spec?.storage?.configuration ?? "—"}</Field>
              <Field label="Grafikus vezérlő">{spec?.gpu ?? "—"}</Field>
              <Field label="Kijelző">{spec?.display ?? "—"}</Field>
              <Field label="Hálózat">{spec?.network ?? "—"}</Field>
              <Field label="OS támogatás vége">{osEnd ?? "—"}</Field>
            </dl>
            <div className="mt-4">
              <p className="text-xs text-muted-foreground">Speciális képességek</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(spec?.features ?? []).map((f) => (
                  <Badge key={f} variant="secondary" className="font-normal">
                    {f}
                  </Badge>
                ))}
              </div>
            </div>
            {std && (
              <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4 text-sm">
                <p className="font-medium">Vonatkozó hardverstandard: {std.label}</p>
                <p className="text-muted-foreground">
                  Minimum: {std.minSpec.cores} mag · {std.minSpec.ramGb} GB · {std.minSpec.storage} — Javasolt:{" "}
                  {std.preferredSpec.cpu} · {std.preferredSpec.ramGb} GB · {std.preferredSpec.storage}
                </p>
              </div>
            )}
          </section>
        </TabsContent>

        <TabsContent value="eletciklus">
          <section className="card-surface p-5">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Alkalmazott politika">{policy.label}</Field>
              <Field label="Politika szerinti élettartam">
                {policy.minYears}–{policy.maxYears} év (tervezés: {policy.plannedYears} év)
              </Field>
              <Field label="Jelenlegi életkor">{Math.max(0, yearsSince(asset.commissionDate)).toFixed(1)} év</Field>
              <Field label="Életciklus vége">{lifecycleEnd(asset)}</Field>
              <Field label="Számított státusz">{lifecycleStatus(asset)}</Field>
              <Field label="Csereprioritás">{replacementPriority(asset)}</Field>
            </dl>
            <p className="mt-4 text-sm text-muted-foreground">
              A státusz az életkorból, az operációs rendszer támogatottságából, az eszköz állapotából,
              a hibabejelentések és javítások számából, valamint a garancia állapotából számítódik.
              Eszközszinten indoklással felülírható.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  store.updateAsset(
                    asset.id,
                    { lifecycleStatusOverride: "normal" },
                    "Életciklus-státusz felülírása (tovább használható)",
                  );
                  toast.success("Az eszköz státusza felülírva: normál használat.");
                }}
              >
                Tovább használhatónak jelölés
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  store.updateAsset(asset.id, { lifecycleStatusOverride: "selejtezesre_var" }, "Életciklus-státusz felülírása (selejtezésre vár)");
                  toast.success("Az eszköz selejtezésre váróként jelölve.");
                }}
              >
                Selejtezésre jelölés
              </Button>
            </div>
          </section>
        </TabsContent>

        <TabsContent value="tortenet" className="space-y-4">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Hozzárendelés-történet</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {assignments.map((a) => (
                <li key={a.id} className="rounded-md border border-border p-3">
                  <p className="font-medium">
                    {a.userId ? lookup.userName(a.userId) : lookup.unit(a.orgUnitId)} — {a.role}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {a.from} – {a.to ?? "jelenleg is"} {a.note ? `· ${a.note}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Eseménynapló</h2>
            <ol className="mt-3 space-y-3">
              {events.map((e) => (
                <li key={e.id} className="border-l-2 border-border pl-4 text-sm">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-muted-foreground">{e.detail}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.at} · {lookup.userName(e.actorId)}
                    {e.cost ? ` · ${huf(e.cost)}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </TabsContent>

        <TabsContent value="szoftver">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Eszközhöz kötött szoftverlicencek</h2>
            {licences.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Nincs ehhez az eszközhöz rendelt licenc.</p>
            ) : (
              <ul className="mt-3 space-y-2 text-sm">
                {licences.map((l) => (
                  <li key={l.id} className="rounded-md border border-border p-3">
                    <p className="font-medium">
                      {assetLookup.productName(l.productKey)} {l.version}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {l.licenceType} · {lookup.userName(l.assignedUserId)} · lejárat: {l.licenceEnd ?? "nincs"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </TabsContent>

        <TabsContent value="dontes">
          <section className="card-surface p-5">
            <h2 className="font-display text-base font-semibold">Csereigény döntés</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A rendszer javaslatot ad, a döntést a szervezeti jóváhagyó és az IT eszközgazda hozza meg.
              A jóváhagyott csereigény bekerül a következő gazdasági év beszerzési tervébe.
            </p>
            {existing && (
              <p className="mt-3 rounded-md bg-secondary/50 p-3 text-sm">
                Korábbi döntés: <strong>{REPLACEMENT_DECISION_LABELS[existing.decision]}</strong> ·{" "}
                {lookup.userName(existing.decidedBy)} · {existing.decidedAt}
                {existing.comment ? ` · ${existing.comment}` : ""}
              </p>
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="dec">Döntés</Label>
                <Select value={decision} onValueChange={(v) => setDecision(v as ReplacementDecisionKey)}>
                  <SelectTrigger id="dec">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REPLACEMENT_DECISION_LABELS).map(([k, l]) => (
                      <SelectItem key={k} value={k}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dec-c">Indoklás</Label>
                <Textarea
                  id="dec-c"
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Szakmai indoklás a döntéshez"
                />
              </div>
            </div>
            <Button
              className="mt-4"
              onClick={() => {
                store.decideReplacement(asset.id, decision, comment.trim() || undefined);
                setComment("");
                toast.success("A csereigény döntés rögzítve.");
              }}
            >
              Döntés rögzítése
            </Button>
          </section>
        </TabsContent>
      </Tabs>
    </div>
  );
}