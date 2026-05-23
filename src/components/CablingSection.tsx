import { useMemo } from "react";
import { Section } from "./Section";
import { Stat } from "./Stat";
import { NumberField } from "./NumberField";
import { SegmentedToggle } from "./SegmentedToggle";
import { PatternIcon } from "./PatternIcon";
import {
  CABLING_PATTERN_LABELS,
  LINEAR_PATTERNS,
  NOVASTAR_SENDERS,
  START_CORNER_LABELS,
  computePortBudget,
  findSender,
  isLinearPattern,
  type CablingConfig,
  type CablingPattern,
  type StartCorner,
} from "../lib/cabling";

interface Props {
  cabling: CablingConfig;
  cabinetsTotal: number;
  pixelsPerCabinet: number;
  onChange: (updates: Partial<CablingConfig>) => void;
}

const intFormat = new Intl.NumberFormat("it-IT");
const pctFormat = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 1,
});

const PATTERNS: CablingPattern[] = ["HS", "HZ", "VS", "VZ"];
const CORNERS: StartCorner[] = ["TL", "TR", "BL", "BR"];

/** Corner forzato per ciascun pattern linear (la direzione è esplicita). */
const LINEAR_FIXED_CORNER: Record<string, StartCorner> = {
  HL: "TL",
  HR: "TR",
  VT: "TL",
  VB: "BL",
};

