/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        obsidian: '#0a0a0a',
        charcoal: '#1a1a1a',
        crimson: '#dc2626',
        neoncyan: '#06b6d4'
      }
    },
  },
  plugins: [],
}
