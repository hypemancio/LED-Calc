import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpLeft,
  ArrowUpRight,
  Crosshair,
  ImagePlus,
  Trash2,
} from "lucide-react";
import { Section } from "./Section";
import {
  DEFAULT_TEST_CARD_PARAMS,
  TEST_CARDS,
  exportTestCardPng,
  renderTestCardToCanvas,
  type LogoPosition,
  type TestCardParams,
  type TestCardType,
} from "../lib/testCards";
import { computeWallResult, type WallConfig } from "../lib/wall";

interface Props {
  wall: WallConfig;
  projectName?: string;
}

const intFormat = new Intl.NumberFormat("it-IT");

const PREVIEW_MAX_W = 800;
const PREVIEW_MAX_H = 360;

export function TestCardSection({ wall, projectName }: Props) {
  const [selected, setSelected] = useState<TestCardType>("bars");
  const [params, setParams] = useState<TestCardParams>(DEFAULT_TEST_CARD_PARAMS);
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const result = useMemo(() => computeWallResult(wall), [wall]);
  const W = result.resolutionWidthPx;
  const H = result.resolutionHeightPx;
  const selectedDef = TEST_CARDS.find((c) => c.key === selected);

  // Inietta projectName nei params (così l'overlay lo include)
  const effectiveParams: TestCardParams = useMemo(
    () => ({ ...params, projectName }),
    [params, projectName]
  );

  const previewSize = useMemo(() => {
    if (W <= 0 || H <= 0) return { width: PREVIEW_MAX_W, height: 300 };
    const aspect = W / H;
    let cw = PREVIEW_MAX_W;
    let ch = cw / aspect;
    if (ch > PREVIEW_MAX_H) {
      ch = PREVIEW_MAX_H;
      cw = ch * aspect;
    }
    return { width: Math.round(cw), height: Math.round(ch) };
  }, [W, H]);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.width = previewSize.width;
    canvasRef.current.height = previewSize.height;
    let cancelled = false;
    renderTestCardToCanvas(
      selected,
      wall,
      canvasRef.current,
      effectiveParams
    ).then(() => {
      if (cancelled) return; // canvas state già aggiornato dalla nuova render
    });
    return () => {
      cancelled = true;
    };
  }, [selected, wall, previewSize.width, previewSize.height, effectiveParams]);

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportTestCardPng(selected, wall, effectiveParams);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const groups = useMemo(
    () => ({
      calibration: TEST_CARDS.filter((c) => c.group === "calibration"),
      alignment: TEST_CARDS.filter((c) => c.group === "alignment"),
      solid: TEST_CARDS.filter((c) => c.group === "solid"),
    }),
    []
  );

  const renderChips = (list: typeof TEST_CARDS) => (
    <div className="flex flex-wrap gap-2">
      {list.map((card) => {
        const active = selected === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => setSelected(card.key)}
            title={card.description}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active
                ? "border-brand bg-brand/15 text-brand"
                : "border-border bg-panel-2 text-slate-300 hover:border-slate-600",
            ].join(" ")}
          >
            {card.label}
          </button>
        );
      })}
    </div>
  );

  return (
    <Section
      title="Test card"
      collapsible
      defaultOpen={false}
      description={
        selectedDef
          ? `${selectedDef.label} — ${selectedDef.description}`
          : "PNG alla risoluzione nativa del Ledwall per commissioning."
      }
    >
      <div className="space-y-3">
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Calibrazione
          </div>
          {renderChips(groups.calibration)}
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Allineamento
          </div>
          {renderChips(groups.alignment)}
        </div>
        <div className="space-y-1.5">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Solid colors
          </div>
          {renderChips(groups.solid)}
        </div>
      </div>

      {/* PARAMETRI */}
      <div className="space-y-3 rounded-lg border border-border bg-panel-2/40 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-300">
          Parametri
        </div>

        {/* Intensità slider */}
        <label className="block">
          <div className="mb-1 flex items-baseline justify-between">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Intensità
            </span>
            <span className="font-mono text-xs text-brand">
              {params.intensity}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={params.intensity}
            onChange={(e) =>
              setParams((p) => ({ ...p, intensity: Number(e.target.value) }))
            }
            className="h-2 w-full cursor-pointer appearance-none rounded-full bg-panel accent-brand"
          />
        </label>

        {/* Color picker — visibile solo se solid-custom selezionato */}
        {selected === "solid-custom" ? (
          <label className="block">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Custom color
              </span>
              <span className="font-mono text-xs uppercase text-brand">
                {params.customColor}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={params.customColor}
                onChange={(e) =>
                  setParams((p) => ({ ...p, customColor: e.target.value }))
                }
                className="h-9 w-12 cursor-pointer rounded border border-border bg-panel"
                aria-label="Scegli colore custom"
              />
              <input
                type="text"
                value={params.customColor}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  if (/^#[0-9a-fA-F]{6}$/.test(v) || v === "") {
                    setParams((p) => ({ ...p, customColor: v }));
                  }
                }}
                placeholder="#ff8000"
                className="h-9 flex-1 rounded border border-border bg-panel px-2 font-mono text-xs text-slate-100 outline-none focus:border-brand"
                maxLength={7}
              />
            </div>
          </label>
        ) : null}

        {/* Frecce serpentina — visibile solo per numbers */}
        {selected === "numbers" ? (
          <Toggle
            label="Frecce serpentina"
            description="Sovrappone il flusso del cablaggio fra cabinet consecutivi"
            value={params.numbersShowArrows}
            onChange={(v) => setParams((p) => ({ ...p, numbersShowArrows: v }))}
          />
        ) : null}

        {/* Overlay universali — applicabili sopra qualsiasi card */}
        <div className="space-y-2 border-t border-border pt-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Overlay
          </div>
          <Toggle
            label="Safe area"
            description="Rettangoli action safe (giallo, 5%) e title safe (ciano, 10%) — broadcast standard"
            value={params.showSafeArea}
            onChange={(v) => setParams((p) => ({ ...p, showSafeArea: v }))}
          />
          <Toggle
            label="Crosshair + diagonali"
            description="Croce centrale + diagonali da angolo ad angolo — allineamento mounting"
            value={params.showCrosshair}
            onChange={(v) => setParams((p) => ({ ...p, showCrosshair: v }))}
          />
          <Toggle
            label="Cabinet grid overlay"
            description="Bordi cabinet visibili sopra qualsiasi card (mint trasparente)"
            value={params.showCabinetGrid}
            onChange={(v) => setParams((p) => ({ ...p, showCabinetGrid: v }))}
          />
          <Toggle
            label="Corner labels TL/TR/BL/BR"
            description="Badge ai 4 angoli per identificare l'orientamento del Ledwall"
            value={params.showCornerLabels}
            onChange={(v) => setParams((p) => ({ ...p, showCornerLabels: v }))}
          />
          <Toggle
            label="Invert (negativo)"
            description="Inverte tutti i colori dell'output (utile per swap test colori)"
            value={params.invert}
            onChange={(v) => setParams((p) => ({ ...p, invert: v }))}
          />
        </div>

        {/* Project info overlay */}
        <Toggle
          label="Project info overlay"
          description="Sovrappone nome progetto, Ledwall, risoluzione e data in alto a destra"
          value={params.overlayProjectInfo}
          onChange={(v) =>
            setParams((p) => ({ ...p, overlayProjectInfo: v }))
          }
        />

        {/* Logo upload */}
        <LogoControl params={params} setParams={setParams} />
      </div>

      {/* PREVIEW CANVAS */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Anteprima
          </div>
          <div className="font-mono text-[10px] text-slate-500">
            export reale: {intFormat.format(W)} × {intFormat.format(H)} px
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-panel-2/40 p-2">
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "auto",
              display: "block",
              imageRendering: "pixelated",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={exporting || W <= 0 || H <= 0}
        className="w-full rounded-lg border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm font-semibold uppercase tracking-wider text-amber-200 transition hover:border-amber-400 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {exporting
          ? "Export…"
          : `Esporta PNG · ${intFormat.format(W)} × ${intFormat.format(H)} px`}
      </button>
      <p className="text-[10px] text-slate-500">
        L'immagine è generata 1:1 con la risoluzione del Ledwall, niente
        scaling. Trascinala nel media server (Resolume, MadMapper, Disguise,
        Watchout) come clip a piena risoluzione.
      </p>
    </Section>
  );
}

interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-brand"
      />
      <div className="flex-1">
        <div className="text-[11px] font-medium text-slate-200">{label}</div>
        {description ? (
          <div className="mt-0.5 text-[10px] leading-snug text-slate-500">
            {description}
          </div>
        ) : null}
      </div>
    </label>
  );
}

interface LogoControlProps {
  params: TestCardParams;
  setParams: React.Dispatch<React.SetStateAction<TestCardParams>>;
}

const LOGO_POSITIONS: Array<{
  key: LogoPosition;
  label: string;
  Icon: typeof ArrowUpLeft;
}> = [
  { key: "TL", label: "TL", Icon: ArrowUpLeft },
  { key: "TR", label: "TR", Icon: ArrowUpRight },
  { key: "CENTER", label: "C", Icon: Crosshair },
  { key: "BL", label: "BL", Icon: ArrowDownLeft },
  { key: "BR", label: "BR", Icon: ArrowDownRight },
];

const MAX_LOGO_FILE_BYTES = 2_500_000; // 2.5 MB

function LogoControl({ params, setParams }: LogoControlProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const onPick = () => fileRef.current?.click();

  const onFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      alert("Seleziona un file immagine (PNG, JPG, SVG, WebP).");
      return;
    }
    if (f.size > MAX_LOGO_FILE_BYTES) {
      alert(
        `Logo troppo grande (${(f.size / 1024 / 1024).toFixed(1)} MB). Max 2.5 MB.`
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setParams((p) => ({ ...p, logoDataUrl: dataUrl }));
    };
    reader.onerror = () => alert("Errore lettura file.");
    reader.readAsDataURL(f);
  };

  const removeLogo = () =>
    setParams((p) => ({ ...p, logoDataUrl: null }));

  return (
    <div className="space-y-2 border-t border-border pt-3">
      <div className="text-[11px] font-medium text-slate-200">Logo</div>
      {params.logoDataUrl ? (
        <>
          <div className="flex items-center gap-2">
            <img
              src={params.logoDataUrl}
              alt="Logo preview"
              className="h-12 max-w-28 rounded border border-border bg-panel object-contain p-1"
            />
            <button
              type="button"
              onClick={onPick}
              className="rounded-md border border-border bg-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-300 transition hover:border-brand hover:text-brand"
            >
              Cambia
            </button>
            <button
              type="button"
              onClick={removeLogo}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
            >
              <Trash2 size={11} aria-hidden /> Rimuovi
            </button>
          </div>

          {/* Position picker — 5 buttons */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
              Posizione
            </span>
            <div className="flex gap-1">
              {LOGO_POSITIONS.map((pos) => {
                const active = params.logoPosition === pos.key;
                const Icon = pos.Icon;
                return (
                  <button
                    key={pos.key}
                    type="button"
                    onClick={() =>
                      setParams((p) => ({ ...p, logoPosition: pos.key }))
                    }
                    aria-label={pos.key}
                    title={pos.key}
                    className={[
                      "grid h-7 w-7 place-items-center rounded-md border transition",
                      active
                        ? "border-brand bg-brand/15 text-brand"
                        : "border-border bg-panel text-slate-400 hover:border-slate-500 hover:text-slate-200",
                    ].join(" ")}
                  >
                    <Icon size={14} aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size slider */}
          <label className="block">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Dimensione
              </span>
              <span className="font-mono text-xs text-brand">
                {params.logoSizePct}%
              </span>
            </div>
            <input
              type="range"
              min={3}
              max={60}
              step={1}
              value={params.logoSizePct}
              onChange={(e) =>
                setParams((p) => ({ ...p, logoSizePct: Number(e.target.value) }))
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-panel accent-brand"
            />
          </label>

          {/* Opacity slider */}
          <label className="block">
            <div className="mb-1 flex items-baseline justify-between">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
                Opacità
              </span>
              <span className="font-mono text-xs text-brand">
                {params.logoOpacity}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={params.logoOpacity}
              onChange={(e) =>
                setParams((p) => ({
                  ...p,
                  logoOpacity: Number(e.target.value),
                }))
              }
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-panel accent-brand"
            />
          </label>
        </>
      ) : (
        <button
          type="button"
          onClick={onPick}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-panel/50 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400 transition hover:border-brand hover:text-brand"
        >
          <ImagePlus size={14} aria-hidden /> Carica logo
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
        onChange={onFile}
        className="hidden"
        aria-hidden
      />
      <p className="text-[10px] leading-snug text-slate-500">
        PNG/JPG/SVG/WebP fino a 2.5 MB. Il logo viene scalato proporzionalmente
        alla larghezza del Ledwall (3-60%) e sovrapposto al test card.
      </p>
    </div>
  );
}
