import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: "var(--brand-pink)",
        },
        danger: {
          red: "var(--danger-red)",
        },
        surface: {
          white: "var(--surface-white)",
        },
        blush: {
          light: "var(--bg-blush-light)",
          deep: "var(--bg-blush-deep)",
        },
        ink: {
          DEFAULT: "var(--text-ink)",
          muted: "var(--text-muted)",
        },
        border: {
          rose: "var(--border-rose)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        btn: "10px",
      },
      boxShadow: {
        card: "0 2px 10px rgba(43, 27, 33, 0.04)",
        elevated: "0 8px 24px rgba(43, 27, 33, 0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
