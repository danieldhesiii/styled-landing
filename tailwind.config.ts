import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#2b2622",
        cream: "#faf6f0",
        sand: "#efe7db",
        clay: "#b98a6a",
        sage: "#8a9a82",
        blush: "#d9b7ad",
        gold: "#a67c52",
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
        // A gentle expanding ring for the decoration markers — slower and softer
        // than Tailwind's built-in `ping` so it reads as a calm pulse, not a flash.
        pingSlow: {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "70%, 100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.25s ease-in-out",
        "ping-slow": "pingSlow 2.8s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
