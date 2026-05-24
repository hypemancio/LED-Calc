import { ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  label: string;
  value: number;
  onChange: (next: number) => void;
  suffix?: string;
  step?: number;
  min?: number;
  placeholder?: string;
  readOnly?: boolean;
  /** Quando "brand", colora il valore numerico in mint Resolume. */
  valueAccent?: "brand";
}

export function NumberField({
  label,
  value,
  onChange,
  suffix = "",
  step = 1,
  min = 0,
  placeholder,
  readOnly = false,
  valueAccent,
}: Props) {
  const safeStep = step > 0 ? step : 1;

  const increment = () => {
    if (readOnly) return;
    const next = (Number.isFinite(value) ? value : 0) + safeStep;
    onChange(parseFloat(next.toFixed(6)));
  };
  const decrement = () => {
    if (readOnly) return;
    const next = (Number.isFinite(value) ? value : 0) - safeStep;
    const rounded = parseFloat(next.toFixed(6));
    onChange(rounded < min ? min : rounded);
  };

  const valueColor =
    valueAccent === "brand" ? "text-brand" : "text-slate-100";
  const inputClass = [
    "h-14 w-full rounded-xl border font-mono text-lg tabular-nums outline-none transition",
    readOnly
      ? "border-border bg-panel-2/40 text-slate-400 cursor-not-allowed"
      : `border-border bg-panel-2 ${valueColor} focus:border-brand focus:ring-2 focus:ring-brand/30`,
    "px-4",
    suffix ? (readOnly ? "pr-12" : "pr-20") : readOnly ? "pr-4" : "pr-14",
  ].join(" ");

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <div className="relative">
        <input
          type="number"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            if (readOnly) return;
            const v = e.target.value;
            onChange(v === "" ? 0 : Number(v));
          }}
          step={step}
          min={min}
          placeholder={placeholder}
          readOnly={readOnly}
          aria-readonly={readOnly}
          tabIndex={readOnly ? -1 : 0}
          className={inputClass}
        />
        {!readOnly ? (
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col gap-0.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={increment}
              aria-label={`Aumenta ${label}`}
              className="grid h-5 w-6 place-items-center rounded-md border border-border bg-panel text-slate-500 transition hover:border-brand hover:text-brand"
            >
              <ChevronUp size={12} aria-hidden />
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={decrement}
              aria-label={`Diminuisci ${label}`}
              className="grid h-5 w-6 place-items-center rounded-md border border-border bg-panel text-slate-500 transition hover:border-brand hover:text-brand"
            >
              <ChevronDown size={12} aria-hidden />
            </button>
          </div>
        ) : null}
        {suffix ? (
          <span
            className={[
              "pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm font-medium",
              readOnly ? "right-4 text-slate-600" : "right-11 text-slate-500",
            ].join(" ")}
          >
            {suffix}
          </span>
        ) : null}
      </div>
    </label>
  );
}
