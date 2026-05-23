/**
 * LED wall math — funzioni pure, nessuna dipendenza, nessun effetto collaterale.
 *
 * Unità di misura:
 *  - tutte le dimensioni fisiche sono in millimetri (mm) se non diversamente specificato
 *  - il pixel pitch è in mm (es. 2.5 = P2.5)
 *  - peso in kg, potenza in W, corrente in A (su rete 230 V), distanza in m/ft
 */

// ---------------------------------------------------------------------------
// Costanti di dominio (esportate così la UI può riusarle per menu/preset)
// ---------------------------------------------------------------------------

/**
 * Pixel pitch standard di settore disponibili nel menu a tendina.
 *
 * I valori in mm sono quelli REALI dei datasheet dei produttori (ROE Visual,
 * Brompton, Absen, Unilumin, Megapixel) — il label è la denominazione
 * commerciale arrotondata. Es. "P1.9" è la label di un panel con pitch
 * effettivo 1.953125 mm (256 px su cabinet 500 mm).
 */
export interface PitchPreset {
  /** Denominazione commerciale, es. "P1.9". */
  label: string;
  /** Pitch reale in mm. */
  mm: number;
}

export const PIXEL_PITCHES: readonly PitchPreset[] = [
  { label: "P0.9", mm: 0.9375 },
  { label: "P1.2", mm: 1.25 },
  { label: "P1.5", mm: 1.5625 },
  { label: "P1.9", mm: 1.953125 },
  { label: "P2.5", mm: 2.5 },
  { label: "P2.6", mm: 2.604167 },
  { label: "P2.9", mm: 2.976 },
  { label: "P3.9", mm: 3.90625 },
  { label: "P4.8", mm: 4.8 },
  { label: "P5.9", mm: 5.952 },
];

/** Tipo della label commerciale ("P0.9" | "P1.2" | ...). */
export type PitchLabel =
  | "P0.9"
  | "P1.2"
  | "P1.5"
  | "P1.9"
  | "P2.5"
  | "P2.6"
  | "P2.9"
  | "P3.9"
  | "P4.8"
  | "P5.9";

/** Dimensioni cabinet più diffuse — usate come preset rapidi. */
export const CABINET_PRESETS = [
  { label: "500 × 500", widthMm: 500, heightMm: 500 },
  { label: "1000 × 500", widthMm: 1000, heightMm: 500 },
  { label: "500 × 1000", widthMm: 500, heightMm: 1000 },
  { label: "1000 × 1000", widthMm: 1000, heightMm: 1000 },
  { label: "600 × 600", widthMm: 600, heightMm: 600 },
  { label: "600 × 1200", widthMm: 600, heightMm: 1200 },
  { label: "1200 × 600", widthMm: 1200, heightMm: 600 },
  { label: "1200 × 1200", widthMm: 1200, heightMm: 1200 },
  { label: "600 × 337.5", widthMm: 600, heightMm: 337.5 },
] as const;

/** Aspect ratio della sorgente video/immagine inviata al Ledwall. */
export const SOURCE_ASPECT_PRESETS = [
  { label: "16:9", w: 16, h: 9 },
  { label: "9:16", w: 9, h: 16 },
  { label: "21:9", w: 21, h: 9 },
  { label: "4:3", w: 4, h: 3 },
] as const;

/** Default modificabili dall'utente — sono **stime indicative**. */
export const DEFAULT_WEIGHT_KG_PER_CABINET = 8;
export const DEFAULT_POWER_AVG_W_PER_CABINET = 150;
export const DEFAULT_POWER_PEAK_W_PER_CABINET = 450;

/** Tensione di rete usata per il calcolo Ampere (Europa). */
export const MAINS_VOLTAGE_V = 230;

/** 1 piede = 304.8 mm (definizione internazionale). */
export const MM_PER_FOOT = 304.8;

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export interface LedWallInput {
  wallWidthMm: number;
  wallHeightMm: number;
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  pitchMm: number;
  weightKgPerCabinet?: number;
  powerAvgWPerCabinet?: number;
  powerPeakWPerCabinet?: number;
}

export interface AspectRatio {
  w: number;
  h: number;
  label: string;
}

export interface LedWallWarnings {
  wallNotMultipleOfCabinetWidth: boolean;
  wallNotMultipleOfCabinetHeight: boolean;
  widthOverflowMm: number;
  heightOverflowMm: number;
}

export interface LedWallResult {
  cabinetsWide: number;
  cabinetsHigh: number;
  cabinetsTotal: number;

  actualWallWidthMm: number;
  actualWallHeightMm: number;
  actualWallWidthM: number;
  actualWallHeightM: number;

  pixelsPerCabinetWidth: number;
  pixelsPerCabinetHeight: number;

  resolutionWidthPx: number;
  resolutionHeightPx: number;
  totalPixels: number;
  megapixels: number;

