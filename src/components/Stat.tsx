type Accent = "brand" | "fit" | "fill";

interface Props {
  label: string;
  value: string;
  sub?: string;
  /** Colore del font (e del box, se `highlight` è true). */
  accent?: Accent;
  /** Se true, aggiunge tinta bg/border al box. Richiede `accent`. */
  highlight?: boolean;
}

const BORDER_CLASS: Record<Accent, string> = {
  brand: "border-brand/50 bg-brand/10",
  fit: "border-fit/50 bg-fit/10",
  fill: "border-fill/50 bg-fill/10",
};

const TEXT_CLASS: Record<Accent, string> = {
  brand: "text-brand",
  fit: "text-fit-bright",
  fill: "text-fill-bright",
};

export function Stat({
  label,
  value,
  sub,
  accent,
  highlight = false,
}: Props) {
  const showBoxTint = accent && highlight;
  return (
    <div
      className={[
        "rounded-xl border p-3",
        showBoxTint
          ? BORDER_CLASS[accent]
          : "border-border bg-panel/60",
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div
        className={[
          "mt-1 font-mono font-semibold tabular-nums",
          accent ? TEXT_CLASS[accent] : "text-slate-100",
          "text-lg leading-tight",
        ].join(" ")}
      >
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 font-mono text-xs text-slate-500 tabular-nums">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
