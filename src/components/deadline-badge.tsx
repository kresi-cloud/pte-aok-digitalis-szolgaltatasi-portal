import { AlarmClock, Clock3, TriangleAlert } from "lucide-react";
import { formatHuDate } from "@/lib/clock";
import type { DeadlineInfo } from "@/lib/deadlines";

/**
 * Lépés-határidő jelvény (D3/D7): mióta vár, határidő, szint.
 * Zöld: határidőn belül; borostyán: emlékeztető; piros: lejárt (jelzés, nincs átvétel).
 */
export function DeadlineBadge({
  deadline,
  compact = false,
}: {
  deadline: DeadlineInfo | undefined;
  compact?: boolean;
}) {
  if (!deadline) return null;
  const { level, waitingWorkdays, remainingWorkdays, dueDate } = deadline;
  const cls =
    level === "overdue"
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : level === "reminder"
        ? "border-warning/50 bg-warning/15 text-warning-foreground"
        : "border-border bg-secondary text-foreground";
  const Icon = level === "overdue" ? TriangleAlert : level === "reminder" ? AlarmClock : Clock3;
  const text =
    level === "overdue"
      ? `Lejárt: ${-remainingWorkdays} munkanapja`
      : level === "reminder"
        ? `Határidő közeleg: ${remainingWorkdays} munkanap`
        : `${waitingWorkdays} munkanapja vár`;
  const title = `Mióta vár: ${waitingWorkdays} munkanap (${formatHuDate(deadline.since)} óta) · Határidő: ${formatHuDate(dueDate)}`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}
      title={title}
      aria-label={`${text}. ${title}`}
    >
      <Icon className="size-3" aria-hidden="true" />
      {text}
      {!compact && <span className="font-normal opacity-80">· határidő {dueDate}</span>}
    </span>
  );
}
