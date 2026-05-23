# LED Calc

PWA installabile per calcolare risoluzione, aspect ratio, peso, consumo e
distanza di visione di una parete LED.

## Stack
- React 18 + Vite 5 + TypeScript
- Tailwind CSS 3 (dark theme)
- `vite-plugin-pwa` (manifest + service worker, autoUpdate)

## Comandi
```bash
npm install        # solo la prima volta
npm run dev        # avvia il server di sviluppo (http://localhost:5173)
npm run build      # build di produzione in dist/
npm run preview    # serve la dist (qui il service worker è attivo)
npm run typecheck  # controllo TypeScript senza emit
```

## Icone

Sostituisci i file in `public/`:
- `icon.svg` — icona vettoriale principale (512×512 viewBox)
- `favicon.svg` — favicon per browser
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` — icone PNG del manifest (richieste da Android per l'installazione)
- `apple-touch-icon.png` — 180×180 per iOS Home Screen

Per generare i PNG dal SVG puoi usare lo script `pwa-assets-generator`
oppure qualsiasi editor (Figma, Inkscape, ImageMagick).
