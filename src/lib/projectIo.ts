/**
 * Import/Export di progetti LED Calc come file JSON.
 *
 * Formato:
 *   {
 *     "type": "ledcalc-project",
 *     "version": "1",
 *     "exportedAt": 1716447600000,
 *     "project": { walls, activeWallId, name }
 *   }
 *
 * Il `type` + `version` permette future evoluzioni del formato senza rompere
 * file vecchi. La funzione di import valida la struttura prima di accettarla.
 */

import { ensureProjectId, type Project, type WallConfig } from "./wall";

const FORMAT_TYPE = "ledcalc-project" as const;
const FORMAT_VERSION = "1" as const;

export interface ProjectFile {
  type: typeof FORMAT_TYPE;
  version: string;
  exportedAt: number;
  project: Project;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export function exportProjectJson(project: Project): void {
  const data: ProjectFile = {
    type: FORMAT_TYPE,
    version: FORMAT_VERSION,
    exportedAt: Date.now(),
    project: JSON.parse(JSON.stringify(project)), // deep clone
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = buildFilename(project);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

export async function importProjectJson(file: File): Promise<Project> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Il file non contiene JSON valido.");
  }
  if (!isProjectFile(data)) {
    // Forse il file è solo un Project (legacy senza wrapper)?
    if (isValidProject(data)) {
      return ensureProjectId(data as Project);
    }
    throw new Error(
      "Il file non sembra un export LED Calc (manca il marker 'ledcalc-project')."
    );
  }
  if (!isValidProject(data.project)) {
    throw new Error("Il progetto nel file ha una struttura non valida.");
  }
  return ensureProjectId(data.project);
}

// ---------------------------------------------------------------------------
// Validators (type guards)
// ---------------------------------------------------------------------------

function isProjectFile(data: unknown): data is ProjectFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === FORMAT_TYPE && typeof d.version === "string" && "project" in d;
}

function isValidProject(p: unknown): p is Project {
  if (typeof p !== "object" || p === null) return false;
  const d = p as Record<string, unknown>;
  if (!Array.isArray(d.walls) || d.walls.length === 0) return false;
  if (typeof d.activeWallId !== "string") return false;
  if (typeof d.name !== "string") return false;
  // project.id può mancare (file legacy) — ensureProjectId lo aggiunge dopo
  if (d.id !== undefined && typeof d.id !== "string") return false;
  return d.walls.every(isValidWall);
}

function isValidWall(w: unknown): w is WallConfig {
  if (typeof w !== "object" || w === null) return false;
  const d = w as Record<string, unknown>;
  return (
    typeof d.id === "string" &&
    typeof d.name === "string" &&
    typeof d.wallWidthMm === "number" &&
    typeof d.wallHeightMm === "number" &&
    typeof d.cabinetWidthMm === "number" &&
    typeof d.cabinetHeightMm === "number"
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildFilename(project: Project): string {
  const sanitized = (project.name || "led-calc-project")
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const date = new Date().toISOString().slice(0, 10);
  return `${sanitized || "led-calc"}-${date}.ledcalc.json`;
}
