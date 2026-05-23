/**
 * Genera tutte le immagini raster del progetto a partire dalle sorgenti SVG:
 *
 *   public/icon.svg       → icon-192.png, icon-512.png, icon-512-maskable.png,
 *                           apple-touch-icon.png
 *   public/og-image.svg   → og-image.png (1200×630, per anteprime link social)
 *
 * Rendering tramite @resvg/resvg-js (Rust prebuilt, niente sharp/libvips).
 */
import { Resvg } from "@resvg/resvg-js";
import fs from "node:fs";
import path from "node:path";

const OUT_DIR = "public";

const targets = [
  // Icone PWA
  { src: "public/icon.svg", out: "icon-192.png", width: 192 },
  { src: "public/icon.svg", out: "icon-512.png", width: 512 },
  { src: "public/icon.svg", out: "icon-512-maskable.png", width: 512 },
  { src: "public/icon.svg", out: "apple-touch-icon.png", width: 180 },
  // Social preview (Open Graph + Twitter Card)
  { src: "public/og-image.svg", out: "og-image.png", width: 1200 },
];

for (const t of targets) {
  const svg = fs.readFileSync(t.src);
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: t.width },
    background: "#161719",
    // resvg-js usa le font del sistema; sans-serif viene risolto a font installato
    font: { loadSystemFonts: true, defaultFontFamily: "Arial" },
  });
  const png = resvg.render().asPng();
  const outPath = path.join(OUT_DIR, t.out);
  fs.writeFileSync(outPath, png);
  console.log(`✔  ${t.out} — ${t.width}px wide (${png.length} bytes)`);
}