  aspectRatioReduced: AspectRatio;
  aspectRatioDecimal: number;
  aspectRatioDecimalLabel: string;

  totalWeightKg: number;
  powerAvgW: number;
  powerPeakW: number;
  currentAvgA: number;
  currentPeakA: number;

  viewingDistanceMinM: number;
  viewingDistanceMinFt: number;

  warnings: LedWallWarnings;
}

/** Risultato del calcolo Fit (letterbox): la sorgente viene contenuta nel Ledwall. */
export interface FitResult {
  /** Pixel del Ledwall effettivamente occupati dalla sorgente. */
  widthPx: number;
  heightPx: number;
  /** Letterbox: bande non utilizzate su top+bottom (o left+right). */
  letterboxXPx: number; // larghezza singola banda verticale (left = right)
  letterboxYPx: number; // altezza singola banda orizzontale (top = bottom)
  /** Frazione [0..1] dei pixel del Ledwall usati dalla sorgente. */
  utilization: number;
}

/** Risultato del calcolo Fill (crop): la sorgente copre l'intero Ledwall. */
export interface FillResult {
  /** Dimensioni "virtuali" della sorgente quando proiettata sul Ledwall
   *  (prima del crop) — utili per disegnare l'overlay nel preview. */
  sourceWidthPx: number;
  sourceHeightPx: number;
  /** Pixel di sorgente croppati (totali, somma dei due lati). */
  croppedXPx: number;
  croppedYPx: number;
  /** Frazione [0..1] della sorgente effettivamente visibile. */
  visibleFraction: number;
}

// ---------------------------------------------------------------------------
// Helper puri
// ---------------------------------------------------------------------------

export function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    [x, y] = [y, x % y];
  }
  return x || 1;
}

export function reduceAspectRatio(
  widthPx: number,
  heightPx: number
): AspectRatio {
  if (widthPx <= 0 || heightPx <= 0) {
    return { w: 0, h: 0, label: "—" };
  }
  const g = gcd(widthPx, heightPx);
  const w = Math.round(widthPx / g);
  const h = Math.round(heightPx / g);
  return { w, h, label: `${w}:${h}` };
}

export function decimalAspectRatio(
  widthPx: number,
  heightPx: number
): { value: number; label: string } {
  if (widthPx <= 0 || heightPx <= 0) {
    return { value: 0, label: "—" };
  }
  const v = widthPx / heightPx;
  return { value: v, label: `${v.toFixed(2)}:1` };
}

export function pixelsPerCabinet(sideMm: number, pitchMm: number): number {
  if (sideMm <= 0 || pitchMm <= 0) return 0;
  return Math.round(sideMm / pitchMm);
}

export function cabinetsToCover(sideMm: number, cabinetSideMm: number): number {
  if (sideMm <= 0 || cabinetSideMm <= 0) return 0;
  return Math.ceil(sideMm / cabinetSideMm);
}

function safe(value: number | undefined, fallback: number): number {
  if (value === undefined || !Number.isFinite(value) || value < 0) {
    return fallback;
  }
  return value;
}

// ---------------------------------------------------------------------------
// Source content fit / fill
// ---------------------------------------------------------------------------

/**
 * Calcola il rettangolo della sorgente "fit" dentro il Ledwall (letterbox).
 * Mantiene l'aspect ratio della sorgente; l'area non coperta sono bande.
 */
export function computeFit(
  wallW: number,
  wallH: number,
  sourceRatio: number
): FitResult {
  if (wallW <= 0 || wallH <= 0 || sourceRatio <= 0) {
    return {
      widthPx: 0,
      heightPx: 0,
      letterboxXPx: 0,
      letterboxYPx: 0,
      utilization: 0,
    };
  }
  const wallRatio = wallW / wallH;
  let w: number;
  let h: number;
  if (sourceRatio > wallRatio) {
    // Sorgente più larga: tocca i bordi orizzontali, bande sopra/sotto
    w = wallW;
    h = wallW / sourceRatio;
  } else {
    // Sorgente più alta (o uguale): tocca i bordi verticali, bande ai lati
    h = wallH;
    w = wallH * sourceRatio;
  }
  const letterboxX = (wallW - w) / 2;
  const letterboxY = (wallH - h) / 2;
  return {
    widthPx: w,
    heightPx: h,
    letterboxXPx: letterboxX,
    letterboxYPx: letterboxY,
    utilization: (w * h) / (wallW * wallH),
  };
}

/**
 * Calcola la sorgente "fill" che copre l'intero Ledwall (crop dei lati lunghi).
 * Le dimensioni di sourceWidth/Height descrivono l'estensione "virtuale"
 * della sorgente sovrapposta al Ledwall prima del crop — utile per disegnarla.
 */
