import { useState } from "react";
import { CalendarClock, Flag, RotateCcw } from "lucide-react";
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
import { MIN_SCHEDULE_REASON } from "@/lib/schedule-rules";

/** D9: az igénylő kérésétől eltérő ütemezés csak indoklással rögzíthető. */
export function ScheduleReasonDialog({
  open,
  requestedLabel,
  actualLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  requestedLabel: string;
  actualLabel: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN_SCHEDULE_REASON;
  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          setReason("");
          onCancel();
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <CalendarClock className="mr-1 inline size-4" aria-hidden="true" />
            Ütemezés eltér az igénylő kérésétől
          </AlertDialogTitle>
          <AlertDialogDescription>
            {`Kért ütemezés: ${requestedLabel} · új besorolás: ${actualLabel}. Az eltérést indokolni kell; az igénylő értesítést kap és az igényén látja az indoklást. A folyamat nem áll meg, beleegyezés nem szükséges.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label htmlFor="schedule-reason">Az eltérés indoklása *</Label>
          <Textarea
            id="schedule-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Például: a keretszerződés következő lehívása a negyedévben esedékes."
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
            Ütemezés rögzítése indoklással
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** D10: az eszközmenedzser a kiemelt tételt átdolgozás után újra beküldi. */
export function ResubmitHoldButton({ onConfirm }: { onConfirm: (comment: string) => void }) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const valid = comment.trim().length >= MIN_SCHEDULE_REASON;
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <RotateCcw className="size-4" /> Átdolgozva – újbóli beküldés
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setComment("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kiemelt tétel újbóli beküldése</AlertDialogTitle>
            <AlertDialogDescription>
              Írja le, mit dolgozott át a gazdasági vezető indoklása szerint. A tétel a gazdasági
              vezető döntésére kerül; a csomag többi tétele már fut.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hold-rework">Átdolgozás leírása *</Label>
            <Textarea
              id="hold-rework"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Például: olcsóbb konfiguráció, a bővítés a következő negyedévre került."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid}
              onClick={() => {
                onConfirm(comment.trim());
                setComment("");
              }}
            >
              Újbóli beküldés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** D10: a gazdasági vezető ismét kiemeli a tételt, indoklással. */
export function ReflagButton({ onConfirm }: { onConfirm: (reason: string) => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN_SCHEDULE_REASON;
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Flag className="size-4" /> Ismét kiemelem
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
            <AlertDialogTitle>Ismételt kiemelés</AlertDialogTitle>
            <AlertDialogDescription>
              A tétel újabb átdolgozási kört fut az IT eszközmenedzsernél; az indoklást az
              eszközmenedzser és az igénylő látja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hold-reflag">Indoklás *</Label>
            <Textarea
              id="hold-reflag"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              Ismételt kiemelés
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
