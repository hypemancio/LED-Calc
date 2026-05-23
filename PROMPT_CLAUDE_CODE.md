# Prompt per Claude Code — PWA Calcolatore pareti LED

> Incolla tutto il blocco qui sotto in Claude Code, dentro una cartella vuota del progetto.
> Se hai già il file `index.html` del prototipo, mettilo nella cartella prima di lanciare: Claude Code lo userà come riferimento.

---

## Contesto

Voglio costruire una **PWA (Progressive Web App) installabile su telefono** che funziona da
**calcolatore professionale per pareti LED**, pensato per tecnici video e operatori di media server.
So programmare un po', quindi spiegami brevemente le scelte importanti mentre procedi, ma
gestisci tu la struttura del progetto. Procedi a piccoli passi e fammi provare ogni milestone.

## Obiettivo

Un'app web in **React + Vite + TypeScript**, stilizzata con **Tailwind CSS**, che:
- calcola risoluzione, aspect ratio e numero di cabinet di una parete LED;
- è **installabile come PWA** e **funziona offline**;
- ha un'interfaccia mobile-first, dark theme, pulita e veloce da usare a mano libera.

## Funzionalità del calcolatore

Input dall'utente:
- Larghezza e altezza muro (in mm)
- Larghezza e altezza del singolo cabinet (in mm) — con preset comuni (500×500, 500×1000, 600×337.5)
- Pixel pitch (menu a tendina: P1.2, P1.5, P1.9, P2.5, P2.6, P2.9, P3.9, P4.8, P5.9)

Output calcolati (aggiornati in tempo reale a ogni modifica):
- **Numero di cabinet**: `cabsWide = ceil(wallW / cabW)`, `cabsHigh = ceil(wallH / cabH)`, e totale
- **Dimensioni reali del muro**: cabinet interi × dimensione cabinet (mm e anche metri)
- **Risoluzione totale in pixel**: `pixelPerCabinet = round(dimCabinet / pitch)`, poi × numero cabinet
- **Aspect ratio**: sia in forma ridotta (es. 16:9, usando il massimo comun divisore) sia in forma N:1 (es. 1.78:1)
- **Megapixel totali**
- **Peso stimato** (campo modificabile kg/cabinet, default ~8 kg, × numero cabinet)
- **Consumo elettrico stimato** (campo modificabile W/cabinet medi, default ~150 W, e picco ~450 W; mostra anche Ampere a 230V)
- **Distanza di visione consigliata** (regola pratica: distanza minima in metri ≈ pixel pitch in mm; mostra in metri e piedi)
- Un **avviso** se larghezza o altezza muro non sono multipli esatti del cabinet (il muro reale sarà più grande del richiesto)

Extra utili se non troppo complessi:
- Toggle per inserire le dimensioni in **metri** anziché mm
- Una **anteprima grafica** semplice: un rettangolo con la griglia dei cabinet disegnata (es. con SVG o canvas)

## Requisiti tecnici

- **React + Vite + TypeScript**
- **Tailwind CSS** per lo stile, dark theme (palette su slate/blu, sfondo scuro tipo #0f172a)
- Configura la PWA con il plugin **`vite-plugin-pwa`**: manifest, service worker, funzionamento offline, e i meta tag iOS (`apple-mobile-web-app-capable`, `theme-color`, `viewport-fit=cover`)
- Genera o predisponi le **icone** del manifest (anche placeholder vanno bene, dimmi solo dove sostituirle)
- Codice ordinato: separa la **logica di calcolo** (funzioni pure in un file tipo `src/lib/ledMath.ts`, facilmente testabile) dalla **UI** (componenti React)
- Mobile-first, input grandi e comodi da toccare, ricalcolo in tempo reale
- Niente backend: tutto gira lato client

## Come procedere

1. Inizializza il progetto Vite (React + TS) e installa le dipendenze (Tailwind, vite-plugin-pwa).
2. Crea `src/lib/ledMath.ts` con tutte le funzioni di calcolo pure e ben commentate.
3. Costruisci la UI base con i campi di input e i risultati che leggono da `ledMath`.
4. Aggiungi peso, consumo, distanza di visione e l'avviso sui multipli.
5. Aggiungi l'anteprima grafica della griglia cabinet.
6. Configura la PWA (manifest + service worker) e verifica che sia installabile/offline.
7. Spiegami come avviarla in locale (`npm run dev`) e come fare il build di produzione (`npm run build`).

Dopo ogni passo fermati, fammi un breve riepilogo di cosa hai fatto e fammi provare prima di proseguire.

## Note

- Non copiare nomi, loghi o design di prodotti esistenti: voglio uno strumento mio e originale.
- Le formule sono standard di settore, quelle posso usarle liberamente.
- Tieni i valori di default (peso, watt) chiaramente etichettati come "stime indicative".
