import { Megaphone, TriangleAlert, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { AnnouncementLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const STYLES: Record<AnnouncementLevel, { box: string; icon: typeof Info }> = {
  info: { box: "border-info/30 bg-info/5", icon: Info },
  figyelmeztetes: { box: "border-warning/40 bg-warning/10", icon: TriangleAlert },
  fontos: { box: "border-destructive/40 bg-destructive/10", icon: Megaphone },
};

export function AnnouncementsBanner() {
  const { activeAnnouncements, dismissAnnouncement } = useStore();
  if (activeAnnouncements.length === 0) return null;

  return (
    <section aria-labelledby="hirek" className="space-y-3">
      <h2 id="hirek" className="font-display text-lg font-semibold">
        Hírek
      </h2>
      <ul className="space-y-3">
        {activeAnnouncements.map((a) => {
          const style = STYLES[a.level];
          const Icon = style.icon;
          return (
            <li key={a.id} className={cn("flex gap-3 rounded-lg border px-4 py-3.5", style.box)}>
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Közzétéve: {a.publishedAt} · Érvényes eddig: {a.expiresAt}
                </p>
              </div>
              {a.level !== "fontos" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Közlemény elrejtése"
                  onClick={() => dismissAnnouncement(a.id)}
                >
                  <X className="size-4" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
