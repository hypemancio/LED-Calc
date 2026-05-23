import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function WarningBanner({ children }: Props) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100"
    >
      <span
        aria-hidden
        className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-500/20 font-bold text-amber-200"
      >
        !
      </span>
      <div className="space-y-1 leading-snug">{children}</div>
    </div>
  );
}
