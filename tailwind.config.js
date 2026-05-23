/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#161719",
        panel: "#1c1d20",
        "panel-2": "#232427",
        border: "#2a2c30",
        // Brand acid mint — segna LED wall fisico + accent UI
        brand: {
          DEFAULT: "#7ffed1",
          light: "#a3ffdf",
          bright: "#d4fff0",
          dim: "#5fc9a4",
        },
        // Sorgente in modalità Fit (letterbox) — arancio acido, contrasta col mint
        fit: {
          DEFAULT: "#fb923c",
          bright: "#fdba74",
        },
        // Sorgente in modalità Fill (crop)
        fill: {
          DEFAULT: "#d946ef",
          bright: "#f0abfc",
        },
      },
      fontFamily: {
        sans: [
          "Chakra Petch",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
