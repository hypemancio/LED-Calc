/**
 * Cablaggio serpentina / pattern Novastar e budget porte sender.
 *
 * Convenzione coordinate cabinet:
 *  - row 0 = riga in alto, col 0 = colonna a sinistra
 *  - `cabinetsWide` = numero colonne (assi X)
 *  - `cabinetsHigh` = numero righe (assi Y)
 *
 * Il cablaggio in NovaLCT/NovaPilot si configura come:
 *  - pattern: HS / HZ / VS / VZ
 *    - H = Horizontal (parte per riga prima di scendere)
 *    - V = Vertical   (parte per colonna prima di traslare)
 *    - S = Serpentine (alterna direzione su ogni passo)
 *    - Z = Zigzag/raster (sempre stessa direzione, "ritorno carrello")
 *  - starting corner: TL / TR / BL / BR
 */

// ---------------------------------------------------------------------------
// Tipi
// ---------------------------------------------------------------------------

export type CablingPattern = "HS" | "HZ" | "VS" | "VZ";
export type StartCorner = "TL" | "TR" | "BL" | "BR";

export const CABLING_PATTERN_LABELS: Record<CablingPattern, string> = {
  HS: "Horizontal · S",
  HZ: "Horizontal · Z",
  VS: "Vertical · S",
  VZ: "Vertical · Z",
};

export const START_CORNER_LABELS: Record<StartCorner, string> = {
  TL: "Top-Left",
  TR: "Top-Right",
  BL: "Bottom-Left",
  BR: "Bottom-Right",
};

export interface CablingConfig {
  pattern: CablingPattern;
  corner: StartCorner;
  /** Mostra numerazione e polyline nel preview canvas. */
  showInPreview: boolean;
  /** Key del sender card preset, oppure "custom". */
  senderKey: string;
  /** Override custom — usati solo se senderKey === "custom". */
  customMaxPixelsPerPort: number;
  customPortsPerCard: number;
}

export const DEFAULT_CABLING: CablingConfig = {
  pattern: "HS",
  corner: "TL",
  showInPreview: false,
  senderKey: "MCTRL4K",
  customMaxPixelsPerPort: 650_000,
  customPortsPerCard: 4,
};

// ---------------------------------------------------------------------------
// Sender card presets Novastar
// ---------------------------------------------------------------------------

export interface SenderCard {
  key: string;
  name: string;
  /** Pixel massimi per singola porta gigabit di output. */
  maxPixelsPerPort: number;
  /** Numero di porte gigabit per scheda. */
  portsPerCard: number;
  /** Pixel massimi totali della scheda (calcolato come ports × pxPerPort). */
  maxTotalPixels: number;
  /** Note opzionali. */
  notes?: string;
}

function card(
  key: string,
  name: string,
  pxPerPort: number,
  ports: number,
  notes?: string
): SenderCard {
  return {
    key,
    name,
    maxPixelsPerPort: pxPerPort,
    portsPerCard: ports,
    maxTotalPixels: pxPerPort * ports,
    notes,
  };
}

/** Cataloghi sender card più comuni Novastar.
 *  Limite tipico per porta gigabit ethernet: 650K px @ 60Hz 8-bit.
 *  MCTRL4K / R5 ottengono pixel/porta maggiori usando link 10G o port-aggregation. */
export const NOVASTAR_SENDERS: SenderCard[] = [
  card("MCTRL660PRO", "MCTRL660 PRO", 650_000, 4, "2.6 MP totali"),
  card("MCTRL4K", "MCTRL4K", 2_200_000, 4, "8.8 MP totali, 4K @ 60Hz"),
  card("MCTRL_R5", "MCTRL R5", 2_200_000, 4, "8.8 MP totali, 10-bit broadcast"),
  card("MCTRL_CL", "MCTRL CL", 1_100_000, 4, "4.4 MP totali"),
  card("KU20", "KU20", 813_000, 16, "13 MP totali, 16 porte ottiche"),
  card("VX400", "VX400", 650_000, 4, "All-in-one 2.6 MP"),
  card("VX600", "VX600", 650_000, 6, "All-in-one 3.9 MP"),
  card("VX1000", "VX1000", 650_000, 10, "All-in-one 6.5 MP"),
  card("VX2000", "VX2000", 650_000, 20, "All-in-one 13 MP"),
  card("H_SERIES", "H Series (modular)", 650_000, 20, "Modular, fino a 13 MP"),
];

export function findSender(key: string): SenderCard | null {
  return NOVASTAR_SENDERS.find((s) => s.key === key) ?? null;
}

// ---------------------------------------------------------------------------
// Ordine cablaggio
// ---------------------------------------------------------------------------

/**
 * Calcola la matrice di numerazione cabinet 1..N secondo pattern + corner.
 * Ritorna `order[row][col]` = numero sequenziale (1-based).
 */
