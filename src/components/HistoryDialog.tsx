import { useEffect, useMemo } from "react";
import {
  deleteFromHistory,
  loadHistory,
  type SavedProject,
} from "../lib/historyStore";
import { computeProjectTotals } from "../lib/wall";

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (saved: SavedProject) => void;
  /** Numero che incrementa quando il caller vuole forzare il refresh della lista. */
  refreshKey?: number;
}

const dateFormat = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const intFormat = new Intl.NumberFormat("it-IT");
const dec2Format = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 2 });

export function HistoryDialog({ open, onClose, onLoad, refreshKey = 0 }: Props) {
  // Reload list when dialog opens or refreshKey changes
  const items = useMemo<SavedProject[]>(
    () => (open ? loadHistory() : []),
    [open, refreshKey]
  );

  // Esc per chiudere
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Storico progetti"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-bg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-border bg-panel-2 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold uppercase tracking-[0.12em] text-slate-100">
              Storico progetti
            </h2>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">
              {items.length} salvataggi in locale (localStorage)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi"
            className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-panel text-slate-400 transition hover:border-brand hover:text-brand"
          >
            ×
          </button>
        </header>

        {items.length === 0 ? (
          <div className="grid h-64 place-items-center px-6 text-center">
            <div>
              <p className="text-sm text-slate-400">
                Nessun progetto salvato.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Premi <span className="font-mono text-brand">Salva</span> dal
                project bar per creare il primo snapshot.
              </p>
            </div>
          </div>
        ) : (
          <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
            {items.map((s) => (
              <HistoryRow
                key={s.id}
                saved={s}
                onLoad={() => {
                  onLoad(s);
                  onClose();
                }}
                onDelete={() => {
                  if (confirm(`Eliminare "${s.project.name}" dallo storico?`)) {
                    deleteFromHistory(s.id);
                    // Force a re-render by re-evaluating items
                    // Easiest: call onClose+reopen? Or use parent refreshKey.
                    // For simplicity we replace state by removing from DOM
                    // and forcing a remount. The parent should bump refreshKey.
                    // Here we mutate localStorage; parent will refresh on next open.
                    // Quick fix: trigger a re-render with a hack
                    // -> We'll leave it: row stays until reload. Parent passes
                    //    refreshKey. We send via custom event.
                    window.dispatchEvent(
                      new CustomEvent("ledcalc-history-changed")
                    );
                  }
                }}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface RowProps {
  saved: SavedProject;
  onLoad: () => void;
  onDelete: () => void;
}

function HistoryRow({ saved, onLoad, onDelete }: RowProps) {
  const totals = useMemo(
    () => computeProjectTotals(saved.project.walls),
    [saved]
  );
  return (
    <li className="group flex items-center gap-3 px-5 py-3 transition hover:bg-panel-2/60">
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <h3 className="truncate text-sm font-semibold text-slate-100">
            {saved.project.name || "Senza titolo"}
          </h3>
          <span className="font-mono text-[10px] text-slate-500">
            {dateFormat.format(saved.savedAt)}
          </span>
        </div>
        <div className="mt-0.5 font-mono text-[11px] text-slate-400">
          {totals.wallsCount} Ledwall · {intFormat.format(totals.cabinetsTotal)}{" "}
          cab · {dec2Format.format(totals.megapixels)} Mpx ·{" "}
          {dec2Format.format(totals.powerPeakW / 1000)} kW picco
        </div>
      </div>
      <div className="flex flex-none gap-1.5">
        <button
          type="button"
          onClick={onLoad}
          className="rounded-md border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-brand-bright transition hover:border-brand hover:bg-brand/20"
        >
          Carica
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Elimina"
          className="grid h-7 w-7 place-items-center rounded-md border border-border bg-panel text-slate-400 transition hover:border-red-500/50 hover:text-red-400"
        >
          ×
        </button>
      </div>
    </li>
  );
}
