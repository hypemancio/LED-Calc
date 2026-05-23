/**
 * Generatori di test card PNG alla risoluzione nativa del Ledwall.
 *
 * Test card supportati (calibrazione · allineamento · solid):
 *   color bars, gradient, pixel grid, cabinet numbers, solid R/G/B/W/K/gray,
 *   solid custom (qualsiasi hex).
 *
 * Parametri configurabili:
 *   - intensity (0-100%) globale che scala tutti i colori
 *   - customColor per solid-custom
 *   - numbersShowArrows: disegna frecce serpentina sopra il numbers card
 *   - overlayProjectInfo: sovrappone in alto a destra nome progetto/wall/res/data
 */

import { getCablingOrder } from "./cabling";
import { computeWallResult, type WallConfig } from "./wall";

export type TestCardType =
  | "bars"
  | "grid"
  | "numbers"
  | "gradient"
  | "solid-white"
  | "solid-black"
  | "solid-red"
  | "solid-green"
  | "solid-blue"
  | "solid-gray"
  | "solid-custom";

export interface TestCardDef {
  key: TestCardType;
  label: string;
  description: string;
  group: "calibration" | "alignment" | "solid";
}

export const TEST_CARDS: TestCardDef[] = [
  {
    key: "bars",
    label: "Color bars",
    description: "EBU 8 barre verticali — calibrazione colore",
    group: "calibration",
  },
  {
    key: "gradient",
    label: "Gradient",
    description: "Gradiente nero→R→Y→W per smooth/banding",
    group: "calibration",
  },
  {
    key: "grid",
    label: "Pixel grid",
    description: "Bordi cabinet colorati — allineamento",
    group: "alignment",
  },
  {
    key: "numbers",
    label: "Cabinet numbers",
    description: "Numerazione serpentina — verifica cablaggio",
    group: "alignment",
  },
  { key: "solid-white", label: "White", description: "Uniformità W · max consumo", group: "solid" },
  { key: "solid-black", label: "Black", description: "Dead pixel / stuck pixel", group: "solid" },
  { key: "solid-red", label: "Red", description: "Uniformità canale R", group: "solid" },
  { key: "solid-green", label: "Green", description: "Uniformità canale G", group: "solid" },
  { key: "solid-blue", label: "Blue", description: "Uniformità canale B", group: "solid" },
  { key: "solid-gray", label: "Gray 50%", description: "Mid-gray · gamma check", group: "solid" },
  { key: "solid-custom", label: "Custom", description: "Color picker · qualsiasi hex", group: "solid" },
];

// ---------------------------------------------------------------------------
// Parametri
// ---------------------------------------------------------------------------

export type LogoPosition = "TL" | "TR" | "BL" | "BR" | "CENTER";

export interface TestCardParams {
  /** Intensità globale 0-100% — scala linearmente tutti i colori. */
  intensity: number;
  /** Colore hex per il card "solid-custom" (es. "#ff8000"). */
  customColor: string;
  /** Numbers card: disegna anche le frecce serpentina fra cabinet. */
  numbersShowArrows: boolean;
  /** Sovrappone nome progetto/wall/risoluzione/data in alto a destra. */
  overlayProjectInfo: boolean;
  /** Nome progetto (per l'overlay, opzionale). */
  projectName?: string;
  /** Logo caricato come data URL (null = nessun logo). */
  logoDataUrl: string | null;
  /** Posizione del logo nel canvas. */
  logoPosition: LogoPosition;
  /** Dimensione del logo come % della larghezza del Ledwall (5-50). */
  logoSizePct: number;
  /** Opacità del logo 0-100%. */
  logoOpacity: number;
  /** Mostra rettangoli "safe area" stile broadcast (action + title safe). */
  showSafeArea: boolean;
  /** Mostra crosshair centrale + diagonali per allineamento. */
  showCrosshair: boolean;
  /** Sovrappone i bordi dei cabinet sopra qualsiasi card. */
  showCabinetGrid: boolean;
  /** Mostra badge ai 4 angoli con label TL/TR/BL/BR per orientamento. */
  showCornerLabels: boolean;
  /** Inverte i colori dell'output finale (negativo). */
  invert: boolean;
}

