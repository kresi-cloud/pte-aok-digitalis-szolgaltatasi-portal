import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { lookup, useStore } from "@/lib/store";
import { TODAY } from "@/lib/asset-data";
import {
  assetLookup,
  huf,
  isMobileAssetCategory,
  licenceStatus,
  lifecycleEnd,
  lifecycleStatus,
  osSupportEnd,
  replacementPriority,
  yearsSince,
} from "@/lib/asset-logic";
import { productModelLabel } from "@/lib/handover-products";
import { Field, LicenceBadge, LifecycleBadge, PriorityBadge, StatTile } from "@/components/asset-bits";
import {
  PERSONAL_CHECK_LABELS,
  SHARED_CHECK_LABELS,
  type PersonalCheckAnswer,
  type SharedCheckAnswer,
} from "@/lib/asset-types";

export function MyAssets() {
  const store = useStore();
  const mine = store.assets.filter((a) => a.assignedUserId === store.currentUser.id);
  const confirmed = store.checks.filter(
    (c) => c.userId === store.currentUser.id && mine.some((a) => a.id === c.assetId),
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Rám rendelt eszköz" value={mine.length} />
        <StatTile
          label="Visszaigazolva"
          value={`${confirmed.length}/${mine.length}`}
          hint="2026. évi leltárciklus"
        />
        <StatTile
          label="Cserére érett"
          value={mine.filter((a) => ["cserere_erett", "tamogatasbol_kifutott", "selejtezesre_var"].includes(lifecycleStatus(a))).length}
          tone="warn"
        />
        <StatTile
          label="Garancián kívül"
          value={mine.filter((a) => Date.parse(a.warrantyEnd) < Date.parse(TODAY)).length}
        />
      </div>

      {mine.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Jelenleg nincs Önhöz rendelt intézményi eszköz a kataszterben.
        </p>
      )}

      {mine.map((a) => (
        <AssetCard key={a.id} assetId={a.id} shared={false} />
      ))}
    </div>
  );
}

