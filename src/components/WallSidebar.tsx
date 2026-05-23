import { useMemo, useState } from "react";
import {
  computeWallResult,
  type WallConfig,
} from "../lib/wall";

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

export function WallSidebar({
  walls,
  activeWallId,
  onSelect,
  onAdd,
  onDuplicate,
  onDelete,
  onRename,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <aside className="space-y-2">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          Ledwalls
        </h2>
        <span className="font-mono text-[10px] text-slate-500">
          {walls.length}
        </span>
      </div>

      <ul className="space-y-1.5">
        {walls.map((w) => (
          <WallSidebarItem
            key={w.id}
            wall={w}
            active={w.id === activeWallId}
            editing={editingId === w.id}
            canDelete={walls.length > 1}
            onSelect={() => onSelect(w.id)}
            onStartRename={() => setEditingId(w.id)}
            onCommitRename={(name) => {
              onRename(w.id, name);
              setEditingId(null);
            }}
            onCancelRename={() => setEditingId(null)}
            onDuplicate={() => onDuplicate(w.id)}
            onDelete={() => onDelete(w.id)}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-panel-2/40 px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-400 transition hover:border-brand hover:text-brand"
      >
        <span aria-hidden className="text-base leading-none">+</span>
        Aggiungi
      </button>
    </aside>
  );
}

interface ItemProps {
  wall: WallConfig;
  active: boolean;
  editing: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onStartRename: () => void;
  onCommitRename: (name: string) => void;
  onCancelRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

function WallSidebarItem({
  wall,
  active,
  editing,
  canDelete,
  onSelect,
  onStartRename,
  onCommitRename,
  onCancelRename,
  onDuplicate,
  onDelete,
}: ItemProps) {
  const summary = useMemo(() => {
    const r = computeWallResult(wall);
    return {
      cab: `${r.cabinetsWide}×${r.cabinetsHigh}`,
      res: `${intFormat.format(r.resolutionWidthPx)}×${intFormat.format(r.resolutionHeightPx)}`,
    };
  }, [wall]);

  const [name, setName] = useState(wall.name);

  return (
    <li
      className={[
        "group relative rounded-lg border transition",
        active
          ? "border-brand/60 bg-brand/10"
          : "border-border bg-panel-2/40 hover:border-slate-600",
      ].join(" ")}
    >
      <button
        type="button"
        onClick={onSelect}
        className="block w-full px-3 py-2 text-left"
      >
        {editing ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={() => onCommitRename(name.trim() || wall.name)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCommitRename(name.trim() || wall.name);
              if (e.key === "Escape") onCancelRename();
            }}
            className="w-full rounded border border-brand bg-panel-2 px-2 py-0.5 text-sm font-semibold text-slate-100 outline-none"
          />
        ) : (
          <div
            className={[
              "text-sm font-semibold",
              active ? "text-brand-bright" : "text-slate-100",
            ].join(" ")}
          >
            {wall.name}
          </div>
        )}
        <div className="mt-0.5 font-mono text-[10px] text-slate-500">
          {summary.cab} · {summary.res}
        </div>
      </button>

      {/* Actions */}
      <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition group-hover:opacity-100 has-[:focus]:opacity-100">
        <IconBtn
          label="Rinomina"
          onClick={(e) => {
            e.stopPropagation();
            setName(wall.name);
            onStartRename();
          }}
        >
          ✎
        </IconBtn>
        <IconBtn
          label="Duplica"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          ⧉
        </IconBtn>
        {canDelete ? (
          <IconBtn
            label="Elimina"
            tone="danger"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Eliminare "${wall.name}"?`)) onDelete();
            }}
          >
            ×
          </IconBtn>
        ) : null}
      </div>
    </li>
  );
}

function IconBtn({
  children,
  label,
  onClick,
  tone = "default",
}: {
  children: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={[
        "grid h-6 w-6 place-items-center rounded border text-xs font-bold transition",
        tone === "danger"
          ? "border-border bg-panel text-slate-400 hover:border-red-500/50 hover:text-red-400"
          : "border-border bg-panel text-slate-400 hover:border-brand hover:text-brand",
      ].join(" ")}
    >
      {children}
    </button>
  );
}