export const DEFAULT_TEST_CARD_PARAMS: TestCardParams = {
  intensity: 100,
  customColor: "#FF8000",
  numbersShowArrows: false,
  overlayProjectInfo: false,
  logoDataUrl: null,
  logoPosition: "TL",
  logoSizePct: 15,
  logoOpacity: 100,
  showSafeArea: false,
  showCrosshair: false,
  showCabinetGrid: false,
  showCornerLabels: false,
  invert: false,
};

// Cache di Image gia caricate per evitare re-decoding fra render preview/export
const imageCache = new Map<string, HTMLImageElement>();

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(dataUrl);
  if (cached && cached.complete && cached.naturalWidth > 0) {
    return Promise.resolve(cached);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      imageCache.set(dataUrl, img);
      resolve(img);
    };
    img.onerror = () => reject(new Error("Logo image failed to load"));
    img.src = dataUrl;
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function renderTestCardToCanvas(
  type: TestCardType,
  wall: WallConfig,
  canvas: HTMLCanvasElement,
  params: TestCardParams = DEFAULT_TEST_CARD_PARAMS
): Promise<void> {
  const result = computeWallResult(wall);
  const W = canvas.width;
  const H = canvas.height;
  if (W <= 0 || H <= 0) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;

  switch (type) {
    case "bars":
      drawColorBars(ctx, W, H, params);
      break;
    case "gradient":
      drawGradient(ctx, W, H, params);
      break;
    case "grid":
      drawPixelGrid(ctx, W, H, result.cabinetsWide, result.cabinetsHigh, params);
      break;
    case "numbers":
      drawCabinetNumbers(
        ctx,
        W,
        H,
        result.cabinetsWide,
        result.cabinetsHigh,
        wall,
        params
      );
      break;
    case "solid-custom":
      drawSolid(ctx, W, H, applyIntensity(params.customColor, params.intensity));
      break;
    default: {
      const colorName = type.replace("solid-", "");
      drawSolid(
        ctx,
        W,
        H,
        applyIntensity(solidColorHex(colorName), params.intensity)
      );
    }
  }

  // Overlay cabinet grid (su QUALSIASI card)
  if (params.showCabinetGrid && type !== "grid") {
    drawCabinetGridOverlay(ctx, W, H, result.cabinetsWide, result.cabinetsHigh);
  }

  // Crosshair centrale (se non già nel grid card)
  if (params.showCrosshair && type !== "grid") {
    drawCrosshair(ctx, W, H);
  }

  // Safe area rectangles
  if (params.showSafeArea) {
    drawSafeArea(ctx, W, H);
  }

  // Corner orientation labels (TL/TR/BL/BR)
  if (params.showCornerLabels) {
    drawCornerLabels(ctx, W, H);
  }

  // Inverti colori (negativo) — applicato a tutto ciò che è stato disegnato
  // PRIMA di logo/overlay informativo (così quelli restano come voluti)
  if (params.invert) {
    invertCanvas(ctx, W, H);
  }

  // Logo (asincrono — aspetta il load dell'immagine)
  if (params.logoDataUrl) {
    try {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const img = await loadImage(params.logoDataUrl);
      drawLogo(ctx, W, H, img, params);
      ctx.imageSmoothingEnabled = false;
    } catch (err) {
      console.warn("Test card: logo load failed", err);
    }
  }

  if (params.overlayProjectInfo) {
    drawProjectInfoOverlay(ctx, W, H, wall, params.projectName);
  }
}

export async function exportTestCardPng(
  type: TestCardType,
  wall: WallConfig,
  params: TestCardParams = DEFAULT_TEST_CARD_PARAMS
): Promise<void> {
  const result = computeWallResult(wall);
  const W = result.resolutionWidthPx;
  const H = result.resolutionHeightPx;
  if (W <= 0 || H <= 0) throw new Error("Risoluzione Ledwall non valida.");

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  await renderTestCardToCanvas(type, wall, canvas, params);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("toBlob returned null"))),
      "image/png"
    );
  });
  triggerDownload(blob, buildFilename(wall, type, W, H));
}

// ---------------------------------------------------------------------------
// Helpers colori
// ---------------------------------------------------------------------------

