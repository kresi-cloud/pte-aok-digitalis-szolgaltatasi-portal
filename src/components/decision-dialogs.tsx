import { useState } from "react";
import { MessageCircleQuestion, ShieldAlert, X } from "lucide-react";
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

const MIN = 5;

/** Elutasítás kötelező indoklással – az igénylő ezt látja a döntések között és értesítésben. */
export function RejectRequestButton({
  requestId,
  onConfirm,
  size = "sm",
}: {
  requestId: string;
  onConfirm: (reason: string) => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN;
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        <X className="size-4" /> Elutasítás
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
            <AlertDialogTitle>Elutasítja az igényt?</AlertDialogTitle>
            <AlertDialogDescription>
              A(z) {requestId} azonosítójú igény elutasításra kerül, a folyamat lezárul. Az
              indoklást az igénylő látja, és a döntések közé kerül.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`reject-reason-${requestId}`}>Indoklás *</Label>
            <Textarea
              id={`reject-reason-${requestId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Például: az eszköz a jelenlegi keretből nem fedezhető."
              rows={3}
            />
            {!valid && reason.length > 0 && (
              <p className="text-xs text-muted-foreground">Legalább {MIN} karakter szükséges.</p>
            )}
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
              Elutasítás
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Pontosítás kérése kötelező kérdéssel – a kérdés üzenetként jut el az igénylőhöz. */
export function ClarificationButton({
  requestId,
  onConfirm,
  size = "sm",
  label = "Pontosítás kérése",
}: {
  requestId: string;
  onConfirm: (question: string) => void;
  size?: "sm" | "default";
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const valid = question.trim().length >= MIN;
  return (
    <>
      <Button size={size} variant="ghost" onClick={() => setOpen(true)}>
        <MessageCircleQuestion className="size-4" /> {label}
      </Button>
      <AlertDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setQuestion("");
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mit kér pontosítani?</AlertDialogTitle>
            <AlertDialogDescription>
              A kérdés üzenetként jelenik meg a(z) {requestId} igénynél, az igénylő értesítést kap.
              A válasz után az ügy visszakerül a jelenlegi lépéshez.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`clarify-${requestId}`}>Kérdés *</Label>
            <Textarea
              id={`clarify-${requestId}`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Például: milyen szoftvereket futtat majd az eszközön?"
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Mégsem</AlertDialogCancel>
            <AlertDialogAction
              disabled={!valid}
              onClick={() => {
                onConfirm(question.trim());
                setQuestion("");
              }}
            >
              Pontosítás kérése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/** Átvételi kifogás kötelező indoklással (D4) – az eszköz visszakerül a kari IT referenshez. */
export function ObjectionButton({
  handoverId,
  deviceName,
  onConfirm,
  size = "sm",
}: {
  handoverId: string;
  deviceName: string;
  onConfirm: (reason: string) => void;
  size?: "sm" | "default";
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const valid = reason.trim().length >= MIN;
  return (
    <>
      <Button size={size} variant="outline" onClick={() => setOpen(true)}>
        <ShieldAlert className="size-4" /> Kifogást jelzek
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
            <AlertDialogTitle>Kifogást jelez az átvételkor?</AlertDialogTitle>
            <AlertDialogDescription>
              A(z) {deviceName} eszköz visszakerül a kari IT referenshez, aki a kifogást kezeli
              (javítás, csere, hiányzó tartozék pótlása), majd ismét átadja. Az indoklást a referens
              és a vezetői nézet is látja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor={`objection-${handoverId}`}>A kifogás indoklása *</Label>
            <Textarea
              id={`objection-${handoverId}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Például: a dokkoló hiányzik a csomagból, vagy a kijelző sérült."
              rows={3}
            />
            {!valid && reason.length > 0 && (
              <p className="text-xs text-muted-foreground">Legalább {MIN} karakter szükséges.</p>
            )}
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
              Kifogás rögzítése
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
