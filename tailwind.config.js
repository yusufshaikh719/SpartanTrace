/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sjsu: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#0055A5',
          600: '#00478A',
          700: '#00386E',
          navy: '#0b1f3a',
          gold: '#E5A823',
          goldLight: '#FEF3C7',
          goldDark: '#B8820B',
          surface: '#F8FAFC',
        },
      },
    },
  },
  plugins: [],
}
