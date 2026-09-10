import type { ComponentType } from "react";
import { AccessDenied } from "@/components/access-denied";
import { canOpenRoute, type GuardedRoute } from "@/lib/route-access";
import { useStore } from "@/lib/store";

/**
 * Route-komponens burkoló: ha az aktív szerepkör nem nyithatja meg az
 * útvonalat, az oldal helyett a korlátozó kártya jelenik meg. Az oldal
 * komponense így hook-sorrend kockázata nélkül marad érintetlen.
 */
export function withRouteAccess<P extends object>(
  route: GuardedRoute,
  title: string,
  Page: ComponentType<P>,
) {
  function Guarded(props: P) {
    const { activeRole } = useStore();
    if (!canOpenRoute(route, activeRole)) return <AccessDenied route={route} title={title} />;
    return <Page {...props} />;
  }
  Guarded.displayName = `withRouteAccess(${route})`;
  return Guarded;
}
