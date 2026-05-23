import { useEffect, useRef, useState } from "react";
import { computeFill, computeFit } from "../lib/ledMath";
import type { CablingPattern, StartCorner } from "../lib/cabling";
import { getCablingOrder } from "../lib/cabling";

export type SourceMode = "none" | "fit" | "fill" | "total";

interface Props {
  cabinetsWide: number;
  cabinetsHigh: number;
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  requestedWallWidthMm: number;
  requestedWallHeightMm: number;
  sourceRatio: number;
  sourceMode: SourceMode;
  /** Risoluzione larghezza (pre-formatted, es. "2.304 px"). */
  resolutionWidthLabel: string;
  /** Risoluzione altezza (pre-formatted, es. "1.152 px"). */
  resolutionHeightLabel: string;
  /** Mostra overlay cablaggio (numerazione + polyline). */
  cablingShow?: boolean;
  cablingPattern?: CablingPattern;
  cablingCorner?: StartCorner;
  /** Numero di cabinet per porta del sender — se >0 la polyline globale
   *  viene spezzata in N segmenti automatici di questa lunghezza. */
  cablingSegmentSize?: number;
  /** Override manuale: indici globali (1-based) dove iniziare nuovi segmenti.
   *  Se non vuoto, ignora `cablingSegmentSize` e splitta nei punti scelti. */
  cablingCustomStarts?: number[];
  /** Callback quando l'utente clicca un cabinet (solo se cablingShow=true). */
  onCabinetClick?: (cabinetIndex: number) => void;
}

// Palette colori dell'anteprima (sincronizzata con tailwind.config.js)
const C = {
  wall: "127 254 209",   // brand mint #7ffed1 — LED wall fisico
  fit: "251 146 60",     // orange #fb923c — Fit (acid, contrasta col mint)
  fill: "217 70 239",    // magenta #d946ef — Fill
  warn: "251 191 36",    // amber #fbbf24 — Ledwall richiesto in overflow
  cabling: "163 255 223", // brand-light — overlay cablaggio (mint chiaro)
};

// CSS transitions per SVG attributes. Tutti i browser moderni (2020+)
// supportano animare x, y, width, height su rect e x1/y1/x2/y2 su line.
const T = "0.35s ease-out";
const TF = "0.25s ease-out";

const rectTransition: React.CSSProperties = {
  transition: `x ${T}, y ${T}, width ${T}, height ${T}, opacity ${TF}, stroke-width ${T}, stroke-dasharray ${T}, fill ${T}, stroke ${T}`,
};

const lineTransition: React.CSSProperties = {
  transition: `x1 ${T}, y1 ${T}, x2 ${T}, y2 ${T}, opacity ${TF}, stroke-width ${T}`,
};

const textTransition: React.CSSProperties = {
  transition: `x ${T}, y ${T}, font-size ${T}, letter-spacing ${T}, fill ${T}`,
};

// Numero massimo di linee di griglia pre-renderizzate per asse.
// Oltre questo (Ledwall enormi) le linee in eccesso non vengono mostrate.
// Le linee non-visibili hanno opacity 0 ma restano nel DOM così possono
// animare in entrata smoothly quando il count cresce.
const MAX_GRID_LINES = 40;

/** Hook leggero per matchMedia con cleanup. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);
  return matches;
}

/**
 * Hook: interpola il viewBox via requestAnimationFrame.
 * SVG's viewBox è un attributo non animabile via CSS — quindi usiamo JS.
 */
function useAnimatedViewBox(
  targetX: number,
  targetY: number,
  targetW: number,
  targetH: number,
  duration = 350
): [number, number, number, number] {
  const [current, setCurrent] = useState<
    [number, number, number, number]
  >([targetX, targetY, targetW, targetH]);
  const currentRef = useRef(current);
  currentRef.current = current;
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = currentRef.current;
    const target: [number, number, number, number] = [
      targetX,
      targetY,
      targetW,
      targetH,
    ];
    // Skip se siamo già al target (evita render inutili al mount)
    if (
      Math.abs(from[0] - target[0]) < 0.01 &&
      Math.abs(from[1] - target[1]) < 0.01 &&
      Math.abs(from[2] - target[2]) < 0.01 &&
      Math.abs(from[3] - target[3]) < 0.01
    ) {
      return;
    }
    const startTime = performance.now();
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setCurrent([
        from[0] + (target[0] - from[0]) * eased,
        from[1] + (target[1] - from[1]) * eased,
        from[2] + (target[2] - from[2]) * eased,
        from[3] + (target[3] - from[3]) * eased,
      ]);
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [targetX, targetY, targetW, targetH, duration]);

  return current;
}

