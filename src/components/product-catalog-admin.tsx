import { useMemo, useState } from "react";
import { Plus, Trash2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useStore } from "@/lib/store";
import { TIERS, TIER_LABELS, categoryIsTiered } from "@/lib/product-catalog";
import { productLockInfo } from "@/lib/product-lock";
import type { EmployeeTier, Product } from "@/lib/types";
import { cn } from "@/lib/utils";

const emptyProduct = {
  name: "",
  vendor: "",
  tier: "alkalmazotti" as EmployeeTier,
  referencePrice: "",
  os: "",
  osVersion: "",
  cpu: "",
  ram: "",
  storage: "",
  display: "",
  battery: "",
  ports: "",
  warranty: "",
  features: "",
  note: "",
};

type Draft = typeof emptyProduct;

function toDraft(p: Product): Draft {
  return {
    name: p.name,
    vendor: p.vendor,
    tier: p.tier,
    referencePrice: String(p.referencePrice),
    os: p.spec.os,
    osVersion: p.spec.osVersion,
    cpu: p.spec.cpu,
    ram: p.spec.ram,
    storage: p.spec.storage,
    display: p.spec.display ?? "",
    battery: p.spec.battery ?? "",
    ports: p.spec.ports ?? "",
    warranty: p.spec.warranty ?? "",
    features: p.spec.features.join(", "),
    note: p.note ?? "",
  };
}

