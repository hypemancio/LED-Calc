import type { LedWallResult, PitchLabel } from "./ledMath";
import {
  DEFAULT_POWER_AVG_W_PER_CABINET,
  DEFAULT_POWER_PEAK_W_PER_CABINET,
  DEFAULT_WEIGHT_KG_PER_CABINET,
  PIXEL_PITCHES,
  SOURCE_ASPECT_PRESETS,
  calculate,
} from "./ledMath";
import { DEFAULT_CABLING, type CablingConfig } from "./cabling";

/** Unità in cui l'utente edita le dimensioni del Ledwall. */
export type WallUnit = "pan" | "m" | "mm";

/** Selezione pitch — label preset oppure custom (valore separato). */
export type PitchSelection = PitchLabel | "custom";

/** Aspect ratio della sorgente video. */
export type SourceSelection = "16:9" | "9:16" | "21:9" | "4:3" | "custom";

/** Modalità di rendering della sorgente nel preview. */
export type SourceMode = "none" | "fit" | "fill" | "total";

/**
 * Configurazione completa di un singolo Ledwall.
 * Ogni Ledwall del progetto è indipendente — questo oggetto contiene
 * TUTTO lo stato che lo descrive.
 */
export interface WallConfig {
  id: string;
  name: string;

  // Layout
  wallUnit: WallUnit;
  wallWidthMm: number;
  wallHeightMm: number;

  // Cabinet
  cabinetWidthMm: number;
  cabinetHeightMm: number;
  cabCustomMode: boolean;

  // Pixel pitch
  pitchSelection: PitchSelection;
  customPitchMm: number;

  // Source content
  sourceSelection: SourceSelection;
  customSourceW: number;
  customSourceH: number;
  sourceMode: SourceMode;

  // Stime per cabinet
  weightKgPerCabinet: number;
  powerAvgWPerCabinet: number;
  powerPeakWPerCabinet: number;

  // Cablaggio (Novastar pattern + porte sender)
  cabling: CablingConfig;

  /** Vista del pannello Fit/Fill: valori esatti o snap al pixel cabinet. */
  fitFillView: "actual" | "closest";
}

