/* ==============================================================================
 * AXTO design tokens — "Crystal Palace" (docs/BLUEPRINT-V4.md §18.1).
 * Sapphire from the owner's "AXTO Digital Global" picture, royal gold for
 * premium accents, obsidian for the palace floor, one colour per app.
 * ============================================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Sapphire — the brand colour everywhere (buttons, links, focus rings).
        brand: {
          50: "#eef6ff", 100: "#d9ebff", 200: "#bbdcff", 300: "#8cc5ff", 400: "#56a4ff",
          500: "#2f82ff", 600: "#1a64f0", 700: "#1550d6", 800: "#1843ad", 900: "#1a3c88", 950: "#142653",
        },
        // Royal gold — premium accents only (prices, Enterprise badges, gilded edges).
        gold: { 50: "#fdf8ec", 100: "#f9eccb", 200: "#f3d98b", 300: "#ecc96a", 400: "#e0b44d", 500: "#c9a24a", 600: "#a8842f", 700: "#7d6122" },
        // Obsidian — the palace floor (public site, acquisition, dark surfaces).
        ink: { 950: "#04060c", 900: "#0a1020", 800: "#111a2e", 700: "#1b2640" },
        // One colour per app (owner's picture).
        app: {
          guardian: "#2f82ff", orchestra: "#9b6bff", vault: "#22c55e", edge: "#38bdf8", soc: "#f43f5e",
          compliance: "#f59e0b", sentinel: "#ef4444", antivirus: "#84cc16", studio: "#ec4899", legal: "#3b82f6",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)",
        lift: "0 10px 30px -12px rgba(15,23,42,.25)",
        crystal: "0 1px 0 rgba(255,255,255,.06) inset, 0 20px 50px -24px rgba(2,6,23,.75)",
        regal: "0 0 0 1px rgba(201,162,74,.35), 0 18px 48px -20px rgba(201,162,74,.45)",
      },
      transitionTimingFunction: { palace: "cubic-bezier(.2,.8,.2,1)" },
      maxWidth: { page: "1200px" },
    },
  },
  plugins: [],
};
