import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ROUTE_ROLES, type GuardedRoute } from "@/lib/route-access";
import { ROLE_LABELS } from "@/lib/types";

/** A beszerzői munkatér korlátozó kártyájának mintája, egységesítve. */
export function AccessDenied({ route, title }: { route: GuardedRoute; title: string }) {
  return (
    <div className="card-surface mx-auto max-w-2xl space-y-3 p-6">
      <Lock className="size-6 text-muted-foreground" aria-hidden="true" />
      <h1 className="font-display text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        Ez a felület a következő szerepkörök számára érhető el:
      </p>
      <ul className="flex flex-wrap gap-2">
        {ROUTE_ROLES[route].map((role) => (
          <li key={role} className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
            {ROLE_LABELS[role]}
          </li>
        ))}
      </ul>
      <Button asChild variant="outline">
        <Link to="/igenyeim">Saját igényeim</Link>
      </Button>
    </div>
  );
}
