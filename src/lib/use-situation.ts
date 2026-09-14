import { useStore } from "./store";
import { requestSituation, type RequestSituation } from "./request-situation";
import type { ServiceRequest } from "./types";

/** Az ügy helyzete a tárolt állapotból, a beállított határidőkkel. */
export function useSituation(request: ServiceRequest | undefined): RequestSituation | undefined {
  const store = useStore();
  if (!request) return undefined;
  return requestSituation(request, {
    planItems: store.planItems,
    planApprovals: store.planApprovals ?? [],
    handovers: store.handovers ?? [],
    users: store.users,
    settings: store.processSettings,
  });
}
