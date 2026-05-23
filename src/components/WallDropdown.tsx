import { useMemo } from "react";
import { computeWallResult, type WallConfig } from "../lib/wall";

interface Props {
  walls: WallConfig[];
  activeWallId: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}

const intFormat = new Intl.NumberFormat("it-IT");

export function WallDropdown({
  walls,
  activeWallId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onRename,
}: Props) {
  const activeWall = walls.find((w) => w.id === activeWallId) ?? walls[0];

  const summary = useMemo(() => {
    if (!activeWall) return null;
    const r = computeWallResult(activeWall);
    return `${r.cabinetsWide}×${r.cabinetsHigh} · ${intFormat.format(r.resolutionWidthPx)}×${intFormat.format(r.resolutionHeightPx)}`;
  }, [activeWall]);

  return (
    <div className="space-y-2 rounded-xl border border-border bg-panel-2/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <label className="block flex-1">
          <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Ledwall attivo · {walls.length} totali
          </span>
          <select
            value={activeWallId}
            onChange={(e) => onSelect(e.target.value)}
            className="h-12 w-full appearance-none rounded-lg border border-border bg-panel px-3 font-mono text-sm font-semibold text-brand-bright outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
          >
            {walls.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={onAdd}
          aria-label="Aggiungi Ledwall"
          className="mt-4 grid h-12 w-12 flex-none place-items-center rounded-lg border border-dashed border-border bg-panel text-xl font-bold text-slate-400 transition hover:border-brand hover:text-brand"
        >
          +
        </button>
      </div>
      {summary ? (
        <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] text-slate-500">
          <span>{summary}</span>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              const next = prompt("Rinomina Ledwall", activeWall?.name ?? "");
              if (next && next.trim()) onRename(activeWallId, next.trim());
            }}
            className="text-slate-400 underline-offset-2 hover:text-brand hover:underline"
          >
            rinomina
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(activeWallId)}
            className="text-slate-400 underline-offset-2 hover:text-brand hover:underline"
          >
            duplica
          </button>
          {walls.length > 1 ? (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Eliminare "${activeWall?.name}"?`)) {
                  onDelete(activeWallId);
                }
              }}
              className="text-slate-400 underline-offset-2 hover:text-red-400 hover:underline"
            >
              elimina
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
