import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, RotateCcw, UserCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useStore } from "@/lib/store";
import { useDemoMode } from "@/lib/demo-mode";
import { demoCurrentStep, DEMO_TOTAL_STEPS } from "@/lib/demo-flow";
import { formatHuDate } from "@/lib/clock";
import { ROLE_LABELS } from "@/lib/types";

/** A minden oldalon látható fiktív-adat jelzés. */
export function DemoBanner() {
  const { demo } = useDemoMode();
  if (!demo) return null;
  return (
    <div
      role="status"
      className="border-b border-amber-300 bg-amber-50 px-4 py-1.5 text-center text-[11px] font-semibold tracking-[0.14em] text-amber-900 uppercase"
    >
      Vezetőségi demó · fiktív adatok
    </div>
  );
}

/**
 * Demóvezérlő: mindig az aktuális lépést, szereplőt és a következő teendőt
 * mutatja. Kizárólag navigál és szereplőt vált – üzleti döntést nem hoz.
 */
export function DemoController() {
  const { demo, demoDate, exitDemo } = useDemoMode();
  const store = useStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const step = useMemo(
    () =>
      demoCurrentStep({
        requests: store.requests,
        planItems: store.planItems,
        planApprovals: store.planApprovals ?? [],
        handovers: store.handovers ?? [],
        users: store.users,
      }),
    [store.requests, store.planItems, store.planApprovals, store.handovers, store.users],
  );

  if (!demo) return null;

  const actor = store.users.find((u) => u.id === step.actorId);
  const isActor = store.currentUser.id === step.actorId;

  const goToTask = () => {
    if (step.route === "/igeny/$id" && step.requestId) {
      navigate({ to: "/igeny/$id", params: { id: step.requestId } });
    } else {
      navigate({ to: step.route });
    }
  };

  const switchAndGo = () => {
    store.switchUser(step.actorId);
    store.setActiveRole(step.role);
    goToTask();
  };

  const reset = () => {
    store.resetDemo({ leadershipDemo: true });
    navigate({ to: "/uj-igeny" });
  };

  if (collapsed) {
    return (
      <div className="fixed right-4 bottom-4 z-50">
        <Button size="sm" onClick={() => setCollapsed(false)}>
          Vezetőségi demó · {step.index} / {DEMO_TOTAL_STEPS}
        </Button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Vezetőségi demó vezérlő"
      className="fixed right-4 bottom-4 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg border border-amber-300 bg-card p-4 shadow-lg"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] text-amber-700 uppercase">
            Vezetőségi demó
          </p>
          <p className="text-sm font-semibold">
            {step.index} / {DEMO_TOTAL_STEPS}. lépés
          </p>
        </div>
        <button
          type="button"
          aria-label="Vezérlő összecsukása"
          className="rounded p-1 text-muted-foreground hover:bg-muted"
          onClick={() => setCollapsed(true)}
        >
          <X className="size-4" />
        </button>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Belépve</dt>
          <dd className="font-medium">
            {store.currentUser.name} · {ROLE_LABELS[store.activeRole]}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Ügy állapota</dt>
          <dd>{step.state}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Kire vár</dt>
          <dd className="font-medium">{step.waitingOn}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Következő teendő</dt>
          <dd>{step.action}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-muted-foreground">Demókörnyezet dátuma</dt>
          <dd>{formatHuDate(demoDate)}</dd>
        </div>
      </dl>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={goToTask} disabled={step.done}>
          Megnyitom a következő teendőt
          <ArrowRight className="ml-1 size-3.5" />
        </Button>
        {!isActor && !step.done ? (
          <Button size="sm" variant="secondary" onClick={switchAndGo}>
            <UserCog className="mr-1 size-3.5" />
            Váltás a következő szereplőre
            {actor ? ` (${actor.name})` : ""}
          </Button>
        ) : null}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline">
              <RotateCcw className="mr-1 size-3.5" />
              Demó újraindítása
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Újraindítja a vezetőségi demót?</AlertDialogTitle>
              <AlertDialogDescription>
                A demó futása során keletkezett minden fiktív adat törlődik, és a rendszer visszaáll
                az eredeti kiindulóállapotra, a demó igénylőjének nézetében.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Mégsem</AlertDialogCancel>
              <AlertDialogAction onClick={reset}>Újraindítás</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button size="sm" variant="ghost" onClick={exitDemo}>
          Kilépés a demóból
        </Button>
      </div>
    </aside>
  );
}
