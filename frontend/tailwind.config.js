/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        sutda: {
          green: "#1a5c2e",
          gold: "#d4a843",
          red: "#c0392b",
          dark: "#1a1a2e",
        },
      },
    },
  },
  plugins: [],
};
