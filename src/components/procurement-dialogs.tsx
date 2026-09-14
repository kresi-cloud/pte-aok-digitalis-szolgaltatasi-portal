import { useState } from "react";
import { OctagonAlert, PackageCheck, ShoppingCart } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { addWorkdays, todayIso } from "@/lib/clock";
import { remainingQuantity, validateOrderInput } from "@/lib/procurement-rules";
import type { ProcurementPlanItem } from "@/lib/asset-types";
import type { BlockInput, DeliveryInput, OrderInput } from "@/lib/store";
import type { Product } from "@/lib/types";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const VAT = 1.27;

/** Beszerzés indítása rendelési rekorddal (D12): szállító, rendelésszám, várható érkezés, tényleges ár. */
export function StartOrderButton({
  item,
  defaultLeadWorkdays,
  budget,
  onConfirm,
}: {
  item: ProcurementPlanItem;
  defaultLeadWorkdays: number;
  /** jóváhagyott keret és küszöb a rendelési ár előzetes ellenőrzéséhez (D5) */
  budget?: { budgetGross: number; tolerancePct: number } | undefined;
  onConfirm: (order: OrderInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [expectedArrival, setExpectedArrival] = useState(() =>
    addWorkdays(todayIso(), defaultLeadWorkdays),
  );
  const [grossInput, setGrossInput] = useState(
    item.unitPriceOverride ? String(item.unitPriceOverride) : "",
  );
  const [note, setNote] = useState("");
  const grossNum = Number(grossInput.replace(/\s/g, ""));
  const gross = Number.isFinite(grossNum) && grossNum > 0 ? Math.round(grossNum) : undefined;
  const net = gross ? Math.round(gross / VAT) : undefined;
  const rule = validateOrderInput({ supplier, orderNumber, expectedArrival });
  const reset = () => {
    setSupplier("");
    setOrderNumber("");
    setNote("");
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <ShoppingCart className="size-4" /> Beszerzés indítása
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Rendelés rögzítése</AlertDialogTitle>
            <AlertDialogDescription>
              {item.deviceName ?? item.standardKey} · {item.quantity} db. A várható érkezés a
              beszerzési lépés határideje; az igénylő értesítést kap róla. A tényleges ár a
              költségkeret-ellenőrzés bemenete.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`sup-${item.id}`}>Szállító *</Label>
              <Input
                id={`sup-${item.id}`}
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="pl. Keretszerződéses szállító Kft."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`ord-${item.id}`}>Rendelésszám *</Label>
              <Input
                id={`ord-${item.id}`}
                type="text"
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="pl. PO-2026-0412"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`arr-${item.id}`}>Várható érkezés *</Label>
              <Input
                id={`arr-${item.id}`}
                type="date"
                value={expectedArrival}
                min={todayIso()}
                onChange={(e) => setExpectedArrival(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`net-${item.id}`}>Tényleges bruttó egységár (Ft)</Label>
              <Input
                id={`net-${item.id}`}
                inputMode="numeric"
                value={grossInput}
                onChange={(e) => setGrossInput(e.target.value)}
                placeholder="pl. 420000"
              />
              <p className="text-xs text-muted-foreground">
                {gross
                  ? `Nettó egységár (27% áfa nélkül): ${(net ?? 0).toLocaleString("hu-HU")} Ft · bruttó összesen ${(gross * (item.quantity || 1)).toLocaleString("hu-HU")} Ft`
                  : "Ha üresen marad, a tervezett ár számít."}
              </p>
              {budget && gross && (
                <p
                  className={
                    gross * (item.quantity || 1) >
                    Math.round(budget.budgetGross * (1 + budget.tolerancePct / 100))
                      ? "text-xs font-medium text-destructive"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {`Jóváhagyott keret: ${budget.budgetGross.toLocaleString("hu-HU")} Ft · küszöb ${budget.tolerancePct}%${
                    gross * (item.quantity || 1) >
                    Math.round(budget.budgetGross * (1 + budget.tolerancePct / 100))
                      ? " – a túllépés a szervezeti jóváhagyó újbóli döntését igényli."
                      : " – kereten belül."
                  }`}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`onote-${item.id}`}>Megjegyzés</Label>
              <Textarea
                id={`onote-${item.id}`}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Keretszerződés, szállítási feltétel, kapcsolattartó…"
              />
            </div>
          </div>
          {!rule.allowed && (supplier || orderNumber) && (
            <p className="text-xs text-muted-foreground">{rule.reason}</p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!rule.allowed}
              onClick={() => {
                onConfirm({
                  supplier,
                  orderNumber,
                  expectedArrival,
                  actualUnitNet: net,
                  actualUnitGross: gross,
                  note: note || undefined,
                });
                reset();
              }}
            >
              Rendelés rögzítése és beszerzés indítása
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Beérkezés rögzítése darabszámmal – több darabnál részteljesítés (D12/D16). */
export function DeliveryButton({
  item,
  label,
  onConfirm,
}: {
  item: ProcurementPlanItem;
  label: string;
  onConfirm: (input: DeliveryInput) => void;
}) {
  const remaining = remainingQuantity(item);
  const total = item.quantity || 1;
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(remaining));
  const [note, setNote] = useState("");
  const n = Number(qty);
  const valid = Number.isInteger(n) && n >= 1 && n <= remaining;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <PackageCheck className="size-4" /> {label}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setQty(String(remaining));
            setNote("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Beérkezés rögzítése</AlertDialogTitle>
            <AlertDialogDescription>
              {item.deviceName ?? item.standardKey} · eddig {total - remaining}/{total} db érkezett
              be. Minden beérkezett darab azonnal leltári számot kap (raktáron), és a kari IT
              referenshez kerül telepítésre és átadásra.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`dq-${item.id}`}>Beérkezett darabszám *</Label>
              <Input
                id={`dq-${item.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                max={remaining}
                step={1}
                value={qty}
                onChange={(e) => setQty(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {remaining > 1
                  ? `Legfeljebb ${remaining} db; kevesebb esetén részteljesítés, a többi beszerzés alatt marad.`
                  : "Ezzel a tétel minden darabja beérkezett."}
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`dn-${item.id}`}>Megjegyzés (szállítólevél, eltérés)</Label>
              <Textarea
                id={`dn-${item.id}`}
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid}
              onClick={() => {
                onConfirm({ quantity: n, note: note || undefined });
                setNote("");
              }}
            >
              Beérkezés rögzítése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Beszerzési akadály (D11): indoklás, helyettesítő modell vagy meghiúsulás. */
export function BlockButton({
  item,
  products,
  budget,
  onConfirm,
}: {
  item: ProcurementPlanItem;
  /** ugyanazon termékkör aktív termékei helyettesítőnek */
  products: Product[];
  budget?: { budgetGross: number; tolerancePct: number } | undefined;
  onConfirm: (input: BlockInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"helyettesito" | "nincs">("helyettesito");
  const [productId, setProductId] = useState("");
  const [customName, setCustomName] = useState("");
  const [unitGross, setUnitGross] = useState("");
  const selected = products.find((p) => p.id === productId);
  const deviceName = selected?.name ?? customName.trim();
  const gross = Number(unitGross.replace(/\s/g, ""));
  const validSub =
    mode === "nincs" || (deviceName.length > 1 && Number.isFinite(gross) && gross > 0);
  const valid = reason.trim().length >= 5 && validSub;
  const total = gross > 0 ? gross * (item.quantity || 1) : 0;
  const over =
    budget && total > 0
      ? total > Math.round(budget.budgetGross * (1 + budget.tolerancePct / 100))
      : false;
  const reset = () => {
    setReason("");
    setMode("helyettesito");
    setProductId("");
    setCustomName("");
    setUnitGross("");
  };
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <OctagonAlert className="size-4" /> Akadály jelzése
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Beszerzési akadály jelzése</AlertDialogTitle>
            <AlertDialogDescription>
              {item.deviceName ?? item.standardKey} · {item.quantity} db. Nem szállítható vagy
              kifutott modellnél helyettesítőt javasolhat; ha az ár a jóváhagyott keretet a küszöbön
              túl lépi, a szervezeti jóváhagyó újra dönt. Helyettesítő nélkül a beszerzés meghiúsul,
              az igény lezárul és új igény adható be.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor={`blk-${item.id}`}>Az akadály leírása *</Label>
              <Textarea
                id={`blk-${item.id}`}
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Például: a modell kifutott, a szállító nem tudja teljesíteni."
              />
            </div>
            <RadioGroup
              value={mode}
              onValueChange={(v) => setMode(v as "helyettesito" | "nincs")}
              className="grid gap-2 sm:grid-cols-2"
            >
              <label
                htmlFor={`blk-sub-${item.id}`}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-xs"
              >
                <RadioGroupItem id={`blk-sub-${item.id}`} value="helyettesito" className="mt-0.5" />
                <span className="font-medium">Helyettesítő modellt javaslok</span>
              </label>
              <label
                htmlFor={`blk-none-${item.id}`}
                className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-xs"
              >
                <RadioGroupItem id={`blk-none-${item.id}`} value="nincs" className="mt-0.5" />
                <span className="font-medium">Nincs helyettesítő – a beszerzés meghiúsul</span>
              </label>
            </RadioGroup>
            {mode === "helyettesito" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor={`blk-prod-${item.id}`}>Helyettesítő modell a katalógusból</Label>
                  <Select
                    value={productId}
                    onValueChange={(v) => {
                      setProductId(v);
                      const p = products.find((x) => x.id === v);
                      if (p) setUnitGross(String(p.referencePrice));
                    }}
                  >
                    <SelectTrigger id={`blk-prod-${item.id}`} aria-label="Helyettesítő modell">
                      <SelectValue placeholder="Válasszon modellt (vagy adja meg kézzel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.vendor}) – {p.referencePrice.toLocaleString("hu-HU")} Ft
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {!selected && (
                  <div className="space-y-1.5">
                    <Label htmlFor={`blk-name-${item.id}`}>Modell neve (kézzel)</Label>
                    <Input
                      id={`blk-name-${item.id}`}
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="pl. Lenovo ThinkPad T14 Gen 5"
                    />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor={`blk-price-${item.id}`}>Bruttó egységár (Ft) *</Label>
                  <Input
                    id={`blk-price-${item.id}`}
                    inputMode="numeric"
                    value={unitGross}
                    onChange={(e) => setUnitGross(e.target.value)}
                  />
                </div>
                {budget && total > 0 && (
                  <p
                    className={`text-xs sm:col-span-2 ${over ? "font-medium text-destructive" : "text-muted-foreground"}`}
                  >
                    {`Új összeg: ${total.toLocaleString("hu-HU")} Ft · jóváhagyott keret: ${budget.budgetGross.toLocaleString("hu-HU")} Ft · küszöb ${budget.tolerancePct}%${over ? " – a szervezeti jóváhagyó újra dönt, az igénylő értesül." : " – kereten belül."}`}
                  </p>
                )}
              </div>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid}
              onClick={() => {
                onConfirm({
                  reason: reason.trim(),
                  substitute:
                    mode === "helyettesito"
                      ? {
                          productId: selected?.id,
                          deviceName,
                          modelKey: selected?.modelKey,
                          unitGross: Math.round(gross),
                        }
                      : undefined,
                });
                reset();
              }}
            >
              {mode === "nincs" ? "Meghiúsulás rögzítése" : "Helyettesítő rögzítése"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
