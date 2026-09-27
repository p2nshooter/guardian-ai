/* ==============================================================================
 * AXTO v3 design tokens — derived from the AXTO logo (teal shield on ink).
 * ============================================================================ */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#effefb", 100: "#c8fff4", 200: "#92fee9", 300: "#53f5db", 400: "#1fd8c0",
          500: "#06bca6", 600: "#029788", 700: "#07786e", 800: "#0b5f58", 900: "#0e4e49", 950: "#01302e",
        },
        ink: { 950: "#07090d", 900: "#0b1220", 800: "#111a2e", 700: "#1b2640" },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "Liberation Mono", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)",
        lift: "0 10px 30px -12px rgba(15,23,42,.25)",
      },
      maxWidth: { page: "1200px" },
    },
  },
  plugins: [],
};
