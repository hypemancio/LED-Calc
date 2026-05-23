import type { ProjectTotals as Totals } from "../lib/wall";
import { MAINS_VOLTAGE_V } from "../lib/ledMath";

const intFormat = new Intl.NumberFormat("it-IT");
const dec1Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const dec2Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

interface Props {
  totals: Totals;
}

export function ProjectTotals({ totals }: Props) {
  // Mostra solo se >= 1 Ledwall con almeno qualche calcolo non-zero
  if (totals.wallsCount === 0) return null;

  return (
    <section className="rounded-2xl border border-brand/30 bg-brand/5 p-4 lg:p-5">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-bright">
          Totali progetto
        </h2>
        <span className="font-mono text-[10px] text-slate-400">
          {totals.wallsCount} Ledwall · somma su tutti
        </span>
      </header>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Cell
          label="Cabinet"
          value={intFormat.format(totals.cabinetsTotal)}
          sub="totali"
        />
        <Cell
          label="Risoluzione"
          value={`${dec2Format.format(totals.megapixels)} Mpx`}
          sub={`${intFormat.format(totals.totalPixels)} px`}
        />
        <Cell
          label="Area"
          value={`${dec2Format.format(totals.areaM2)} m²`}
          sub="superficie Ledwall"
        />
        <Cell
          label="Peso"
          value={`${dec1Format.format(totals.totalWeightKg)} kg`}
          sub={`${dec2Format.format(totals.totalWeightKg / 1000)} t`}
        />
        <Cell
          label="Consumo medio"
          value={`${dec2Format.format(totals.powerAvgW / 1000)} kW`}
          sub={`${dec1Format.format(totals.powerAvgW / MAINS_VOLTAGE_V)} A`}
        />
        <Cell
          label="Consumo picco"
          value={`${dec2Format.format(totals.powerPeakW / 1000)} kW`}
          sub={`${dec1Format.format(totals.powerPeakW / MAINS_VOLTAGE_V)} A @ ${MAINS_VOLTAGE_V} V`}
        />
      </div>
    </section>
  );
}

function Cell({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-brand/20 bg-bg/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-lg font-semibold tabular-nums leading-tight text-brand-bright">
        {value}
      </div>
      {sub ? (
        <div className="mt-0.5 font-mono text-[10px] text-slate-500 tabular-nums">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
