import type { ReactNode } from "react";

interface Props {
  open: boolean;
  children: ReactNode;
}

/**
 * Container che anima l'apertura/chiusura di contenuto a altezza variabile.
 * Usa il trick di `grid-template-rows` 0fr → 1fr (supportato dal 2023 su
 * tutti i browser moderni) — niente max-height fisso, l'animazione segue
 * l'altezza reale del contenuto.
 */
export function Collapse({ open, children }: Props) {
  return (
    <div
      className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
      style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      aria-hidden={!open}
    >
      <div
        className={[
          "overflow-hidden transition-opacity duration-300 ease-out motion-reduce:transition-none",
          open ? "opacity-100" : "opacity-0",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
