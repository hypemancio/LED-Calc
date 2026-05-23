import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { StatusLed } from "./components/StatusLed";
import { WallEditor } from "./components/WallEditor";
import { WallSidebar } from "./components/WallSidebar";
import { WallDropdown } from "./components/WallDropdown";
import { ProjectTotals } from "./components/ProjectTotals";
import { HistoryDialog } from "./components/HistoryDialog";
import { CompareView } from "./components/CompareView";
import { SegmentedToggle } from "./components/SegmentedToggle";
import {
  computeProjectTotals,
  computeWallResult,
  createDefaultProject,
  createDefaultWall,
  duplicateWall as duplicateWallConfig,
  ensureProjectId,
  type Project,
  type WallConfig,
} from "./lib/wall";
import {
  findSavedByProjectId,
  loadHistory,
  loadWorking,
  migrateHistory,
  saveToHistory,
  saveWorking,
} from "./lib/historyStore";
import { exportProjectPng } from "./lib/exportPng";
import { exportProjectJson, importProjectJson } from "./lib/projectIo";

export default function App() {
  // Migration: backfilla project.id sugli snapshot legacy (chiamata sicura
  // e idempotente — lavora solo su entry che non hanno già project.id)
  if (typeof window !== "undefined") {
    // eseguita ad ogni render ma è no-op dopo la prima
    migrateHistory();
  }

  // Stato del progetto. Al primo render proviamo a recuperare lo stato
  // auto-salvato in localStorage; se non c'è (o è corrotto) → default.
  const [project, setProject] = useState<Project>(
    () => loadWorking() ?? createDefaultProject()
  );

  // Vista corrente (editor vs compare)
  const [view, setView] = useState<"editor" | "compare">("editor");

  // History dialog open/close
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  // Feedback "Salvato!" temporaneo
  const [savedToast, setSavedToast] = useState<string | null>(null);
  const [historyCount, setHistoryCount] = useState(() => loadHistory().length);

  const activeWall: WallConfig =
    project.walls.find((w) => w.id === project.activeWallId) ??
    project.walls[0];

  // ---------- Auto-save (debounced 500 ms) ----------
  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      saveWorking(project);
    }, 500);
    return () => {
      if (saveTimer.current !== null) window.clearTimeout(saveTimer.current);
    };
  }, [project]);

  // Listener per refresh contatore storico (quando dialog elimina entries)
  useEffect(() => {
    const handler = () => {
      setHistoryCount(loadHistory().length);
      setHistoryRefreshKey((k) => k + 1);
    };
    window.addEventListener("ledcalc-history-changed", handler);
    return () => window.removeEventListener("ledcalc-history-changed", handler);
  }, []);

  // ---------- Mutazioni progetto ----------

  const updateActiveWall = (updates: Partial<WallConfig>) => {
    setProject((p) => ({
      ...p,
      walls: p.walls.map((w) =>
        w.id === p.activeWallId ? { ...w, ...updates } : w
      ),
    }));
  };

  const selectWall = (id: string) => {
    setProject((p) => ({ ...p, activeWallId: id }));
  };

  const addWall = () => {
    setProject((p) => {
      const next = createDefaultWall(`Ledwall ${p.walls.length + 1}`);
      return {
        ...p,
        walls: [...p.walls, next],
        activeWallId: next.id,
      };
    });
  };

  const duplicateWall = (id: string) => {
    setProject((p) => {
      const source = p.walls.find((w) => w.id === id);
      if (!source) return p;
      const copy = duplicateWallConfig(source);
      const sourceIdx = p.walls.findIndex((w) => w.id === id);
      const walls = [...p.walls];
      walls.splice(sourceIdx + 1, 0, copy);
      return { ...p, walls, activeWallId: copy.id };
    });
  };

  const deleteWall = (id: string) => {
    setProject((p) => {
      if (p.walls.length <= 1) return p;
      const walls = p.walls.filter((w) => w.id !== id);
      const activeWallId =
        p.activeWallId === id ? walls[0].id : p.activeWallId;
      return { ...p, walls, activeWallId };
    });
  };

  const renameWall = (id: string, name: string) => {
    setProject((p) => ({
      ...p,
      walls: p.walls.map((w) => (w.id === id ? { ...w, name } : w)),
    }));
  };

  const renameProject = (name: string) => {
    setProject((p) => ({ ...p, name }));
  };

  // ---------- Storico ----------

  const saveProjectSnapshot = () => {
    const existing = findSavedByProjectId(project.id);
    if (existing) {
      const when = new Intl.DateTimeFormat("it-IT", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(existing.savedAt);
      const ok = confirm(
        `"${existing.project.name}" è già presente nello storico.\n\nUltimo salvataggio: ${when}\n\nSovrascrivere?`
      );
      if (!ok) return;
    }
    saveToHistory(project);
    setHistoryCount(loadHistory().length);
    setHistoryRefreshKey((k) => k + 1);
    setSavedToast(
      existing ? "Snapshot aggiornato" : "Progetto salvato nello storico"
    );
    window.setTimeout(() => setSavedToast(null), 2500);
  };

  const loadProjectFromSnapshot = (snapshotProject: Project) => {
    // Difensivo: se lo snapshot proviene da un dato legacy senza
    // project.id, gliene assegniamo uno prima di entrare in stato — così
    // i salvataggi successivi faranno upsert invece di creare duplicati.
    setProject(ensureProjectId(snapshotProject));
  };

  const newProject = () => {
    if (
      !confirm(
        "Iniziare un nuovo progetto? Il progetto corrente non salvato andrà perso (se non l'hai salvato nello storico)."
      )
    )
      return;
    setProject(createDefaultProject());
  };

  const [exporting, setExporting] = useState(false);
  const exportPng = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportProjectPng(project);
      setSavedToast("PNG esportato");
      window.setTimeout(() => setSavedToast(null), 2500);
    } catch (err) {
      console.error("Export PNG failed:", err);
      alert("Errore durante l'export PNG. Controlla la console per dettagli.");
    } finally {
      setExporting(false);
    }
  };

  const exportJson = () => {
    exportProjectJson(project);
    setSavedToast("JSON esportato");
    window.setTimeout(() => setSavedToast(null), 2500);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permette di re-importare lo stesso file
    if (!file) return;
    try {
      const imported = await importProjectJson(file);
      if (
        confirm(
          `Importare "${imported.name}" (${imported.walls.length} Ledwall)?\n\nIl progetto corrente verrà sostituito — salvalo prima nello storico se vuoi conservarlo.`
        )
      ) {
        setProject(imported);
        setSavedToast("Progetto importato");
        window.setTimeout(() => setSavedToast(null), 2500);
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  // ---------- Derivati ----------

  const activeResult = useMemo(
    () => computeWallResult(activeWall),
    [activeWall]
  );
  const projectTotals = useMemo(
    () => computeProjectTotals(project.walls),
    [project.walls]
  );

  const activeHasWarning =
    activeResult.warnings.wallNotMultipleOfCabinetWidth ||
    activeResult.warnings.wallNotMultipleOfCabinetHeight;

  return (
    <div className="min-h-dvh w-full px-4 pb-0 lg:px-10">
      <SiteHeader />

      <main className="pb-6">
        {/* PROJECT BAR */}
        <div className="mb-6 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <label className="block">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Progetto
              </span>
              <input
                value={project.name}
                onChange={(e) => renameProject(e.target.value)}
                className="mt-0.5 w-full max-w-md rounded-md border border-transparent bg-transparent px-1 py-0.5 text-lg font-semibold text-slate-100 outline-none transition hover:border-border focus:border-brand focus:bg-panel-2/40 lg:text-xl"
              />
            </label>
            <p className="mt-1 text-sm text-slate-400">
              {project.walls.length} Ledwall · risoluzione, sorgente, peso, consumo.
            </p>
          </div>

          {/* Azioni progetto + status */}
          <div className="flex flex-col gap-3 lg:items-end">
            <div className="flex flex-wrap items-center gap-2">
              <SegmentedToggle<"editor" | "compare">
                size="sm"
                ariaLabel="Vista"
                value={view}
                onChange={setView}
                options={[
                  { value: "editor", label: "Editor" },
                  { value: "compare", label: "Confronta" },
                ]}
              />
              <span className="hidden text-slate-700 lg:inline">·</span>
              <button
                type="button"
                onClick={saveProjectSnapshot}
                className="rounded-lg border border-brand/40 bg-brand/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-brand-bright transition hover:border-brand hover:bg-brand/20"
              >
                Salva
              </button>
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-brand hover:text-brand"
              >
                Storico
                {historyCount > 0 ? (
                  <span className="ml-2 inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand/20 px-1 font-mono text-[10px] text-brand-bright">
                    {historyCount}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={newProject}
                className="rounded-lg border border-border bg-panel-2 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300 transition hover:border-slate-500 hover:text-slate-100"
              >
                Nuovo
              </button>
              <button
                type="button"
                onClick={exportPng}
                disabled={exporting}
                className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-amber-200 transition hover:border-amber-400 hover:bg-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                title="Esporta scheda progetto come immagine PNG"
              >
                {exporting ? "Export…" : "Export PNG"}
              </button>
              <button
                type="button"
                onClick={exportJson}
                className="rounded-lg border border-fit/40 bg-fit/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-fit-bright transition hover:border-fit hover:bg-fit/20"
                title="Esporta progetto come file JSON (backup/condivisione)"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-lg border border-fill/40 bg-fill/10 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-fill-bright transition hover:border-fill hover:bg-fill/20"
                title="Importa progetto da file JSON"
              >
                Import JSON
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json,.ledcalc"
                onChange={handleImportFile}
                className="hidden"
                aria-hidden
              />
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-[#0a0b0c] px-4 py-2.5">
              <StatusLed label="SYNC" state="ok" />
              <StatusLed label="POWER OK" state="ok" />
              <StatusLed
                label={activeHasWarning ? "OVERFLOW" : "FIT WALL"}
                state={activeHasWarning ? "warn" : "ok"}
              />
              <StatusLed
                label={`SRC: ${
                  activeWall.sourceMode === "none"
                    ? "OFF"
                    : activeWall.sourceMode.toUpperCase()
                }`}
                state={activeWall.sourceMode === "none" ? "off" : "ok"}
              />
              <StatusLed label="OFFLINE READY" state="ok" />
            </div>
          </div>
        </div>

        {view === "editor" ? (
          <>
            {/* MOBILE: dropdown wall switcher */}
            <div className="mb-4 lg:hidden">
              <WallDropdown
                walls={project.walls}
                activeWallId={project.activeWallId}
                onSelect={selectWall}
                onAdd={addWall}
                onDuplicate={duplicateWall}
                onDelete={deleteWall}
                onRename={renameWall}
              />
            </div>

            {/* MAIN: sidebar (desktop only) + editor */}
            <div className="lg:grid lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-6">
              <div className="hidden lg:block">
                <WallSidebar
                  walls={project.walls}
                  activeWallId={project.activeWallId}
                  onSelect={selectWall}
                  onAdd={addWall}
                  onDuplicate={duplicateWall}
                  onDelete={deleteWall}
                  onRename={renameWall}
                />
              </div>

              <WallEditor
                key={activeWall.id}
                wall={activeWall}
                onChange={updateActiveWall}
              />
            </div>

            {/* TOTALI PROGETTO */}
            <div className="mt-6 lg:mt-8">
              <ProjectTotals totals={projectTotals} />
            </div>
          </>
        ) : (
          <>
            <CompareView
              walls={project.walls}
              onSelectWall={selectWall}
              onSwitchToEditor={() => setView("editor")}
              onAddWall={addWall}
            />
            <div className="mt-6 lg:mt-8">
              <ProjectTotals totals={projectTotals} />
            </div>
          </>
        )}
      </main>

      <SiteFooter />

      {/* History dialog (modal) */}
      <HistoryDialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={(s) => loadProjectFromSnapshot(s.project)}
        refreshKey={historyRefreshKey}
      />

      {/* Toast feedback save */}
      {savedToast ? (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-brand/40 bg-brand/15 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-brand-bright backdrop-blur"
        >
          ✓ {savedToast}
        </div>
      ) : null}
    </div>
  );
}
