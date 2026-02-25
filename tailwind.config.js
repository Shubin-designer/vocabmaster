/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      colors: {
        theme: {
          dark: '#0d0d10',
          light: '#f7f7f9',
          glass: 'rgba(255, 255, 255, 0.03)',
          'glass-border': 'rgba(255, 255, 255, 0.06)'
        }
      }
    },
  },
  plugins: [],
}