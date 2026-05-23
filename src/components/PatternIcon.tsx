import { getCablingOrder, type CablingPattern, type StartCorner } from "../lib/cabling";

interface Props {
  pattern: CablingPattern;
  corner: StartCorner;
  size?: number;
  /** Numero di celle della griglia visualizzata (3 = griglia 3×3). */
  cells?: number;
}

/**
 * Icona SVG che illustra un pattern di cablaggio su una griglia mini cells×cells.
 * Disegna una polyline che collega i centri dei cabinet nell'ordine corretto.
 */
export function PatternIcon({
  pattern,
  corner,
  size = 32,
  cells = 3,
}: Props) {
  const order = getCablingOrder(cells, cells, pattern, corner);
  // Costruisco l'array di {row, col} ordinato 1..N
  const N = cells * cells;
  const points: Array<{ x: number; y: number }> = [];
  for (let n = 1; n <= N; n++) {
    outer: for (let r = 0; r < cells; r++) {
      for (let c = 0; c < cells; c++) {
        if (order[r][c] === n) {
          points.push({
            x: ((c + 0.5) / cells) * size,
            y: ((r + 0.5) / cells) * size,
          });
          break outer;
        }
      }
    }
  }
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
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

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <rect width={size} height={size} rx={size * 0.12} fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.35" />
      {gridLines}
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Punto di partenza */}
      {points[0] ? (
        <circle cx={points[0].x} cy={points[0].y} r={size * 0.07} fill="currentColor" />
      ) : null}
      {/* Freccia finale */}
      {points.length >= 2 ? (
        <ArrowHead
          from={points[points.length - 2]}
          to={points[points.length - 1]}
          size={size * 0.18}
        />
      ) : null}
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
  // Vettore perpendicolare
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
