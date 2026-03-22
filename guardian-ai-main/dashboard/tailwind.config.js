/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        axto: {
          primary: "#22d3ee",
          dark: "#060c14",
          surface: "#0a1628",
        },
      },
    },
  },
  plugins: [],
};