export function computeFill(
  wallW: number,
  wallH: number,
  sourceRatio: number
): FillResult {
  if (wallW <= 0 || wallH <= 0 || sourceRatio <= 0) {
    return {
      sourceWidthPx: 0,
      sourceHeightPx: 0,
      croppedXPx: 0,
      croppedYPx: 0,
      visibleFraction: 0,
    };
  }
  const wallRatio = wallW / wallH;
  let srcW: number;
  let srcH: number;
  if (sourceRatio > wallRatio) {
    // Sorgente più larga → altezza fillata, larghezza croppata
    srcH = wallH;
    srcW = wallH * sourceRatio;
  } else {
    srcW = wallW;
    srcH = wallW / sourceRatio;
  }
  const croppedX = Math.max(0, srcW - wallW);
  const croppedY = Math.max(0, srcH - wallH);
  const visible = (wallW * wallH) / (srcW * srcH);
  return {
    sourceWidthPx: srcW,
    sourceHeightPx: srcH,
    croppedXPx: croppedX,
    croppedYPx: croppedY,
    visibleFraction: visible,
  };
}

// ---------------------------------------------------------------------------
// Calcolo completo
// ---------------------------------------------------------------------------

export function calculate(input: LedWallInput): LedWallResult {
  const {
    wallWidthMm,
    wallHeightMm,
    cabinetWidthMm,
    cabinetHeightMm,
    pitchMm,
  } = input;

  const weightKgPerCabinet = safe(
    input.weightKgPerCabinet,
    DEFAULT_WEIGHT_KG_PER_CABINET
  );
  const powerAvgWPerCabinet = safe(
    input.powerAvgWPerCabinet,
    DEFAULT_POWER_AVG_W_PER_CABINET
  );
  const powerPeakWPerCabinet = safe(
    input.powerPeakWPerCabinet,
    DEFAULT_POWER_PEAK_W_PER_CABINET
  );

  const cabinetsWide = cabinetsToCover(wallWidthMm, cabinetWidthMm);
  const cabinetsHigh = cabinetsToCover(wallHeightMm, cabinetHeightMm);
  const cabinetsTotal = cabinetsWide * cabinetsHigh;

  const actualWallWidthMm = cabinetsWide * (cabinetWidthMm || 0);
  const actualWallHeightMm = cabinetsHigh * (cabinetHeightMm || 0);

  const pixelsPerCabinetWidth = pixelsPerCabinet(cabinetWidthMm, pitchMm);
  const pixelsPerCabinetHeight = pixelsPerCabinet(cabinetHeightMm, pitchMm);
  const resolutionWidthPx = pixelsPerCabinetWidth * cabinetsWide;
  const resolutionHeightPx = pixelsPerCabinetHeight * cabinetsHigh;
  const totalPixels = resolutionWidthPx * resolutionHeightPx;
  const megapixels = totalPixels / 1_000_000;

  const aspectRatioReduced = reduceAspectRatio(
    resolutionWidthPx,
    resolutionHeightPx
  );
  const decimal = decimalAspectRatio(resolutionWidthPx, resolutionHeightPx);

  const totalWeightKg = cabinetsTotal * weightKgPerCabinet;
  const powerAvgW = cabinetsTotal * powerAvgWPerCabinet;
  const powerPeakW = cabinetsTotal * powerPeakWPerCabinet;
  const currentAvgA = powerAvgW / MAINS_VOLTAGE_V;
  const currentPeakA = powerPeakW / MAINS_VOLTAGE_V;

  const viewingDistanceMinM = pitchMm > 0 ? pitchMm : 0;
  const viewingDistanceMinFt = (viewingDistanceMinM * 1000) / MM_PER_FOOT;

  const widthOverflowMm = Math.max(0, actualWallWidthMm - wallWidthMm);
  const heightOverflowMm = Math.max(0, actualWallHeightMm - wallHeightMm);
  const warnings: LedWallWarnings = {
    wallNotMultipleOfCabinetWidth: widthOverflowMm > 0.0001,
    wallNotMultipleOfCabinetHeight: heightOverflowMm > 0.0001,
    widthOverflowMm,
    heightOverflowMm,
  };

  return {
    cabinetsWide,
    cabinetsHigh,
    cabinetsTotal,
    actualWallWidthMm,
    actualWallHeightMm,
    actualWallWidthM: actualWallWidthMm / 1000,
    actualWallHeightM: actualWallHeightMm / 1000,
    pixelsPerCabinetWidth,
    pixelsPerCabinetHeight,
    resolutionWidthPx,
    resolutionHeightPx,
    totalPixels,
    megapixels,
    aspectRatioReduced,
    aspectRatioDecimal: decimal.value,
    aspectRatioDecimalLabel: decimal.label,
    totalWeightKg,
    powerAvgW,
    powerPeakW,
    currentAvgA,
    currentPeakA,
    viewingDistanceMinM,
    viewingDistanceMinFt,
    warnings,
  };
}
