import { Info, TriangleAlert } from "lucide-react";
import { ASSET_MODELS } from "@/lib/asset-data";
import type { SimilarAsset } from "@/lib/similar-assets";

interface Props {
  items: SimilarAsset[];
  /** kinek szól a szöveg: az igénylőnek saját magáról, vagy a jóváhagyónak az igénylőről */
  audience: "igenylo" | "jovahagyo";
  requesterName?: string | undefined;
  /** csere jelölésekor tájékoztató hangnem */
  tone?: "figyelmeztetes" | "tajekoztatas" | undefined;
}

const CONDITION_LABELS: Record<string, string> = {
  kifogastalan: "Kifogástalan",
  jo: "Jó",
  kopott: "Kopott",
  hibas: "Hibás",
};

export function SimilarAssetNotice({ items, audience, requesterName, tone }: Props) {
  if (items.length === 0) return null;

  const info = tone === "tajekoztatas";
  const Icon = info ? Info : TriangleAlert;
  const title = info
    ? audience === "igenylo"
      ? "A leltárában szereplő, cserére jelölhető eszközök"
      : `${requesterName ? requesterName + " " : "Az igénylő "}leltárában szereplő, cserére jelölhető eszközök`
    : audience === "igenylo"
      ? "Ön jelenleg is rendelkezik ilyen típusú eszközzel"
      : `${requesterName ? requesterName + " " : "Az igénylő "}jelenleg is rendelkezik ilyen típusú eszközzel`;

  return (
    <div
      className={
        info
          ? "flex gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-3.5"
          : "flex gap-3 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3.5"
      }
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{title}</p>
        <ul className="mt-2 space-y-1.5 text-sm">
          {items.map(({ asset, relation }) => {
            const model = ASSET_MODELS.find((m) => m.key === asset.modelKey);
            const name = model ? `${model.manufacturer} ${model.model}` : asset.deviceId;
            return (
              <li key={asset.id}>
                <span className="font-medium">{name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {asset.inventoryNo} · üzembe helyezve: {asset.commissionDate} · állapot:{" "}
                  {CONDITION_LABELS[asset.condition] ?? asset.condition} ·{" "}
                  {relation === "hasznalo" ? "személyes használatban" : "felelősként kezeli"}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-muted-foreground">
          {info
            ? "Az igénylés cseréként érkezik: a jóváhagyás után a jelölt eszköz kivezetésre kerülhet."
            : "A tájékoztatás nem akadályozza az igénylést, de érdemes mérlegelni a meglévő eszköz további használatát vagy cseréjét."}
        </p>
      </div>
    </div>
  );
}
