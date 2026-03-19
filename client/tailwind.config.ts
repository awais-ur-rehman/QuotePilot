import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark slate background
        slate: {
          950: "#0F1419",
          900: "#1A1F2E",
          800: "#242938",
          700: "#2E3448",
        },
        // Electric teal accent
        teal: {
          400: "#00D4AA",
          500: "#00BF99",
          600: "#00A885",
        },
        // Warm amber for warnings
        amber: {
          400: "#F59E0B",
          500: "#D97706",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "IBM Plex Mono", "Fira Code", "monospace"],
        sans: ["Outfit", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-teal": "pulse-teal 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slide-in 0.2s ease-out",
        "fade-in": "fade-in 0.15s ease-out",
      },
      keyframes: {
        "pulse-teal": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
        "slide-in": {
          "0%": { transform: "translateY(-4px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
