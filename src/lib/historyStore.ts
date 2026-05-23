/**
 * Layer di persistenza in localStorage per progetti LED Calc.
 *
 * Due namespace separati:
 *  - `ledcalc.working.v1`  → stato corrente (auto-save ad ogni modifica)
 *  - `ledcalc.history.v1`  → snapshot salvati manualmente dall'utente
 *
 * Tutte le funzioni sono tolleranti a errori (storage pieno, JSON corrotto,
 * SSR senza window): in caso di problema ritornano null o array vuoto.
 */

import { ensureProjectId, type Project } from "./wall";

const WORKING_KEY = "ledcalc.working.v1";
const HISTORY_KEY = "ledcalc.history.v1";

export interface SavedProject {
  /** ID dello snapshot (diverso dall'eventuale id del progetto stesso). */
  id: string;
  /** Snapshot del Project al momento del save. */
  project: Project;
  /** Unix ms del momento del save. */
  savedAt: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

// ---------------------------------------------------------------------------
// Working state (auto-save)
// ---------------------------------------------------------------------------

export function loadWorking(): Project | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(WORKING_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    if (
      !parsed ||
      !Array.isArray(parsed.walls) ||
      parsed.walls.length === 0 ||
      typeof parsed.activeWallId !== "string"
    ) {
      return null;
    }
    // Legacy: progetti salvati prima dell'introduzione di project.id
    return ensureProjectId(parsed);
  } catch {
    return null;
  }
}

export function saveWorking(project: Project): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(WORKING_KEY, JSON.stringify(project));
  } catch {
    // ignore (quota exceeded, private mode, etc.)
  }
}

export function clearWorking(): void {
  if (!isBrowser()) return;
  try {
    localStorage.removeItem(WORKING_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// History (manual save)
// ---------------------------------------------------------------------------

export function loadHistory(): SavedProject[] {
  if (!isBrowser()) return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Sort by savedAt desc (più recente prima)
    return parsed
      .filter(
        (s): s is SavedProject =>
          s && typeof s.id === "string" && typeof s.savedAt === "number"
      )
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

/**
 * Migration una-tantum: backfilla `project.id` sugli snapshot legacy
 * usando lo `snapshot.id` esistente. Senza questo, salvataggi successivi
 * di uno stesso progetto loadato da uno snapshot vecchio creerebbero
 * duplicati invece di fare upsert.
 *
 * Sicura da chiamare più volte: lavora solo sui project senza id.
 */
export function migrateHistory(): void {
  if (!isBrowser()) return;
  const items = loadHistory();
  let changed = false;
  for (const item of items) {
    if (item.project && !item.project.id) {
      item.project = { ...item.project, id: item.id };
      changed = true;
    }
  }
  if (changed) writeHistory(items);
}

function writeHistory(items: SavedProject[]): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Salva uno snapshot del progetto nello storico.
 *
 * Comportamento upsert: se esiste già uno snapshot con lo stesso `project.id`
 * (es. l'utente ha salvato → modificato → risalvato lo stesso progetto),
 * **sovrascrive** quello esistente aggiornando contenuto e `savedAt`.
 * Altrimenti crea un nuovo entry.
 *
 * Lo snapshot id coincide con project.id → 1 snapshot per progetto.
 */
export function saveToHistory(project: Project): SavedProject {
  const safe = ensureProjectId(project);
  const items = loadHistory();
  const existingIdx = items.findIndex((s) => s.project.id === safe.id);
  const snapshot: SavedProject = {
    id: safe.id,
    project: JSON.parse(JSON.stringify(safe)), // deep clone
    savedAt: Date.now(),
  };
  if (existingIdx >= 0) {
    items.splice(existingIdx, 1);
  }
  items.unshift(snapshot);
  writeHistory(items);
  return snapshot;
}

export function deleteFromHistory(id: string): void {
  const items = loadHistory().filter((s) => s.id !== id);
  writeHistory(items);
}

/** Cerca uno snapshot per project.id. Utile per chiedere conferma di
 *  sovrascrittura prima di salvare. */
export function findSavedByProjectId(projectId: string): SavedProject | null {
  const items = loadHistory();
  return items.find((s) => s.project.id === projectId) ?? null;
}

export function clearHistory(): void {
  writeHistory([]);
}

// ---------------------------------------------------------------------------
// Backup completo dello storico (export/import JSON)
// ---------------------------------------------------------------------------

const BACKUP_TYPE = "ledcalc-history-backup" as const;
const BACKUP_VERSION = "1" as const;

interface HistoryBackupFile {
  type: typeof BACKUP_TYPE;
  version: string;
  exportedAt: number;
  snapshots: SavedProject[];
}

/** Esporta l'intero storico come file JSON scaricabile. */
export function exportHistoryBackup(): void {
  if (!isBrowser()) return;
  const data: HistoryBackupFile = {
    type: BACKUP_TYPE,
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    snapshots: loadHistory(),
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const date = new Date().toISOString().slice(0, 10);
  a.download = `ledcalc-backup-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Legge un file backup, valida la struttura, ritorna gli snapshot.
 * Non scrive nulla in localStorage — sta al chiamante decidere strategia
 * (replace vs merge) tramite `replaceHistory` o `mergeHistory`.
 */
export async function importHistoryBackup(file: File): Promise<SavedProject[]> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("Il file non contiene JSON valido.");
  }
  if (!isBackupFile(data)) {
    throw new Error(
      "Il file non sembra un backup LED Calc (manca il marker 'ledcalc-history-backup')."
    );
  }
  // Sanitize each snapshot
  const valid: SavedProject[] = [];
  for (const s of data.snapshots) {
    if (
      s &&
      typeof s.id === "string" &&
      typeof s.savedAt === "number" &&
      s.project &&
      Array.isArray(s.project.walls) &&
      s.project.walls.length > 0
    ) {
      valid.push(s);
    }
  }
  return valid;
}

function isBackupFile(data: unknown): data is HistoryBackupFile {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return (
    d.type === BACKUP_TYPE &&
    typeof d.version === "string" &&
    Array.isArray(d.snapshots)
  );
}

/** Sostituisce tutto lo storico corrente con quello fornito. */
export function replaceHistory(items: SavedProject[]): void {
  if (!isBrowser()) return;
  const sorted = [...items].sort((a, b) => b.savedAt - a.savedAt);
  writeHistory(sorted);
}

/**
 * Unisce gli snapshot importati con quelli esistenti.
 *  - Match per project.id → tiene la versione con `savedAt` più recente
 *  - Snapshot orfani (no match) vengono aggiunti
 */
export function mergeHistory(incoming: SavedProject[]): void {
  if (!isBrowser()) return;
  const existing = loadHistory();
  const byProjectId = new Map<string, SavedProject>();
  for (const s of existing) {
    byProjectId.set(s.project.id, s);
  }
  for (const inc of incoming) {
    const cur = byProjectId.get(inc.project.id);
    if (!cur || inc.savedAt > cur.savedAt) {
      byProjectId.set(inc.project.id, inc);
    }
  }
  const merged = Array.from(byProjectId.values()).sort(
    (a, b) => b.savedAt - a.savedAt
  );
  writeHistory(merged);
}
