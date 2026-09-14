import { useState } from "react";
import { toast } from "sonner";
import { UserRoundCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lookup, useStore } from "@/lib/store";
import { addWorkdays, todayIso } from "@/lib/clock";
import { substituteOf } from "@/lib/delegation";

/** D8 – időszakos helyettesítés beállítása egy felhasználóhoz (saját profil vagy admin). */
export function DelegationCard({ userId, title }: { userId: string; title?: string }) {
  const store = useStore();
  const current = store.delegations.find((d) => d.userId === userId);
  const active = substituteOf(store.delegations, userId, todayIso());
  const [substituteId, setSubstituteId] = useState(current?.substituteId ?? "");
  const [from, setFrom] = useState(current?.from ?? todayIso());
  const [to, setTo] = useState(current?.to ?? addWorkdays(todayIso(), 10));
  const candidates = store.activeUsers.filter((u) => u.id !== userId);
  const name = lookup.user(userId)?.name ?? userId;
  return (
    <section className="card-surface space-y-4 p-5" aria-labelledby={`delegation-${userId}`}>
      <div>
        <h2 id={`delegation-${userId}`} className="font-display text-base font-semibold">
          <UserRoundCheck className="mr-1 inline size-4" aria-hidden="true" />
          {title ?? "Helyettesítés"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Az időszak alatt a{" "}
          {name === lookup.user(store.currentUser.id)?.name ? "hozzám" : `${name} részére`} érkező
          jóváhagyási teendők és értesítések a helyettesnél jelennek meg; minden helyettesként
          hozott döntés naplózva. Az admin felülírhatja.
        </p>
      </div>
      {current && (
        <p
          className={`rounded-md px-3 py-2 text-sm ${active ? "bg-success/10 text-success" : "bg-secondary"}`}
        >
          {`Beállított helyettes: ${lookup.user(current.substituteId)?.name ?? current.substituteId} · ${current.from} – ${current.to}${active ? " · most aktív" : " · nem aktív időszak"}`}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor={`sub-${userId}`}>Helyettes</Label>
          <Select value={substituteId} onValueChange={setSubstituteId}>
            <SelectTrigger id={`sub-${userId}`} aria-label="Helyettes">
              <SelectValue placeholder="Válasszon munkatársat" />
            </SelectTrigger>
            <SelectContent>
              {candidates.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name} – {u.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`from-${userId}`}>Időszak kezdete</Label>
          <Input
            id={`from-${userId}`}
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`to-${userId}`}>Időszak vége</Label>
          <Input
            id={`to-${userId}`}
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            const err = store.setDelegation(userId, { substituteId, from, to });
            if (err) toast.error(err);
            else toast.success("Helyettesítés beállítva, naplózva.");
          }}
        >
          Helyettesítés mentése
        </Button>
        {current && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const err = store.setDelegation(userId, null);
              if (err) toast.error(err);
              else {
                setSubstituteId("");
                toast.success("Helyettesítés törölve.");
              }
            }}
          >
            Helyettesítés törlése
          </Button>
        )}
      </div>
    </section>
  );
}
