/**
 * Export PNG della scheda progetto.
 *
 * Strategia: costruisco un SVG monolitico con tutto il contenuto (header,
 * totali, dettaglio walls con preview), poi lo converto a PNG via canvas
 * 2D + Image() — niente dipendenze esterne.
 *
 * Font: uso generic family (sans-serif / monospace) perché Chakra Petch e
 * JetBrains Mono caricati via Google Fonts non sono garantiti disponibili
 * quando si serializza SVG → Image. Helvetica/Arial e Menlo/Consolas
 * comuni sui sistemi rendono il PNG abbastanza vicino allo stile UI.
 */

import {
  computeProjectTotals,
  computeWallResult,
  getPitchMm,
  type Project,
  type WallConfig,
} from "./wall";
import { MAINS_VOLTAGE_V, type LedWallResult } from "./ledMath";

const intFormat = new Intl.NumberFormat("it-IT");
const dec1Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const dec2Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });
const dateFormat = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

// Palette (RGB sincronizzata con tailwind / CabinetPreview)
const C = {
  bg: "#161719",
  panel: "#1c1d20",
  panel2: "#232427",
  border: "#2a2c30",
  text: "#f1f5f9",
  textDim: "#94a3b8",
  textFaint: "#64748b",
  brand: "#7ffed1",
  brandDim: "#5fc9a4",
  brandBright: "#d4fff0",
  brandRgb: "127 254 209",
  warn: "#fbbf24",
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function exportProjectPng(project: Project): Promise<void> {
  const { svg, width, height } = buildProjectSvg(project);
  const pngBlob = await svgToPngBlob(svg, width, height, 2);
  triggerDownload(pngBlob, buildFilename(project, "png"));
}

/** Renderizza un SVG arbitrario in un Blob PNG via canvas 2D. Scale = 2 → retina. */
export async function svgToPngBlob(
  svg: string,
  width: number,
  height: number,
  scale = 2
): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const svgUrl = URL.createObjectURL(svgBlob);
  try {
    const img = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context not available");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Fill bg (in caso l'SVG abbia trasparenze)
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, width * scale, height * scale);
    return await canvasToBlob(canvas);
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

// ---------------------------------------------------------------------------
// SVG builder
// ---------------------------------------------------------------------------

export function buildProjectSvg(project: Project): {
  svg: string;
  width: number;
  height: number;
} {
  const W = 1600;
  const PAD = 48;

  const totals = computeProjectTotals(project.walls);
  const wallsData = project.walls.map((wall) => ({
    wall,
    result: computeWallResult(wall),
    pitchMm: getPitchMm(wall),
  }));

  // Layout dinamico
  const HEADER_H = 110;
  const TOTALS_H = 170;
  const CARD_H = 320;
  const CARDS_PER_ROW = project.walls.length === 1 ? 1 : 2;
  const cardRows = Math.ceil(project.walls.length / CARDS_PER_ROW);
  const CARDS_TOTAL_H = cardRows * CARD_H + (cardRows - 1) * 24;
  const FOOTER_H = 70;
  const SECTION_GAP = 32;

  const H =
    HEADER_H + SECTION_GAP + TOTALS_H + SECTION_GAP + CARDS_TOTAL_H + SECTION_GAP + FOOTER_H + 2 * PAD;

  // Build pieces
  let y = PAD;
  const headerSvg = renderHeader(PAD, y, W - 2 * PAD, HEADER_H, project);
  y += HEADER_H + SECTION_GAP;
  const totalsSvg = renderTotals(PAD, y, W - 2 * PAD, TOTALS_H, totals);
  y += TOTALS_H + SECTION_GAP;
  const cardsSvg = renderWallCards(
    PAD,
    y,
    W - 2 * PAD,
    CARD_H,
    CARDS_PER_ROW,
    wallsData
  );
  y += CARDS_TOTAL_H + SECTION_GAP;
  const footerSvg = renderFooter(PAD, y, W - 2 * PAD, FOOTER_H);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  ${headerSvg}
  ${totalsSvg}
  ${cardsSvg}
  ${footerSvg}
</svg>`;

  return { svg, width: W, height: H };
}

// ---------------------------------------------------------------------------
// Sezioni
// ---------------------------------------------------------------------------

function renderHeader(x: number, y: number, w: number, h: number, project: Project): string {
  const totals = computeProjectTotals(project.walls);
  const today = dateFormat.format(new Date());

  // Logo box (sinistra)
  const logoSize = 72;
  const logo = renderLogo(x, y + (h - logoSize) / 2, logoSize);

  // Title block
  const titleX = x + logoSize + 24;
  const titleY = y + 30;

  // Right meta
  const rightX = x + w;
  const metaY = y + 22;

  return `
    <g>
      ${logo}
      <text x="${titleX}" y="${titleY}" fill="${C.text}" font-family="Helvetica, Arial, sans-serif" font-size="40" font-weight="700" letter-spacing="4">LED CALC</text>
      <text x="${titleX}" y="${titleY + 32}" fill="${C.brand}" font-family="Menlo, Consolas, monospace" font-size="20" font-weight="600" letter-spacing="2">${escapeXml(project.name || "Senza titolo")}</text>
      <text x="${titleX}" y="${titleY + 56}" fill="${C.textFaint}" font-family="Menlo, Consolas, monospace" font-size="14">${totals.wallsCount} LEDWALL · ${today.toUpperCase()}</text>

      <text x="${rightX}" y="${metaY}" fill="${C.textDim}" font-family="Menlo, Consolas, monospace" font-size="13" text-anchor="end" letter-spacing="2">PROJECT REPORT</text>
      <text x="${rightX}" y="${metaY + 22}" fill="${C.text}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700" text-anchor="end">${dec2Format.format(totals.megapixels)} Mpx · ${dec2Format.format(totals.powerPeakW / 1000)} kW</text>
      <text x="${rightX}" y="${metaY + 44}" fill="${C.textFaint}" font-family="Menlo, Consolas, monospace" font-size="13" text-anchor="end">${intFormat.format(totals.cabinetsTotal)} CABINETS · ${dec1Format.format(totals.totalWeightKg)} KG · ${dec2Format.format(totals.areaM2)} M²</text>

      <line x1="${x}" y1="${y + h + 4}" x2="${x + w}" y2="${y + h + 4}" stroke="${C.brand}" stroke-width="1" stroke-opacity="0.4"/>
    </g>`;
}

function renderTotals(x: number, y: number, w: number, h: number, totals: ReturnType<typeof computeProjectTotals>): string {
  const cells = [
    { label: "CABINET TOTALI", value: intFormat.format(totals.cabinetsTotal), sub: `${totals.wallsCount} Ledwall` },
    { label: "RISOLUZIONE", value: `${dec2Format.format(totals.megapixels)} Mpx`, sub: `${intFormat.format(totals.totalPixels)} px` },
    { label: "AREA", value: `${dec2Format.format(totals.areaM2)} m²`, sub: "superficie LED" },
    { label: "PESO", value: `${dec1Format.format(totals.totalWeightKg)} kg`, sub: `${dec2Format.format(totals.totalWeightKg / 1000)} t` },
    { label: "CONSUMO MEDIO", value: `${dec2Format.format(totals.powerAvgW / 1000)} kW`, sub: `${dec1Format.format(totals.powerAvgW / MAINS_VOLTAGE_V)} A` },
    { label: "CONSUMO PICCO", value: `${dec2Format.format(totals.powerPeakW / 1000)} kW`, sub: `${dec1Format.format(totals.powerPeakW / MAINS_VOLTAGE_V)} A @ ${MAINS_VOLTAGE_V} V` },
  ];

  const cellGap = 12;
  const cellW = (w - cellGap * (cells.length - 1)) / cells.length;
  const cellsXml = cells.map((cell, i) => {
    const cx = x + i * (cellW + cellGap);
    return `
      <rect x="${cx}" y="${y}" width="${cellW}" height="${h}" rx="14" fill="rgb(${C.brandRgb} / 0.06)" stroke="rgb(${C.brandRgb} / 0.3)" stroke-width="1"/>
      <text x="${cx + 18}" y="${y + 30}" fill="${C.textDim}" font-family="Menlo, Consolas, monospace" font-size="11" font-weight="600" letter-spacing="2">${cell.label}</text>
      <text x="${cx + 18}" y="${y + 78}" fill="${C.brandBright}" font-family="Menlo, Consolas, monospace" font-size="34" font-weight="700">${cell.value}</text>
      <text x="${cx + 18}" y="${y + 110}" fill="${C.textFaint}" font-family="Menlo, Consolas, monospace" font-size="13">${cell.sub}</text>
    `;
  }).join("\n");

  return `
    <g>
      <text x="${x}" y="${y - 10}" fill="${C.brand}" font-family="Menlo, Consolas, monospace" font-size="12" font-weight="700" letter-spacing="3">PROJECT TOTALS</text>
      ${cellsXml}
    </g>`;
}

function renderWallCards(
  x: number,
  y: number,
  w: number,
  cardH: number,
  perRow: number,
  walls: Array<{ wall: WallConfig; result: LedWallResult; pitchMm: number }>
): string {
  const gap = 24;
  const cardW = (w - gap * (perRow - 1)) / perRow;
  let svg = `<text x="${x}" y="${y - 10}" fill="${C.brand}" font-family="Menlo, Consolas, monospace" font-size="12" font-weight="700" letter-spacing="3">LEDWALL DETAIL</text>`;

  walls.forEach((data, idx) => {
    const col = idx % perRow;
    const row = Math.floor(idx / perRow);
    const cx = x + col * (cardW + gap);
    const cy = y + row * (cardH + 24);
    svg += renderWallCard(cx, cy, cardW, cardH, data, idx + 1);
  });
  return svg;
}

function renderWallCard(
  x: number,
  y: number,
  w: number,
  h: number,
  data: { wall: WallConfig; result: LedWallResult; pitchMm: number },
  index: number
): string {
  const { wall, result, pitchMm } = data;
  const innerPad = 20;

  // Card background
  let svg = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.panel}" stroke="${C.border}" stroke-width="1"/>`;

  // Title row
  svg += `
    <text x="${x + innerPad}" y="${y + 30}" fill="${C.textDim}" font-family="Menlo, Consolas, monospace" font-size="11" font-weight="600" letter-spacing="2">#${String(index).padStart(2, "0")}</text>
    <text x="${x + innerPad + 36}" y="${y + 30}" fill="${C.text}" font-family="Helvetica, Arial, sans-serif" font-size="22" font-weight="700">${escapeXml(wall.name)}</text>
  `;

  // Preview area (LEFT half)
  const previewX = x + innerPad;
  const previewY = y + 50;
  const previewW = (w - innerPad * 3) * 0.48;
  const previewH = h - 70;
  svg += renderWallPreview(previewX, previewY, previewW, previewH, result, wall);

  // Stats area (RIGHT half)
  const statsX = previewX + previewW + innerPad;
  const statsY = previewY;
  const statsW = w - innerPad * 2 - previewW - innerPad;
  svg += renderWallStats(statsX, statsY, statsW, previewH, result, wall, pitchMm);

  return svg;
}

function renderWallPreview(
  x: number,
  y: number,
  w: number,
  h: number,
  result: LedWallResult,
  wall: WallConfig
): string {
  const wallW = result.actualWallWidthMm;
  const wallH = result.actualWallHeightMm;
  if (wallW <= 0 || wallH <= 0) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.panel2}" stroke="${C.border}"/>`;
  }

  // Compute scale to fit wall into (w × h) keeping aspect, with padding
  const padding = 16;
  const innerW = w - padding * 2;
  const innerH = h - padding * 2;
  const scale = Math.min(innerW / wallW, innerH / wallH);
  const renderedW = wallW * scale;
  const renderedH = wallH * scale;
  const ox = x + (w - renderedW) / 2;
  const oy = y + (h - renderedH) / 2;

  // Cabinet grid lines
  let grid = "";
  for (let i = 1; i < result.cabinetsWide; i++) {
    const lx = ox + i * wall.cabinetWidthMm * scale;
    grid += `<line x1="${lx}" y1="${oy}" x2="${lx}" y2="${oy + renderedH}" stroke="rgb(${C.brandRgb} / 0.35)" stroke-width="0.6"/>`;
  }
  for (let i = 1; i < result.cabinetsHigh; i++) {
    const ly = oy + i * wall.cabinetHeightMm * scale;
    grid += `<line x1="${ox}" y1="${ly}" x2="${ox + renderedW}" y2="${ly}" stroke="rgb(${C.brandRgb} / 0.35)" stroke-width="0.6"/>`;
  }

  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${C.panel2}" stroke="${C.border}" stroke-width="1"/>
    <rect x="${ox}" y="${oy}" width="${renderedW}" height="${renderedH}" fill="rgb(${C.brandRgb} / 0.05)" stroke="rgb(${C.brandRgb} / 0.8)" stroke-width="1.5"/>
    ${grid}
    <text x="${x + w / 2}" y="${y + h - 8}" fill="${C.brand}" font-family="Menlo, Consolas, monospace" font-size="12" font-weight="700" text-anchor="middle" letter-spacing="1">${result.cabinetsWide} × ${result.cabinetsHigh} CABINET</text>
  `;
}

function renderWallStats(
  x: number,
  y: number,
  w: number,
  h: number,
  result: LedWallResult,
  wall: WallConfig,
  pitchMm: number
): string {
  const rows = [
    { label: "Layout", value: `${dec2Format.format(result.actualWallWidthM)} × ${dec2Format.format(result.actualWallHeightM)} m` },
    { label: "Cabinet", value: `${wall.cabinetWidthMm} × ${wall.cabinetHeightMm} mm` },
    { label: "Pixel pitch", value: `${wall.pitchSelection === "custom" ? "Custom" : wall.pitchSelection} · ${pitchMm.toFixed(4)} mm` },
    { label: "Risoluzione", value: `${intFormat.format(result.resolutionWidthPx)} × ${intFormat.format(result.resolutionHeightPx)}`, big: true },
    { label: "Megapixel", value: `${dec2Format.format(result.megapixels)} Mpx` },
    { label: "Aspect", value: `${result.aspectRatioReduced.label} (${result.aspectRatioDecimalLabel})` },
    { label: "Peso", value: `${dec1Format.format(result.totalWeightKg)} kg` },
    { label: "Consumo medio", value: `${dec2Format.format(result.powerAvgW / 1000)} kW · ${dec1Format.format(result.currentAvgA)} A` },
    { label: "Consumo picco", value: `${dec2Format.format(result.powerPeakW / 1000)} kW · ${dec1Format.format(result.currentPeakA)} A`, highlight: true },
    { label: "Distanza visione", value: `${dec1Format.format(result.viewingDistanceMinM)} m · ${dec1Format.format(result.viewingDistanceMinFt)} ft` },
  ];

  const rowH = h / rows.length;
  let svg = "";
  rows.forEach((r, i) => {
    const ry = y + i * rowH + rowH * 0.6;
    const valueColor = r.highlight
      ? C.brandBright
      : r.big
      ? C.brand
      : C.text;
    const valueSize = r.big ? 18 : 14;
    svg += `
      <text x="${x}" y="${ry}" fill="${C.textDim}" font-family="Menlo, Consolas, monospace" font-size="11" font-weight="600" letter-spacing="1">${r.label.toUpperCase()}</text>
      <text x="${x + w}" y="${ry}" fill="${valueColor}" font-family="Menlo, Consolas, monospace" font-size="${valueSize}" font-weight="${r.big || r.highlight ? "700" : "500"}" text-anchor="end">${escapeXml(r.value)}</text>
    `;
  });
  return svg;
}

function renderFooter(x: number, y: number, w: number, h: number): string {
  const cy = y + h / 2 + 5;
  return `
    <line x1="${x}" y1="${y}" x2="${x + w}" y2="${y}" stroke="${C.border}" stroke-width="1"/>
    <text x="${x}" y="${cy}" fill="${C.textFaint}" font-family="Menlo, Consolas, monospace" font-size="13">Generated by LED CALC · PWA</text>
    <text x="${x + w / 2}" y="${cy}" fill="${C.brand}" font-family="Menlo, Consolas, monospace" font-size="13" font-weight="700" text-anchor="middle" letter-spacing="2">@_HYPEMANCIO_</text>
    <text x="${x + w}" y="${cy}" fill="${C.textFaint}" font-family="Menlo, Consolas, monospace" font-size="13" text-anchor="end">${dateFormat.format(new Date())}</text>
  `;
}

function renderLogo(x: number, y: number, size: number): string {
  // Mini logo basato su public/icon.svg, scalato a (size × size)
  const s = size / 32;
  return `
    <g transform="translate(${x}, ${y}) scale(${s})">
      <rect width="32" height="32" rx="6" fill="#0a0b0c" stroke="${C.brand}" stroke-width="0.5"/>
      <g fill="none" stroke="${C.brand}" stroke-width="1.6" stroke-linecap="round">
        <rect x="5" y="7" width="22" height="17" rx="1.5"/>
        <line x1="10.5" y1="7" x2="10.5" y2="24"/>
        <line x1="16" y1="7" x2="16" y2="24"/>
        <line x1="21.5" y1="7" x2="21.5" y2="24"/>
        <line x1="5" y1="11.5" x2="27" y2="11.5"/>
        <line x1="5" y1="15.5" x2="27" y2="15.5"/>
        <line x1="5" y1="19.75" x2="27" y2="19.75"/>
      </g>
    </g>`;
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Canvas toBlob returned null"));
      else resolve(blob);
    }, "image/png");
  });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Aspetta che il browser inizi il download prima di revocare
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildFilename(project: Project, ext = "png"): string {
  const sanitized = (project.name || "led-calc-project")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date()
    .toISOString()
    .slice(0, 10);
  return `${sanitized || "led-calc"}-${date}.${ext}`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
