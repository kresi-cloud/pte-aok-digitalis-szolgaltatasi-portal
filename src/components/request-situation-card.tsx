import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Circle, Dot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { useDemoMode } from "@/lib/demo-mode";
import { requestSituation } from "@/lib/request-situation";
import { demoCurrentStep } from "@/lib/demo-flow";
import type { ServiceRequest } from "@/lib/types";

/** „Az ügy jelenlegi helyzete” – egységes állapotkártya az igény oldal tetején. */
export function RequestSituationCard({ request }: { request: ServiceRequest }) {
  const store = useStore();
  const { demo } = useDemoMode();
  const navigate = useNavigate();

  const s = requestSituation(request, {
    planItems: store.planItems,
    planApprovals: store.planApprovals ?? [],
    handovers: store.handovers ?? [],
    users: store.users,
  });

  const demoStep = demo
    ? demoCurrentStep({
        requests: store.requests,
        planItems: store.planItems,
        planApprovals: store.planApprovals ?? [],
        handovers: store.handovers ?? [],
        users: store.users,
      })
    : null;

  const continueDemo = () => {
    if (!demoStep) return;
    store.switchUser(demoStep.actorId);
    store.setActiveRole(demoStep.role);
    if (demoStep.route === "/igeny/$id" && demoStep.requestId) {
      navigate({ to: "/igeny/$id", params: { id: demoStep.requestId } });
    } else {
      navigate({ to: demoStep.route });
    }
  };

  return (
    <section
      aria-label="Az ügy jelenlegi helyzete"
      className={`card-surface mt-6 space-y-4 border-l-4 p-5 ${s.terminated || s.overdue ? "border-l-destructive" : "border-l-primary"}`}
    >
      <h2 className="font-display text-base font-semibold">Az ügy jelenlegi helyzete</h2>
      {s.terminated && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          A folyamat megszakadt – nincs további teendő.
        </p>
      )}
      {s.overdue && !s.terminated && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          Késedelmes: a tervezett negyedév vége elmúlt, a tétel még nem teljesült.
        </p>
      )}

      <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <dt className="text-xs text-muted-foreground">Jelenlegi státusz</dt>
          <dd className="mt-0.5 font-medium">{s.statusLabel}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Jelenlegi felelős</dt>
          <dd className="mt-0.5 font-medium">{s.owner}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Kire vár</dt>
          <dd className="mt-0.5 font-medium">{s.waitingOn}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Következő döntés / művelet</dt>
          <dd className="mt-0.5 font-medium">{s.nextAction}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Becsült bruttó költség</dt>
          <dd className="mt-0.5 font-medium">
            {s.grossCost ? `${s.grossCost.toLocaleString("hu-HU")} Ft` : "Nincs költségvonzat"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Jóváhagyási eredmény</dt>
          <dd className="mt-0.5 font-medium">
            {s.approvalsDone} / {s.approvalsTotal}
          </dd>
        </div>
      </dl>

      <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 border-t border-border pt-4 text-xs">
        {s.track.map((stage, i) => (
          <li key={stage.label} className="flex items-center gap-1">
            {i > 0 && <Dot className="size-4 text-muted-foreground" aria-hidden="true" />}
            <span
              className={
                stage.done
                  ? "inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-1 font-medium"
                  : stage.current
                    ? "inline-flex items-center gap-1 rounded-full border border-primary px-2 py-1 font-semibold text-primary"
                    : "inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-muted-foreground"
              }
            >
              {stage.done ? (
                <CheckCircle2 className="size-3.5" aria-hidden="true" />
              ) : (
                <Circle className="size-3.5" aria-hidden="true" />
              )}
              {stage.label}
              <span className="sr-only">
                {stage.done ? " – kész" : stage.current ? " – folyamatban" : " – hátravan"}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {demo && demoStep && !demoStep.done && store.currentUser.id !== demoStep.actorId ? (
        <div className="flex flex-wrap items-center gap-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <span>
            A folyamat itt folytatódik: {demoStep.waitingOn} – {demoStep.action}.
          </span>
          <Button size="sm" className="ml-auto" onClick={continueDemo}>
            Váltás és folytatás
            <ArrowRight className="ml-1 size-3.5" />
          </Button>
        </div>
      ) : null}
    </section>
  );
}
