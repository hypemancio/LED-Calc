export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border pb-12 pt-8">
      <div className="space-y-3 text-center text-xs">
        <p className="text-slate-500">
          Peso e consumo sono{" "}
          <span className="italic">stime indicative</span> — tara i default sulle schede tecniche del tuo prodotto.
        </p>
        <p className="text-slate-400">
          Made with{" "}
          <span aria-hidden className="text-brand">
            ♥
          </span>{" "}
          by{" "}
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