function applyIntensity(hex: string, intensity: number): string {
  const factor = Math.max(0, Math.min(100, intensity)) / 100;
  if (factor >= 0.999) return hex;
  const clean = hex.replace("#", "");
  if (clean.length !== 6) return hex;
  const r = Math.round(parseInt(clean.substring(0, 2), 16) * factor);
  const g = Math.round(parseInt(clean.substring(2, 4), 16) * factor);
  const b = Math.round(parseInt(clean.substring(4, 6), 16) * factor);
  const to2 = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function solidColorHex(name: string): string {
  switch (name) {
    case "white":
      return "#FFFFFF";
    case "black":
      return "#000000";
    case "red":
      return "#FF0000";
    case "green":
      return "#00FF00";
    case "blue":
      return "#0000FF";
    case "gray":
      return "#808080";
    default:
      return "#FFFFFF";
  }
}

// ---------------------------------------------------------------------------
// Generatori
// ---------------------------------------------------------------------------

function drawColorBars(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  params: TestCardParams
): void {
  const bars = [
    "#BFBFBF",
    "#BFBF00",
    "#00BFBF",
    "#00BF00",
    "#BF00BF",
    "#BF0000",
    "#0000BF",
    "#000000",
  ].map((c) => applyIntensity(c, params.intensity));
  const barW = W / bars.length;
  bars.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(i * barW), 0, Math.ceil(barW) + 1, H);
  });
}

function drawGradient(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  params: TestCardParams
): void {
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, applyIntensity("#000000", params.intensity));
  grad.addColorStop(0.33, applyIntensity("#FF0000", params.intensity));
  grad.addColorStop(0.66, applyIntensity("#FFFF00", params.intensity));
  grad.addColorStop(1, applyIntensity("#FFFFFF", params.intensity));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawPixelGrid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cabsW: number,
  cabsH: number,
  params: TestCardParams
): void {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, W, H);
  if (cabsW <= 0 || cabsH <= 0) return;
  const cabW = W / cabsW;
  const cabH = H / cabsH;
  const palette = ["#FF0040", "#00FF80", "#0080FF", "#FFFF00"].map((c) =>
    applyIntensity(c, params.intensity)
  );
  ctx.lineWidth = Math.max(1, Math.min(cabW, cabH) * 0.008);
  for (let r = 0; r < cabsH; r++) {
    for (let c = 0; c < cabsW; c++) {
      const x = c * cabW;
      const y = r * cabH;
      ctx.strokeStyle = palette[(r + c) % palette.length];
      ctx.strokeRect(
        x + ctx.lineWidth / 2,
        y + ctx.lineWidth / 2,
        cabW - ctx.lineWidth,
        cabH - ctx.lineWidth
      );
    }
  }
  ctx.strokeStyle = applyIntensity("#FFFFFF", params.intensity);
  ctx.lineWidth = Math.max(1, Math.min(W, H) * 0.0022);
  ctx.beginPath();
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  ctx.stroke();
}

function drawCabinetNumbers(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cabsW: number,
  cabsH: number,
  wall: WallConfig,
  params: TestCardParams
): void {
  if (cabsW <= 0 || cabsH <= 0) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, W, H);
    return;
  }
  const order = getCablingOrder(
    cabsW,
    cabsH,
    wall.cabling.pattern,
    wall.cabling.corner
  );
  const cabW = W / cabsW;
  const cabH = H / cabsH;
  const fontSize = Math.min(cabW, cabH) * 0.45;
  const mintFull = applyIntensity("#7ffed1", params.intensity);
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(1, Math.min(cabW, cabH) * 0.01);

  for (let r = 0; r < cabsH; r++) {
    for (let c = 0; c < cabsW; c++) {
      const n = order[r][c];
      const x = c * cabW;
      const y = r * cabH;
      ctx.fillStyle = (r + c) % 2 === 0 ? "#1c1d20" : "#0a0b0c";
      ctx.fillRect(x, y, cabW, cabH);
      ctx.strokeStyle = mintFull;
      ctx.strokeRect(
        x + ctx.lineWidth / 2,
        y + ctx.lineWidth / 2,
        cabW - ctx.lineWidth,
        cabH - ctx.lineWidth
      );
      ctx.fillStyle = mintFull;
      ctx.fillText(String(n), x + cabW / 2, y + cabH / 2);
    }
  }

  // Frecce serpentina (overlay sopra i numeri, semi-trasparenti)
  if (params.numbersShowArrows) {
    const points: Array<{ x: number; y: number; n: number }> = [];
    for (let n = 1; n <= cabsW * cabsH; n++) {
      outer: for (let r = 0; r < cabsH; r++) {
        for (let c = 0; c < cabsW; c++) {
          if (order[r][c] === n) {
            points.push({ x: c * cabW + cabW / 2, y: r * cabH + cabH / 2, n });
            break outer;
          }
        }
      }
    }
    const arrowColor = applyIntensity("#FF8000", params.intensity);
    ctx.strokeStyle = arrowColor + "B0"; // ~70% alpha
    ctx.fillStyle = arrowColor;
    ctx.lineWidth = Math.max(1.5, Math.min(cabW, cabH) * 0.015);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    // Frecce su ciascun segmento
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len;
      const uy = dy / len;
      const arrowSize = Math.min(cabW, cabH) * 0.18;
      const baseX = b.x - ux * arrowSize;
      const baseY = b.y - uy * arrowSize;
      const px = -uy;
      const py = ux;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(
        baseX + px * arrowSize * 0.5,
        baseY + py * arrowSize * 0.5
      );
      ctx.lineTo(
        baseX - px * arrowSize * 0.5,
        baseY - py * arrowSize * 0.5
      );
      ctx.closePath();
      ctx.fill();
    }
  }
}

