/**
 * Export PDF della scheda progetto.
 *
 * Strategia: riusa il builder SVG di exportPng.ts → rasterizza a PNG ad
 * alta risoluzione (2x retina) → embedda in un PDF con dimensioni pagina
 * proporzionali all'SVG.
 *
 * PDF a singola pagina con dimensione custom (no whitespace forzati).
 * Aspect ratio mantenuto dal SVG sorgente → l'utente può stampare
 * "Adatta alla pagina" su qualsiasi formato.
 */

import jsPDF from "jspdf";
import {
  buildFilename,
  buildProjectSvg,
  svgToPngBlob,
} from "./exportPng";
import type { Project } from "./wall";

export async function exportProjectPdf(project: Project): Promise<void> {
  const { svg, width, height } = buildProjectSvg(project);
  // 2x scale per qualità print/retina
  const pngBlob = await svgToPngBlob(svg, width, height, 2);
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer());

  // Pagina PDF: larghezza fissa 297mm (A3 landscape / A4 inversion),
  // altezza proporzionale al SVG → no bordi bianchi.
  const pageWidthMm = 297;
  const pageHeightMm = (height / width) * pageWidthMm;
  const orientation: "landscape" | "portrait" =
    pageWidthMm >= pageHeightMm ? "landscape" : "portrait";

  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  // addImage accetta Uint8Array; "PNG" hint per il decoder interno
  pdf.addImage(pngBytes, "PNG", 0, 0, pageWidthMm, pageHeightMm, undefined, "FAST");

  pdf.save(buildFilename(project, "pdf"));
}