export function SharedAssets() {
  const store = useStore();
  const mine = store.assets.filter(
    (a) => a.usage === "kozos" && (a.custodianUserId === store.currentUser.id || a.inventoryResponsibleId === store.currentUser.id),
  );
  const unitShared = store.assets.filter(
    (a) => a.usage === "kozos" && a.orgUnitId === store.currentUser.orgUnitId && !mine.includes(a),
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        A közös használatú eszközöket nem személyre, hanem szervezeti egységre tartjuk nyilván, kijelölt
        eszközfelelőssel. A leltári visszaigazolást a felelős végzi.
      </p>
      <h3 className="font-display text-sm font-semibold">Saját felelősségi körömben</h3>
      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincs Önhöz rendelt közös eszközfelelősség.</p>
      ) : (
        mine.map((a) => <AssetCard key={a.id} assetId={a.id} shared />)
      )}
      <h3 className="font-display text-sm font-semibold">Egységem további közös eszközei</h3>
      {unitShared.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nincs további közös eszköz az egységnél.</p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {unitShared.map((a) => (
            <li key={a.id} className="card-surface flex items-center justify-between gap-3 p-3 text-sm">
              <div>
                <Link to="/eszkoz/$id" params={{ id: a.id }} className="font-medium text-primary hover:underline">
                  {assetLookup.modelLabel(a.modelKey)}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {a.inventoryNo} · {assetLookup.locationLabel(a.locationId)} · felelős:{" "}
                  {lookup.userName(a.custodianUserId ?? a.inventoryResponsibleId)}
                </p>
              </div>
              <LifecycleBadge status={lifecycleStatus(a)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssetCard({ assetId, shared }: { assetId: string; shared: boolean }) {
  const store = useStore();
  const asset = store.assets.find((a) => a.id === assetId)!;
  const model = assetLookup.model(asset.modelKey);
  // Katalógusból beszerzett eszköznél a modellnév és a műszaki adatok a
  // termék adatlapjáról származnak – ez elsőbbséget élvez a technikai
  // modellkulcs felett, különben más gyártó neve alatt keresné a felhasználó.
  const product = (store.products ?? []).find((p) => p.id === asset.productId);
  const spec = product ? undefined : model?.spec;
  const title = product
    ? productModelLabel(product)
    : model
      ? assetLookup.modelLabel(asset.modelKey)
      : assetLookup.modelLabel(asset.modelKey);

  const check = store.checks.find((c) => c.assetId === asset.id && c.userId === store.currentUser.id);
  const [answer, setAnswer] = useState<string>(shared ? "megtalalhato" : "nalam_van_hasznalom");
  const [comment, setComment] = useState("");
  const osEnd = osSupportEnd(asset);

  const answers = shared ? SHARED_CHECK_LABELS : PERSONAL_CHECK_LABELS;

  return (
    <article className="card-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">
            <Link to="/eszkoz/$id" params={{ id: asset.id }} className="hover:underline">
              {title}
            </Link>
          </h3>
          <p className="text-sm text-muted-foreground">
            {assetLookup.categoryLabel(asset.categoryKey)} ·{" "}
            {isMobileAssetCategory(asset.categoryKey)
              ? "Személyi használat"
              : assetLookup.locationLabel(asset.locationId)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Gyári szám: {asset.serial || "—"} · PTE leltárkód: {asset.inventoryNo}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {asset.note?.startsWith("Beszerzési átadásból") && (
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
              Beszerzésből érkezett
            </Badge>
          )}
          <LifecycleBadge status={lifecycleStatus(asset)} />
          <PriorityBadge priority={replacementPriority(asset)} />
        </div>

      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Operációs rendszer">
          {spec?.os ?? product?.spec.os ?? "—"} {spec?.osVersion ?? product?.spec.osVersion ?? ""}
        </Field>
        <Field label="Processzor">
          {spec?.processor
            ? `${spec.processor.name} · ${spec.processor.cores} mag`
            : (product?.spec.cpu ?? "—")}
        </Field>
        <Field label="Memória">
          {spec?.memory ? `${spec.memory.capacityGb} GB ${spec.memory.type}` : (product?.spec.ram ?? "—")}
        </Field>
        <Field label="Tároló">
          {spec?.storage
            ? `${spec.storage.capacity} ${spec.storage.type}`
            : (product?.spec.storage ?? "—")}
        </Field>
        <Field label="Üzembe helyezés">
          {asset.commissionDate} ({Math.max(0, yearsSince(asset.commissionDate)).toFixed(1)} év)
        </Field>
        <Field label="Garancia vége">
          {asset.warrantyEnd}
          {Date.parse(asset.warrantyEnd) < Date.parse(TODAY) && (
            <span className="ml-1 text-xs text-destructive">lejárt</span>
          )}
        </Field>
        <Field label="Életciklus vége">{lifecycleEnd(asset)}</Field>
        <Field label="OS támogatás vége">{osEnd ?? "—"}</Field>
      </dl>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(spec?.features ?? product?.spec.features ?? []).map((f) => (
          <Badge key={f} variant="secondary" className="font-normal">
            {f}
          </Badge>
        ))}
      </div>

      <div className="mt-4 rounded-md border border-border bg-secondary/40 p-4">
        <p className="text-sm font-medium">Leltári visszaigazolás – 2026. évi ciklus</p>
        {check ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Visszaigazolva: {answers[check.answer as keyof typeof answers] ?? check.answer} · {check.at} ·
            állapot: {check.stage === "lezarva" ? "lezárva" : "leltárfelelős ellenőrzésére vár"}
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`ans-${asset.id}`}>Visszajelzés</Label>
              <Select value={answer} onValueChange={setAnswer}>
                <SelectTrigger id={`ans-${asset.id}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(answers).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor={`cmt-${asset.id}`}>Megjegyzés</Label>
              <Textarea
                id={`cmt-${asset.id}`}
                maxLength={400}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Opcionális kiegészítés"
              />
            </div>
            <div>
              <Button
                onClick={() => {
                  store.submitCheck(
                    asset.id,
                    answer as PersonalCheckAnswer | SharedCheckAnswer,
                    comment.trim() || undefined,
                  );
                  setComment("");
                  toast.success("Visszaigazolás rögzítve, leltárfelelős ellenőrzésére vár.");
                }}
              >
                Visszaigazolás küldése
              </Button>
            </div>
          </div>
        )}
      </div>

    </article>
  );
}

export function MyLicences() {
  const store = useStore();
  const mine = store.licences.filter((l) => l.assignedUserId === store.currentUser.id);
  const annual = mine.reduce((s, l) => s + l.annualCost, 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Személyes licenc" value={mine.length} />
        <StatTile label="Éves licencköltség" value={huf(annual)} />
        <StatTile
          label="Figyelmet igényel"
          value={mine.filter((l) => licenceStatus(l) !== "aktiv").length}
          tone="warn"
        />
      </div>
      {mine.length === 0 && <p className="text-sm text-muted-foreground">Nincs Önhöz rendelt licenc.</p>}
      {mine.map((l) => {
        const product = assetLookup.product(l.productKey);
        const support = product?.supportEnd[l.version];
        return (
          <article key={l.id} className="card-surface p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-semibold">
                  {product?.name} {l.version}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {product?.manufacturer} · {l.licenceType} · {l.purpose}
                </p>
              </div>
              <LicenceBadge status={licenceStatus(l)} />
            </div>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Beszerzés">{l.purchaseDate}</Field>
              <Field label="Beszerzési érték">{huf(l.purchaseValue)}</Field>
              <Field label="Éves díj">{l.annualCost ? huf(l.annualCost) : "—"}</Field>
              <Field label="Licenc lejárata">{l.licenceEnd ?? "nincs (örökös)"}</Field>
              <Field label="Megújítás esedékessége">{l.renewalDate ?? "—"}</Field>
              <Field label="Gyártói támogatás vége">{support ?? "—"}</Field>
              <Field label="Érintett eszköz">
                {l.assetId ? (
                  <Link to="/eszkoz/$id" params={{ id: l.assetId }} className="text-primary hover:underline">
                    {store.assets.find((a) => a.id === l.assetId)?.inventoryNo ?? l.assetId}
                  </Link>
                ) : (
                  "—"
                )}
              </Field>
              <Field label="Költséghely / forrás">
                {l.costCenter} · {assetLookup.funding(l.fundingSourceId)}
              </Field>
            </dl>
            {l.note && <p className="mt-2 text-sm text-muted-foreground">{l.note}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  store.markLicenceUnused(l.id, !l.reportedUnused);
                  toast.success(
                    l.reportedUnused ? "A licenc újra használtként jelölve." : "Jelezve: a licenc nincs használatban.",
                  );
                }}
              >
                {l.reportedUnused ? "Mégis használom" : "Nem használom"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  store.reportDiscrepancy({
                    kind: "szoftver_nem_hasznalt",
                    licenceId: l.id,
                    description: `${product?.name ?? l.productKey} ${l.version} – felülvizsgálat kérése.`,
                  });
                  toast.success("Felülvizsgálati kérés elküldve a szoftvergazdának.");
                }}
              >
                Felülvizsgálat kérése
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}