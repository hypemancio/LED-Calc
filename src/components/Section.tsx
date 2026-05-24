import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Collapse } from "./Collapse";

interface Props {
  title: string;
  children: ReactNode;
  description?: string;
  action?: ReactNode;
  /** Quando "brand", colora il titolo in mint Resolume. */
  titleAccent?: "brand";
  /** Se true, header cliccabile per espandere/collassare con animazione. */
  collapsible?: boolean;
  /** Se collapsible, stato iniziale (default true = aperto). */
  defaultOpen?: boolean;
}

export function Section({
  title,
  description,
  children,
  action,
  titleAccent,
  collapsible = false,
  defaultOpen = true,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const titleClass = [
    "text-base font-semibold uppercase tracking-wider",
    titleAccent === "brand" ? "text-brand" : "text-slate-100",
  ].join(" ");

  return (
    <section className="rounded-2xl border border-border bg-panel/70 p-4 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className="group flex min-w-0 flex-1 items-start gap-2 text-left"
          >
            <Chevron open={open} />
            <div className="min-w-0">
              <h2 className={titleClass}>{title}</h2>
              {description ? (
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
              ) : null}
            </div>
          </button>
        ) : (
          <div className="min-w-0">
            <h2 className={titleClass}>{title}</h2>
            {description ? (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            ) : null}
          </div>
        )}
        {action ? (
          <div className="flex-none" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        ) : null}
      </header>
      {collapsible ? (
        <Collapse open={open}>
          <div className="space-y-4">{children}</div>
        </Collapse>
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </section>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <ChevronRight
      size={16}
      strokeWidth={2.5}
      aria-hidden
      className={[
        "mt-1 flex-none text-slate-400 transition-transform duration-300 group-hover:text-brand",
        open ? "rotate-90" : "rotate-0",
      ].join(" ")}
    />
  );
}
