export type LengthUnit = "mm" | "m" | "pan";

interface Props {
  value: LengthUnit;
  onChange: (next: LengthUnit) => void;
}

const UNIT_LABELS: Record<LengthUnit, string> = {
  mm: "mm",
  m: "m",
  pan: "pannelli",
};

export function UnitToggle({ value, onChange }: Props) {
  const units: LengthUnit[] = ["mm", "m", "pan"];
  return (
    <div
      role="tablist"
      aria-label="Unità di misura"
      className="inline-flex rounded-full border border-border bg-panel-2 p-0.5"
    >
      {units.map((u) => {
        const active = u === value;
        return (
          <button
            key={u}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(u)}
            title={UNIT_LABELS[u]}
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider transition",
              active
                ? "bg-brand text-bg shadow"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {u}
          </button>
        );
      })}
    </div>
  );
}