export function getCablingOrder(
  cabinetsWide: number,
  cabinetsHigh: number,
  pattern: CablingPattern,
  corner: StartCorner
): number[][] {
  const order: number[][] = Array.from({ length: cabinetsHigh }, () =>
    new Array(cabinetsWide).fill(0)
  );
  if (cabinetsWide <= 0 || cabinetsHigh <= 0) return order;

  const isHorizontal = pattern === "HS" || pattern === "HZ";
  const isSerpentine = pattern === "HS" || pattern === "VS";
  const startTop = corner === "TL" || corner === "TR";
  const startLeft = corner === "TL" || corner === "BL";

  let n = 1;
  if (isHorizontal) {
    for (let ri = 0; ri < cabinetsHigh; ri++) {
      const row = startTop ? ri : cabinetsHigh - 1 - ri;
      const goingLeft = isSerpentine
        ? ri % 2 === 0
          ? startLeft
          : !startLeft
        : startLeft;
      for (let ci = 0; ci < cabinetsWide; ci++) {
        const col = goingLeft ? ci : cabinetsWide - 1 - ci;
        order[row][col] = n++;
      }
    }
  } else {
    for (let ci = 0; ci < cabinetsWide; ci++) {
      const col = startLeft ? ci : cabinetsWide - 1 - ci;
      const goingTop = isSerpentine
        ? ci % 2 === 0
          ? startTop
          : !startTop
        : startTop;
      for (let ri = 0; ri < cabinetsHigh; ri++) {
        const row = goingTop ? ri : cabinetsHigh - 1 - ri;
        order[row][col] = n++;
      }
    }
  }
  return order;
}

/** Trova {row, col} dato il numero N (1-based) nell'ordine corrente. */
export function findCabinetByOrderIndex(
  order: number[][],
  n: number
): { row: number; col: number } | null {
  for (let r = 0; r < order.length; r++) {
    for (let c = 0; c < order[r].length; c++) {
      if (order[r][c] === n) return { row: r, col: c };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Budget porte sender Novastar
// ---------------------------------------------------------------------------

export interface PortBudget {
  /** Sender card usato (o custom override). */
  sender: SenderCard;
  /** Pixel di un singolo cabinet. */
  pixelsPerCabinet: number;
  /** Cabinet per porta (limite hardware del sender). */
  cabinetsPerPort: number;
  /** Pixel totali del progetto. */
  totalPixels: number;
  /** Numero di porte necessarie (totale cabinets / cabPerPort, ceiling). */
  portsNeeded: number;
  /** Numero di sender card necessari (porte / portsPerCard, ceiling). */
  sendersNeeded: number;
  /** Frazione [0..1] di pixel usati su una porta tipica (porta piena). */
  portUtilization: number;
  /** Se true, anche un singolo cabinet eccede il limite di pixel/porta. */
  oversized: boolean;
}

/**
 * Calcola il budget di porte/sender per cablare `cabinetsTotal` cabinet
 * dato un sender card preset (o override custom).
 */
export function computePortBudget(
  config: CablingConfig,
  cabinetsTotal: number,
  pixelsPerCabinet: number
): PortBudget {
  // Sender effettivo (preset o custom)
  const preset = findSender(config.senderKey);
  const sender: SenderCard =
    config.senderKey === "custom" || !preset
      ? card(
          "custom",
          "Custom",
          Math.max(1, config.customMaxPixelsPerPort),
          Math.max(1, config.customPortsPerCard)
        )
      : preset;

  if (cabinetsTotal <= 0 || pixelsPerCabinet <= 0) {
    return {
      sender,
      pixelsPerCabinet,
      cabinetsPerPort: 0,
      totalPixels: 0,
      portsNeeded: 0,
      sendersNeeded: 0,
      portUtilization: 0,
      oversized: false,
    };
  }

  const oversized = pixelsPerCabinet > sender.maxPixelsPerPort;
  const cabinetsPerPort = oversized
    ? 0
    : Math.floor(sender.maxPixelsPerPort / pixelsPerCabinet);
  const portsNeeded = oversized
    ? cabinetsTotal // 1 porta per cabinet (impossibile da rispettare)
    : Math.ceil(cabinetsTotal / cabinetsPerPort);
  const sendersNeeded = Math.ceil(portsNeeded / sender.portsPerCard);
  const portUtilization = oversized
    ? 1
    : (pixelsPerCabinet * cabinetsPerPort) / sender.maxPixelsPerPort;

  return {
    sender,
    pixelsPerCabinet,
    cabinetsPerPort,
    totalPixels: cabinetsTotal * pixelsPerCabinet,
    portsNeeded,
    sendersNeeded,
    portUtilization,
    oversized,
  };
}
