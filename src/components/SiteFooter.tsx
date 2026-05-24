import { Heart } from "lucide-react";

export function SiteFooter() {
  return (
    <footer
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 backdrop-blur"
      role="contentinfo"
    >
      <div className="mx-auto flex flex-col items-center justify-center gap-1 px-4 py-2 text-center text-[11px] lg:flex-row lg:gap-4 lg:px-10">
        <p className="text-slate-500">
          Peso e consumo sono{" "}
          <span className="italic">stime indicative</span> — tara sulle schede
          tecniche del produttore.
        </p>
        <span aria-hidden className="hidden text-slate-700 lg:inline">
          ·
        </span>
        <p className="inline-flex items-center gap-1 text-slate-400">
          Made with
          <Heart
            className="text-brand"
            size={12}
            strokeWidth={2}
            fill="currentColor"
            aria-hidden
          />
          by
          <a
            href="https://instagram.com/_hypemancio_"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-brand transition hover:text-brand-bright"
          >
            hypemancio
          </a>
        </p>
      </div>
    </footer>
  );
}
