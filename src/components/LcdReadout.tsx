interface LcdItem {
  label: string;
  value: string;
  sub?: string;
}

interface Props {
  primary: LcdItem;
  secondary?: LcdItem[];
}

/**
 * Display LCD verde-fosforo in stile processore LED hardware.
 * Numeri grandi con glow, tipografia monospace.
 */
export function LcdReadout({ primary, secondary = [] }: Props) {
  const glowBig = "0 0 18px rgba(127, 254, 209, 0.55)";
  const glowSm = "0 0 10px rgba(127, 254, 209, 0.45)";
  return (
    <div
      className="rounded-2xl border border-brand/25 bg-[#0a0b0c] p-5 shadow-[inset_0_0_30px_rgba(127,254,209,0.07)]"
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-12">
        <div className="sm:col-span-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {primary.label}
          </div>
          <div
            className="mt-1 font-mono text-3xl font-bold tabular-nums text-brand-bright sm:text-4xl"
            style={{ textShadow: glowBig }}
          >
            {primary.value}
          </div>
          {primary.sub ? (
            <div className="mt-1 font-mono text-xs text-slate-500">
              {primary.sub}
            </div>
          ) : null}
        </div>
        {secondary.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:col-span-7 sm:grid-cols-4">
            {secondary.map((s) => (
              <div key={s.label}>
                <div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {s.label}
                </div>
                <div
                  className="mt-1 font-mono text-lg font-semibold tabular-nums text-brand"
                  style={{ textShadow: glowSm }}
                >
                  {s.value}
                </div>
                {s.sub ? (
                  <div className="mt-0.5 font-mono text-[10px] text-slate-500">
                    {s.sub}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