/** Crea un id unico — usa crypto.randomUUID se disponibile, fallback random. */
function makeId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `w-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

/** Crea un WallConfig con i valori di default. */
export function createDefaultWall(name = "Ledwall 1"): WallConfig {
  return {
    id: makeId(),
    name,
    wallUnit: "pan",
    wallWidthMm: 6000,
    wallHeightMm: 3000,
    cabinetWidthMm: 500,
    cabinetHeightMm: 500,
    cabCustomMode: false,
    pitchSelection: "P2.6",
    customPitchMm: 3.0,
    sourceSelection: "16:9",
    customSourceW: 16,
    customSourceH: 9,
    sourceMode: "fit",
    weightKgPerCabinet: DEFAULT_WEIGHT_KG_PER_CABINET,
    powerAvgWPerCabinet: DEFAULT_POWER_AVG_W_PER_CABINET,
    powerPeakWPerCabinet: DEFAULT_POWER_PEAK_W_PER_CABINET,
    cabling: { ...DEFAULT_CABLING },
    fitFillView: "actual",
  };
}

/** Duplica un wall: stesso config, id nuovo, nome con suffisso "copia". */
export function duplicateWall(source: WallConfig, suffix = "copia"): WallConfig {
  return {
    ...source,
    id: makeId(),
    name: `${source.name} ${suffix}`,
  };
}

/** Stato di un intero progetto. */
export interface Project {
  /** ID stabile del progetto. Usato per upsert dello snapshot nello storico
   *  (un salvataggio sovrascrive il precedente con stesso id, invece di
   *  duplicare). Persiste attraverso import/export. */
  id: string;
  walls: WallConfig[];
  activeWallId: string;
  name: string;
}

export function createDefaultProject(): Project {
  const first = createDefaultWall("Ledwall 1");
  return {
    id: makeId(),
    walls: [first],
    activeWallId: first.id,
    name: "Progetto senza titolo",
  };
}

/** Garantisce che un Project (anche legacy/importato) abbia un id. */
export function ensureProjectId(p: Project): Project {
  const withId = p.id && typeof p.id === "string" ? p : { ...p, id: makeId() };
  // Backfilla i campi nuovi sui wall legacy (creati prima di feature successive)
  const walls = withId.walls.map((w) => {
    let wall = w;
    if (!wall.cabling) {
      wall = { ...wall, cabling: { ...DEFAULT_CABLING } };
    } else {
      // Backfill campi nuovi su cabling esistente
      const cab = { ...wall.cabling };
      let changed = false;
      if (!Array.isArray(cab.customStarts)) {
        cab.customStarts = [];
        changed = true;
      }
      if (typeof cab.customCabinetsPerPort !== "number") {
        cab.customCabinetsPerPort = 0;
        changed = true;
      }
      if (changed) wall = { ...wall, cabling: cab };
    }
    if (wall.fitFillView !== "actual" && wall.fitFillView !== "closest") {
      wall = { ...wall, fitFillView: "actual" };
    }
    return wall;
  });
  return { ...withId, walls };
}

// ---------------------------------------------------------------------------
// Helper derivati da un WallConfig
// ---------------------------------------------------------------------------

/** Restituisce il pitch in mm: preset o valore custom. */
export function getPitchMm(wall: WallConfig): number {
  if (wall.pitchSelection === "custom") return wall.customPitchMm;
  const preset = PIXEL_PITCHES.find((p) => p.label === wall.pitchSelection);
  return preset?.mm ?? 0;
}

/** Aspect ratio della sorgente come W/H (0 se non valido). */
export function getSourceRatio(wall: WallConfig): number {
  if (wall.sourceSelection === "custom") {
    if (wall.customSourceW <= 0 || wall.customSourceH <= 0) return 0;
    return wall.customSourceW / wall.customSourceH;
  }
  const preset = SOURCE_ASPECT_PRESETS.find(
    (p) => p.label === wall.sourceSelection
  );
  return preset ? preset.w / preset.h : 0;
}

/** Etichetta del ratio sorgente per la UI (es. "16:9" o "21:9"). */
export function getSourceRatioLabel(wall: WallConfig): string {
  if (wall.sourceSelection === "custom") {
    return `${wall.customSourceW}:${wall.customSourceH}`;
  }
  return wall.sourceSelection;
}

/** Calcolo completo del Ledwall — wrap di `calculate()` con pitch derivato. */
export function computeWallResult(wall: WallConfig): LedWallResult {
  return calculate({
    wallWidthMm: wall.wallWidthMm,
    wallHeightMm: wall.wallHeightMm,
    cabinetWidthMm: wall.cabinetWidthMm,
    cabinetHeightMm: wall.cabinetHeightMm,
    pitchMm: getPitchMm(wall),
    weightKgPerCabinet: wall.weightKgPerCabinet,
    powerAvgWPerCabinet: wall.powerAvgWPerCabinet,
    powerPeakWPerCabinet: wall.powerPeakWPerCabinet,
  });
}

/** Totali aggregati di tutti i Ledwall del progetto. */
export interface ProjectTotals {
  wallsCount: number;
  cabinetsTotal: number;
  totalWeightKg: number;
  powerAvgW: number;
  powerPeakW: number;
  totalPixels: number;
  megapixels: number;
  areaM2: number;
}

export function computeProjectTotals(walls: WallConfig[]): ProjectTotals {
  const totals: ProjectTotals = {
    wallsCount: walls.length,
    cabinetsTotal: 0,
    totalWeightKg: 0,
    powerAvgW: 0,
    powerPeakW: 0,
    totalPixels: 0,
    megapixels: 0,
    areaM2: 0,
  };
  for (const w of walls) {
    const r = computeWallResult(w);
    totals.cabinetsTotal += r.cabinetsTotal;
    totals.totalWeightKg += r.totalWeightKg;
    totals.powerAvgW += r.powerAvgW;
    totals.powerPeakW += r.powerPeakW;
    totals.totalPixels += r.totalPixels;
    totals.areaM2 += r.actualWallWidthM * r.actualWallHeightM;
  }
  totals.megapixels = totals.totalPixels / 1_000_000;
  return totals;
}
