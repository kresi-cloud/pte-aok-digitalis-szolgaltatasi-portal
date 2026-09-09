import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useDemoMode } from "@/lib/demo-mode";
import { todayIso } from "@/lib/clock";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore, lookup } from "@/lib/store";
import { specForModel } from "@/lib/inventory-data";
import {
  categoryForHandover,
  handoverProductOptions,
  needsLocationForCategory,
  productForHandover,
  specFromProduct,
} from "@/lib/handover-products";
import { LOCATION_KIND_LABELS } from "@/lib/asset-types";
import { locationsForUser } from "@/lib/asset-logic";
import {
  ATTACHMENT_KIND_LABELS,
  HANDOVER_CHECKLIST,
  HANDOVER_STATUS_LABELS,
  type AssetHandover,
  type HandoverAttachment,
  type HandoverAttachmentKind,
} from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Paperclip, Trash2 } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { useViewOnly } from "@/lib/access";
import { ViewOnlyNotice } from "@/components/view-only-notice";
import { StatTile } from "@/components/asset-bits";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Kép kicsinyítése és tömörítése, hogy a prototípus tárolója ne teljen be. */
async function fileToDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Nem sikerült beolvasni a fájlt."));
    reader.readAsDataURL(file);
  });
  if (!file.type.startsWith("image/")) return raw;
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(raw);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(raw);
    img.src = raw;
  });
}

