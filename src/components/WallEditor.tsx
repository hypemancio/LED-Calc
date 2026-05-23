import { useMemo } from "react";
import {
  CABINET_PRESETS,
  MAINS_VOLTAGE_V,
  PIXEL_PITCHES,
  SOURCE_ASPECT_PRESETS,
  computeFill,
  computeFit,
  type PitchLabel,
} from "../lib/ledMath";
import {
  computeWallResult,
  getPitchMm,
  getSourceRatio,
  getSourceRatioLabel,
  type SourceMode,
  type SourceSelection,
  type WallConfig,
} from "../lib/wall";
import { computePortBudget } from "../lib/cabling";
import { NumberField } from "./NumberField";
import { Section } from "./Section";
import { Stat } from "./Stat";
import { WarningBanner } from "./WarningBanner";
import { CabinetPreview } from "./CabinetPreview";
import { SegmentedToggle } from "./SegmentedToggle";
import { LcdReadout } from "./LcdReadout";
import { Collapse } from "./Collapse";
import { CablingSection } from "./CablingSection";
import { PreviewLegend } from "./PreviewLegend";
import { TestCardSection } from "./TestCardSection";
import type { CablingConfig } from "../lib/cabling";

const intFormat = new Intl.NumberFormat("it-IT");
const dec2Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const dec1Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const pctFormat = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 1,
});

interface Props {
  wall: WallConfig;
  onChange: (updates: Partial<WallConfig>) => void;
  projectName?: string;
}

