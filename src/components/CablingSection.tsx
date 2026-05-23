import { useMemo } from "react";
import { Section } from "./Section";
import { Stat } from "./Stat";
import { NumberField } from "./NumberField";
import { SegmentedToggle } from "./SegmentedToggle";
import { PatternIcon } from "./PatternIcon";
import {
  CABLING_PATTERN_LABELS,
  NOVASTAR_SENDERS,
  START_CORNER_LABELS,
  computePortBudget,
  findSender,
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
      {/* Pattern picker — 4 pattern × 4 corner = 16 icone */}
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Pattern · {CABLING_PATTERN_LABELS[cabling.pattern]} ·{" "}
          {START_CORNER_LABELS[cabling.corner]}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
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
                    "grid place-items-center rounded-md border transition aspect-square",
                    active
                      ? "border-brand bg-brand/15 text-brand-bright"
                      : "border-border bg-panel-2 text-slate-400 hover:border-slate-500 hover:text-slate-200",
                  ].join(" ")}
                >
                  <PatternIcon pattern={pattern} corner={corner} size={32} />
                </button>
              );
            })
          )}
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
              : `${pctFormat.format(budget.portUtilization)} util.`
          }
          accent={budget.oversized ? "fill" : undefined}
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
    </Section>
  );
}
