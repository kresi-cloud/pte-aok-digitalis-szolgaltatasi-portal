import { cn } from "@/lib/utils";
import { STATUS_LABELS, type Priority, type StatusKey } from "@/lib/types";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  FileEdit,
  Hammer,
  Inbox,
  PackageCheck,
  Search,
  ShieldCheck,
  TestTube,
  Undo2,
  XCircle,
} from "lucide-react";

const STATUS_STYLE: Record<StatusKey, { cls: string; Icon: typeof Clock }> = {
  piszkozat: { cls: "bg-muted text-muted-foreground border-border", Icon: FileEdit },
  bekuldve: { cls: "bg-secondary text-secondary-foreground border-border", Icon: Inbox },
  elso_ertekeles: { cls: "bg-accent text-accent-foreground border-accent", Icon: Search },
  pontositas: {
    cls: "bg-warning/15 text-warning-foreground border-warning/40",
    Icon: AlertTriangle,
  },
  jovahagyasra_var: { cls: "bg-info/12 text-info border-info/30", Icon: Clock },
  elfogadva: { cls: "bg-success/12 text-success border-success/30", Icon: ShieldCheck },
  tervezes: { cls: "bg-secondary text-secondary-foreground border-border", Icon: CircleDashed },
  megvalositas: { cls: "bg-primary/10 text-primary border-primary/25", Icon: Hammer },
  teszteles: { cls: "bg-accent text-accent-foreground border-accent", Icon: TestTube },
  atadasra_var: { cls: "bg-warning/15 text-warning-foreground border-warning/40", Icon: PackageCheck },
  lezarva: { cls: "bg-success/12 text-success border-success/30", Icon: CheckCircle2 },
  elutasitva: { cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle },
  visszavonva: { cls: "bg-muted text-muted-foreground border-border", Icon: Undo2 },
};

export function StatusBadge({ status, className }: { status: StatusKey; className?: string }) {
  const { cls, Icon } = STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        cls,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}

const PRIORITY: Record<Priority, { label: string; cls: string; mark: string }> = {
  alacsony: { label: "Alacsony", cls: "text-muted-foreground border-border", mark: "○" },
  kozepes: { label: "Közepes", cls: "text-foreground border-border", mark: "◐" },
  magas: { label: "Magas", cls: "text-warning-foreground border-warning/50 bg-warning/10", mark: "◕" },
  kritikus: {
    label: "Kritikus",
    cls: "text-destructive border-destructive/40 bg-destructive/10",
    mark: "●",
  },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const p = PRIORITY[priority];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        p.cls,
      )}
    >
      <span aria-hidden="true">{p.mark}</span>
      {p.label}
    </span>
  );
}

export function AiBadge({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-info/30 bg-info/5 p-4">
    <p className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-info uppercase">
      <span aria-hidden="true">✦</span> Igényértékelés – manuális jóváhagyás szükséges
    </p>
      {children}
    </div>
  );
}