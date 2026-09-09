import { useState } from "react";
import { toast } from "sonner";
import { Undo2 } from "lucide-react";
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
import { useStore } from "@/lib/store";
import { withdrawBlockReason } from "@/lib/withdraw";
import type { ServiceRequest } from "@/lib/types";

/**
 * Igény visszavonása az igénylő által – a beszerzés gazdasági vezetői
 * jóváhagyásáig. Ha már nem lehetséges, a gomb helyett indoklás jelenik meg.
 */
export function WithdrawRequestButton({
  request,
  size = "sm",
  showBlockReason = true,
}: {
  request: ServiceRequest;
  size?: "sm" | "default";
  showBlockReason?: boolean;
}) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");

  if (request.requesterId !== store.currentUser.id) return null;

  const blocked = withdrawBlockReason(request, {
    planItems: store.planItems,
    planApprovals: store.planApprovals ?? [],
    handovers: store.handovers ?? [],
  });

  if (blocked) {
    if (!showBlockReason) return null;
    return <p className="text-xs text-muted-foreground">{blocked}</p>;
  }

  return (
    <>
      <Button
        size={size}
        variant="outline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Undo2 className="size-4" aria-hidden="true" /> Igény visszavonása
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Visszavonja az igényt?</AlertDialogTitle>
            <AlertDialogDescription>
              A(z) {request.id} azonosítójú igény visszavonásra kerül. A folyamatban lévő
              jóváhagyások tárgytalanná válnak, és a kapcsolódó beszerzési tervsor kikerül a
              tervből. A művelet nem vonható vissza.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`withdraw-reason-${request.id}`}>Indoklás (nem kötelező)</Label>
            <Textarea
              id={`withdraw-reason-${request.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Például: az eszközre már nincs szükség."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                store.withdrawRequest(request.id, reason.trim() || undefined);
                toast.success("Az igényt visszavonta.");
                setReason("");
              }}
            >
              Visszavonás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
