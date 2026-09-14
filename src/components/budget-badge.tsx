import { useState } from "react";
import { BadgeCheck, CircleDollarSign, TriangleAlert } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { BudgetCheck } from "@/lib/budget-rules";

const huf = (n: number) => `${n.toLocaleString("hu-HU")} Ft`;

/** Költségkeret-jelvény (D1/D5): kereten belül / túllépés / jóváhagyásra vár / elutasítva. */
export function BudgetBadge({ check }: { check: BudgetCheck | undefined }) {
  if (!check || check.budgetGross <= 0) return null;
  const title = `Jóváhagyott keret: ${huf(check.budgetGross)} · jelenlegi összeg: ${huf(check.currentGross)} · küszöb ${check.tolerancePct}%`;
  if (check.pending)
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-warning/50 bg-warning/15 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-warning-foreground"
        title={title}
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        {`Kerettúllépés +${check.deltaPct}% – jóváhagyásra vár`}
      </span>
    );
  if (check.rejected)
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-destructive"
        title={title}
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        {`Kerettúllépés +${check.deltaPct}% – elutasítva`}
      </span>
    );
  if (check.exceeded)
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-destructive"
        title={title}
      >
        <TriangleAlert className="size-3" aria-hidden="true" />
        {`Kerettúllépés +${check.deltaPct}%`}
      </span>
    );
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium whitespace-nowrap"
      title={title}
    >
      <BadgeCheck className="size-3" aria-hidden="true" />
      {check.deltaPct > 0 ? `Kereten belül (+${check.deltaPct}%)` : "Kereten belül"}
    </span>
  );
}

/** Kerettúllépés elutasítása kötelező indoklással. */
export function RejectBudgetButton({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= 5;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <CircleDollarSign className="size-4" /> Túllépés elutasítása
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setReason("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elutasítja a kerettúllépést?</AlertDialogTitle>
            <AlertDialogDescription>
              A folyamat megáll, amíg az IT eszközmenedzser vagy a beszerző olcsóbb modellt vagy
              helyettesítést nem talál. Az indoklást az igénylő és a beszerzés szereplői látják.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="budget-reject-reason">Indoklás *</Label>
            <Textarea
              id="budget-reject-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Például: a keret nem emelhető, olcsóbb konfigurációt kérünk."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid}
              onClick={() => {
                onConfirm(reason.trim());
                setReason("");
              }}
            >
              Túllépés elutasítása
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
