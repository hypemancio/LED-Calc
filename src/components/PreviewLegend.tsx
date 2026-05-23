/**
 * Legenda visiva dei colori usati nel CabinetPreview.
 * Mostrata sotto il canvas come riferimento per l'utente.
 */
export function PreviewLegend() {
  return (
    <div className="space-y-2 px-1 pt-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <LegendChip color="brand" label="Physical Wall" filled />
        <LegendChip color="fit" label="Fit Content" />
        <LegendChip color="fill" label="Fill Content" />
        <LegendChip color="amber" label="Overflow" dashed />
      </div>
      <p className="text-[10px] italic text-slate-500">
        Disclaimer: strumento di riferimento. Le stime di peso, consumo e
        cablaggio non sostituiscono le specifiche tecniche del produttore.
      </p>
    </div>
  );
}

type ChipColor = "brand" | "fit" | "fill" | "amber";

interface ChipProps {
  color: ChipColor;
  label: string;
  filled?: boolean;
  dashed?: boolean;
}

const CHIP_FILLED: Record<ChipColor, string> = {
  brand: "bg-brand",
  fit: "bg-fit",
  fill: "bg-fill",
  amber: "bg-amber-400",
};

const CHIP_OUTLINE: Record<ChipColor, string> = {
  brand: "border-brand",
  fit: "border-fit",
  fill: "border-fill",
  amber: "border-amber-400",
};

function LegendChip({ color, label, filled, dashed }: ChipProps) {
  const swatchClass = filled
    ? `h-3 w-3 rounded-sm ${CHIP_FILLED[color]}`
    : `h-3 w-3 rounded-sm border-[1.5px] ${CHIP_OUTLINE[color]} ${
        dashed ? "border-dashed" : ""
      }`;
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={swatchClass} />
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
        {label}
      </span>
    </span>
  );
}
