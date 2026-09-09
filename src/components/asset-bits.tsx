import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  LICENCE_STATUS_LABELS,
  LIFECYCLE_LABELS,
  PRIORITY_LABELS,
  PROCUREMENT_STATUS_LABELS,
  type LicenceStatus,
  type LifecycleStatus,
  type ProcurementStatus,
  type ReplacementPriority,
} from "@/lib/asset-types";

const pill = "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap";

const LIFECYCLE_TONE: Record<LifecycleStatus, string> = {
  uj: "bg-primary/10 text-primary",
  normal: "bg-secondary text-secondary-foreground",
  kozep: "bg-secondary text-secondary-foreground",
  cserere_tervezendo: "bg-accent text-accent-foreground",
  cserere_erett: "bg-chart-4/20 text-foreground",
  tamogatasbol_kifutott: "bg-destructive/10 text-destructive",
  selejtezesre_var: "bg-destructive/15 text-destructive",
  selejtezett: "bg-muted text-muted-foreground",
};

export function LifecycleBadge({ status }: { status: LifecycleStatus }) {
  return <span className={cn(pill, LIFECYCLE_TONE[status])}>{LIFECYCLE_LABELS[status]}</span>;
}

const PRIORITY_TONE: Record<ReplacementPriority, string> = {
  kritikus: "bg-destructive/15 text-destructive",
  magas: "bg-chart-4/20 text-foreground",
  kozepes: "bg-accent text-accent-foreground",
  alacsony: "bg-secondary text-secondary-foreground",
};

export function PriorityBadge({ priority }: { priority: ReplacementPriority }) {
  return <span className={cn(pill, PRIORITY_TONE[priority])}>{PRIORITY_LABELS[priority]}</span>;
}

const LICENCE_TONE: Record<LicenceStatus, string> = {
  aktiv: "bg-primary/10 text-primary",
  nem_hasznalt: "bg-muted text-muted-foreground",
  lejarathoz_kozel: "bg-accent text-accent-foreground",
  lejart: "bg-destructive/15 text-destructive",
  megujitas_szukseges: "bg-chart-4/20 text-foreground",
  kivezetes_alatt: "bg-secondary text-secondary-foreground",
};

export function LicenceBadge({ status }: { status: LicenceStatus }) {
  return <span className={cn(pill, LICENCE_TONE[status])}>{LICENCE_STATUS_LABELS[status]}</span>;
}

export function ProcurementBadge({ status }: { status: ProcurementStatus }) {
  const tone =
    status === "jovahagyva" || status === "teljesult"
      ? "bg-primary/10 text-primary"
      : status === "elhalasztva"
        ? "bg-muted text-muted-foreground"
        : status === "jovahagyasra_var"
          ? "bg-accent text-accent-foreground"
          : "bg-secondary text-secondary-foreground";
  return <span className={cn(pill, tone)}>{PROCUREMENT_STATUS_LABELS[status]}</span>;
}

export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "warn" | "danger";
}) {
  return (
    <div className="card-surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-2xl font-semibold",
          tone === "danger" && "text-destructive",
          tone === "warn" && "text-chart-4",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}