export function ProductCatalogAdmin({ readOnly = false }: { readOnly?: boolean }) {
  const store = useStore();
  const categories = store.productCategories ?? [];
  const products = store.products ?? [];

  const [selectedCat, setSelectedCat] = useState<string>(categories[0]?.id ?? "");
  const [newCat, setNewCat] = useState({ name: "", description: "", personalUse: false });
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyProduct);

  const activeCat = categories.find((c) => c.id === selectedCat) ?? categories[0];
  const catProducts = useMemo(
    () => products.filter((p) => p.categoryId === activeCat?.id),
    [products, activeCat?.id],
  );

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  function saveProduct() {
    if (!activeCat || draft.name.trim().length < 2) return;
    const payload = {
      categoryId: activeCat.id,
      name: draft.name.trim(),
      vendor: draft.vendor.trim(),
      tier: draft.tier,
      referencePrice: Number(draft.referencePrice.replace(/\s/g, "")) || 0,
      active: true,
      note: draft.note.trim() || undefined,
      spec: {
        os: draft.os.trim() || "—",
        osVersion: draft.osVersion.trim() || "—",
        cpu: draft.cpu.trim() || "—",
        ram: draft.ram.trim() || "—",
        storage: draft.storage.trim() || "—",
        display: draft.display.trim() || undefined,
        battery: draft.battery.trim() || undefined,
        ports: draft.ports.trim() || undefined,
        warranty: draft.warranty.trim() || undefined,
        features: draft.features
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean),
      },
    };
    if (editingProduct) {
      store.updateProduct(editingProduct, payload);
      toast.success("Termék módosítva");
    } else {
      store.addProduct(payload);
      toast.success("Termék felvéve a katalógusba");
    }
    setDraft(emptyProduct);
    setEditingProduct(null);
    setShowForm(false);
  }

  return (
    <fieldset disabled={readOnly} className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
      {/* Termékkörök */}
      <aside className="card-surface h-fit p-4">
        <h3 className="font-display text-base font-semibold">Termékkörök</h3>
        <ul className="mt-3 space-y-1">
          {categories.map((c) => {
            const count = products.filter((p) => p.categoryId === c.id).length;
            return (
              <li key={c.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCat(c.id);
                    setShowForm(false);
                    setEditingProduct(null);
                  }}
                  className={cn(
                    "flex-1 rounded-md px-3 py-2 text-left text-sm transition-colors",
                    c.id === activeCat?.id ? "bg-accent text-accent-foreground" : "hover:bg-secondary",
                  )}
                >
                  <span className="block font-medium">{c.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {count} modell{c.personalUse ? " · személyi használat" : ""}
                  </span>
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`${c.name} termékkör törlése`}
                  onClick={() => {
                    if (count > 0 && !window.confirm(`${c.name}: ${count} modell is törlődik. Folytatja?`))
                      return;
                    store.removeProductCategory(c.id);
                    toast.success("Termékkör törölve");
                  }}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-2 border-t border-border pt-4">
          <Label htmlFor="new-cat">Új termékkör</Label>
          <Input
            id="new-cat"
            value={newCat.name}
            onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
            placeholder="Pl. Okosóra"
          />
          <Textarea
            rows={2}
            value={newCat.description}
            onChange={(e) => setNewCat({ ...newCat, description: e.target.value })}
            placeholder="Rövid leírás az igénylőknek"
          />
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="new-cat-personal" className="text-sm font-normal">
              Személyi használatú eszközkör
            </Label>
            <Switch
              id="new-cat-personal"
              checked={newCat.personalUse}
              onCheckedChange={(v) => setNewCat({ ...newCat, personalUse: v })}
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              if (newCat.name.trim().length < 2) return;
              const id = store.addProductCategory({
                name: newCat.name.trim(),
                description: newCat.description.trim(),
                active: true,
                personalUse: newCat.personalUse,
              });
              setSelectedCat(id);
              setNewCat({ name: "", description: "", personalUse: false });
              toast.success("Termékkör létrehozva");
            }}
          >
            <Plus className="size-4" /> Hozzáadás
          </Button>
        </div>
      </aside>

      {/* Termékek */}
      <section className="space-y-4">
        {activeCat ? (
          <>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{activeCat.name}</h3>
                <p className="text-sm text-muted-foreground">{activeCat.description}</p>
                <div className="mt-2 flex items-center gap-2">
                  <Switch
                    id={`cat-personal-${activeCat.id}`}
                    checked={activeCat.personalUse === true}
                    onCheckedChange={(v) => {
                      store.updateProductCategory(activeCat.id, { personalUse: v });
                      toast.success(
                        v ? "Személyi használatú eszközkör" : "Nem személyi használatú eszközkör",
                      );
                    }}
                  />
                  <Label htmlFor={`cat-personal-${activeCat.id}`} className="text-sm font-normal">
                    Személyi használatú eszközkör
                  </Label>
                </div>
              </div>
              <Button
                onClick={() => {
                  setDraft(emptyProduct);
                  setEditingProduct(null);
                  setShowForm((v) => !v);
                }}
              >
                <Plus className="size-4" /> Új modell
              </Button>
            </div>

            {showForm && (
              <div className="card-surface space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-semibold">
                    {editingProduct ? "Modell módosítása" : "Új modell felvétele"}
                  </h4>
                  <Button size="icon" variant="ghost" onClick={() => setShowForm(false)} aria-label="Bezárás">
                    <X className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Megnevezés" value={draft.name} onChange={(v) => set({ name: v })} placeholder="Xiaomi Redmi Note 15 Pro 5G 256GB" />
                  <Field label="Gyártó" value={draft.vendor} onChange={(v) => set({ vendor: v })} placeholder="Xiaomi" />
                  <div className="space-y-1.5">
                    <Label>Elérhetőség</Label>
                    {activeCat && categoryIsTiered(activeCat.id) ? (
                      <Select value={draft.tier} onValueChange={(v) => set({ tier: v as EmployeeTier })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TIERS.map((t) => (
                            <SelectItem key={t} value={t}>
                              {TIER_LABELS[t]} kategóriától
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="rounded-md border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
                        Ebben a termékkörben nincs besorolási korlát, mindenki igényelheti.
                      </p>
                    )}
                  </div>
                  <Field label="Referenciaár (Ft)" value={draft.referencePrice} onChange={(v) => set({ referencePrice: v })} placeholder="149000" />
                  <Field label="Operációs rendszer" value={draft.os} onChange={(v) => set({ os: v })} placeholder="Android (HyperOS)" />
                  <Field label="OS verzió" value={draft.osVersion} onChange={(v) => set({ osVersion: v })} placeholder="Android 15" />
                  <Field label="Processzor" value={draft.cpu} onChange={(v) => set({ cpu: v })} />
                  <Field label="Memória" value={draft.ram} onChange={(v) => set({ ram: v })} />
                  <Field label="Tároló" value={draft.storage} onChange={(v) => set({ storage: v })} />
                  <Field label="Kijelző" value={draft.display} onChange={(v) => set({ display: v })} />
                  <Field label="Akkumulátor" value={draft.battery} onChange={(v) => set({ battery: v })} />
                  <Field label="Csatlakozók" value={draft.ports} onChange={(v) => set({ ports: v })} />
                  <Field label="Garancia" value={draft.warranty} onChange={(v) => set({ warranty: v })} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="features">Speciális jellemzők (vesszővel elválasztva)</Label>
                  <Textarea
                    id="features"
                    rows={2}
                    value={draft.features}
                    onChange={(e) => set({ features: e.target.value })}
                    placeholder="5G, NFC, MDM felügyelet"
                  />
                </div>
                <Button onClick={saveProduct} disabled={draft.name.trim().length < 2}>
                  {editingProduct ? "Módosítás mentése" : "Modell hozzáadása"}
                </Button>
              </div>
            )}

            {catProducts.length === 0 ? (
              <p className="card-surface p-6 text-sm text-muted-foreground">
                Ehhez a termékkörhöz még nincs modell rögzítve.
              </p>
            ) : (
              <ul className="space-y-3">
                {catProducts.map((p) => {
                  const lock = productLockInfo(p.id, {
                    requests: store.requests,
                    planItems: store.planItems,
                    handovers: store.handovers ?? [],
                  });
                  return (
                  <li key={p.id} className={cn("card-surface p-4", !p.active && "opacity-60")}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="block font-medium">{p.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {p.vendor} · {p.referencePrice.toLocaleString("hu-HU")} Ft ·{" "}
                          {p.spec.cpu} · {p.spec.ram} · {p.spec.storage}
                        </span>
                        {lock.locked && (
                          <span className="mt-1 block text-xs text-amber-700">{lock.reason}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!p.active && <Badge variant="outline">Nem igényelhető</Badge>}
                        <div className="flex items-center gap-1.5">
                          <Switch
                            id={`active-${p.id}`}
                            checked={p.active}
                            onCheckedChange={(v) => {
                              if (!v && lock.locked) {
                                const ok = window.confirm(
                                  "A termékhez aktív beszerzési folyamat tartozik; a kikapcsolás csak az új igényeket tiltja, a folyamatban lévőket nem érinti. Folytatja?",
                                );
                                if (!ok) return;
                              }
                              store.updateProduct(p.id, { active: v });
                              toast.success(v ? "A termék ismét igényelhető" : "A termék már nem igényelhető");
                            }}
                          />
                          <Label htmlFor={`active-${p.id}`} className="text-xs font-normal">
                            Igényelhető
                          </Label>
                        </div>
                        {categoryIsTiered(p.categoryId) && (
                          <Badge variant="secondary">{TIER_LABELS[p.tier]} kategóriától</Badge>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDraft(toDraft(p));
                            setEditingProduct(p.id);
                            setShowForm(true);
                          }}
                        >
                          <Pencil className="size-4" /> Szerkesztés
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={lock.locked}
                          title={lock.locked ? lock.reason : undefined}
                          onClick={() => {
                            if (lock.locked) {
                              toast.error(lock.reason ?? "A termék jelenleg nem távolítható el.");
                              return;
                            }
                            store.removeProduct(p.id);
                            toast.success("Termék törölve");
                          }}
                        >
                          <Trash2 className="size-4" /> Törlés
                        </Button>
                      </div>
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <p className="card-surface p-6 text-sm text-muted-foreground">
            Hozzon létre egy termékkört a bal oldali űrlapon.
          </p>
        )}
      </section>
    </fieldset>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = label.replace(/\s+/g, "-").toLowerCase();
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
