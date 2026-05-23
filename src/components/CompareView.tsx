import { useMemo } from "react";
import {
  computeWallResult,
  getPitchMm,
  getSourceRatioLabel,
  type WallConfig,
} from "../lib/wall";
import { MAINS_VOLTAGE_V } from "../lib/ledMath";

interface Props {
  walls: WallConfig[];
  onSelectWall: (id: string) => void;
  onSwitchToEditor: () => void;
  onAddWall: () => void;
}

const intFormat = new Intl.NumberFormat("it-IT");
const dec1Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const dec2Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

/** Direzione "migliore" per le metriche numeriche evidenziabili. */
type BestDir = "max" | "min" | "none";

/** Trova gli indici della colonna con il valore "migliore" per la metrica. */
function bestIndices(values: number[], dir: BestDir): Set<number> {
  if (dir === "none" || values.length < 2) return new Set();
  const allEqual = values.every((v) => v === values[0]);
  if (allEqual) return new Set();
  const target =
    dir === "max" ? Math.max(...values) : Math.min(...values);
  const result = new Set<number>();
  values.forEach((v, i) => {
    if (v === target) result.add(i);
  });
  return result;
}

export function CompareView({
  walls,
  onSelectWall,
  onSwitchToEditor,
  onAddWall,
}: Props) {
  const cols = useMemo(
    () =>
      walls.map((w) => ({
        wall: w,
        result: computeWallResult(w),
        pitchMm: getPitchMm(w),
        sourceLabel: getSourceRatioLabel(w),
      })),
    [walls]
  );

  // Computiamo gli indici "best" per le righe numeriche evidenziabili
  const bestByRow: Record<string, Set<number>> = {
    resolution: bestIndices(
      cols.map((c) => c.result.totalPixels),
      "max"
    ),
    megapixel: bestIndices(
      cols.map((c) => c.result.megapixels),
      "max"
    ),
    powerPeak: bestIndices(
      cols.map((c) => c.result.powerPeakW),
      "min"
    ),
    weight: bestIndices(
      cols.map((c) => c.result.totalWeightKg),
      "min"
    ),
    viewing: bestIndices(
      cols.map((c) => c.result.viewingDistanceMinM),
      "min"
    ),
  };

  if (walls.length < 2) {
    return (
      <section className="grid place-items-center rounded-2xl border border-dashed border-border bg-panel-2/40 px-6 py-16 text-center">
        <div className="max-w-md space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Servono almeno 2 Ledwall
          </h2>
          <p className="text-sm text-slate-400">
            La vista Confronto mette i tuoi Ledwall fianco a fianco con
            risoluzione, pitch, carichi e visione. Aggiungi un altro Ledwall
            al progetto per iniziare.
          </p>
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={onAddWall}
              className="rounded-lg border border-brand/40 bg-brand/10 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-bright transition hover:border-brand hover:bg-brand/20"
            >
              + Aggiungi Ledwall
            </button>
            <button
              type="button"
              onClick={onSwitchToEditor}
              className="rounded-lg border border-border bg-panel-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
            >
              Torna all'editor
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-100">
            Confronto Ledwall
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {walls.length} colonne · in verde i valori "migliori" per metrica
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddWall}
            className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-bright transition hover:border-brand hover:bg-brand/20"
          >
            + Scenario
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-panel-2/40">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 font-mono text-xs">
          <thead>
            <tr>
              <Th sticky>Parametro</Th>
              {cols.map((c) => (
                <Th key={c.wall.id}>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-semibold text-slate-100">
                      {c.wall.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectWall(c.wall.id);
                        onSwitchToEditor();
                      }}
                      className="text-[10px] font-medium uppercase tracking-wider text-brand transition hover:text-brand-bright"
                    >
                      Modifica →
                    </button>
                  </div>
                </Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SectionRow span={cols.length + 1}>Setup</SectionRow>
            <Row
              label="Layout (m)"
              sticky
              values={cols.map(
                (c) =>
                  `${dec2Format.format(
                    c.result.actualWallWidthM
                  )} × ${dec2Format.format(c.result.actualWallHeightM)}`
              )}
            />
            <Row
              label="Cabinet (mm)"
              sticky
              values={cols.map(
                (c) => `${c.wall.cabinetWidthMm} × ${c.wall.cabinetHeightMm}`
              )}
            />
            <Row
              label="Pixel pitch"
              sticky
              values={cols.map(
                (c) =>
                  `${
                    c.wall.pitchSelection === "custom"
                      ? "Custom"
                      : c.wall.pitchSelection
                  } (${c.pitchMm.toFixed(3)} mm)`
              )}
            />
            <Row
              label="Source"
              sticky
              values={cols.map(
                (c) =>
                  `${c.sourceLabel} · ${
                    c.wall.sourceMode === "none"
                      ? "—"
                      : c.wall.sourceMode.toUpperCase()
                  }`
              )}
            />

            <SectionRow span={cols.length + 1}>Risoluzione</SectionRow>
            <Row
              label="Cabinet count"
              sticky
              values={cols.map(
                (c) =>
                  `${c.result.cabinetsWide} × ${c.result.cabinetsHigh} = ${c.result.cabinetsTotal}`
              )}
            />
            <Row
              label="Risoluzione (px)"
              sticky
              values={cols.map(
                (c) =>
                  `${intFormat.format(
                    c.result.resolutionWidthPx
                  )} × ${intFormat.format(c.result.resolutionHeightPx)}`
              )}
              best={bestByRow.resolution}
            />
            <Row
              label="Pixel / cabinet"
              sticky
              values={cols.map(
                (c) =>
                  `${c.result.pixelsPerCabinetWidth} × ${c.result.pixelsPerCabinetHeight}`
              )}
            />
            <Row
              label="Megapixel"
              sticky
              values={cols.map(
                (c) => `${dec2Format.format(c.result.megapixels)} Mpx`
              )}
              best={bestByRow.megapixel}
            />
            <Row
              label="Aspect ratio"
              sticky
              values={cols.map(
                (c) =>
                  `${c.result.aspectRatioReduced.label} · ${c.result.aspectRatioDecimalLabel}`
              )}
            />

            <SectionRow span={cols.length + 1}>Carichi</SectionRow>
            <Row
              label="Peso totale"
              sticky
              values={cols.map(
                (c) => `${dec1Format.format(c.result.totalWeightKg)} kg`
              )}
              best={bestByRow.weight}
            />
            <Row
              label="Consumo medio"
              sticky
              values={cols.map(
                (c) =>
                  `${dec2Format.format(
                    c.result.powerAvgW / 1000
                  )} kW · ${dec1Format.format(c.result.currentAvgA)} A`
              )}
            />
            <Row
              label="Consumo picco"
              sticky
              values={cols.map(
                (c) =>
                  `${dec2Format.format(
                    c.result.powerPeakW / 1000
                  )} kW · ${dec1Format.format(c.result.currentPeakA)} A`
              )}
              best={bestByRow.powerPeak}
            />
            <Row
              label={`Voltaggio rete`}
              sticky
              values={cols.map(() => `${MAINS_VOLTAGE_V} V`)}
            />

            <SectionRow span={cols.length + 1}>Visione</SectionRow>
            <Row
              label="Distanza minima"
              sticky
              values={cols.map(
                (c) =>
                  `${dec1Format.format(c.result.viewingDistanceMinM)} m · ${dec1Format.format(c.result.viewingDistanceMinFt)} ft`
              )}
              best={bestByRow.viewing}
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Th({
  children,
  sticky,
}: {
  children: React.ReactNode;
  sticky?: boolean;
}) {
  return (
    <th
      className={[
        "border-b border-border bg-panel px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-200",
        sticky
          ? "sticky left-0 z-10 min-w-[180px]"
          : "min-w-[180px]",
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function SectionRow({
  span,
  children,
}: {
  span: number;
  children: React.ReactNode;
}) {
  return (
    <tr>
      <td
        colSpan={span}
        className="bg-brand/8 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-brand-bright"
      >
        {children}
      </td>
    </tr>
  );
}

function Row({
  label,
  values,
  best,
  sticky,
}: {
  label: string;
  values: string[];
  best?: Set<number>;
  sticky?: boolean;
}) {
  return (
    <tr className="even:bg-panel/40">
      <td
        className={[
          "border-b border-border px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-slate-400",
          sticky ? "sticky left-0 z-[5] bg-panel" : "",
        ].join(" ")}
      >
        {label}
      </td>
      {values.map((v, i) => {
        const isBest = best?.has(i);
        return (
          <td
            key={i}
            className={[
              "border-b border-border px-3 py-2 tabular-nums",
              isBest ? "font-semibold text-brand-bright" : "text-slate-200",
            ].join(" ")}
          >
            {v}
            {isBest ? (
              <span className="ml-1.5 text-[9px] text-brand">★</span>
            ) : null}
          </td>
        );
      })}
    </tr>
  );
}
