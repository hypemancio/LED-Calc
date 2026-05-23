import type { ReactNode } from "react";

interface Props {
  title: string;
  children: ReactNode;
  description?: string;
  action?: ReactNode;
}

export function Section({ title, description, children, action }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-panel/70 p-4 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold uppercase tracking-wider text-slate-100">
            {title}
          </h2>
          {description ? (
            <p className="mt-0.5 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="flex-none">{action}</div> : null}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
