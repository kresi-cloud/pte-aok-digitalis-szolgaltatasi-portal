import { Eye } from "lucide-react";

export function ViewOnlyNotice({
  text = "Dékáni betekintés – csak olvasható nézet. Az adatok teljeskörűen láthatók, módosítás nem végezhető.",
}: {
  text?: string;
}) {
  return (
    <div className="mt-6 flex items-start gap-2 rounded-md border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <Eye className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}