export function CablingSection({
  cabling,
  cabinetsTotal,
  pixelsPerCabinet,
  onChange,
}: Props) {
  const budget = useMemo(
    () => computePortBudget(cabling, cabinetsTotal, pixelsPerCabinet),
    [cabling, cabinetsTotal, pixelsPerCabinet]
  );

  const sender = findSender(cabling.senderKey);
  const isCustomSender = cabling.senderKey === "custom" || !sender;

  return (
    <Section
      title="Cablaggio"
      description="Pattern serpentina Novastar + budget porte sender."
      action={
        <SegmentedToggle<"on" | "off">
          size="xs"
          ariaLabel="Mostra cablaggio nel preview"
          value={cabling.showInPreview ? "on" : "off"}
          onChange={(v) => onChange({ showInPreview: v === "on" })}
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "Show" },
          ]}
        />
      }
    >
      {/* Pattern picker */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Pattern ·{" "}
          {CABLING_PATTERN_LABELS[cabling.pattern]}
          {!isLinearPattern(cabling.pattern)
            ? ` · ${START_CORNER_LABELS[cabling.corner]}`
            : ""}
        </div>

        {/* Serpentine/Raster (HS/HZ/VS/VZ × 4 corner = 16) */}
        <div className="grid grid-cols-8 gap-1">
          {PATTERNS.flatMap((pattern) =>
            CORNERS.map((corner) => {
              const active =
                cabling.pattern === pattern && cabling.corner === corner;
              return (
                <button
                  key={`${pattern}-${corner}`}
                  type="button"
                  onClick={() => onChange({ pattern, corner })}
                  aria-label={`${CABLING_PATTERN_LABELS[pattern]} da ${START_CORNER_LABELS[corner]}`}
                  title={`${CABLING_PATTERN_LABELS[pattern]} · ${START_CORNER_LABELS[corner]}`}
                  className={[
                    "grid h-9 place-items-center rounded-md border transition",
                    active
                      ? "border-brand bg-brand/15 text-brand-bright"
                      : "border-border bg-panel-2 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                  ].join(" ")}
                >
                  <PatternIcon pattern={pattern} corner={corner} size={22} />
                </button>
              );
            })
          )}
        </div>

        {/* Linear esplicitamente direzionali (HL/HR/VT/VB, no corner) */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
            Linear
          </span>
          <div className="grid flex-1 grid-cols-4 gap-1">
            {LINEAR_PATTERNS.map((pattern) => {
              const fixedCorner = LINEAR_FIXED_CORNER[pattern];
              const active = cabling.pattern === pattern;
              return (
                <button
                  key={pattern}
                  type="button"
                  onClick={() =>
                    onChange({ pattern, corner: fixedCorner })
                  }
                  aria-label={CABLING_PATTERN_LABELS[pattern]}
                  title={CABLING_PATTERN_LABELS[pattern]}
                  className={[
                    "grid h-9 place-items-center rounded-md border transition",
                    active
                      ? "border-brand bg-brand/15 text-brand-bright"
                      : "border-border bg-panel-2 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                  ].join(" ")}
                >
                  <PatternIcon
                    pattern={pattern}
                    corner={fixedCorner}
                    size={22}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sender card preset */}
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
            Sender card Novastar
          </span>
          <select
            value={cabling.senderKey}
            onChange={(e) => onChange({ senderKey: e.target.value })}
            className="h-12 w-full appearance-none rounded-xl border border-border bg-panel-2 px-3 font-mono text-sm text-slate-100 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {NOVASTAR_SENDERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.name} — {intFormat.format(s.maxPixelsPerPort)} px/porta × {s.portsPerCard}
              </option>
            ))}
            <option value="custom">Custom…</option>
          </select>
        </label>
        {isCustomSender ? (
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Max px / porta"
              suffix="px"
              step={50000}
              value={cabling.customMaxPixelsPerPort}
              onChange={(v) => onChange({ customMaxPixelsPerPort: v })}
            />
            <NumberField
              label="Porte / scheda"
              suffix=""
              step={1}
              value={cabling.customPortsPerCard}
              onChange={(v) => onChange({ customPortsPerCard: v })}
            />
          </div>
        ) : sender?.notes ? (
          <p className="text-[11px] text-slate-500">{sender.notes}</p>
        ) : null}
      </div>

      {/* Override carico per porta — load balance */}
      {!budget.oversized && budget.maxCabinetsPerPort > 1 ? (
        <div className="space-y-2 rounded-lg border border-border bg-panel-2/40 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
                Cab / porta — load balance
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500">
                {budget.isOverridden
                  ? `Override attivo · ${budget.cabinetsPerPort} di max ${budget.maxCabinetsPerPort}`
                  : `Auto · usa il max teorico ${budget.maxCabinetsPerPort}`}
              </p>
            </div>
            {budget.isOverridden ? (
              <button
                type="button"
                onClick={() => onChange({ customCabinetsPerPort: 0 })}
                className="rounded-md border border-border bg-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-brand hover:text-brand"
              >
                Auto
              </button>
            ) : null}
          </div>
          <NumberField
            label={`Override (max ${budget.maxCabinetsPerPort})`}
            suffix="cab"
            step={1}
            min={0}
            value={cabling.customCabinetsPerPort}
            onChange={(v) =>
              onChange({
                customCabinetsPerPort: Math.max(
                  0,
                  Math.min(budget.maxCabinetsPerPort, Math.round(v))
                ),
              })
            }
          />
        </div>
      ) : null}

      {/* Budget stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <Stat
          label="Cabinets / porta"
          value={
            budget.oversized
              ? "—"
              : `${budget.cabinetsPerPort}`
          }
          sub={
            budget.oversized
              ? "cabinet oversized"
              : budget.isOverridden
              ? `${pctFormat.format(budget.portUtilization)} util · max ${budget.maxCabinetsPerPort}`
              : `${pctFormat.format(budget.portUtilization)} util.`
          }
          accent={
            budget.oversized
              ? "fill"
              : budget.isOverridden
              ? "fit"
              : undefined
          }
        />
        <Stat
          label="Porte necessarie"
          value={intFormat.format(budget.portsNeeded)}
          sub={`su ${intFormat.format(budget.sender.portsPerCard)} per scheda`}
          accent="brand"
        />
        <Stat
          label="Sender card"
          value={intFormat.format(budget.sendersNeeded)}
          sub={`${budget.sender.name}`}
          accent="brand"
          highlight
        />
        <Stat
          label="Pixel totali"
          value={`${intFormat.format(budget.totalPixels)}`}
          sub={`${intFormat.format(budget.pixelsPerCabinet)} px / cab`}
        />
      </div>

      {budget.oversized ? (
        <div className="rounded-lg border border-fill/40 bg-fill/10 p-3 text-xs text-fill-bright">
          ⚠ Un singolo cabinet ({intFormat.format(budget.pixelsPerCabinet)} px) eccede il
          limite di {intFormat.format(budget.sender.maxPixelsPerPort)} px / porta.
          Servirà più di una porta per cabinet — verifica la scheda tecnica del
          receiver card o cambia sender.
        </div>
      ) : null}

      {/* Custom origins per segmento — click su preview per definire */}
      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
              Custom origins
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {cabling.customStarts.length === 0
                ? "Click sui cabinet nel preview per definire l'inizio di una porta."
                : `${cabling.customStarts.length} start manuali · split del cablaggio nei punti scelti.`}
            </p>
          </div>
          {cabling.customStarts.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange({ customStarts: [] })}
              className="rounded-md border border-border bg-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-fill hover:text-fill-bright"
            >
              Reset
            </button>
          ) : null}
        </div>
        {cabling.customStarts.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {[...cabling.customStarts]
              .sort((a, b) => a - b)
              .map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    onChange({
                      customStarts: cabling.customStarts.filter(
                        (x) => x !== n
                      ),
                    })
                  }
                  title={`Rimuovi start su cabinet #${n}`}
                  className="rounded-full border border-brand/40 bg-brand/10 px-2.5 py-0.5 font-mono text-[10px] font-semibold text-brand-bright transition hover:border-fill hover:bg-fill/10 hover:text-fill-bright"
                >
                  #{n}
                </button>
              ))}
          </div>
        ) : null}
      </div>
    </Section>
  );
}
