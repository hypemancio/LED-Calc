import {
  getCablingOrder,
  isLinearPattern,
  type CablingPattern,
  type StartCorner,
} from "../lib/cabling";

interface Props {
  pattern: CablingPattern;
  corner: StartCorner;
  size?: number;
  /** Numero di celle della griglia visualizzata (3 = griglia 3×3). */
  cells?: number;
}

/**
 * Icona SVG che illustra un pattern di cablaggio su griglia mini cells×cells.
 *
 * Pattern HS/HZ/VS/VZ: polyline CONTINUA che attraversa tutti i cabinet —
 *   l'eventuale diagonale di "ritorno carrello" mostra direzione del pattern
 *   (utile per distinguere TL/TR/BL/BR fra loro).
 *
 * Pattern HL/HR/VT/VB (linear): polyline SPEZZATA ai cambi di riga/colonna —
 *   visualizza chiaramente "frecce parallele tutte nella stessa direzione".
 */
export function PatternIcon({
  pattern,
  corner,
  size = 32,
  cells = 3,
}: Props) {
  const order = getCablingOrder(cells, cells, pattern, corner);
  const N = cells * cells;
  const points: Array<{ x: number; y: number; row: number; col: number }> = [];
  for (let n = 1; n <= N; n++) {
    outer: for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (order[r][c] === n) {
          points.push({
            x: ((c + 0.5) / cells) * size,
            y: ((r + 0.5) / cells) * size,
            row: r,
            col: c,
          });
          break outer;
        }
      }
    }
  }

  // Per pattern linear, spezza la polyline ad ogni cambio di riga/colonna
  const linear = isLinearPattern(pattern);
  const isJump = (
    prev: typeof points[number],
    curr: typeof points[number]
  ) => {
    if (!linear) return false;
    if (pattern === "HL" || pattern === "HR") return prev.row !== curr.row;
    return prev.col !== curr.col;
  };

  const path = points
    .map((p, i) => {
      const cmd = i === 0 ? "M" : isJump(points[i - 1], p) ? "M" : "L";
      return `${cmd}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    })
    .join(" ");

  // Griglia di sfondo
  const gridLines: JSX.Element[] = [];
  for (let i = 1; i < cells; i++) {
    const v = (i / cells) * size;
    gridLines.push(
      <line key={`v${i}`} x1={v} y1={0} x2={v} y2={size} stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    );
    gridLines.push(
      <line key={`h${i}`} x1={0} y1={v} x2={size} y2={v} stroke="currentColor" strokeWidth="0.5" opacity="0.25" />
    );
  }

  // Start dots: solo primo per non-linear, uno per segmento linear
  const startDots: Array<{ x: number; y: number }> = [];
  if (points[0]) startDots.push(points[0]);
  if (linear) {
    for (let i = 1; i < points.length; i++) {
      if (isJump(points[i - 1], points[i])) startDots.push(points[i]);
    }
  }

  // End arrows: ultimo per non-linear, uno per segmento linear
  const endPairs: Array<{ from: { x: number; y: number }; to: { x: number; y: number } }> = [];
  if (linear) {
    for (let i = 0; i < points.length - 1; i++) {
      if (isJump(points[i], points[i + 1]) && i >= 1) {
        endPairs.push({ from: points[i - 1], to: points[i] });
      }
    }
  }
  if (points.length >= 2) {
    endPairs.push({
      from: points[points.length - 2],
      to: points[points.length - 1],
    });
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect width={size} height={size} rx={size * 0.12} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
      {gridLines}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {startDots.map((p, i) => (
        <circle key={`s${i}`} cx={p.x} cy={p.y} r={size * 0.07} fill="currentColor" />
      ))}
      {endPairs.map((pair, i) => (
        <ArrowHead key={`a${i}`} from={pair.from} to={pair.to} size={size * 0.18} />
      ))}
    </svg>
  );
}

function ArrowHead({
  from,
  to,
  size,
}: {
  from: { x: number; y: number };
  to: { x: number; y: number };
  size: number;
}) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const tipX = to.x;
  const tipY = to.y;
  const baseX = to.x - ux * size;
  const baseY = to.y - uy * size;
  const leftX = baseX + px * size * 0.5;
  const leftY = baseY + py * size * 0.5;
  const rightX = baseX - px * size * 0.5;
  const rightY = baseY - py * size * 0.5;
  return (
    <polygon
      points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
      fill="currentColor"
    />
  );
}
