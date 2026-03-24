/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'cr-bg': '#05080F',
        'cr-surface': '#0A1120',
      }
    },
  },
  plugins: [],
}