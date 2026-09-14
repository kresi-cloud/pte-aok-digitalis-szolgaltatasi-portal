import { useState } from "react";
import { PackageCheck, ShoppingCart } from "lucide-react";
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
import type { DeliveryInput, OrderInput } from "@/lib/store";

const VAT = 1.27;

/** Beszerzés indítása rendelési rekorddal (D12): szállító, rendelésszám, várható érkezés, tényleges ár. */
export function StartOrderButton({
  item,
  defaultLeadWorkdays,
  onConfirm,
}: {
  item: ProcurementPlanItem;
  defaultLeadWorkdays: number;
  onConfirm: (order: OrderInput) => void;
}) {
  const [open, setOpen] = useState(false);
  const [supplier, setSupplier] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [expectedArrival, setExpectedArrival] = useState(() =>
    addWorkdays(todayIso(), defaultLeadWorkdays),
  );
  const [net, setNet] = useState(item.unitPriceOverride ? String(item.unitPriceOverride) : "");
  const [note, setNote] = useState("");
  const netNum = Number(net.replace(/\s/g, ""));
  const gross = Number.isFinite(netNum) && netNum > 0 ? Math.round(netNum * VAT) : undefined;
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
              <Label htmlFor={`net-${item.id}`}>Tényleges nettó egységár (Ft)</Label>
              <Input
                id={`net-${item.id}`}
                inputMode="numeric"
                value={net}
                onChange={(e) => setNet(e.target.value)}
                placeholder="pl. 420000"
              />
              <p className="text-xs text-muted-foreground">
                {gross
                  ? `Bruttó egységár (27% áfa): ${gross.toLocaleString("hu-HU")} Ft · összesen ${(gross * (item.quantity || 1)).toLocaleString("hu-HU")} Ft`
                  : "Ha üresen marad, a tervezett ár számít."}
              </p>
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
                  actualUnitNet: gross ? netNum : undefined,
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
