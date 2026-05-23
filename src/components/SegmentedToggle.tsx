interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (next: T) => void;
  size?: "xs" | "sm" | "md";
  ariaLabel?: string;
}

const SIZE_PAD: Record<NonNullable<Props<string>["size"]>, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-1.5 text-sm",
};

export function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = "sm",
  ariaLabel,
}: Props<T>) {
  const pad = SIZE_PAD[size];
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex rounded-full border border-border bg-panel-2 p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={[
              pad,
              "rounded-full font-semibold uppercase tracking-wider transition",
              active
                ? "bg-brand text-bg shadow"
                : "text-slate-400 hover:text-slate-200",
            ].join(" ")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