export function WallEditor({ wall, onChange, projectName }: Props) {
  // Derivati
  const pitchMm = getPitchMm(wall);
  const sourceRatio = useMemo(() => getSourceRatio(wall), [wall]);
  const sourceRatioLabel = useMemo(() => getSourceRatioLabel(wall), [wall]);
  const result = useMemo(() => computeWallResult(wall), [wall]);

  const fit = useMemo(
    () =>
      computeFit(
        result.resolutionWidthPx,
        result.resolutionHeightPx,
        sourceRatio
      ),
    [result.resolutionWidthPx, result.resolutionHeightPx, sourceRatio]
  );
  const fill = useMemo(
    () =>
      computeFill(
        result.resolutionWidthPx,
        result.resolutionHeightPx,
        sourceRatio
      ),
    [result.resolutionWidthPx, result.resolutionHeightPx, sourceRatio]
  );

  const activePresetLabel = useMemo(() => {
    const match = CABINET_PRESETS.find(
      (p) =>
        p.widthMm === wall.cabinetWidthMm && p.heightMm === wall.cabinetHeightMm
    );
    return match?.label ?? null;
  }, [wall.cabinetWidthMm, wall.cabinetHeightMm]);

  const { warnings } = result;
  const hasWarning =
    warnings.wallNotMultipleOfCabinetWidth ||
    warnings.wallNotMultipleOfCabinetHeight;

  // Budget cablaggio — usato anche per i segmenti polyline nel preview
  const pixelsPerCabinet =
    result.pixelsPerCabinetWidth * result.pixelsPerCabinetHeight;
  const portBudget = useMemo(
    () => computePortBudget(wall.cabling, result.cabinetsTotal, pixelsPerCabinet),
    [wall.cabling, result.cabinetsTotal, pixelsPerCabinet]
  );

  // Layout — dimensioni derivate per i 4 input (cabinet count + metri)
  const cabsW =
    wall.cabinetWidthMm > 0
      ? parseFloat((wall.wallWidthMm / wall.cabinetWidthMm).toFixed(2))
      : 0;
  const cabsH =
    wall.cabinetHeightMm > 0
      ? parseFloat((wall.wallHeightMm / wall.cabinetHeightMm).toFixed(2))
      : 0;
  const wMeters = parseFloat((wall.wallWidthMm / 1000).toFixed(3));
  const hMeters = parseFloat((wall.wallHeightMm / 1000).toFixed(3));

  return (
    <div className="grid gap-4 lg:grid-cols-12 lg:gap-6">
      {/* COLONNA SETUP (sinistra) */}
      <div className="space-y-4 lg:col-span-3 lg:space-y-4">
        <Section
          title="Source Content"
          titleAccent="brand"
          description="Aspect ratio della sorgente video/immagine."
        >
          <div className="flex flex-wrap gap-2">
            {SOURCE_ASPECT_PRESETS.map((p) => {
              const active = wall.sourceSelection === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ sourceSelection: p.label as SourceSelection })
                  }
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-brand bg-brand/15 text-brand-bright"
                      : "border-border bg-panel-2 text-slate-300 hover:border-slate-600",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onChange({ sourceSelection: "custom" })}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                wall.sourceSelection === "custom"
                  ? "border-brand bg-brand/15 text-brand-bright"
                  : "border-border bg-panel-2 text-slate-300 hover:border-slate-600",
              ].join(" ")}
            >
              Custom
            </button>
          </div>

          <Collapse open={wall.sourceSelection === "custom"}>
            <div className="grid grid-cols-2 gap-3 pt-3">
              <NumberField
                label="Ratio W"
                suffix=""
                step={1}
                value={wall.customSourceW}
                onChange={(v) => onChange({ customSourceW: v })}
              />
              <NumberField
                label="Ratio H"
                suffix=""
                step={1}
                value={wall.customSourceH}
                onChange={(v) => onChange({ customSourceH: v })}
              />
            </div>
          </Collapse>

          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Ratio"
              value={sourceRatioLabel}
              sub={sourceRatio > 0 ? `${sourceRatio.toFixed(3)}:1` : "—"}
              accent="brand"
            />
            <Stat
              label="Source vs Wall"
              value={
                sourceRatio > 0 && result.aspectRatioDecimal > 0
                  ? sourceRatio > result.aspectRatioDecimal
                    ? "più larga"
                    : sourceRatio < result.aspectRatioDecimal
                    ? "più alta"
                    : "stesso ratio"
                  : "—"
              }
              sub={`Wall: ${result.aspectRatioDecimalLabel}`}
            />
          </div>
        </Section>

        <Section
          title="Cabinet"
          titleAccent="brand"
          description="Sempre in mm. Seleziona un preset o usa Custom."
        >
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
              Preset
            </span>
            <select
              value={
                wall.cabCustomMode || activePresetLabel === null
                  ? "custom"
                  : activePresetLabel
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "custom") {
                  onChange({ cabCustomMode: true });
                  return;
                }
                const preset = CABINET_PRESETS.find((p) => p.label === v);
                if (preset) {
                  onChange({
                    cabCustomMode: false,
                    cabinetWidthMm: preset.widthMm,
                    cabinetHeightMm: preset.heightMm,
                  });
                }
              }}
              className="h-14 w-full appearance-none rounded-xl border border-border bg-panel-2 px-4 font-mono text-lg text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            >
              {CABINET_PRESETS.map((p) => (
                <option key={p.label} value={p.label}>
                  {p.label} mm
                </option>
              ))}
              <option value="custom">Custom…</option>
            </select>
          </label>
          {wall.cabCustomMode || activePresetLabel === null ? (
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Larghezza"
                suffix="mm"
                step={10}
                value={wall.cabinetWidthMm}
                onChange={(v) => onChange({ cabinetWidthMm: v })}
              />
              <NumberField
                label="Altezza"
                suffix="mm"
                step={10}
                value={wall.cabinetHeightMm}
                onChange={(v) => onChange({ cabinetHeightMm: v })}
              />
            </div>
          ) : null}
        </Section>

        <Section
          title="Pixel pitch"
          titleAccent="brand"
          description={
            wall.pitchSelection === "custom"
              ? "Custom — imposta pixel per cabinet, il pitch viene derivato dal cabinet."
              : "Pitch in mm tra due pixel. I pixel per cabinet sono derivati."
          }
        >
          <div className="flex flex-wrap gap-2">
            {PIXEL_PITCHES.map((p) => {
              const active = wall.pitchSelection === p.label;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() =>
                    onChange({ pitchSelection: p.label as PitchLabel })
                  }
                  className={[
                    "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                    active
                      ? "border-brand bg-brand/15 text-brand-bright"
                      : "border-border bg-panel-2 text-slate-300 hover:border-slate-600",
                  ].join(" ")}
                >
                  {p.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => onChange({ pitchSelection: "custom" })}
              className={[
                "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                wall.pitchSelection === "custom"
                  ? "border-brand bg-brand/15 text-brand-bright"
                  : "border-border bg-panel-2 text-slate-300 hover:border-slate-600",
              ].join(" ")}
            >
              Custom
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Pixel L/cab"
              suffix="px"
              step={1}
              value={result.pixelsPerCabinetWidth}
              onChange={(px) => {
                if (px > 0 && wall.cabinetWidthMm > 0) {
                  onChange({
                    pitchSelection: "custom",
                    customPitchMm: parseFloat(
                      (wall.cabinetWidthMm / px).toFixed(4)
                    ),
                  });
                }
              }}
              readOnly={wall.pitchSelection !== "custom"}
            />
            <NumberField
              label="Pixel H/cab"
              suffix="px"
              step={1}
              value={result.pixelsPerCabinetHeight}
              onChange={(px) => {
                if (px > 0 && wall.cabinetHeightMm > 0) {
                  onChange({
                    pitchSelection: "custom",
                    customPitchMm: parseFloat(
                      (wall.cabinetHeightMm / px).toFixed(4)
                    ),
                  });
                }
              }}
              readOnly={wall.pitchSelection !== "custom"}
            />
          </div>
        </Section>

        <Section
          title="Layout"
          titleAccent="brand"
          description="Dimensioni del Ledwall — modifica in cabinet o in metri (sincronizzati)."
        >
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Larghezza"
              suffix="cab"
              step={1}
              value={cabsW}
              onChange={(v) => onChange({ wallWidthMm: v * wall.cabinetWidthMm })}
            />
            <NumberField
              label="Altezza"
              suffix="cab"
              step={1}
              value={cabsH}
              onChange={(v) => onChange({ wallHeightMm: v * wall.cabinetHeightMm })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Larghezza"
              suffix="m"
              step={0.5}
              value={wMeters}
              onChange={(v) => onChange({ wallWidthMm: v * 1000 })}
              valueAccent="brand"
            />
            <NumberField
              label="Altezza"
              suffix="m"
              step={0.5}
              value={hMeters}
              onChange={(v) => onChange({ wallHeightMm: v * 1000 })}
              valueAccent="brand"
            />
          </div>
        </Section>

        <Section
          title="Stime per cabinet"
          description="Tara i default sulle schede tecniche."
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-2">
            <div className="lg:col-span-2">
              <NumberField
                label="Peso"
                suffix="kg"
                value={wall.weightKgPerCabinet}
                onChange={(v) => onChange({ weightKgPerCabinet: v })}
                step={0.5}
              />
            </div>
            <NumberField
              label="W medi"
              suffix="W"
              value={wall.powerAvgWPerCabinet}
              onChange={(v) => onChange({ powerAvgWPerCabinet: v })}
              step={10}
            />
            <NumberField
              label="W picco"
              suffix="W"
              value={wall.powerPeakWPerCabinet}
              onChange={(v) => onChange({ powerPeakWPerCabinet: v })}
              step={10}
            />
          </div>
        </Section>

      </div>

      {/* COLONNA CANVAS + CONSOLE (destra) */}
      <div className="space-y-4 lg:col-span-9 lg:space-y-5">
        <LcdReadout
          primary={{
            label: "Resolution",
            value: `${intFormat.format(result.resolutionWidthPx)} × ${intFormat.format(result.resolutionHeightPx)}`,
            sub: `${result.pixelsPerCabinetWidth} × ${result.pixelsPerCabinetHeight} px / cab`,
          }}
          secondary={[
            {
              label: "Cabinets",
              value: `${result.cabinetsWide} × ${result.cabinetsHigh}`,
              sub: `tot ${result.cabinetsTotal}`,
            },
            {
              label: "Aspect",
              value: result.aspectRatioReduced.label,
              sub: result.aspectRatioDecimalLabel,
            },
            {
              label: "Megapixel",
              value: `${dec2Format.format(result.megapixels)} Mpx`,
            },
            {
              label: "Power · peak",
              value: `${dec2Format.format(result.powerPeakW / 1000)} kW`,
              sub: `${dec1Format.format(result.currentPeakA)} A`,
            },
          ]}
        />

        {hasWarning ? (
          <WarningBanner>
            <p className="font-medium text-amber-50">
              Le dimensioni richieste non sono multipli esatti del cabinet.
            </p>
            <p>
              Il Ledwall reale sarà{" "}
              <span className="font-mono font-semibold tabular-nums">
                {dec2Format.format(result.actualWallWidthM)} ×{" "}
                {dec2Format.format(result.actualWallHeightM)} m
              </span>{" "}
              ({intFormat.format(result.actualWallWidthMm)} ×{" "}
              {intFormat.format(result.actualWallHeightMm)} mm).
              {warnings.wallNotMultipleOfCabinetWidth && (
                <>
                  {" "}
                  +{intFormat.format(Math.round(warnings.widthOverflowMm))} mm in larghezza.
                </>
              )}
              {warnings.wallNotMultipleOfCabinetHeight && (
                <>
                  {" "}
                  +{intFormat.format(Math.round(warnings.heightOverflowMm))} mm in altezza.
                </>
              )}
            </p>
          </WarningBanner>
        ) : null}

        <Section
          title="Anteprima"
          action={
            <SegmentedToggle<SourceMode>
              size="xs"
              ariaLabel="Modalità sorgente"
              value={wall.sourceMode}
              onChange={(v) => onChange({ sourceMode: v })}
              options={[
                { value: "none", label: "—" },
                { value: "fit", label: "Fit" },
                { value: "fill", label: "Fill" },
                { value: "total", label: "Total" },
              ]}
            />
          }
        >
          <CabinetPreview
            cabinetsWide={result.cabinetsWide}
            cabinetsHigh={result.cabinetsHigh}
            cabinetWidthMm={wall.cabinetWidthMm}
            cabinetHeightMm={wall.cabinetHeightMm}
            requestedWallWidthMm={wall.wallWidthMm}
            requestedWallHeightMm={wall.wallHeightMm}
            sourceRatio={sourceRatio}
            sourceMode={wall.sourceMode}
            resolutionWidthLabel={`${intFormat.format(
              result.resolutionWidthPx
            )} px`}
            resolutionHeightLabel={`${intFormat.format(
              result.resolutionHeightPx
            )} px`}
            cablingShow={wall.cabling.showInPreview}
            cablingPattern={wall.cabling.pattern}
            cablingCorner={wall.cabling.corner}
            cablingSegmentSize={portBudget.cabinetsPerPort}
            cablingCustomStarts={wall.cabling.customStarts}
            onCabinetClick={
              wall.cabling.showInPreview
                ? (n) => {
                    const has = wall.cabling.customStarts.includes(n);
                    const next = has
                      ? wall.cabling.customStarts.filter((x) => x !== n)
                      : [...wall.cabling.customStarts, n];
                    onChange({ cabling: { ...wall.cabling, customStarts: next } });
                  }
                : undefined
            }
          />
          <PreviewLegend />
        </Section>

        <Section
          title="Fit / Fill analysis"
          description={
            wall.fitFillView === "actual"
              ? "Valori esatti con decimali — calcolo matematico puro."
              : "Valori approssimati al pixel intero (Math.round)."
          }
          action={
            <SegmentedToggle<"actual" | "closest">
              size="xs"
              ariaLabel="Vista Fit/Fill"
              value={wall.fitFillView}
              onChange={(v) => onChange({ fitFillView: v })}
              options={[
                { value: "actual", label: "# Actual" },
                { value: "closest", label: "□ Closest" },
              ]}
            />
          }
        >
          {(() => {
            // Actual = decimali (2 cifre); Closest = intero arrotondato
            const closest = wall.fitFillView === "closest";
            const fmt = (v: number) =>
              closest
                ? intFormat.format(Math.round(v))
                : dec2Format.format(v);

            return (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Fit · area visibile"
                  value={`${fmt(fit.widthPx)} × ${fmt(fit.heightPx)}`}
                  sub={`${pctFormat.format(fit.utilization)} dei pixel Ledwall`}
                  accent="fit"
                  highlight
                />
                <Stat
                  label="Fit · letterbox"
                  value={
                    fit.letterboxYPx > fit.letterboxXPx
                      ? `${fmt(fit.letterboxYPx)} px ↕`
                      : fit.letterboxXPx > 0
                      ? `${fmt(fit.letterboxXPx)} px ↔`
                      : "0 px"
                  }
                  sub="per banda (sopra/sotto · sx/dx)"
                  accent="fit"
                />
                <Stat
                  label="Fill · sorgente"
                  value={`${fmt(fill.sourceWidthPx)} × ${fmt(fill.sourceHeightPx)}`}
                  sub={`${pctFormat.format(fill.visibleFraction)} visibile`}
                  accent="fill"
                  highlight
                />
                <Stat
                  label="Fill · crop"
                  value={
                    fill.croppedXPx > 0
                      ? `${fmt(fill.croppedXPx / 2)} px ↔`
                      : fill.croppedYPx > 0
                      ? `${fmt(fill.croppedYPx / 2)} px ↕`
                      : "0 px"
                  }
                  sub="per lato (sx/dx · sopra/sotto)"
                  accent="fill"
                />
              </div>
            );
          })()}
        </Section>

        <Section
          title="Dettagli tecnici"
          description="Ledwall reale, pitch, peso, consumo, distanza visione."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Ledwall reale"
              value={`${dec2Format.format(result.actualWallWidthM)} × ${dec2Format.format(result.actualWallHeightM)} m`}
              sub={`${intFormat.format(result.actualWallWidthMm)} × ${intFormat.format(result.actualWallHeightMm)} mm`}
            />
            <Stat
              label="Pixel pitch"
              value={
                wall.pitchSelection === "custom" ? "Custom" : wall.pitchSelection
              }
              sub={`${pitchMm.toFixed(4)} mm`}
            />
            <Stat
              label="Peso totale"
              value={`${dec1Format.format(result.totalWeightKg)} kg`}
              sub={`${result.cabinetsTotal} × ${dec1Format.format(wall.weightKgPerCabinet)} kg`}
            />
            <Stat
              label="Consumo medio"
              value={`${dec2Format.format(result.powerAvgW / 1000)} kW`}
              sub={`${dec1Format.format(result.currentAvgA)} A @ ${MAINS_VOLTAGE_V} V`}
            />
            <Stat
              label="Pixel totali"
              value={`${dec2Format.format(result.megapixels)} Mpx`}
              sub={`${intFormat.format(result.totalPixels)} px`}
            />
            <Stat
              label="Distanza visione"
              value={`${dec1Format.format(result.viewingDistanceMinM)} m`}
              sub={`${dec1Format.format(result.viewingDistanceMinFt)} ft`}
            />
          </div>
        </Section>

        <CablingSection
          cabling={wall.cabling}
          cabinetsTotal={result.cabinetsTotal}
          pixelsPerCabinet={pixelsPerCabinet}
          onChange={(updates: Partial<CablingConfig>) =>
            onChange({ cabling: { ...wall.cabling, ...updates } })
          }
        />

        <TestCardSection wall={wall} projectName={projectName} />
      </div>
    </div>
  );
}