function formatSize(bytes: number): string {
  return bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} kB`;
}

export const Route = createFileRoute("/eszkozatadas")({
  head: () => ({
    meta: [
      { title: "Eszközátadás – ÁOK Digitális Szolgáltatási Portál" },
      {
        name: "description",
        content:
          "Kari IT referens munkatere: a beszerzésből beérkezett eszközök telepítése, gyári szám és leltárkód rögzítése, átadás az igénylőnek.",
      },
      { property: "og:title", content: "Eszközátadás – ÁOK Digitális Szolgáltatási Portál" },
      {
        property: "og:description",
        content: "Beérkezett eszközök telepítése és átadás-átvétele egy felületen.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HandoverWorkspace,
});

/** Semleges, kis méretű helyi demókép (nem tartalmaz valós adatot). */
const DEMO_PHOTO_DATA_URL =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200"><rect width="320" height="200" fill="#eef2f7"/><rect x="60" y="60" width="200" height="110" rx="8" fill="#c9d6e5"/><rect x="40" y="170" width="240" height="10" rx="5" fill="#a9bccf"/><text x="160" y="40" font-family="sans-serif" font-size="14" text-anchor="middle" fill="#40566d">Fiktív átadási fotó</text></svg>',
  );

function HandoverCard({ handover, canAct }: { handover: AssetHandover; canAct: boolean }) {
  const store = useStore();
  const { demo } = useDemoMode();
  const [serial, setSerial] = useState(handover.serial ?? "");
  const [inventoryNo, setInventoryNo] = useState(handover.inventoryNo ?? "");
  const catalogCtx = {
    products: store.products,
    categories: store.productCategories,
    requests: store.requests,
  };
  const defaultProduct = productForHandover(handover, catalogCtx);
  const recipientLocations = locationsForUser(handover.recipientId);
  const recipientLocation = recipientLocations[0];
  const [productId, setProductId] = useState(handover.productId ?? defaultProduct?.id ?? "");
  const [building, setBuilding] = useState(handover.building ?? recipientLocation?.building ?? "");
  const [room, setRoom] = useState(handover.room ?? recipientLocation?.room ?? "");

  const [note, setNote] = useState(handover.note ?? "");
  const [attachKind, setAttachKind] = useState<HandoverAttachmentKind>("fenykep");
  const [uploading, setUploading] = useState(false);

  const checklist = handover.checklist ?? {};
  const attachments = handover.attachments ?? [];
  const missingRequired = HANDOVER_CHECKLIST.filter((c) => c.required && !checklist[c.key]);
  const hasPhoto = attachments.some((a) => a.kind === "fenykep");
  const requiredDone = missingRequired.length === 0;

  const options = handoverProductOptions(handover, catalogCtx);
  const category = categoryForHandover(handover, catalogCtx);
  const selectedProduct = options.find((p) => p.id === productId);
  const modelKey = selectedProduct?.modelKey ?? handover.modelKey ?? "";
  const spec = selectedProduct
    ? specFromProduct(selectedProduct)
    : modelKey
      ? specForModel(modelKey)
      : undefined;
  const needsLocation = Boolean(productId) && needsLocationForCategory(category);
  const buildings = [...new Set(recipientLocations.map((l) => l.building))];
  const rooms = recipientLocations.filter((l) => l.building === building);

  const done = handover.status === "atadva" || handover.status === "atvetel_igazolva";

  const save = (label: string, extra: Partial<AssetHandover> = {}) => {
    store.updateHandover(
      handover.id,
      {
        serial: serial || undefined,
        inventoryNo: inventoryNo || undefined,
        productId: productId || undefined,
        modelKey: modelKey || undefined,
        building: needsLocation ? building || undefined : undefined,
        room: needsLocation ? room || undefined : undefined,
        note: note || undefined,
        installedOs: spec ? `${spec.os} ${spec.osVersion}` : undefined,
        ...extra,
      },
      label,
    );
  };

  /** Demómód: fiktív átadási adatok kitöltése – az átadást továbbra is a referens indítja. */
  const fillDemoHandover = () => {
    const prod = options[0];
    const demoSerial = "DEMO-PTE-2026-001";
    const demoInventoryNo = "PTE-AOK-DEMO-00421";
    const demoNote = "Vezetőségi bemutatóhoz használt fiktív átadás.";
    setSerial(demoSerial);
    setInventoryNo(demoInventoryNo);
    if (prod) setProductId(prod.id);
    setNote(demoNote);
    const fullChecklist = Object.fromEntries(
      HANDOVER_CHECKLIST.map((c) => [c.key, true]),
    ) as Record<string, boolean>;
    const withPhoto = attachments.some((a) => a.kind === "fenykep")
      ? attachments
      : [
          ...attachments,
          {
            id: `att-demo-${Date.now()}`,
            kind: "fenykep" as HandoverAttachmentKind,
            name: "atadas-demo.svg",
            mimeType: "image/svg+xml",
            sizeBytes: DEMO_PHOTO_DATA_URL.length,
            dataUrl: DEMO_PHOTO_DATA_URL,
            uploadedBy: store.currentUser.id,
            uploadedAt: todayIso(),
          },
        ];
    store.updateHandover(
      handover.id,
      {
        serial: demoSerial,
        inventoryNo: demoInventoryNo,
        productId: prod?.id ?? productId ?? undefined,
        modelKey: prod?.modelKey ?? modelKey ?? undefined,
        note: demoNote,
        checklist: fullChecklist,
        attachments: withPhoto,
      },
      "Fiktív átadási adatok kitöltve (vezetőségi demó)",
    );
    toast.success("A fiktív átadási adatok kitöltve – az átadást Ön indítja el.");
  };

  return (
    <article className="card-surface space-y-4 p-5">
      {demo && canAct && !done && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span>Vezetőségi demó – az átadási adatok egy kattintással kitölthetők.</span>
          <Button size="sm" variant="outline" className="ml-auto" onClick={fillDemoHandover}>
            Fiktív átadási adatok kitöltése
          </Button>
        </div>
      )}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-base font-semibold">{handover.deviceName}</h3>
          <p className="text-xs text-muted-foreground">
            Átvevő: {lookup.user(handover.recipientId)?.name ?? handover.recipientId} ·{" "}
            {lookup.unit(handover.orgUnitId)}
          </p>
          {handover.requestId && (
            <Link
              to="/igeny/$id"
              params={{ id: handover.requestId }}
              className="mt-1 inline-block text-xs font-medium text-primary underline"
            >
              Forrásigény: {handover.requestId}
            </Link>
          )}
        </div>
        <span className="rounded-sm bg-secondary px-2 py-1 text-xs font-semibold">
          {HANDOVER_STATUS_LABELS[handover.status]}
        </span>
      </header>

      {canAct && !done && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`model-${handover.id}`}>
              Eszközmodell (műszaki adatok forrása)
              {category ? ` – ${category.name}` : ""}
            </Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger id={`model-${handover.id}`}>
                <SelectValue placeholder="Válasszon modellt" />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.vendor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`serial-${handover.id}`}>Gyári szám (szériaszám)</Label>
            <Input
              id={`serial-${handover.id}`}
              value={serial}
              onChange={(e) => setSerial(e.target.value)}
              placeholder="pl. 5CD3421XYZ"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`inv-${handover.id}`}>PTE leltárkód</Label>
            <Input
              id={`inv-${handover.id}`}
              value={inventoryNo}
              onChange={(e) => setInventoryNo(e.target.value)}
              placeholder="pl. PTE-AOK-IT-004999"
            />
          </div>
          {needsLocation && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor={`bld-${handover.id}`}>Épület</Label>
                <Select value={building} onValueChange={setBuilding}>
                  <SelectTrigger id={`bld-${handover.id}`}>
                    <SelectValue placeholder="Épület" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`room-${handover.id}`}>Helyiség</Label>
                <Select value={room} onValueChange={setRoom}>
                  <SelectTrigger id={`room-${handover.id}`}>
                    <SelectValue placeholder="Helyiség" />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map((r) => (
                      <SelectItem key={r.id} value={r.room}>
                        {r.room} ({LOCATION_KIND_LABELS[r.kind]})
                      </SelectItem>
                    ))}

                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`note-${handover.id}`}>Telepítési megjegyzés</Label>
            <Textarea
              id={`note-${handover.id}`}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Telepített szoftverek, beállítások, hálózati csatlakozás…"
            />
          </div>
        </div>
      )}

      {(canAct || attachments.length > 0 || Object.keys(checklist).length > 0) && (
        <section className="space-y-3 rounded-md border border-border p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold">Telepítési checklist</h4>
            <span
              className={
                requiredDone
                  ? "text-xs font-semibold text-emerald-700"
                  : "text-xs font-semibold text-amber-700"
              }
            >
              Kötelező lépések: {HANDOVER_CHECKLIST.filter((c) => c.required).length - missingRequired.length}
              /{HANDOVER_CHECKLIST.filter((c) => c.required).length}
            </span>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {HANDOVER_CHECKLIST.map((step) => (
              <li key={step.key} className="flex gap-2">
                <Checkbox
                  id={`${handover.id}-${step.key}`}
                  checked={Boolean(checklist[step.key])}
                  disabled={!canAct || done}
                  onCheckedChange={(v) =>
                    store.updateHandover(
                      handover.id,
                      { checklist: { ...checklist, [step.key]: v === true } },
                      `Checklist: ${step.label} – ${v === true ? "teljesítve" : "visszavonva"}`,
                    )
                  }
                />
                <label htmlFor={`${handover.id}-${step.key}`} className="cursor-pointer text-xs">
                  <span className="font-medium">
                    {step.label}
                    {step.required && <span className="text-destructive"> *</span>}
                  </span>
                  <span className="block text-muted-foreground">{step.hint}</span>
                </label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3 rounded-md border border-border p-4">
        <h4 className="text-sm font-semibold">
          Fénykép- és dokumentumcsatolás
          <span className="text-destructive"> *</span>
        </h4>
        <p className="text-xs text-muted-foreground">
          Legalább egy fénykép kötelező (eszköz és felragasztott leltárcímke). Ajánlott az
          átadás-átvételi jegyzőkönyv és a szállítólevél feltöltése is. Maximum 5 MB fájlonként.
        </p>
        {attachments.length > 0 && (
          <ul className="grid gap-2 sm:grid-cols-2">
            {attachments.map((a) => (
              <li key={a.id} className="flex items-center gap-3 rounded-md border border-border p-2">
                {a.mimeType.startsWith("image/") ? (
                  <img
                    src={a.dataUrl}
                    alt={`${ATTACHMENT_KIND_LABELS[a.kind]} – ${a.name}`}
                    className="size-12 rounded object-cover"
                  />
                ) : (
                  <span className="grid size-12 place-items-center rounded bg-secondary">
                    <Paperclip className="size-4" aria-hidden="true" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium">{a.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {ATTACHMENT_KIND_LABELS[a.kind]} · {formatSize(a.sizeBytes)} · {a.uploadedAt}
                  </span>
                </span>
                <a
                  href={a.dataUrl}
                  download={a.name}
                  className="text-xs font-medium text-primary underline"
                >
                  Megnyitás
                </a>
                {canAct && !done && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Csatolmány törlése"
                    onClick={() =>
                      store.updateHandover(
                        handover.id,
                        { attachments: attachments.filter((x) => x.id !== a.id) },
                        `Csatolmány törölve: ${a.name}`,
                      )
                    }
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {canAct && !done && (
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label htmlFor={`kind-${handover.id}`}>Csatolmány típusa</Label>
              <Select
                value={attachKind}
                onValueChange={(v) => setAttachKind(v as HandoverAttachmentKind)}
              >
                <SelectTrigger id={`kind-${handover.id}`} className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ATTACHMENT_KIND_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`file-${handover.id}`}>Fájl kiválasztása</Label>
              <Input
                id={`file-${handover.id}`}
                type="file"
                accept="image/*,application/pdf"
                disabled={uploading}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > MAX_FILE_BYTES) {
                    toast.error("A fájl mérete meghaladja az 5 MB-ot.");
                    return;
                  }
                  setUploading(true);
                  try {
                    const dataUrl = await fileToDataUrl(file);
                    const att: HandoverAttachment = {
                      id: `att-${Date.now()}`,
                      kind: attachKind,
                      name: file.name,
                      mimeType: file.type || "application/octet-stream",
                      sizeBytes: file.size,
                      dataUrl,
                      uploadedBy: store.currentUser.id,
                      uploadedAt: new Date().toISOString().slice(0, 10),
                    };
                    store.updateHandover(
                      handover.id,
                      { attachments: [...attachments, att] },
                      `Csatolmány feltöltve: ${ATTACHMENT_KIND_LABELS[att.kind]} – ${file.name}`,
                    );
                    toast.success("Csatolmány feltöltve");
                  } catch {
                    toast.error("A fájl feltöltése nem sikerült.");
                  } finally {
                    setUploading(false);
                  }
                }}
              />
            </div>
          </div>
        )}
      </section>

      {spec && (
        <p className="text-xs text-muted-foreground">
          Telepített rendszer: {spec.os} {spec.osVersion} · {spec.cpu} · {spec.ram}
        </p>
      )}

      {(handover.serial || handover.inventoryNo) && (
        <p className="text-xs text-muted-foreground">
          {handover.serial ? `Gyári szám: ${handover.serial}` : ""}
          {handover.serial && handover.inventoryNo ? " · " : ""}
          {handover.inventoryNo ? `Leltárkód: ${handover.inventoryNo}` : ""}
        </p>
      )}

      <ul className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
        {handover.history.map((h, i) => (
          <li key={i}>
            {h.at} · {lookup.user(h.actorId)?.name ?? "—"} – {h.action}
            {h.comment ? ` – ${h.comment}` : ""}
          </li>
        ))}
      </ul>

      {canAct && !done && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              save("Telepítés és beállítás megkezdve", { status: "elokeszites_alatt" });
              toast.success("Telepítés megkezdve");
            }}
          >
            Telepítés megkezdése
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              save("Eszköz átadásra kész", { status: "atadasra_kesz" });
              toast.success("Átadásra kész");
            }}
          >
            Átadásra kész
          </Button>
          <Button
            size="sm"
            disabled={!serial || !inventoryNo || !productId || !requiredDone || !hasPhoto}
            onClick={() => {
              save("Átadási adatok rögzítve");
              store.handOverToUser(handover.id, note || undefined);
              toast.success("Eszköz átadva az igénylőnek");
            }}
          >
            Eszköz átadása az igénylőnek
          </Button>
          {(!serial || !inventoryNo || !productId || !requiredDone || !hasPhoto) && (
            <span className="self-center text-xs text-muted-foreground">
              Az átadáshoz kötelező: modell, gyári szám, leltárkód, minden kötelező checklist-lépés
              {!requiredDone ? ` (hiányzik: ${missingRequired.length})` : ""} és legalább egy fénykép
              csatolása.
            </span>
          )}
        </div>
      )}
    </article>
  );
}

function HandoverWorkspace() {
  const store = useStore();
  const viewOnly = useViewOnly("eszkozatadas");
  const role = store.activeRole;
  const allowed = ["it_referens", "eszkozmenedzser", "beszerzo", "dekan"].includes(
    role,
  );
  const canAct = role === "it_referens";

  const handovers = store.handovers ?? [];
  const mine = useMemo(
    () =>
      canAct
        ? handovers.filter(
            (h) => !h.referentId || h.referentId === store.currentUser.id || h.orgUnitId === store.currentUser.orgUnitId,
          )
        : handovers,
    [handovers, canAct, store.currentUser],
  );
  const open = mine.filter((h) => h.status !== "atvetel_igazolva");
  const closed = mine.filter((h) => h.status === "atvetel_igazolva");

  if (!allowed) {
    return (
      <div className="card-surface mx-auto max-w-2xl space-y-3 p-6">
        <h1 className="font-display text-xl font-semibold">Eszközátadás</h1>
        <p className="text-sm text-muted-foreground">
          Ez a felület a kari IT referens munkatere. Az Ön átvételre váró eszközeit a Személyi
          leltár oldalon találja.
        </p>
        <Button asChild variant="outline">
          <Link to="/leltar">Személyi leltár</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeading
        title="Eszközátadás"
        description="A beszerzésből beérkezett eszközök telepítése és beállítása, a gyári szám és a PTE leltárkód rögzítése, majd átadás az igénylőnek. Az igénylő átvételi visszaigazolása után az eszköz automatikusan bekerül a személyi leltárába."
      />
      {viewOnly && <ViewOnlyNotice />}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Átadásra váró eszköz" value={String(open.length)} />
        <StatTile
          label="Átadva, visszaigazolásra vár"
          value={String(mine.filter((h) => h.status === "atadva").length)}
        />
        <StatTile label="Lezárt átadás" value={String(closed.length)} />
      </div>

      <section className="space-y-4">
        <h2 className="font-display text-lg font-semibold">Folyamatban lévő átadások</h2>
        {open.length === 0 ? (
          <p className="card-surface p-6 text-sm text-muted-foreground">
            Jelenleg nincs beérkezett, átadásra váró eszköz.
          </p>
        ) : (
          open.map((h) => <HandoverCard key={h.id} handover={h} canAct={canAct} />)
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-display text-lg font-semibold">Lezárt átadások</h2>
          {closed.map((h) => (
            <HandoverCard key={h.id} handover={h} canAct={false} />
          ))}
        </section>
      )}
    </div>
  );
}