function drawSolid(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  color: string
): void {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, W, H);
}

/** Rettangoli safe area in stile broadcast: action safe (5%) + title safe (10%). */
function drawSafeArea(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  const lineWidth = Math.max(1, Math.min(W, H) * 0.0015);
  ctx.lineWidth = lineWidth;
  // Action safe: 5% margin
  ctx.strokeStyle = "rgba(255, 255, 0, 0.85)";
  ctx.setLineDash([lineWidth * 5, lineWidth * 4]);
  ctx.strokeRect(W * 0.05, H * 0.05, W * 0.9, H * 0.9);
  // Title safe: 10% margin
  ctx.strokeStyle = "rgba(0, 200, 255, 0.85)";
  ctx.strokeRect(W * 0.1, H * 0.1, W * 0.8, H * 0.8);
  ctx.setLineDash([]);
}

/** Crosshair: croce centrale + diagonali da angolo ad angolo + cerchi
 *  concentrici al centro. Linee abbastanza spesse da essere visibili
 *  anche nel preview ridotto. */
function drawCrosshair(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  const lineWidth = Math.max(2, Math.min(W, H) * 0.003);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
  ctx.lineCap = "butt";

  // Linee a tutta lunghezza (toccano i bordi opposti)
  ctx.beginPath();
  // Croce centrale (verticale e orizzontale, full edge-to-edge)
  ctx.moveTo(W / 2, 0);
  ctx.lineTo(W / 2, H);
  ctx.moveTo(0, H / 2);
  ctx.lineTo(W, H / 2);
  // Diagonali angolo-ad-angolo
  ctx.moveTo(0, 0);
  ctx.lineTo(W, H);
  ctx.moveTo(W, 0);
  ctx.lineTo(0, H);
  ctx.stroke();

  // Cerchi concentrici — il più grande ha diametro = altezza del Ledwall
  // (tocca bordo superiore e inferiore). Utile per check geometria.
  const cx = W / 2;
  const cy = H / 2;
  const outer = H / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, outer, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, outer * 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, outer * 0.25, 0, Math.PI * 2);
  ctx.stroke();
  // Punto centrale solid
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(2, H * 0.006), 0, Math.PI * 2);
  ctx.fill();
}

