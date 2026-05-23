/**
 * Top bar: logo + wordmark + version chip. Sticky in cima alla pagina.
 */
export function SiteHeader() {
  return (
    <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-border bg-bg/95 backdrop-blur lg:-mx-10">
      <div className="flex items-center gap-3 px-4 py-3 lg:px-10">
        {/* Logo mini */}
        <svg
          width="26"
          height="26"
          viewBox="0 0 32 32"
          aria-hidden
          className="flex-none"
        >
          <rect width="32" height="32" rx="6" fill="#0a0b0c" />
          <g
            fill="none"
            stroke="#7ffed1"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <rect x="5" y="7" width="22" height="17" rx="1.5" />
            <line x1="10.5" y1="7" x2="10.5" y2="24" />
            <line x1="16" y1="7" x2="16" y2="24" />
            <line x1="21.5" y1="7" x2="21.5" y2="24" />
            <line x1="5" y1="11.5" x2="27" y2="11.5" />
            <line x1="5" y1="15.5" x2="27" y2="15.5" />
            <line x1="5" y1="19.75" x2="27" y2="19.75" />
          </g>
        </svg>
        <div className="text-base font-semibold uppercase tracking-[0.18em] text-slate-100">
          LED Calc
        </div>
        <div className="hidden text-xs text-slate-500 sm:block">
          · Tool calcolatore pareti LED · hypemancio
        </div>
        <div className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          v0.1
        </div>
      </div>
    </div>
  );
}