export function CabinetPreview({
  cabinetsWide,
  cabinetsHigh,
  cabinetWidthMm,
  cabinetHeightMm,
  requestedWallWidthMm,
  requestedWallHeightMm,
  sourceRatio,
  sourceMode,
  resolutionWidthLabel,
  resolutionHeightLabel,
  cablingShow = false,
  cablingPattern = "HS",
  cablingCorner = "TL",
  cablingSegmentSize,
  cablingCustomStarts,
  onCabinetClick,
}: Props) {
  // Compute target values (instant, then animati separatamente)
  const safe =
    cabinetsWide > 0 &&
    cabinetsHigh > 0 &&
    cabinetWidthMm > 0 &&
    cabinetHeightMm > 0;

  // Calcoli sempre (anche se non safe — diamo zeri puliti)
  const wallW = safe ? cabinetsWide * cabinetWidthMm : 1000;
  const wallH = safe ? cabinetsHigh * cabinetHeightMm : 500;

  const fit = sourceRatio > 0 ? computeFit(wallW, wallH, sourceRatio) : null;
  const fill = sourceRatio > 0 ? computeFill(wallW, wallH, sourceRatio) : null;

  const showRequested =
    safe &&
    requestedWallWidthMm > 0 &&
    requestedWallHeightMm > 0 &&
    (requestedWallWidthMm < wallW - 0.0001 ||
      requestedWallHeightMm < wallH - 0.0001);

  // Overhang considerato SOLO quando stiamo visualizzando il Fill —
  // così in Fit/None il viewBox si adatta al solo Ledwall (nessuno spazio
  // sprecato). Il viewBox si espande/contrae con animazione durante il
  // toggle Fit ↔ Fill grazie al useAnimatedViewBox.
  const fillOverhangX = fill
    ? Math.max(0, (fill.sourceWidthPx - wallW) / 2)
    : 0;
  const fillOverhangY = fill
    ? Math.max(0, (fill.sourceHeightPx - wallH) / 2)
    : 0;
  // Total e Fill mostrano entrambi il rettangolo Fill (che può eccedere
  // il Ledwall) → estendiamo viewBox per non clippare l'outline.
  const showFillOverhang = sourceMode === "fill" || sourceMode === "total";
  const overhangX = showFillOverhang ? fillOverhangX : 0;
  const overhangY = showFillOverhang ? fillOverhangY : 0;
  // Padding proporzionale al "base" del viewBox (Ledwall + overhang), per
  // ospitare le label esterne (width sopra · height a sinistra ruotata).
  const baseMax = Math.max(wallW + 2 * overhangX, wallH + 2 * overhangY);
  const padding = baseMax * 0.06;
  const targetVbX = -overhangX - padding;
  const targetVbY = -overhangY - padding;
  const targetVbW = wallW + 2 * overhangX + 2 * padding;
  const targetVbH = wallH + 2 * overhangY + 2 * padding;

  // Anima il viewBox via JS rAF (CSS non supporta animare viewBox)
  const [vbX, vbY, vbW, vbH] = useAnimatedViewBox(
    targetVbX,
    targetVbY,
    targetVbW,
    targetVbH
  );

  if (!safe) {
    return (
      <div className="grid h-48 place-items-center rounded-xl border border-dashed border-border bg-panel-2/60 text-sm text-slate-500">
        Inserisci dimensioni valide
      </div>
    );
  }

  // Stroke e font-size derivati dal viewBox animato → si animano anche loro
  const stroke = Math.max(vbW, vbH) * 0.0018;
  const gridStroke = stroke * 0.4;
  const overlayStroke = stroke * 0.7;
  // Font label: scala col viewBox, ma più grande sotto lg (canvas più stretto
  // su mobile/tablet → SVG renderizzato più piccolo → testo a parità di
  // ratio sarebbe illeggibile).
  const isCompact = useMediaQuery("(max-width: 1023.98px)");
  const labelFontSize = Math.max(vbW, vbH) * (isCompact ? 0.018 : 0.012);
  const labelOffset = labelFontSize * 0.6; // distanza dalla cornice Ledwall

  // Pre-render MAX_GRID_LINES per asse, opacity decide visibilità
  const vLines = [];
  for (let i = 1; i <= MAX_GRID_LINES; i++) {
    const x = i * cabinetWidthMm;
    const visible = i < cabinetsWide;
    vLines.push(
      <line
        key={`v${i}`}
        x1={x}
        y1={0}
        x2={x}
        y2={wallH}
        style={{ ...lineTransition, opacity: visible ? 1 : 0 }}
      />
    );
  }
  const hLines = [];
  for (let i = 1; i <= MAX_GRID_LINES; i++) {
    const y = i * cabinetHeightMm;
    const visible = i < cabinetsHigh;
    hLines.push(
      <line
        key={`h${i}`}
        x1={0}
        y1={y}
        x2={wallW}
        y2={y}
        style={{ ...lineTransition, opacity: visible ? 1 : 0 }}
      />
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-panel-2/40 p-3"
      style={{ aspectRatio: "16 / 9" }}
    >
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        role="img"
        aria-label={`Anteprima griglia ${cabinetsWide} per ${cabinetsHigh} cabinet · ${resolutionWidthLabel} × ${resolutionHeightLabel}`}
      >
        {/* Sfondo Ledwall reale */}
        <rect
          x={0}
          y={0}
          width={wallW}
          height={wallH}
          fill={`rgb(${C.wall} / 0.05)`}
          stroke={`rgb(${C.wall} / 0.7)`}
          strokeWidth={stroke}
          style={rectTransition}
        />

        {/* Griglia cabinet — affinata, pre-renderizzata con opacity */}
        <g
          stroke={`rgb(${C.wall} / 0.4)`}
          strokeWidth={gridStroke}
          shapeRendering="crispEdges"
          style={{ transition: `stroke-width ${T}` }}
        >
          {vLines}
          {hLines}
        </g>

        {/* Fit overlay */}
        {fit ? (
          <rect
            x={fit.letterboxXPx}
            y={fit.letterboxYPx}
            width={fit.widthPx}
            height={fit.heightPx}
            fill={`rgb(${C.fit} / 0.08)`}
            stroke={`rgb(${C.fit} / 0.95)`}
            strokeWidth={overlayStroke}
            style={{
              ...rectTransition,
              opacity:
                sourceMode === "fit" || sourceMode === "total" ? 1 : 0,
            }}
          />
        ) : null}

        {/* Fill overlay (3 layer: tinta clip + tinta esterna tenue + outline) */}
        {fill ? (
          <>
            <defs>
              <clipPath id="wallClip">
                <rect x={0} y={0} width={wallW} height={wallH} />
              </clipPath>
            </defs>
            <rect
              x={(wallW - fill.sourceWidthPx) / 2}
              y={(wallH - fill.sourceHeightPx) / 2}
              width={fill.sourceWidthPx}
              height={fill.sourceHeightPx}
              fill={`rgb(${C.fill} / 0.08)`}
              clipPath="url(#wallClip)"
              style={{
                ...rectTransition,
                opacity:
                  sourceMode === "fill" || sourceMode === "total" ? 1 : 0,
              }}
            />
            <rect
              x={(wallW - fill.sourceWidthPx) / 2}
              y={(wallH - fill.sourceHeightPx) / 2}
              width={fill.sourceWidthPx}
              height={fill.sourceHeightPx}
              fill={`rgb(${C.fill} / 0.03)`}
              style={{
                ...rectTransition,
                opacity:
                  sourceMode === "fill" || sourceMode === "total" ? 1 : 0,
              }}
            />
            <rect
              x={(wallW - fill.sourceWidthPx) / 2}
              y={(wallH - fill.sourceHeightPx) / 2}
              width={fill.sourceWidthPx}
              height={fill.sourceHeightPx}
              fill="none"
              stroke={`rgb(${C.fill} / 0.95)`}
              strokeWidth={overlayStroke}
              strokeDasharray={`${overlayStroke * 5} ${overlayStroke * 4}`}
              style={{
                ...rectTransition,
                opacity:
                  sourceMode === "fill" || sourceMode === "total" ? 1 : 0,
              }}
            />
          </>
        ) : null}

        {/* Riquadro tratteggiato del Ledwall richiesto (overflow) */}
        <rect
          x={0}
          y={0}
          width={requestedWallWidthMm > 0 ? requestedWallWidthMm : wallW}
          height={requestedWallHeightMm > 0 ? requestedWallHeightMm : wallH}
          fill="none"
          stroke={`rgb(${C.warn} / 0.95)`}
          strokeWidth={stroke * 1.4}
          strokeDasharray={`${stroke * 6} ${stroke * 4}`}
          style={{ ...rectTransition, opacity: showRequested ? 1 : 0 }}
        />

        {/* Overlay cablaggio — segmenti polyline + numerazione */}
        {cablingShow && safe ? (
          <g style={{ transition: "opacity 0.3s ease-out", opacity: 1 }}>
            {(() => {
              const order = getCablingOrder(
                cabinetsWide,
                cabinetsHigh,
                cablingPattern,
                cablingCorner
              );
              const cw = cabinetWidthMm;
              const ch = cabinetHeightMm;
              const N = cabinetsWide * cabinetsHigh;
              const points: Array<{ x: number; y: number; n: number }> = [];
              for (let n = 1; n <= N; n++) {
                outer: for (let r = 0; r < cabinetsHigh; r++) {
                  for (let c = 0; c < cabinetsWide; c++) {
                    if (order[r][c] === n) {
                      points.push({
                        x: c * cw + cw / 2,
                        y: r * ch + ch / 2,
                        n,
                      });
                      break outer;
                    }
                  }
                }
              }

              // Split in segmenti: prima customStarts (override manuale),
              // altrimenti auto a cabinetsPerPort
              const segments: Array<typeof points> = [];
              const customs =
                cablingCustomStarts && cablingCustomStarts.length > 0
                  ? Array.from(new Set(cablingCustomStarts))
                      .filter((n) => n >= 1 && n <= points.length)
                      .sort((a, b) => a - b)
                  : null;
              if (customs && customs.length > 0) {
                // Aggiungi 1 (inizio) se non già presente
                const breakpoints = [
                  ...(customs[0] === 1 ? customs : [1, ...customs]),
                  points.length + 1, // sentinella
                ];
                for (let i = 0; i < breakpoints.length - 1; i++) {
                  const from = breakpoints[i];
                  const to = breakpoints[i + 1] - 1;
                  segments.push(points.slice(from - 1, to));
                }
              } else {
                const segSize =
                  cablingSegmentSize && cablingSegmentSize > 0
                    ? cablingSegmentSize
                    : points.length;
                for (let i = 0; i < points.length; i += segSize) {
                  segments.push(points.slice(i, i + segSize));
                }
              }

              // Stile cablaggio — sottile, semi-trasparente, tratteggio leggero
              const cablingStroke = stroke * 0.8;
              const cabFontSize = Math.min(cw, ch) * 0.22;
              const dash = `${cablingStroke * 5} ${cablingStroke * 3}`;
              // Cerchio start: appena più grande del numero per contenerlo
              const startCircleR = Math.min(cw, ch) * 0.22;
              // Indici dei cabinet che sono "start" di un segmento
              const startIndices = new Set<number>(
                segments.map((s) => s[0]?.n).filter((n): n is number => !!n)
              );

              return (
                <>
                  {/* Polylines per ogni segmento */}
                  {segments.map((seg, segIdx) => {
                    if (seg.length === 0) return null;
                    const d = seg
                      .map(
                        (p, i) =>
                          `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`
                      )
                      .join(" ");
                    const first = seg[0];
                    const last = seg[seg.length - 1];
                    return (
                      <g key={`seg-${segIdx}`}>
                        {/* Percorso tratteggiato */}
                        <path
                          d={d}
                          fill="none"
                          stroke={`rgb(${C.cabling} / 0.55)`}
                          strokeWidth={cablingStroke}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={dash}
                          style={{ transition: "d 0.3s ease-out" }}
                        />
                        {/* Cerchio START — abbastanza grande da contenere il numero */}
                        <circle
                          cx={first.x}
                          cy={first.y}
                          r={startCircleR}
                          fill={`rgb(${C.cabling} / 0.95)`}
                          style={{
                            transition:
                              "cx 0.35s ease-out, cy 0.35s ease-out, r 0.35s ease-out",
                          }}
                        />
                        {/* Freccia END (solo se segmento ha >=2 punti) */}
                        {seg.length >= 2
                          ? (() => {
                              const a = seg[seg.length - 2];
                              const b = last;
                              const dx = b.x - a.x;
                              const dy = b.y - a.y;
                              const len = Math.hypot(dx, dy) || 1;
                              const ux = dx / len;
                              const uy = dy / len;
                              const arrowSize = cablingStroke * 3.2;
                              const baseX = b.x - ux * arrowSize;
                              const baseY = b.y - uy * arrowSize;
                              const px = -uy;
                              const py = ux;
                              return (
                                <polygon
                                  points={`${b.x},${b.y} ${baseX + px * arrowSize * 0.5},${baseY + py * arrowSize * 0.5} ${baseX - px * arrowSize * 0.5},${baseY - py * arrowSize * 0.5}`}
                                  fill={`rgb(${C.cabling} / 0.95)`}
                                />
                              );
                            })()
                          : null}
                      </g>
                    );
                  })}
                  {/* Numeri sequenziali in ogni cabinet (globali 1..N) —
                      sui cabinet START il colore si inverte (scuro su mint
                      del cerchio sotto) per restare leggibile. */}
                  {points.map((p) => {
                    const isStart = startIndices.has(p.n);
                    return (
                      <text
                        key={`cab-${p.n}`}
                        x={p.x}
                        y={p.y + cabFontSize * 0.35}
                        textAnchor="middle"
                        fill={isStart ? "#0a0b0c" : `rgb(${C.cabling} / 0.85)`}
                        fontFamily="'JetBrains Mono', ui-monospace, monospace"
                        fontSize={cabFontSize}
                        fontWeight={isStart ? 700 : 600}
                        pointerEvents="none"
                        style={{ transition: "fill 0.25s ease-out" }}
                      >
                        {p.n}
                      </text>
                    );
                  })}
                  {/* Hit areas cliccabili per ogni cabinet — sopra tutto */}
                  {onCabinetClick
                    ? points.map((p) => (
                        <rect
                          key={`hit-${p.n}`}
                          x={p.x - cw / 2}
                          y={p.y - ch / 2}
                          width={cw}
                          height={ch}
                          fill="transparent"
                          style={{ cursor: "pointer" }}
                          onClick={() => onCabinetClick(p.n)}
                        >
                          <title>
                            Cabinet #{p.n} · click per aggiungere/togliere come start di segmento
                          </title>
                        </rect>
                      ))
                    : null}
                </>
              );
            })()}
          </g>
        ) : null}

        {/* Label risoluzione — larghezza SOTTO, altezza ruotata a DESTRA */}
        <text
          x={wallW / 2}
          y={wallH + labelOffset + labelFontSize * 0.85}
          textAnchor="middle"
          fill={`rgb(${C.wall} / 0.95)`}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize={labelFontSize}
          fontWeight={700}
          style={{
            ...textTransition,
            letterSpacing: `${labelFontSize * 0.04}px`,
          }}
        >
          {resolutionWidthLabel}
        </text>
        <text
          x={wallW + labelOffset}
          y={wallH / 2}
          textAnchor="middle"
          fill={`rgb(${C.wall} / 0.95)`}
          fontFamily="'JetBrains Mono', ui-monospace, monospace"
          fontSize={labelFontSize}
          fontWeight={700}
          transform={`rotate(90, ${wallW + labelOffset}, ${wallH / 2})`}
          style={{
            ...textTransition,
            letterSpacing: `${labelFontSize * 0.04}px`,
          }}
        >
          {resolutionHeightLabel}
        </text>
      </svg>
    </div>
  );
}