/** Bordi cabinet sovrapposti a qualsiasi card (mint semi-trasparente). */
function drawCabinetGridOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  cabsW: number,
  cabsH: number
): void {
  if (cabsW <= 0 || cabsH <= 0) return;
  const cabW = W / cabsW;
  const cabH = H / cabsH;
  ctx.strokeStyle = "rgba(127, 254, 209, 0.7)";
  ctx.lineWidth = Math.max(1, Math.min(cabW, cabH) * 0.006);
  for (let c = 1; c < cabsW; c++) {
    const x = c * cabW;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let r = 1; r < cabsH; r++) {
    const y = r * cabH;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
}

/** Badge TL/TR/BL/BR ai 4 angoli per identificazione orientamento. */
function drawCornerLabels(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  const fontSize = Math.max(16, Math.min(W, H) * 0.04);
  ctx.font = `bold ${fontSize}px 'JetBrains Mono', monospace`;
  const padding = fontSize * 0.5;
  const margin = Math.max(8, Math.min(W, H) * 0.015);
  const labels = [
    { text: "TL", x: margin, y: margin, align: "left" as const, baseline: "top" as const },
    { text: "TR", x: W - margin, y: margin, align: "right" as const, baseline: "top" as const },
    { text: "BL", x: margin, y: H - margin, align: "left" as const, baseline: "bottom" as const },
    { text: "BR", x: W - margin, y: H - margin, align: "right" as const, baseline: "bottom" as const },
  ];
  labels.forEach((l) => {
    ctx.textAlign = l.align;
    ctx.textBaseline = l.baseline;
    const m = ctx.measureText(l.text);
    const w = m.width + padding * 2;
    const h = fontSize + padding * 0.8;
    let bx = l.x;
    let by = l.y;
    if (l.align === "right") bx = l.x - w;
    if (l.baseline === "bottom") by = l.y - h;
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(bx, by, w, h);
    ctx.strokeStyle = "rgba(127, 254, 209, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx + 0.75, by + 0.75, w - 1.5, h - 1.5);
    ctx.fillStyle = "#7ffed1";
    ctx.fillText(
      l.text,
      l.align === "right" ? l.x - padding : l.x + padding,
      l.baseline === "bottom" ? l.y - padding * 0.4 : l.y + padding * 0.4
    );
  });
}

/** Inverte i colori del canvas (negativo fotografico). */
function invertCanvas(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number
): void {
  const imageData = ctx.getImageData(0, 0, W, H);
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = 255 - d[i]; // R
    d[i + 1] = 255 - d[i + 1]; // G
    d[i + 2] = 255 - d[i + 2]; // B
    // alpha invariato
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  img: HTMLImageElement,
  params: TestCardParams
): void {
  if (img.naturalWidth <= 0 || img.naturalHeight <= 0) return;
  const sizePct = Math.max(2, Math.min(80, params.logoSizePct));
  const logoW = W * (sizePct / 100);
  const aspect = img.naturalWidth / img.naturalHeight;
  const logoH = logoW / aspect;
  const margin = Math.max(8, Math.min(W, H) * 0.02);
  let x = 0;
  let y = 0;
  switch (params.logoPosition) {
    case "TL":
      x = margin;
      y = margin;
      break;
    case "TR":
      x = W - logoW - margin;
      y = margin;
      break;
    case "BL":
      x = margin;
      y = H - logoH - margin;
      break;
    case "BR":
      x = W - logoW - margin;
      y = H - logoH - margin;
      break;
    case "CENTER":
      x = (W - logoW) / 2;
      y = (H - logoH) / 2;
      break;
  }
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(100, params.logoOpacity)) / 100;
  ctx.drawImage(img, x, y, logoW, logoH);
  ctx.restore();
}

function drawProjectInfoOverlay(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  wall: WallConfig,
  projectName?: string
): void {
  const lines = [
    projectName || "",
    wall.name,
    `${W} × ${H} px`,
    new Date().toISOString().slice(0, 10),
  ].filter((s) => s.length > 0);
  const margin = Math.max(8, Math.min(W, H) * 0.02);
  const fontSize = Math.max(10, Math.min(W, H) * 0.022);
  ctx.font = `${fontSize}px 'JetBrains Mono', ui-monospace, Menlo, monospace`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  const padding = fontSize * 0.55;
  const lineH = fontSize * 1.35;
  const maxLineW = lines.reduce(
    (max, l) => Math.max(max, ctx.measureText(l).width),
    0
  );
  const boxW = maxLineW + padding * 2;
  const boxH = lines.length * lineH + padding * 2;
  const boxX = W - boxW - margin;
  const boxY = margin;

  ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = "rgba(127, 254, 209, 0.7)";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(boxX + 0.75, boxY + 0.75, boxW - 1.5, boxH - 1.5);

  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  lines.forEach((line, i) => {
    ctx.fillText(line, boxX + padding, boxY + padding + i * lineH);
  });
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

function buildFilename(
  wall: WallConfig,
  type: TestCardType,
  W: number,
  H: number
): string {
  const sanitized = (wall.name || "ledwall")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${sanitized || "ledwall"}-test-${type}-${W}x${H}.png`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
