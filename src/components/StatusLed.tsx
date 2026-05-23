type State = "ok" | "warn" | "off";

interface Props {
  label: string;
  state: State;
}

const DOT_CLASS: Record<State, string> = {
  ok: "bg-brand shadow-[0_0_8px_rgba(127,254,209,0.9)]",
  warn: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]",
  off: "bg-slate-700",
};

const TEXT_CLASS: Record<State, string> = {
  ok: "text-slate-200",
  warn: "text-amber-200",
  off: "text-slate-500",
};

export function StatusLed({ label, state }: Props) {
  return (
    <div
      className={[
        "flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em]",
        TEXT_CLASS[state],
      ].join(" ")}
    >
      <span className={["h-2 w-2 flex-none rounded-full", DOT_CLASS[state]].join(" ")} />
      <span>{label}</span>
    </div>
  );
}
